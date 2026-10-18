import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from '../../../node_modules/playwright/index.mjs';
import {decode} from '../../../mcp/src/check/png.js';

const output=path.resolve(process.argv[2]??'/tmp/orbital-tooltip-exports');
fs.mkdirSync(output,{recursive:true});
const results=[];
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,acceptDownloads:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4398/examples/real/orbital-traffic/orbital-retro.html');
  await page.locator('.object-row.other').waitFor();
  await page.evaluate(async()=>{
   await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));
   const y=document.querySelector('.poster').getBoundingClientRect().top;
   document.body.style.paddingTop=`${parseFloat(getComputedStyle(document.body).paddingTop)+Math.ceil(y)-y}px`;
  });
  const mark=page.locator('.object-row.other .object-point'),tip=page.locator('.orbit-tooltip');
  await mark.scrollIntoViewIfNeeded();await page.locator('.object-row.other').focus();
  await page.locator('.orbit-tooltip:popover-open').waitFor();
  const paper=await tip.evaluate(element=>getComputedStyle(element).backgroundColor.match(/\d+/g).slice(0,3).map(Number));
  // Keep the selected image's glow in the reference, but leave out the temporary popup.
  await tip.evaluate(element=>element.hidePopover());
  const reference=decode(await page.locator('.poster').screenshot({path:path.join(output,`${name}-reference.png`)}));
  await mark.scrollIntoViewIfNeeded();await tip.evaluate(element=>element.showPopover());
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const selected=await page.locator('.readout').innerText();
  const downloaded=page.waitForEvent('download',{timeout:60000});
  await page.locator('.poster-download').click();
  const target=path.join(output,`${name}-download.png`);await(await downloaded).saveAs(target);
  await page.waitForFunction(()=>!document.querySelector('.poster-download').hasAttribute('aria-busy'));
  assert.equal(await page.locator('.readout').innerText(),selected,'Download preserves category selection');
  assert.equal(await tip.evaluate(element=>element.matches(':popover-open')),true,'The popup returns after export');
  const png=decode(fs.readFileSync(target));
  const width=Math.min(png.width,reference.width),height=Math.min(png.height,reference.height);
  let difference=0,maxTileDifference=0,maxAddedPaperFraction=0;
  // Detect a new solid card separately from browser differences in the Earth artwork.
  for(let sy=0;sy<height;sy+=96)for(let sx=0;sx<width;sx+=96){
   let tile=0,pixels=0,addedPaper=0;
   for(let y=sy;y<Math.min(sy+96,height);y++)for(let x=sx;x<Math.min(sx+96,width);x++){
    const i=(y*png.width+x)*4,j=(y*reference.width+x)*4;
    let pixelDifference=0;
    for(let channel=0;channel<3;channel++)pixelDifference+=Math.abs(png.data[i+channel]-reference.data[j+channel]);
    if(paper.every((value,channel)=>Math.abs(png.data[i+channel]-value)<=2)&&pixelDifference>60)addedPaper++;
    tile+=pixelDifference;difference+=pixelDifference;pixels++;
   }
   maxTileDifference=Math.max(maxTileDifference,tile/(pixels*3));
   maxAddedPaperFraction=Math.max(maxAddedPaperFraction,addedPaper/pixels);
  }
  const meanRgbDifference=difference/(width*height*3);
  assert.ok(meanRgbDifference<7&&maxAddedPaperFraction<.2,`${name}: unexpected overlay in the PNG (${meanRgbDifference}, ${maxAddedPaperFraction})`);
  assert.deepEqual(errors,[]);
  const result={name,png:{width:png.width,height:png.height},meanRgbDifference,maxTileDifference,maxAddedPaperFraction,tooltipOmitted:true,selectionPreserved:true,errors};
  results.push(result);console.log(JSON.stringify(result));
 }finally{await browser.close();}
}
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(results,null,2)+'\n');

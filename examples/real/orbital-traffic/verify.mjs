import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from '../../../node_modules/playwright/index.mjs';
import {decode} from '../../../mcp/src/check/png.js';

const output=path.resolve(process.argv[2]??'/tmp/orbital-validation');
fs.mkdirSync(output,{recursive:true});
const file=process.argv[3]??'orbital-retro';
const textFont=process.argv[4]??'Zen Dots';
const url=`http://127.0.0.1:4398/examples/real/orbital-traffic/${file}.html`;
const results={checked:new Date().toISOString(),url,browsers:[]};
const ready=page=>page.evaluate(async()=>{
 await document.fonts.ready;
 await Promise.all([...document.images].map(image=>image.decode()));
 await new Promise(requestAnimationFrame);
});
const readout=page=>page.locator('.readout').innerText();

for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2,acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await ready(page);
  const geometry=await page.evaluate(()=>[...document.querySelectorAll('.object-row')].map(row=>{
   const point=row.querySelector('.object-point'),style=point.style;
   const x=Number(style.getPropertyValue('--rhp-at')),cross=Number(style.getPropertyValue('--rhp-cross'));
   const radius=Math.hypot(x-.5,1.05-(.72-cross));
   return {key:row.dataset.symbol,expected:Number(row.dataset.altitude),actual:(radius-.48)/.0005};
  }));
  assert.equal(geometry.length,34);
  for(const point of geometry)assert.ok(Math.abs(point.actual-point.expected)<.00001,`Altitude changed: ${point.key}`);
  const families=await page.evaluate(()=>[...document.querySelectorAll('.poster *')].filter(element=>[...element.childNodes].some(node=>node.nodeType===3&&node.textContent.trim())).map(element=>({text:element.textContent.trim(),font:getComputedStyle(element).fontFamily,number:element.matches('.stat strong')})));
  for(const item of families)assert.ok(item.font.includes(item.number?'Atomic Age':textFont),`Wrong font: ${item.text}`);

  await page.locator('.legend button[data-category="debris"]').click();
  await page.mouse.move(0,0);
  const selected=await readout(page);assert.match(selected,/Debris/);assert.match(selected,/7,632/);assert.match(selected,/454/);
  await page.evaluate(()=>{
   const top=document.querySelector('.poster').getBoundingClientRect().top;
   document.body.style.paddingTop=`${parseFloat(getComputedStyle(document.body).paddingTop)+Math.ceil(top)-top}px`;
  });
  const shot=path.join(output,`${name}-browser.png`);
  const dimensions=await page.locator('.poster').evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  await page.locator('.poster').screenshot({path:shot});
  await page.locator('.poster-fit-toggle').click();
  await page.waitForFunction(()=>document.querySelector('.poster-fit-frame').classList.contains('is-fitted'));
  const fitted=await page.locator('.poster').boundingBox();
  assert.ok(fitted.height<=951,'Fit exceeds 95% viewport height');
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  const afterScroll=await page.locator('.poster').boundingBox();
  assert.ok(Math.abs(afterScroll.width-fitted.width)<.1&&Math.abs(afterScroll.height-fitted.height)<.1,'Fitted size shifted on scroll');
  const download=page.waitForEvent('download',{timeout:60000});
  await page.locator('.poster-download').click();
  await (await download).saveAs(path.join(output,`${name}-download.png`));
  await page.waitForFunction(()=>!document.querySelector('.poster-download').hasAttribute('aria-busy'));
  assert.equal(await readout(page),selected,'Download cleared the selected category');
  assert.equal(await page.locator('.legend button[data-category="debris"]').getAttribute('aria-pressed'),'true');
  const image=decode(fs.readFileSync(path.join(output,`${name}-download.png`))),reference=decode(fs.readFileSync(shot));
  assert.equal(image.width,Math.floor(dimensions.width*2));assert.equal(image.height,Math.floor(dimensions.height*2));
  // With the origin aligned, only the far fractional edge can round outwards in a screenshot.
  assert.ok(Math.abs(image.width-reference.width)<=2&&Math.abs(image.height-reference.height)<=2);
  const commonWidth=Math.min(image.width,reference.width),commonHeight=Math.min(image.height,reference.height);
  let sum=0;for(let y=0;y<commonHeight;y++)for(let x=0;x<commonWidth;x++)for(let channel=0;channel<3;channel++)sum+=Math.abs(image.data[(y*image.width+x)*4+channel]-reference.data[(y*reference.width+x)*4+channel]);
  const meanRgbDifference=sum/(commonWidth*commonHeight*3);
  assert.ok(meanRgbDifference<7,`${name} export mismatch: ${meanRgbDifference}`);
  await page.locator('.poster-fit-toggle').click();
  assert.equal(await readout(page),selected,'Restoring size cleared selection');
  const other=page.locator('.object-row[data-category="other"]').first();
  await other.focus();assert.match(await readout(page),/Other/);
  await page.keyboard.press('ArrowDown');
  const focusedCategory=await page.evaluate(()=>document.activeElement.dataset.category);
  const expected={payload:'Spacecraft',debris:'Debris',other:'Other'}[focusedCategory];
  assert.match(await readout(page),new RegExp(expected));
  assert.deepEqual(errors,[]);
  const row={name,dimensions,png:{width:image.width,height:image.height},meanRgbDifference,altitudeChecks:geometry.length,selectionPreserved:true,fitStable:true,fontsConsistent:true,keyboard:true,errors};
  results.browsers.push(row);console.log(JSON.stringify(row));
  if(name==='chromium'){
   const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const mobile=await phone.newPage();await mobile.goto(url);await ready(mobile);
   for(const width of [390,360,320]){
    await mobile.setViewportSize({width,height:844});
    await mobile.locator('.miniature').first().tap();
    assert.match(await readout(mobile),/Spacecraft/);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await mobile.locator('.poster').screenshot({path:path.join(output,`phone-${width}.png`)});
   }
   results.touchWidths=[390,360,320];await phone.close();
  }
  await context.close();
 }finally{await browser.close();}
}
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(results,null,2)+'\n');

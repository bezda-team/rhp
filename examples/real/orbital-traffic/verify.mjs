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
const meanDifference=(image,reference,region={})=>{
 const left=Math.max(0,Math.ceil(region.left??0)),top=Math.max(0,Math.ceil(region.top??0));
 const right=Math.min(image.width,reference.width,Math.floor(region.right??Infinity));
 const bottom=Math.min(image.height,reference.height,Math.floor(region.bottom??Infinity));
 assert.ok(right>left&&bottom>top,'The comparison region has visible pixels');
 let difference=0;
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)for(let channel=0;channel<3;channel++)difference+=Math.abs(image.data[(y*image.width+x)*4+channel]-reference.data[(y*reference.width+x)*4+channel]);
 return difference/((right-left)*(bottom-top)*3);
};

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
  const footer=page.locator('.footer-summary');
  if(await footer.count()){
   const posterHeight=(await page.locator('.poster').boundingBox()).height;
   assert.equal(await footer.getAttribute('aria-expanded'),'false');
   assert.equal(await footer.locator('strong').innerText(),'Spacecraft includes working and inactive payloads.');
   assert.equal(await page.locator('.footer-prompt').isVisible(),true);
   await footer.focus();await page.keyboard.press('Enter');
   await page.locator('.footer-drawer').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
   assert.equal(await footer.getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('.footer-prompt').isVisible(),false);
   assert.equal(await page.locator('.footer-body').isVisible(),true);
   assert.ok(Math.abs((await page.locator('.poster').boundingBox()).height-posterHeight)<.1,'Expanding the footer keeps the poster size');
   assert.equal(await readout(page),selected,'Expanding notes preserves chart selection');
   await page.keyboard.press('Space');
   await page.locator('.footer-drawer').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
   assert.equal(await footer.getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('.footer-body').isVisible(),false);
  }
  await page.evaluate(()=>{
   const top=document.querySelector('.poster').getBoundingClientRect().top;
   document.body.style.paddingTop=`${parseFloat(getComputedStyle(document.body).paddingTop)+Math.ceil(top)-top}px`;
  });
  const shot=path.join(output,`${name}-browser.png`);
  const dimensions=await page.locator('.poster').evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  const earthRegion=await page.evaluate(()=>{
   if(!document.querySelector('.footer-stage'))return null;
   const poster=document.querySelector('.poster').getBoundingClientRect(),earth=document.querySelector('.earth').getBoundingClientRect(),footer=document.querySelector('.footer-stage').getBoundingClientRect();
   return{left:poster.width*.75*2,right:poster.width*.975*2,top:(earth.top-poster.top)*2,bottom:(footer.top-poster.top)*2};
  });
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
  const meanRgbDifference=meanDifference(image,reference);
  assert.ok(meanRgbDifference<7,`${name} export mismatch: ${meanRgbDifference}`);
  const earthEdgeDifference=earthRegion?meanDifference(image,reference,earthRegion):null;
  if(earthRegion)assert.ok(earthEdgeDifference<10,`${name} Earth glow export mismatch: ${earthEdgeDifference}`);
  if(await footer.count()){
   await footer.click();
   await page.locator('.footer-drawer').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
   const expandedFit=await page.locator('.poster').boundingBox();
   assert.ok(Math.abs(expandedFit.width-fitted.width)<.1&&Math.abs(expandedFit.height-fitted.height)<.1,'Expanding the fitted footer keeps its scale');
   await page.locator('.poster-fit-toggle').click();
   const expandedShot=path.join(output,`${name}-expanded-browser.png`);
   await page.locator('.poster').screenshot({path:expandedShot});
   await page.locator('.poster-fit-toggle').click();
   const expandedDownload=page.waitForEvent('download',{timeout:60000});
   await page.locator('.poster-download').click();
   const expandedPath=path.join(output,`${name}-expanded-download.png`);
   await (await expandedDownload).saveAs(expandedPath);
   await page.waitForFunction(()=>!document.querySelector('.poster-download').hasAttribute('aria-busy'));
   const png=decode(fs.readFileSync(expandedPath)),ref=decode(fs.readFileSync(expandedShot));
   assert.equal(png.width,image.width);assert.equal(png.height,image.height);
   assert.ok(meanDifference(png,ref)<7,`${name} expanded footer export mismatch`);
   assert.ok(meanDifference(png,ref,earthRegion)<10,`${name} expanded Earth glow export mismatch`);
   assert.equal(await footer.getAttribute('aria-expanded'),'true','Download preserves the expanded footer');
   assert.equal(await readout(page),selected,'Expanded download preserves chart selection');
  }
  await page.locator('.poster-fit-toggle').click();
  assert.equal(await readout(page),selected,'Restoring size cleared selection');
  const other=page.locator('.object-row[data-category="other"]').first();
  await other.focus();assert.match(await readout(page),/Other/);
  await page.keyboard.press('ArrowDown');
  const focusedCategory=await page.evaluate(()=>document.activeElement.dataset.category);
  const expected={payload:'Spacecraft',debris:'Debris',other:'Other'}[focusedCategory];
  assert.match(await readout(page),new RegExp(expected));
  assert.deepEqual(errors,[]);
  const row={name,dimensions,png:{width:image.width,height:image.height},meanRgbDifference,earthEdgeDifference,footer:await footer.count()>0,altitudeChecks:geometry.length,selectionPreserved:true,fitStable:true,fontsConsistent:true,keyboard:true,errors};
  results.browsers.push(row);console.log(JSON.stringify(row));
  if(name==='chromium'){
   const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const mobile=await phone.newPage();await mobile.goto(url);await ready(mobile);
   for(const width of [390,360,320]){
    await mobile.setViewportSize({width,height:844});
    await mobile.locator('.miniature').first().tap();
    assert.match(await readout(mobile),/Spacecraft/);
    if(await mobile.locator('.footer-summary').count()){
     const height=(await mobile.locator('.poster').boundingBox()).height;
     await mobile.locator('.footer-summary').tap();
     assert.equal(await mobile.locator('.footer-summary').getAttribute('aria-expanded'),'true');
     assert.equal(await mobile.locator('.footer-prompt').isVisible(),false);
     await mobile.locator('.footer-summary').tap();
     await mobile.locator('.footer-drawer').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
     assert.equal(await mobile.locator('.footer-summary').getAttribute('aria-expanded'),'false');
     assert.ok(Math.abs((await mobile.locator('.poster').boundingBox()).height-height)<.1,'Phone footer preserves poster height');
    }
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await mobile.locator('.poster').screenshot({path:path.join(output,`phone-${width}.png`)});
   }
   results.touchWidths=[390,360,320];await phone.close();
  }
  await context.close();
 }finally{await browser.close();}
}
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(results,null,2)+'\n');

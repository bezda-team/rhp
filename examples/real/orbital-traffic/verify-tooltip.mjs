import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from '../../../node_modules/playwright/index.mjs';

const output=path.resolve(process.argv[2]??'/tmp/orbital-tooltips');
const url=process.argv[3]??'http://127.0.0.1:4398/examples/real/orbital-traffic/orbital-retro.html';
fs.mkdirSync(output,{recursive:true});
const results=[];
const ready=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));});
const bounds=async page=>{
 const box=await page.locator('.orbit-tooltip:popover-open').boundingBox();
 const viewport=page.viewportSize();
 assert.ok(box&&box.x>=11.5&&box.y>=11.5&&box.x+box.width<=viewport.width-11.5&&box.y+box.height<=viewport.height-11.5,'Tooltip stays inside the viewport');
 return box;
};
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await ready(page);
  await page.evaluate(()=>{
   window.tipTiming={};
   document.addEventListener('pointerover',event=>{if(event.target.closest('.object-row.other'))window.tipTiming.entered=performance.now();},true);
   document.addEventListener('beforetoggle',event=>{if(event.newState==='open'&&event.target.matches('.orbit-tooltip'))window.tipTiming.opened=performance.now();},true);
  });
  const other=page.locator('.object-row.other'),image=other.locator('.miniature');
  await image.hover();await page.locator('.orbit-tooltip:popover-open').waitFor();
  const delay=await page.evaluate(()=>tipTiming.opened-tipTiming.entered);
  assert.ok(delay>=650,`Hover should wait about 700ms, observed ${delay}ms`);
  const tip=page.locator('.orbit-tooltip');
  assert.match(await tip.locator('.tip-altitude').innerText(),/841/);
  assert.match(await tip.innerText(),/Rocket bodies and unknown classifications/);
  assert.doesNotMatch(await tip.innerText(),/750/);
  assert.equal(await other.getAttribute('aria-describedby'),await tip.getAttribute('id'));
  const style=await tip.evaluate(element=>{const css=getComputedStyle(element);return{background:css.backgroundColor,font:css.fontFamily,padLeft:css.paddingLeft,padRight:css.paddingRight};});
  assert.equal(style.background,'rgb(229, 212, 172)');assert.match(style.font,/Michroma/);
  assert.equal(style.padLeft,'19px');assert.equal(style.padRight,'19px');
  const normal=await bounds(page);assert.ok(Math.abs(normal.width-251)<.01);
  const textSize=()=>tip.locator('.tip-altitude').evaluate(element=>{const range=document.createRange();range.selectNodeContents(element.firstChild);return{font:getComputedStyle(element).fontSize,width:range.getBoundingClientRect().width,height:range.getBoundingClientRect().height};});
  const normalText=await textSize();assert.equal(normalText.font,'26px');
  const textEdges=await tip.evaluate(element=>{
   const box=element.getBoundingClientRect(),walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   let node,right=box.left;
   while(node=walker.nextNode()){
    if(!node.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const line of range.getClientRects())right=Math.max(right,line.right);
   }
   return{left:parseFloat(getComputedStyle(element).paddingLeft)+1,right:box.right-right};
  });
  assert.ok(Math.abs(textEdges.left-textEdges.right)<2,'The longest text line has balanced space on both sides');
  await tip.screenshot({path:path.join(output,`${name}-card.png`)});
  const pointer=await image.boundingBox();
  await page.keyboard.press('Escape');assert.equal(await tip.count(),0);
  await page.mouse.move(pointer.x+pointer.width/2+1,pointer.y+pointer.height/2);
  await page.waitForTimeout(750);assert.equal(await tip.count(),0,'Escape dismisses until the pointer leaves the image');
  await page.mouse.move(0,0);await image.hover();await page.locator('.orbit-tooltip:popover-open').waitFor();
  await tip.hover();await page.waitForTimeout(200);
  assert.equal(await tip.count(),1,'The card remains open while its content is hovered');
  await page.keyboard.press('Escape');
  await image.scrollIntoViewIfNeeded();await other.focus();await page.locator('.orbit-tooltip:popover-open').waitFor();
  await page.locator('.poster-fit-toggle').click();
  assert.ok(Math.abs((await bounds(page)).width-normal.width)<.01,'Fitting the poster keeps the tooltip readable');
  const fittedText=await textSize();assert.equal(fittedText.font,normalText.font);
  assert.ok(Math.abs(fittedText.width-normalText.width)<.01&&Math.abs(fittedText.height-normalText.height)<.01,'Fitting keeps the actual text glyphs the same size');
  await page.screenshot({path:path.join(output,`${name}-fitted.png`)});
  await page.keyboard.press('Escape');await page.locator('.poster-fit-toggle').click();
  await image.scrollIntoViewIfNeeded();await other.focus();await page.keyboard.press('ArrowUp');
  const focused=await page.evaluate(()=>({key:document.activeElement.dataset.symbol,altitude:document.activeElement.dataset.altitude}));
  await page.locator('.orbit-tooltip:popover-open').waitFor();
  assert.equal(await tip.getAttribute('id'),`orbit-tip-${focused.key}`);
  assert.equal((await tip.locator('.tip-altitude').innerText()).replaceAll(',','').replace(/\s*km$/,'').trim(),focused.altitude);
  await page.keyboard.press('Escape');
  await page.mouse.move(0,0);await image.hover();await page.mouse.move(0,0);
  await page.waitForTimeout(750);assert.equal(await tip.count(),0,'Passing over an image cancels the pending tooltip');
  const categoryAccents={payload:'rgb(24, 51, 58)',debris:'rgb(133, 53, 31)',other:'rgb(83, 84, 73)'};
  for(const [category,expected] of Object.entries(categoryAccents)){
   await page.locator(`.object-row.${category} .miniature`).first().click();
   await page.locator('.orbit-tooltip:popover-open').waitFor();
   const accents=await tip.evaluate(element=>({
    border:getComputedStyle(element).borderTopColor,
    heading:getComputedStyle(element.querySelector('.tip-heading')).color,
    rule:getComputedStyle(element.querySelector('.tip-heading')).borderBottomColor,
    indicator:getComputedStyle(element.querySelector('.tip-indicator')).backgroundColor,
    altitude:getComputedStyle(element.querySelector('.tip-altitude')).color,
   }));
   for(const [part,color] of Object.entries(accents))assert.equal(color,expected,`${category} popup ${part} matches its category`);
   if(category!=='other')assert.equal(await page.locator(category==='debris'?'.headline .second':'.headline span:not(.second)').evaluate(element=>getComputedStyle(element).color),expected,'Popup and title use the same category ink');
   await tip.screenshot({path:path.join(output,`${name}-${category}-card.png`)});
   await page.keyboard.press('Escape');
  }
  const phone=await browser.newContext({viewport:{width:390,height:664},hasTouch:true});
  const mobile=await phone.newPage();mobile.on('pageerror',error=>errors.push(error.message));
  await mobile.goto(url);await ready(mobile);
  for(const width of [390,320]){
   await mobile.setViewportSize({width,height:664});
   await mobile.locator('.object-row.other .miniature').tap();
   await mobile.locator('.orbit-tooltip:popover-open').waitFor();await bounds(mobile);
   assert.match(await mobile.locator('.tip-altitude').innerText(),/841/);
   await mobile.screenshot({path:path.join(output,`${name}-phone-${width}.png`)});
   const selected=await mobile.locator('.readout').innerText();
   await mobile.locator('.below h2').tap();assert.equal(await mobile.locator('.orbit-tooltip').count(),0);
   assert.equal(await mobile.locator('.readout').innerText(),selected,'Dismissing details preserves the selected category');
  }
  assert.deepEqual(errors,[]);
  const result={name,hoverDelayMs:delay,creamCard:true,width:normal.width,equalPadding:true,categoryAccents,keyboard:true,touchWidths:[390,320],fitReadable:true,errors};
  results.push(result);console.log(JSON.stringify(result));await phone.close();await page.close();
 }finally{await browser.close();}
}
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(results,null,2)+'\n');

import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launch} from '../../../mcp/src/check/browser.js';

const {browser,error}=await launch();
assert(browser,error?.join('; '));
try{
  for(const width of [1280,1024,768,390,360,320]){
    const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'no-preference'});
    await page.goto(pathToFileURL(fileURLToPath(new URL('./acid-rain-glass.html',import.meta.url))).href);
    await page.locator('.pick').last().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.pick').nth(20).focus();
    await page.waitForFunction(()=>[...document.querySelectorAll('.value-text')].every(el=>Number(getComputedStyle(el).opacity)===1));
    const frames=await page.evaluate(async()=>{
      const frames=[];
      for(let i=0;i<40;i++){
        if(i<24&&i%4===0)document.querySelectorAll('.pick')[i%8===0?21:20].focus();
        await new Promise(resolve=>requestAnimationFrame(resolve));
        frames.push({year:document.querySelector('.poster').dataset.selectedYear,
          offsets:[...document.querySelectorAll('.value')].map(el=>parseFloat(el.style.getPropertyValue('--label-y'))),
          opacity:[...document.querySelectorAll('.value-text')].map(el=>Number(getComputedStyle(el).opacity))});
      }
      return frames;
    });
    for(const year of ['2020','2021'])for(let series=0;series<2;series++){
      const offsets=frames.filter(frame=>frame.year===year).map(frame=>frame.offsets[series]);
      assert(Math.max(...offsets)-Math.min(...offsets)<.1,`${width}px ${year}: no temporary vertical detour`);
    }
    assert(frames.every(frame=>frame.opacity.every(value=>value===1)),`${width}px: side changes never hide or delay the labels`);
    await page.waitForFunction(()=>[...document.querySelectorAll('.value-text')].every(el=>Number(getComputedStyle(el).opacity)===1));
    assert.equal(await page.locator('.readout .year').textContent(),'2020');
    console.log(`PASS ${width}px: rapid side changes stay visible without temporary vertical detours`);
    await page.close();
  }
}finally{await browser.close();}

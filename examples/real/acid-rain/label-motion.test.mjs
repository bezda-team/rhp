import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launch} from '../../../mcp/src/check/browser.js';

const {browser,error}=await launch();
assert(browser,error?.join('; '));
try{
  for(const width of [1280,1024,768,390,360,320]){
    const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'no-preference'});
    await page.goto(process.argv[2] || pathToFileURL(fileURLToPath(new URL('./acid-rain-glass-animated.html',import.meta.url))).href);
    await page.locator('.pick').last().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    // Wait for font-driven layout and pause the independent background renderer.
    // Software WebGL must not determine how many label-animation frames we sample.
    await page.locator('.pick').nth(20).focus();
    await page.waitForFunction(()=>[...document.querySelectorAll('.value')].every(el=>el.style.getPropertyValue('--label-y')));
    await page.evaluate(async()=>{for(let i=0;i<2;i++)await new Promise(resolve=>requestAnimationFrame(resolve));});
    await page.getByRole('button',{name:'Pause background rain'}).waitFor();
    if(width===1280||width===390){
      const firstFrame=await page.locator('.poster-rain').evaluate(el=>el.toDataURL());
      await page.waitForFunction(before=>document.querySelector('.poster-rain').toDataURL()!==before,firstFrame,{polling:100,timeout:5000});
    }
    await page.getByRole('button',{name:'Pause background rain'}).click();
    for(const [from,to] of [[20,21],[21,20]]){
      await page.locator('.pick').nth(from).focus();
      await page.waitForFunction(()=>[...document.querySelectorAll('.value-text')].every(el=>el.getAnimations().length===0));
      const translations=await page.evaluate(async to=>{
        const samples=[];document.querySelectorAll('.pick')[to].focus();
        for(let frame=0;frame<16;frame++){
          await new Promise(resolve=>requestAnimationFrame(resolve));
          samples.push([...document.querySelectorAll('.value-text')].map(el=>getComputedStyle(el).translate));
        }
        return samples;
      },to);
      for(let series=0;series<2;series++)assert(new Set(translations.map(sample=>sample[series])).size>2,`${width}px ${from} to ${to}: both labels slide`);
    }
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
    const readouts=[];
    for(let index=0;index<24;index++){
      await page.locator('.pick').nth(index).focus();
      readouts.push(await page.evaluate(()=>['.year','.sulfur','.sulfur strong','.metric:last-child'].map(selector=>{
        const el=document.querySelector(`.readout ${selector}`),box=el.getBoundingClientRect();
        if(el.scrollWidth>el.clientWidth+1)throw new Error(`Readout content overflows ${selector}`);
        return {left:box.left,width:box.width};
      })));
    }
    for(let item=0;item<4;item++){
      const boxes=readouts.map(readout=>readout[item]);
      assert(Math.max(...boxes.map(box=>box.left))-Math.min(...boxes.map(box=>box.left))<.1,`${width}px: readout position stays fixed`);
      assert(Math.max(...boxes.map(box=>box.width))-Math.min(...boxes.map(box=>box.width))<.1,`${width}px: readout width stays fixed`);
    }
    console.log(`PASS ${width}px: bidirectional slides, immediate labels, no vertical detours, and stable readouts for all 24 years`);
    await page.close();
  }
}finally{await browser.close();}

import assert from "node:assert/strict";
import {launch} from "../src/check/browser.js";
import {install} from "../src/check/inpage.js";
import {withPosterDownload} from "../../scripts/sync-poster-download.mjs";

const {browser,error}=await launch();
assert(browser,error?.join("; "));
try {
  const page=await browser.newPage({viewport:{width:1000,height:700}});
  await page.setContent(withPosterDownload(`<!doctype html><html><head><style>
    body {margin:20px;font:16px sans-serif;}
    .poster {box-sizing:border-box;width:600px;min-height:900px;margin:auto;padding:30px;}
    h1 {height:60px;margin:0;}
    .rhp-chart {width:500px;height:300px;}
  </style></head><body><section class="poster"><h1>View test</h1>
  <div class="rhp-chart"><div class="rhp-body">Data</div></div><button>Chart control</button></section>
  <button>Following control</button></body></html>`));
  await page.getByRole("button",{name:"Fit poster to screen",exact:true}).waitFor();
  await page.evaluate(install);
  const view=await page.evaluate(()=>window.__rhpProbe.targets().buttons.find(button=>button.view));
  assert(view?.view,"the shared view control identifies its controlled poster");
  const place=()=>page.evaluate(id=>window.__rhpProbe.place(id),view.view);
  const moved=()=>page.evaluate(target=>window.__rhpProbe.moved(target),view.target);
  await place();
  await page.locator(".poster-fit-toggle").click();
  await page.evaluate(()=>window.__rhpProbe.settle());
  assert.deepEqual(await moved(),[],"proportional scaling and normal flow changes are expected");
  await place();
  await page.locator(".poster-fit-toggle").click();
  await page.evaluate(()=>window.__rhpProbe.settle());
  assert.deepEqual(await moved(),[],"restoring the view keeps the original content layout");
  await place();
  await page.locator(".poster-fit-toggle").click();
  await page.evaluate(()=>document.querySelector("h1").style.height="100px");
  await page.evaluate(()=>window.__rhpProbe.settle());
  assert((await moved()).some(item=>item.what==="the chart"),"a real content shift during fitting must still fail");
  await page.evaluate(()=>window.__rhpProbe.place());
  await page.evaluate(()=>document.querySelector("h1").style.height="140px");
  assert((await moved()).some(item=>item.what==="the chart"),"ordinary interactions in a fitted view still detect layout jumps");
  console.log("PASS fit/restore preserve layout; real content jumps still fail in both coordinate modes");
} finally {await browser.close();}

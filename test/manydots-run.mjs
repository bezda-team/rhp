// Browser checks for the bulk HTML point collection, including server HTML before JavaScript runs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, webkit, firefox } from "playwright";
import { page as bundle, ssrServer, ssrClient, ssrPackage } from "../scripts/bundle.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const at = (file) => path.join(here, file);
const out = at("out/manydots");
fs.mkdirSync(out, { recursive: true });
// Exercise package exports rather than relying on source-only imports.
execFileSync("node", [path.join(here, "../scripts/build.mjs")], { stdio: "ignore" });
await bundle(at("manydots.jsx"), path.join(out, "manydots.js"));
await ssrServer(at("manydots-ssr-server.jsx"), path.join(out, "manydots-ssr-server.mjs"));
await ssrClient(at("manydots-ssr-client.jsx"), path.join(out, "manydots-ssr-client.js"));
await ssrPackage(at("manydots-ssr-server.jsx"), path.join(out, "manydots-dist-server.mjs"), "server");
await ssrPackage(at("manydots-ssr-client.jsx"), path.join(out, "manydots-dist-client.js"), "browser");
fs.writeFileSync(path.join(out, "manydots.html"), '<!doctype html><html><head><meta charset=utf-8></head><body><div id="root"></div><script src="manydots.js"></script></body></html>');
const SSR = await import(pathToFileURL(path.join(out, "manydots-ssr-server.mjs")).href + "?" + Date.now());
const styleTextCases = SSR.styleTextCases();
fs.writeFileSync(path.join(out, "manydots-ssr.html"), SSR.page());
fs.writeFileSync(path.join(out, "manydots-islands.html"), SSR.islandsPage());
fs.writeFileSync(path.join(out, "manydots-hydration-change.html"), SSR.hydrationChangePage());
fs.writeFileSync(path.join(out, "manydots-hydration-foreign.html"), SSR.hydrationForeignPage());
const DIST = await import(pathToFileURL(path.join(out, "manydots-dist-server.mjs")).href + "?" + Date.now());
fs.writeFileSync(path.join(out, "manydots-dist.html"), DIST.page("manydots-dist-client.js"));
fs.writeFileSync(path.join(out, "manydots-dist-islands.html"), DIST.islandsPage("manydots-dist-client.js"));
fs.writeFileSync(path.join(out, "manydots-dist-hydration-change.html"), DIST.hydrationChangePage("manydots-dist-client.js"));

const engine = process.env.BROWSER ?? "chromium";
assert.ok(["chromium", "webkit", "firefox"].includes(engine), "BROWSER must name a supported Playwright engine");
const browser = await { chromium, webkit, firefox }[engine].launch(engine === "chromium" ? { executablePath: process.env.CHROMIUM || undefined } : {});
let passed = 0;
let failed = 0;
const check = async (name, work) => {
  try {
    await work();
    passed++;
    console.log(`ok   ManyDots ${engine}: ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ManyDots ${engine}: ${name}: ${e.message}`);
  }
};
const open = async (file, suffix = "", options = {}) => {
  const p = await browser.newPage({ viewport: { width: 900, height: 900 }, ...options });
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  p.setDefaultTimeout(15000);
  await p.goto(pathToFileURL(path.join(out, file)).href + suffix);
  await p.waitForFunction(() => document.querySelector("#primary-points .rhp-manydot, #island-a .rhp-manydot, #hydration-change .rhp-manydot, #hydration-foreign-points .rhp-manydots-points"));
  return p;
};
const settle = (p) => p.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const geometry = async (p, id, pointSelector) => {
  const measured = await p.evaluate(({ id, pointSelector }) => {
    const box = document.querySelector(`#${id} .rhp-body`).getBoundingClientRect();
    return { width: box.width, height: box.height, points: [...document.querySelectorAll(`#${id} ${pointSelector}`)].map((el) => {
      const rect = el.getBoundingClientRect();
      return [(rect.left + rect.width / 2 - box.left) / box.width, (box.bottom - rect.top - rect.height / 2) / box.height, rect.width, rect.height];
    }) };
  }, { id, pointSelector });
  for (const point of measured.points) point.positionTolerance = [0.1 / measured.width, 0.1 / measured.height];
  return measured.points;
};
const plotSize = (p, id) => p.evaluate((id) => {
  const box = document.querySelector(`#${id} .rhp-body`).getBoundingClientRect();
  return [box.width, box.height];
}, id);
const near = (got, want, epsilon = 0.025) => {
  assert.equal(got.length, want.length);
  got.forEach((v, i) => {
    if (Array.isArray(v)) near(v, want[i], epsilon);
    else {
      const tolerance = i < 2 && got.positionTolerance ? got.positionTolerance[i] : epsilon;
      assert.ok(Math.abs(v - want[i]) <= tolerance, `${v} must be within ${tolerance} of ${want[i]}`);
    }
  });
};
const expectedCentering = async (p, font = 20) => {
  const [width, height] = await plotSize(p, "centering-cases");
  const rem = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  return [[.1, .1, 4, 4], [.2, .2, 9.5, 9.5], [.3, .3, width * .1, height * .1],
    [.4, .4, width * .05 + 4, height * .05 + 4], [.5, .5, font, font], [.6, .6, rem, rem],
    [.7, .7, 12, 12], [.8, .8, 12, 12], [.9, .9, 0, 0], [.9, .05, 0, 0], [.9, .15, 0, 0]];
};
const styleRuleCount = (p) => p.evaluate(() => {
  const count = (rules) => [...rules].reduce((n, rule) => n + (rule.selectorText ? 1 : 0) + (rule.cssRules ? count(rule.cssRules) : 0), 0);
  return [...new Set([...document.styleSheets, ...document.adoptedStyleSheets])].reduce((n, sheet) => n + count(sheet.cssRules), 0);
});
const appearance = (p, selector) => p.locator(selector).evaluateAll((points) => points.map((el) => {
  const s = getComputedStyle(el);
  return [s.backgroundColor, s.width, s.height, s.clipPath];
}));

try {
  const p = await open("manydots.html");
  await settle(p);
  await check("light DOM, host props, ref, and shared category styling", async () => {
    assert.deepEqual(await p.evaluate(() => {
      const host = document.getElementById("primary-points");
      const category = [...document.querySelectorAll("#categories .rhp-manydot")].map((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).borderRadius]);
      return [host === T.host, host.shadowRoot, host.classList.contains("host-utility"), host.title, host.dataset.native,
        host.getAttribute("aria-label"), getComputedStyle(host).getPropertyValue("--native-style").trim(), host.querySelectorAll(".rhp-manydot").length, category];
    }), [true, null, true, "bulk points", "kept", "Individual sample points", "kept", 3,
      [["rgb(190, 45, 90)", "20%"], ["rgb(20, 140, 70)", "50%"], ["rgb(190, 45, 90)", "20%"]]]);
  });
  await check("horizontal and vertical geometry agrees with Dot", async () => {
    near(await geometry(p, "primary", ".rhp-manydot"), await geometry(p, "reference", ".rhp-dot"));
    near(await geometry(p, "primary", ".rhp-manydot"), [[.2, .25, 6, 6], [.5, .5, 10, 10], [.8, .75, 14, 14]]);
    near(await geometry(p, "vertical", ".rhp-manydot"), await geometry(p, "vertical-reference", ".rhp-dot"));
    near(await geometry(p, "vertical", ".rhp-manydot"), [[.25, .2, 6, 6], [.5, .5, 10, 10], [.75, .8, 14, 14]]);
  });
  await check("different colors, sizes, and shape outlines remain available", async () => {
    const styles = await p.evaluate(() => [...document.querySelectorAll("#primary .rhp-manydot")].map((el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.width, s.height, s.clipPath];
    }));
    assert.deepEqual(styles.map((s) => s.slice(0, 3)), [["rgb(210, 30, 70)", "6px", "6px"], ["rgb(20, 150, 80)", "10px", "10px"], ["rgb(30, 90, 220)", "14px", "14px"]]);
    assert.ok(styles[0][3].startsWith("polygon("));
    assert.ok(styles[1][3].startsWith("polygon("));
    assert.equal(styles[2][3], "none");
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#categories .rhp-manydot")].map((el) => getComputedStyle(el).outlineColor)),
      ["rgb(10, 20, 30)", "rgb(20, 150, 80)", "rgb(30, 90, 220)"]);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#uniform .rhp-manydot")].map((el) => {
      const s = getComputedStyle(el);
      return [s.width, s.height, s.clipPath.startsWith("polygon("), s.opacity];
    })), [["4px", "4px", true, "0.6"], ["4px", "4px", true, "0.6"], ["4px", "4px", true, "0.6"]]);
  });
  await check("fresh points preserve literal classes and CSS property values without markup or declaration injection", async () => {
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#literal-styles .rhp-manydot")].map((el, i) => {
      const row = T.escapingRows()[i];
      return [el.className === "rhp-manydot " + row.cls, el.style.getPropertyValue("--quoted").trim() === row.style["--quoted"], el.hasAttribute("onclick"), el.hasAttribute("onerror")];
    })), [[true, true, false, false], [true, true, false, false]]);
    assert.equal(await p.locator("#literal-styles-points img, #literal-styles-points script").count(), 0);
    assert.deepEqual(await p.locator("#invalid-declarations .rhp-manydot").evaluate((el) => {
      const s = getComputedStyle(el);
      return [el.style.getPropertyValue("opacity"), el.style.getPropertyValue("outline"), s.opacity, s.color];
    }), ["", "", "1", "rgb(1, 2, 3)"]);
    assert.equal(await p.locator("#commented-styles .rhp-manydot").evaluate((el) => getComputedStyle(el).opacity), "0.5");
    await p.locator("#literal-styles .rhp-manydot").first().click();
    assert.equal(await p.evaluate(() => window.ManyDotsInjected), undefined);
    await p.evaluate(() => { T.events = []; });
  });
  await check("concrete appearance rules belong to each collection and their variable fallback remains correct", async () => {
    assert.deepEqual(await p.evaluate(() => {
      const scopeRule = (rules) => [...rules].some((rule) => rule.constructor.name === "CSSScopeRule" || rule.cssRules && scopeRule(rule.cssRules));
      return ["scope-a-points", "scope-b-points"].map((id) => {
        const host = document.getElementById(id), st = host.querySelector(":scope > style[data-rhp-manydots]");
        return [st?.parentElement === host, scopeRule(st.sheet.cssRules)];
      });
    }), [[true, true], [true, true]]);
    assert.equal(await p.evaluate(() => {
      const declarations = (rules) => [...rules].flatMap((rule) => rule.style ? [rule.style] : rule.cssRules ? declarations(rule.cssRules) : []);
      const st = document.querySelector("#scope-a-points > style[data-rhp-manydots]");
      return declarations(st.sheet.cssRules).some((style) => style.getPropertyValue("width") === "6px"
        && style.getPropertyValue("height") === "6px" && style.getPropertyValue("background-color")
        && !style.cssText.includes("var("));
    }), true);
    const before = await appearance(p, "#scope-a-points .rhp-manydot");
    await p.evaluate(() => { document.querySelector("#scope-a-points > style[data-rhp-manydots]").sheet.disabled = true; });
    try {
      await settle(p);
      assert.deepEqual(await appearance(p, "#scope-a-points .rhp-manydot"), before);
      near(await geometry(p, "scopes", "#scope-a-points .rhp-manydot"), [[.2, .25, 6, 6], [.3, .5, 6, 6]]);
    } finally {
      await p.evaluate(() => { document.querySelector("#scope-a-points > style[data-rhp-manydots]").sheet.disabled = false; });
      await settle(p);
    }
  });
  await check("SSR scoped CSS preserves ampersands and cannot end its style element", async () => {
    assert.deepEqual(await p.evaluate((cases) => cases.map((html, i) => {
      const doc = new DOMParser().parseFromString(html, "text/html"), st = doc.querySelector("style[data-rhp-manydots]");
      return [doc.querySelectorAll("img").length, doc.querySelectorAll(".rhp-manydot").length,
        i === 0 ? st.textContent.includes("#clip&foo") && !st.textContent.includes("#clip&amp;foo") : st.parentElement.classList.contains("rhp-manydots")];
    }), styleTextCases), [[0, 1, true], [0, 1, true]]);
  });
  await check("owned collection styles preserve existing slat layer precedence", async () => {
    assert.equal(await p.locator("#mixed-primitives .scope-regression-text").evaluate((el) => getComputedStyle(el).color), "rgb(200, 30, 50)");
  });
  await check("shared appearance updates and removals retain leaves without bleeding into another collection", async () => {
    const first = await appearance(p, "#scope-a-points .rhp-manydot");
    const other = await appearance(p, "#scope-b-points .rhp-manydot");
    const rules = await styleRuleCount(p);
    assert.deepEqual(first.map((s) => s.slice(0, 3)), [["rgb(180, 20, 40)", "6px", "6px"], ["rgb(20, 140, 70)", "6px", "6px"]]);
    assert.ok(first.every((s) => s[3].startsWith("polygon(")));
    await p.evaluate(() => {
      window.scopePoints = [...document.querySelectorAll("#scope-a-points .rhp-manydot")];
      T.setScopeColor("rgb(60, 80, 100)"); T.setScopeSize(12); T.setScopeShape(T.diamond);
    });
    await settle(p);
    const changed = await appearance(p, "#scope-a-points .rhp-manydot");
    assert.deepEqual(changed.map((s) => s.slice(0, 3)), [["rgb(60, 80, 100)", "12px", "12px"], ["rgb(20, 140, 70)", "12px", "12px"]]);
    assert.notEqual(changed[0][3], first[0][3]);
    assert.deepEqual(await appearance(p, "#scope-b-points .rhp-manydot"), other);
    assert.equal(await styleRuleCount(p), rules);
    await p.evaluate(() => { T.setScopeColor(undefined); T.setScopeSize(undefined); T.setScopeShape(undefined); });
    await settle(p);
    assert.deepEqual(await appearance(p, "#scope-a-points .rhp-manydot"),
      [["rgb(110, 65, 210)", "4px", "4px", "none"], ["rgb(20, 140, 70)", "4px", "4px", "none"]]);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#scope-a-points .rhp-manydot")].every((el, i) => el === scopePoints[i])), true);
    assert.deepEqual(await appearance(p, "#scope-b-points .rhp-manydot"), other);
  });
  await check("category classes and inline styles or accessors override ordinary collection defaults", async () => {
    await p.evaluate(() => {
      T.setScopeColor("rgb(180, 20, 40)"); T.setScopeSize(6); T.setScopeShape(T.triangle);
      T.setScopePointStyle({ "background-color": "rgb(10, 11, 12)", width: "12px", height: "4px", "clip-path": "none" });
    });
    await settle(p);
    assert.deepEqual((await appearance(p, "#scope-a-points .rhp-manydot"))[0], ["rgb(10, 11, 12)", "12px", "4px", "none"]);
    near(await geometry(p, "scopes", "#scope-a-points .rhp-manydot"), [[.2, .25, 12, 4], [.3, .5, 6, 6]]);
    await p.evaluate(() => {
      T.setScopeColor(() => (d) => d.id === "a1" ? "rgb(30, 40, 50)" : "rgb(60, 70, 80)");
      T.setScopeSize(() => (d) => d.id === "a1" ? 7 : 11);
      T.setScopeShape(() => (d) => d.id === "a1" ? T.diamond : T.triangle);
    });
    await settle(p);
    const accessor = await appearance(p, "#scope-a-points .rhp-manydot");
    assert.deepEqual(accessor.map((s) => s.slice(0, 3)), [["rgb(30, 40, 50)", "7px", "7px"], ["rgb(60, 70, 80)", "11px", "11px"]]);
    assert.ok(accessor.every((s) => s[3].startsWith("polygon(")));
    await p.evaluate(() => { T.setScopePointStyle({}); T.setScopeColor(undefined); T.setScopeSize(undefined); T.setScopeShape(undefined); });
    await settle(p);
    assert.deepEqual(await appearance(p, "#scope-a-points .rhp-manydot"),
      [["rgb(110, 65, 210)", "4px", "4px", "none"], ["rgb(20, 140, 70)", "4px", "4px", "none"]]);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#scope-a-points .rhp-manydot")].every((el, i) => el === scopePoints[i])), true);
  });
  await check("changed CSS shorthands preserve explicit accessor colors and protected point offsets", async () => {
    await p.evaluate(() => {
      T.setScopeColor(() => () => "rgb(25, 130, 70)"); T.setScopeSize(() => () => 12);
      T.setScopePointStyle({ background: "rgb(20, 30, 40)", margin: "10px" });
    });
    await settle(p);
    assert.equal((await appearance(p, "#scope-a-points .rhp-manydot"))[0][0], "rgb(25, 130, 70)");
    await p.evaluate(() => T.setScopePointStyle({ background: "rgb(70, 80, 90)", margin: "40px" }));
    await settle(p);
    assert.equal((await appearance(p, "#scope-a-points .rhp-manydot"))[0][0], "rgb(25, 130, 70)");
    near(await geometry(p, "scopes", "#scope-a-points .rhp-manydot"), [[.2, .25, 12, 12], [.3, .5, 12, 12]]);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#scope-a-points .rhp-manydot")].every((el, i) => el === scopePoints[i])), true);
    await p.evaluate(() => T.setScopePointStyle({}));
    await settle(p);
    assert.equal((await appearance(p, "#scope-a-points .rhp-manydot"))[0][0], "rgb(25, 130, 70)");
    near(await geometry(p, "scopes", "#scope-a-points .rhp-manydot"), [[.2, .25, 12, 12], [.3, .5, 12, 12]]);
    await p.evaluate(() => { T.setScopePointStyle({}); T.setScopeColor(undefined); T.setScopeSize(undefined); });
    await settle(p);
  });
  await check("appearance declaration order is honored while resolved coordinates and accessor colors stay authoritative", async () => {
    await p.evaluate(() => {
      T.setScopeColor(() => () => "rgb(25, 130, 70)"); T.setScopeSize(() => () => 12);
      T.setScopePointStyle({ backgroundColor: "rgb(200, 0, 0)", background: "rgb(20, 30, 40)", left: "1px", bottom: "2px", inset: "50px", margin: "10px" });
    });
    await settle(p);
    assert.equal((await appearance(p, "#scope-a-points .rhp-manydot"))[0][0], "rgb(25, 130, 70)");
    near(await geometry(p, "scopes", "#scope-a-points .rhp-manydot"), [[.2, .25, 12, 12], [.3, .5, 12, 12]]);
    await p.evaluate(() => {
      T.setScopeColor(undefined); T.setScopeSize(undefined);
      T.setScopePointStyle({ background: "rgb(20, 30, 40)", "background-color": "rgb(60, 70, 80)" });
    });
    await settle(p);
    assert.equal((await appearance(p, "#scope-a-points .rhp-manydot"))[0][0], "rgb(60, 70, 80)");
    await p.evaluate(() => T.setScopePointStyle({ "background-color": "rgb(60, 70, 80)", background: "rgb(20, 30, 40)" }));
    await settle(p);
    assert.equal((await appearance(p, "#scope-a-points .rhp-manydot"))[0][0], "rgb(20, 30, 40)");
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#scope-a-points .rhp-manydot")].every((el, i) => el === scopePoints[i])), true);
    await p.evaluate(() => T.setScopePointStyle({}));
    await settle(p);
  });
  await check("vendor-prefixed point styles match the browser's native CSS property behavior", async () => {
    const native = await p.evaluate(() => {
      const probe = document.createElement("div"); probe.style.setProperty("-webkit-text-fill-color", "rgb(7, 8, 9)");
      document.body.append(probe); const value = getComputedStyle(probe).getPropertyValue("-webkit-text-fill-color");
      probe.remove(); T.setScopePointStyle({ "-webkit-text-fill-color": "rgb(7, 8, 9)" }); return value;
    });
    await settle(p);
    assert.equal(await p.locator("#scope-a-points .rhp-manydot").first().evaluate((el) => getComputedStyle(el).getPropertyValue("-webkit-text-fill-color")), native);
    await p.evaluate(() => T.setScopePointStyle({}));
    await settle(p);
  });
  await check("collection stylesheet rules are replaced and cleaned up on unmount", async () => {
    const before = await styleRuleCount(p);
    await p.evaluate(() => T.setMountedScope(true));
    await settle(p);
    assert.ok(await styleRuleCount(p) > before);
    assert.deepEqual((await appearance(p, "#scope-lifecycle .rhp-manydot"))[0].slice(0, 3), ["rgb(170, 85, 0)", "8px", "8px"]);
    await p.evaluate(() => { window.lifecyclePoint = document.querySelector("#scope-lifecycle .rhp-manydot"); T.setMountedScope(false); });
    await settle(p);
    assert.equal(await p.evaluate(() => lifecyclePoint.isConnected), false);
    assert.equal(await styleRuleCount(p), before);
    await p.evaluate(() => T.setMountedScope(true));
    await settle(p);
    assert.deepEqual((await appearance(p, "#scope-lifecycle .rhp-manydot"))[0].slice(0, 3), ["rgb(170, 85, 0)", "8px", "8px"]);
    await p.evaluate(() => T.setMountedScope(false));
    await settle(p);
    assert.equal(await styleRuleCount(p), before);
  });
  await check("default opaque points stay centered without per-point translation", async () => {
    near(await geometry(p, "centering-default", ".rhp-manydot"), [[.1, .1, 4, 4], [.5, .5, 4, 4], [.9, .9, 4, 4]]);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#centering-default .rhp-manydot")].map((el) => {
      const s = getComputedStyle(el);
      return [s.getPropertyValue("translate"), s.transform, s.opacity];
    })), [["none", "none", "1"], ["none", "none", "1"], ["none", "none", "1"]]);
  });
  await check("numeric, CSS, percentage, calc, and fallback sizes use both plot dimensions correctly", async () => {
    near(await geometry(p, "centering-cases", ".rhp-manydot"), await expectedCentering(p));
    assert.deepEqual(await p.evaluate(() => ["numeric", "pixels"].map((name) =>
      getComputedStyle(document.querySelector(`#centering-cases .center-${name}`)).getPropertyValue("translate"))), ["none", "none"]);
  });
  await check("unequal per-point width and height overrides keep each point center", async () => {
    const [width, height] = await plotSize(p, "centering-unequal");
    near(await geometry(p, "centering-unequal", ".rhp-manydot"), [[.2, .2, 12, 6], [.5, .5, 6, 18], [.8, .8, width * .1, height * .1 + 4]]);
  });
  await check("font-relative sizes react to element and root font changes without shifting centers", async () => {
    const rootFont = await p.evaluate(() => document.documentElement.style.getPropertyValue("font-size"));
    try {
      await p.evaluate(() => { T.setRelativeFont(32); document.documentElement.style.setProperty("font-size", "24px"); });
      await settle(p);
      near(await geometry(p, "centering-cases", ".rhp-manydot"), await expectedCentering(p, 32));
    } finally {
      await p.evaluate((value) => { T.setRelativeFont(20); document.documentElement.style.setProperty("font-size", value); }, rootFont);
      await settle(p);
    }
  });
  await check("percentage and calc sizes remain centered after viewport resizing without replacing points", async () => {
    await p.evaluate(() => { window.resizedCentering = [...document.querySelectorAll("#centering-cases .rhp-manydot")]; });
    await p.setViewportSize({ width: 450, height: 900 });
    await settle(p);
    near(await geometry(p, "centering-cases", ".rhp-manydot"), await expectedCentering(p));
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#centering-cases .rhp-manydot")].every((el, i) => el === resizedCentering[i])), true);
    await p.setViewportSize({ width: 900, height: 900 });
    await settle(p);
  });
  await check("application transforms preserve both centered and custom transform origins", async () => {
    near(await geometry(p, "utilities", ".rhp-manydot"), [[.5, .5, 10, 10]]);
    const [width, height] = await plotSize(p, "centering-origin");
    near(await geometry(p, "centering-origin", ".rhp-manydot"), [[.5 + 4 / width, .5 - 4 / height, 16, 16]]);
    assert.deepEqual(await p.evaluate(() => [getComputedStyle(document.querySelector("#utilities .rhp-manydot")).transformOrigin,
      getComputedStyle(document.querySelector("#centering-origin .rhp-manydot")).transformOrigin]), ["4px 4px", "0px 0px"]);
  });
  await check("changing size modes preserves keyed nodes and native point clicks", async () => {
    await p.evaluate(() => {
      window.centeredPixel = document.querySelector("#centering-cases .center-pixels");
      const rows = T.initialCenteringRows();
      T.setCenteringRows([{ ...rows[1], size: "20%" }, rows[0], ...rows.slice(2)]);
    });
    await settle(p);
    const [width, height] = await plotSize(p, "centering-cases");
    near(await geometry(p, "centering-cases", ".center-pixels"), [[.2, .2, width * .2, height * .2]]);
    assert.equal(await p.evaluate(() => document.querySelector("#centering-cases .center-pixels") === centeredPixel), true);
    await p.locator("#centering-cases .center-pixels").click();
    assert.deepEqual(await p.evaluate(() => T.events.at(-1)), { target: true, index: "0", host: "centering-points" });
    await p.evaluate(() => { T.setCenteringRows(T.initialCenteringRows()); T.events = []; });
    await settle(p);
    near(await geometry(p, "centering-cases", ".rhp-manydot"), await expectedCentering(p));
    assert.equal(await p.evaluate(() => document.querySelector("#centering-cases .center-pixels") === centeredPixel), true);
  });
  await check("reserved margin and translate styles cannot override point centering", async () => {
    near(await geometry(p, "centering-protected", ".rhp-manydot"), [[.5, .5, 12, 6]]);
    assert.equal(await p.locator("#centering-protected .rhp-manydot").evaluate((el) => getComputedStyle(el).getPropertyValue("translate")), "none");
  });
  await check("shared size transitions clear old centering overrides while retaining every node", async () => {
    await p.evaluate(() => { window.sharedPoints = [...document.querySelectorAll("#centering-shared .rhp-manydot")]; });
    const [width, height] = await plotSize(p, "centering-shared");
    for (const [size, w, h] of [[4, 4, 4], [8, 8, 8], ["10%", width * .1, height * .1], ["var(--shared-size)", 12, 12], [4, 4, 4]]) {
      await p.evaluate((size) => T.setSharedSize(size), size);
      await settle(p);
      near(await geometry(p, "centering-shared", ".rhp-manydot"), [[.2, .2, w, h], [.5, .5, w, h], [.8, .8, w, h]]);
      assert.equal(await p.evaluate(() => [...document.querySelectorAll("#centering-shared .rhp-manydot")].every((el, i) => el === sharedPoints[i])), true);
    }
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#centering-shared .rhp-manydot")].map((el) =>
      [el.style.getPropertyValue("translate"), el.style.getPropertyPriority("translate"), getComputedStyle(el).getPropertyValue("translate")])),
    [["", "", "none"], ["", "", "none"], ["", "", "none"]]);
  });
  await check("variable-sized fallback points preserve native Dot centering when CSS variables change outside Solid", async () => {
    await p.evaluate(() => {
      document.querySelector("#centering-cases .center-variable").style.setProperty("--marker-size", "24px");
      T.setSharedSize("var(--shared-size)");
    });
    await settle(p);
    near(await geometry(p, "centering-cases", ".center-variable"), [[.7, .7, 24, 24]]);
    await p.evaluate(() => {
      document.getElementById("centering-shared-points").style.setProperty("--shared-size", "20px");
      document.querySelector(".centering-shared-reference-points").style.setProperty("--shared-size", "20px");
    });
    await settle(p);
    near(await geometry(p, "centering-shared", ".rhp-manydot"), [[.2, .2, 20, 20], [.5, .5, 20, 20], [.8, .8, 20, 20]]);
    await p.evaluate(() => {
      document.getElementById("centering-shared-points").style.setProperty("--shared-size", "10%");
      document.querySelector(".centering-shared-reference-points").style.setProperty("--shared-size", "10%");
    });
    await settle(p);
    const [width, height] = await plotSize(p, "centering-shared");
    const actual = await geometry(p, "centering-shared", ".rhp-manydot");
    near(actual, await geometry(p, "centering-shared-reference", ".rhp-dot"));
    const expected = [[.2, .2, width * .1, height * .1], [.5, .5, width * .1, height * .1], [.8, .8, width * .1, height * .1]];
    if (engine === "webkit") {
      // Native WebKit percentage transforms snap this fractional width, producing the same 0.215625px shift in Dot.
      // Require strict parity with that native baseline above, and separately bound this retained behavior to half a pixel.
      for (let i = 0; i < actual.length; i++) {
        assert.ok(Math.abs((actual[i][0] - expected[i][0]) * width) <= .5);
        assert.ok(Math.abs((actual[i][1] - expected[i][1]) * height) <= .5);
        near(actual[i].slice(2), expected[i].slice(2));
      }
    } else near(actual, expected);
    await p.evaluate(() => {
      document.querySelector("#centering-cases .center-variable").style.setProperty("--marker-size", "12px");
      document.getElementById("centering-shared-points").style.setProperty("--shared-size", "12px");
      document.querySelector(".centering-shared-reference-points").style.setProperty("--shared-size", "12px");
      T.setSharedSize(4);
    });
    await settle(p);
  });
  await check("native string styles preserve priorities without overriding collection defaults", async () => {
    assert.deepEqual(await p.evaluate(() => {
      const host = document.getElementById("string-style-points"), s = getComputedStyle(host);
      return [s.opacity, s.getPropertyValue("--custom-host").trim(), s.getPropertyValue("--rhp-manydot-size").trim(),
        host.style.getPropertyPriority("--rhp-manydot-size"), s.outlineWidth, s.outlineColor,
        getComputedStyle(host.querySelector(".rhp-manydot")).width];
    }), ["0.8", "value", "12px", "important", "2px", "rgb(255, 0, 0)", "6px"]);
    await p.evaluate(() => T.setStringStyle("opacity:.55;--rhp-manydot-size:30px!important;--custom-host:changed"));
    await settle(p);
    assert.deepEqual(await p.evaluate(() => {
      const host = document.getElementById("string-style-points"), s = getComputedStyle(host);
      return [s.opacity, s.getPropertyValue("--custom-host").trim(), host.style.getPropertyPriority("--rhp-manydot-size"), getComputedStyle(host.querySelector(".rhp-manydot")).width];
    }), ["0.55", "changed", "important", "6px"]);
    await p.evaluate(() => T.setStringStyle({ opacity: "0.6", "--custom-host": "object" }));
    await settle(p);
    assert.deepEqual(await p.evaluate(() => {
      const host = document.getElementById("string-style-points");
      return [getComputedStyle(host).opacity, host.style.getPropertyValue("--rhp-manydot-size"), getComputedStyle(host.querySelector(".rhp-manydot")).width];
    }), ["0.6", "", "6px"]);
  });
  await check("very wide finite domains place endpoints and midpoints stably, including reversed domains", async () => {
    near(await geometry(p, "wide", ".rhp-manydot"), [[0, 0, 4, 4], [.5, .5, 4, 4], [1, 1, 4, 4]]);
    await p.evaluate(() => { T.setWideScale([1e308, -1e308]); T.setWideCross([1e308, -1e308]); });
    await settle(p);
    near(await geometry(p, "wide", ".rhp-manydot"), [[1, 1, 4, 4], [.5, .5, 4, 4], [0, 0, 4, 4]]);
  });
  await check("application opacity, filter, and transform utilities apply", async () => {
    assert.deepEqual(await p.evaluate(() => {
      const s = getComputedStyle(document.querySelector("#utilities .rhp-manydot"));
      return [s.opacity, s.filter, s.transform];
    }), ["0.45", "brightness(0.8)", "matrix(1.25, 0, 0, 1.25, 0, 0)"]);
  });
  await p.emulateMedia({ forcedColors: "active" });
  if (await p.evaluate(() => matchMedia("(forced-colors: active)").matches)) {
    await check("forced colors preserve fills and add visible system-color outlines", async () => {
      assert.deepEqual(await p.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "CanvasText";
        document.body.append(probe);
        const systemColor = getComputedStyle(probe).color;
        probe.remove();
        return [...document.querySelectorAll("#primary .rhp-manydot")].map((el) => {
          const s = getComputedStyle(el);
          // WebKit can emulate the media query while lacking the forced-color-adjust property itself.
          const adjusted = !CSS.supports("forced-color-adjust", "none") || s.getPropertyValue("forced-color-adjust") === "none";
          return [adjusted, s.backgroundColor, s.outlineStyle, s.outlineWidth, s.outlineColor === systemColor, s.outlineOffset];
        });
      }), [[true, "rgb(210, 30, 70)", "solid", "1px", true, "-1px"],
        [true, "rgb(20, 150, 80)", "solid", "1px", true, "-1px"], [true, "rgb(30, 90, 220)", "solid", "1px", true, "-1px"]]);
    });
  } else {
    console.log(`skip ManyDots ${engine}: forced colors (the engine does not activate the media feature)`);
  }
  await p.emulateMedia({ forcedColors: "none" });
  await check("document queries and page-level delegated clicks reach the original point", async () => {
    await p.locator("#primary .point-b").click();
    assert.deepEqual(await p.evaluate(() => [T.events, T.hostClicked]), [[{ target: true, index: "1", host: "primary-points" }], "primary-points"]);
  });
  await check("one coordinate change mutates only that point", async () => {
    await p.evaluate(() => {
      const host = document.getElementById("primary-points");
      window.beforePoints = [...host.querySelectorAll(".rhp-manydot")];
      window.mutations = [];
      window.observer = new MutationObserver((records) => window.mutations.push(...records.map((r) => [r.type, r.target.className, r.attributeName])));
      observer.observe(host, { attributes: true, subtree: true, childList: true });
      T.setRows(T.initialRows().map((d) => d.id === "b" ? { ...d, x: 7 } : d));
    });
    await settle(p);
    const changes = await p.evaluate(() => {
      observer.disconnect();
      return [[...document.getElementById("primary-points").querySelectorAll(".rhp-manydot")].every((el, i) => el === beforePoints[i]), mutations];
    });
    assert.equal(changes[0], true);
    assert.ok(changes[1].length > 0);
    assert.ok(changes[1].every(([type, target]) => type === "attributes" && target.includes("point-b")), JSON.stringify(changes[1]));
    near(await geometry(p, "primary", ".rhp-manydot"), [[.2, .25, 6, 6], [.7, .5, 10, 10], [.8, .75, 14, 14]]);
  });
  await check("ordinary updates retain imperative point attributes, styles, and native listeners", async () => {
    await p.evaluate(() => {
      const point = document.querySelector("#primary .point-b");
      window.appPoint = point; window.appClicks = 0;
      point.dataset.app = "kept"; point.style.setProperty("filter", "brightness(.7)");
      point.addEventListener("click", () => window.appClicks++);
      T.setRows(T.initialRows().map((d) => d.id === "b" ? { ...d, x: 6 } : d));
    });
    await settle(p);
    near(await geometry(p, "primary", ".point-b"), [[.6, .5, 10, 10]]);
    assert.deepEqual(await p.evaluate(() => {
      const point = document.querySelector("#primary .point-b");
      return [point === appPoint, point.dataset.app, getComputedStyle(point).filter];
    }), [true, "kept", "brightness(0.7)"]);
    await p.locator("#primary .point-b").click();
    assert.equal(await p.evaluate(() => appClicks), 1);
  });
  await check("keyed removal, append, and reorder preserve point identities and source indexes", async () => {
    await p.evaluate(() => {
      window.kept = Object.fromEntries([...document.querySelectorAll("#primary .rhp-manydot")].map((el) => [el.className.match(/point-([abc])/)[1], el]));
      const [a, , c] = T.initialRows();
      T.setRows([c, a, { id: "d", x: 4, y: 12, size: "8px", color: "purple", category: "b" }]);
    });
    await settle(p);
    assert.deepEqual(await p.evaluate(() => {
      const points = [...document.querySelectorAll("#primary .rhp-manydot")];
      return [points.map((el) => [el.className.match(/point-([acd])/)[1], el.dataset.rhpIndex]), points[0] === kept.c, points[1] === kept.a, kept.b.isConnected];
    }), [[["c", "0"], ["a", "1"], ["d", "2"]], true, true, false]);
  });
  await check("domain, cross domain, and orientation update concrete positions", async () => {
    await p.evaluate(() => { T.reset(); T.setScale([0, 20]); T.setCross([0, 40]); });
    await settle(p);
    near(await geometry(p, "primary", ".rhp-manydot"), [[.1, .125, 6, 6], [.25, .25, 10, 10], [.4, .375, 14, 14]]);
    await p.evaluate(() => T.setOrientation("vertical"));
    await settle(p);
    near(await geometry(p, "primary", ".rhp-manydot"), [[.125, .1, 6, 6], [.25, .25, 10, 10], [.375, .4, 14, 14]]);
    near(await geometry(p, "primary", ".rhp-manydot"), await geometry(p, "reference", ".rhp-dot"));
    await p.evaluate(() => T.reset());
    await settle(p);
  });
  await check("theme tokens react and class/style overrides update in place", async () => {
    await p.evaluate(() => {
      window.themedPoint = document.querySelector("#primary .point-b");
      T.setThemeColor(true); T.setSeries("rgb(4, 120, 160)"); T.setSelected("b");
      T.setPointStyle({ opacity: "0.35", "border-radius": "10%" }); T.setHostClass("changed-host"); T.setTitle("updated title");
    });
    await settle(p);
    assert.deepEqual(await p.evaluate(() => {
      const el = document.querySelector("#primary .point-b");
      const host = document.getElementById("primary-points"), s = getComputedStyle(el);
      return [el === themedPoint, s.backgroundColor, s.opacity, s.borderRadius, el.classList.contains("selected"), host.classList.contains("host-selected"), host.classList.contains("changed-host"), host.title,
        getComputedStyle(document.querySelector("#uniform .rhp-manydot")).backgroundColor];
    }), [true, "rgb(4, 120, 160)", "0.35", "10%", true, true, true, "updated title", "rgb(4, 120, 160)"]);
    await p.evaluate(() => { T.setClasses(false); T.setSelected(""); T.setPointStyle({}); });
    await settle(p);
    assert.deepEqual(await p.evaluate(() => {
      const el = document.querySelector("#primary .point-b");
      return [el.classList.contains("custom-point"), el.classList.contains("selected"), getComputedStyle(el).opacity, getComputedStyle(el).borderRadius];
    }), [false, false, "1", "50%"]);
  });
  await check("nonfinite coordinates are omitted and their source index is retained", async () => {
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#invalid .rhp-manydot")].map((el) => el.dataset.rhpIndex)), ["3"]);
    await p.evaluate(() => T.setInvalidRows([{ x: 3, y: 4 }, { x: 8, y: NaN }, { x: 7, y: 6 }]));
    await settle(p);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#invalid .rhp-manydot")].map((el) => el.dataset.rhpIndex)), ["0", "2"]);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#invalid .rhp-manydot")].every((el) => !/NaN|Infinity/.test(el.getAttribute("style")))), true);
  });
  await check("an initially empty collection populates, clears, and repopulates correctly", async () => {
    assert.equal(await p.locator("#empty .rhp-manydot").count(), 0);
    await p.evaluate(() => T.setEmpty([{ x: 2, y: 4 }, { x: 3, y: 8 }]));
    await settle(p);
    assert.equal(await p.locator("#empty .rhp-manydot").count(), 2);
    await p.evaluate(() => T.setEmpty([]));
    await settle(p);
    assert.equal(await p.locator("#empty .rhp-manydot").count(), 0);
    await p.evaluate(() => T.setEmpty([{ x: 8, y: 15 }]));
    await settle(p);
    near(await geometry(p, "empty", ".rhp-manydot"), [[.8, .75, 4, 4]]);
    await p.evaluate(() => T.setEmpty([]));
    await settle(p);
    assert.equal(await p.locator("#empty .rhp-manydot").count(), 0);
  });
  await check("responsive width changes preserve coordinates without rebuilding leaves", async () => {
    await p.evaluate(() => { T.reset(); window.responsivePoints = [...document.querySelectorAll("#primary .rhp-manydot")]; });
    await settle(p);
    const before = await geometry(p, "primary", ".rhp-manydot");
    await p.setViewportSize({ width: 450, height: 900 });
    await settle(p);
    near(await geometry(p, "primary", ".rhp-manydot"), before);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#primary .rhp-manydot")].every((el, i) => el === responsivePoints[i])), true);
    await p.setViewportSize({ width: 900, height: 900 });
    await settle(p);
  });
  for (const [name, declarations] of [
    ["margin", "margin: 12px"], ["padding", "padding: 16px"], ["border", "border: 3px solid red"],
    ["minimum dimensions", "min-width: 30px; min-height: 25px"], ["maximum dimensions", "max-width: 2px; max-height: 2px"],
    ["width and height", "width: 400px; height: 300px"],
  ]) {
    await check(`page-wide div ${name} does not distort point geometry`, async () => {
      const baseline = await geometry(p, "primary", ".rhp-manydot");
      // Chart roots belong to the page. Probe boxes inside charts without intentionally resizing their outer roots.
      const style = await p.addStyleTag({ content: `* { box-sizing: border-box; } div:not(.rhp-chart) { ${declarations} }` });
      try {
        await settle(p);
        const actual = await geometry(p, "primary", ".rhp-manydot");
        try { near(actual, baseline); }
        catch (e) { throw new Error(`${e.message}; actual ${JSON.stringify(actual)}, baseline ${JSON.stringify(baseline)}`); }
      } finally {
        await style.evaluate((el) => el.remove());
        await settle(p);
      }
    });
  }
  await check("browser rendering has no uncaught errors", async () => assert.deepEqual(p.errors, []));
  await p.close();

  const noScript = await open("manydots-ssr.html", "", { javaScriptEnabled: false });
  const serverImage = await noScript.screenshot({ fullPage: true });
  await check("server HTML renders colors, shapes, coordinates, and light DOM without JavaScript", async () => {
    near(await geometry(noScript, "primary", ".rhp-manydot"), [[.2, .25, 6, 6], [.5, .5, 10, 10], [.8, .75, 14, 14]]);
    assert.equal(await noScript.locator("#primary .rhp-manydot").count(), 3);
    assert.equal(await noScript.locator("#primary-points").getAttribute("title"), "bulk points");
    assert.equal(await noScript.evaluate(() => document.querySelector("#primary-points").shadowRoot === null), true);
    near(await geometry(noScript, "wide", ".rhp-manydot"), [[0, 0, 4, 4], [.5, .5, 4, 4], [1, 1, 4, 4]]);
    assert.deepEqual(await noScript.evaluate(() => {
      const host = document.getElementById("string-style-points");
      return [host.style.getPropertyValue("--rhp-manydot-size"), host.style.getPropertyPriority("--rhp-manydot-size"), getComputedStyle(host.querySelector(".rhp-manydot")).width];
    }), ["12px", "important", "6px"]);
    near(await geometry(noScript, "centering-default", ".rhp-manydot"), [[.1, .1, 4, 4], [.5, .5, 4, 4], [.9, .9, 4, 4]]);
    near(await geometry(noScript, "centering-cases", ".rhp-manydot"), await expectedCentering(noScript));
    const [unequalWidth, unequalHeight] = await plotSize(noScript, "centering-unequal");
    near(await geometry(noScript, "centering-unequal", ".rhp-manydot"), [[.2, .2, 12, 6], [.5, .5, 6, 18], [.8, .8, unequalWidth * .1, unequalHeight * .1 + 4]]);
    near(await geometry(noScript, "centering-protected", ".rhp-manydot"), [[.5, .5, 12, 6]]);
    assert.equal(await noScript.locator("#mixed-primitives .scope-regression-text").evaluate((el) => getComputedStyle(el).color), "rgb(200, 30, 50)");
    assert.equal(await noScript.locator("#centering-default .rhp-manydot").first().evaluate((el) => getComputedStyle(el).getPropertyValue("translate")), "none");
  });
  const hydrated = await open("manydots-ssr.html", "?wait");
  await hydrated.evaluate(() => {
    window.serverHost = document.getElementById("primary-points"); window.serverPoints = [...serverHost.querySelectorAll(".rhp-manydot")];
    window.serverCenteredPoints = [...document.querySelectorAll('.rhp-chart[id^="centering-"] .rhp-manydot')]; window.go();
  });
  await settle(hydrated);
  await check("hydration reuses the server host and all existing point nodes", async () => {
    assert.deepEqual(await hydrated.evaluate(() => [document.getElementById("primary-points") === serverHost, [...document.getElementById("primary-points").querySelectorAll(".rhp-manydot")].every((el, i) => el === serverPoints[i])]), [true, true]);
    assert.equal(await hydrated.evaluate(() => [...document.querySelectorAll('.rhp-chart[id^="centering-"] .rhp-manydot')].every((el, i) => el === serverCenteredPoints[i])), true);
    assert.deepEqual(hydrated.errors, []);
  });
  await check("server-only and hydrated rendering are pixel-identical", async () => assert.equal((await hydrated.screenshot({ fullPage: true })).equals(serverImage), true));
  const fresh = await open("manydots-ssr.html", "#fresh");
  await settle(fresh);
  await check("fresh rendering matches server-only and hydrated rendering", async () => {
    assert.equal((await fresh.screenshot({ fullPage: true })).equals(serverImage), true);
    assert.deepEqual(fresh.errors, []);
  });
  await check("hydrated points remain reactive, keyed, and reachable by page listeners", async () => {
    await hydrated.evaluate(() => {
      const initial = T.initialRows();
      T.setRows(initial.map((d) => d.id === "b" ? { ...d, x: 6, color: "rgb(140, 60, 30)" } : d));
    });
    await settle(hydrated);
    near(await geometry(hydrated, "primary", ".rhp-manydot"), [[.2, .25, 6, 6], [.6, .5, 10, 10], [.8, .75, 14, 14]]);
    assert.equal(await hydrated.evaluate(() => document.querySelector("#primary .point-b") === serverPoints[1]), true);
    assert.equal(await hydrated.locator("#primary .point-b").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(140, 60, 30)");
    await hydrated.locator("#primary .point-b").click();
    assert.deepEqual(await hydrated.evaluate(() => T.events), [{ target: true, index: "1", host: "primary-points" }]);
    assert.deepEqual(hydrated.errors, []);
  });
  await Promise.all([noScript.close(), hydrated.close(), fresh.close()]);

  const packageServer = await open("manydots-dist.html", "", { javaScriptEnabled: false });
  await check("the server package export renders the same points without JavaScript", async () => {
    near(await geometry(packageServer, "primary", ".rhp-manydot"), [[.2, .25, 6, 6], [.5, .5, 10, 10], [.8, .75, 14, 14]]);
    assert.equal((await packageServer.screenshot({ fullPage: true })).equals(serverImage), true);
  });
  const packageBrowser = await open("manydots-dist.html", "?wait");
  await packageBrowser.evaluate(() => { window.packagePoints = [...document.querySelectorAll("#primary .rhp-manydot")]; window.go(); });
  await settle(packageBrowser);
  await check("the browser package export hydrates, preserves nodes, and remains reactive", async () => {
    assert.equal((await packageBrowser.screenshot({ fullPage: true })).equals(serverImage), true);
    assert.equal(await packageBrowser.evaluate(() => [...document.querySelectorAll("#primary .rhp-manydot")].every((el, i) => el === packagePoints[i])), true);
    await packageBrowser.evaluate(() => T.setRows(T.initialRows().map((d) => d.id === "c" ? { ...d, x: 9 } : d)));
    await settle(packageBrowser);
    near(await geometry(packageBrowser, "primary", ".rhp-manydot"), [[.2, .25, 6, 6], [.5, .5, 10, 10], [.9, .75, 14, 14]]);
    assert.deepEqual(packageBrowser.errors, []);
  });
  await Promise.all([packageServer.close(), packageBrowser.close()]);

  for (const [file, name] of [["manydots-hydration-change.html", "source"], ["manydots-dist-hydration-change.html", "package"]]) {
    const changed = await open(file, "?wait");
    await changed.evaluate(() => { window.changedServerPoint = document.querySelector("#hydration-change .rhp-manydot"); window.go(); });
    await settle(changed);
    const equivalent = await open(file, "#fresh");
    await settle(equivalent);
    await check(`${name} hydration removes obsolete SSR styles when initial client props differ`, async () => {
      assert.deepEqual((await appearance(changed, "#hydration-change .rhp-manydot"))[0], ["rgb(20, 110, 190)", "6px", "6px", "none"]);
      assert.deepEqual(await changed.locator("#hydration-change .rhp-manydot").evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.opacity, s.marginLeft, s.marginBottom, ["width", "height", "opacity", "clip-path", "background-color", "margin-left", "margin-bottom"].every((key) => !el.style.getPropertyValue(key))];
      }), ["1", "-3px", "-3px", true]);
      assert.equal(await changed.evaluate(() => document.querySelector("#hydration-change .rhp-manydot") === changedServerPoint), true);
      assert.equal((await changed.screenshot({ fullPage: true })).equals(await equivalent.screenshot({ fullPage: true })), true);
      near(await geometry(changed, "hydration-change", ".rhp-manydot"), [[.2, .25, 6, 6]]);
      await changed.evaluate(() => HCHANGE.setRows([{ id: "kept", x: 8, y: 15 }]));
      await settle(changed);
      near(await geometry(changed, "hydration-change", ".rhp-manydot"), [[.8, .75, 6, 6]]);
      assert.equal(await changed.evaluate(() => document.querySelector("#hydration-change .rhp-manydot") === changedServerPoint), true);
      assert.deepEqual(changed.errors, []);
      assert.deepEqual(equivalent.errors, []);
    });
    await Promise.all([changed.close(), equivalent.close()]);
  }
  const foreign = await open("manydots-hydration-foreign.html", "?wait");
  await foreign.evaluate(() => {
    const container = document.querySelector("#hydration-foreign .rhp-manydots-points");
    window.foreignClicks = 0; window.foreignSpan = document.createElement("span");
    foreignSpan.className = "app-owned"; foreignSpan.textContent = "App overlay";
    foreignSpan.addEventListener("click", () => foreignClicks++);
    window.foreignText = document.createTextNode(" App text");
    container.append(foreignSpan, foreignText); window.go();
  });
  await settle(foreign);
  await check("hydrating an empty SSR collection retains app-owned children when client points arrive", async () => {
    assert.deepEqual(await foreign.evaluate(() => [document.querySelector("#hydration-foreign .app-owned") === foreignSpan,
      foreignText.isConnected, foreignText.textContent]), [true, true, " App text"]);
    near(await geometry(foreign, "hydration-foreign", ".rhp-manydot"), [[.5, .5, 6, 6]]);
    await foreign.locator("#hydration-foreign .app-owned").click();
    assert.equal(await foreign.evaluate(() => foreignClicks), 1);
    await foreign.evaluate(() => HFOREIGN.setRows([{ id: "new", x: 8, y: 15 }]));
    await settle(foreign);
    near(await geometry(foreign, "hydration-foreign", ".rhp-manydot"), [[.8, .75, 6, 6]]);
    assert.equal(await foreign.evaluate(() => foreignSpan.isConnected && foreignText.isConnected), true);
    await foreign.evaluate(() => HFOREIGN.setRows([]));
    await settle(foreign);
    assert.equal(await foreign.locator("#hydration-foreign .rhp-manydot").count(), 0);
    await foreign.evaluate(() => HFOREIGN.setRows([{ id: "returned", x: 2, y: 5 }]));
    await settle(foreign);
    near(await geometry(foreign, "hydration-foreign", ".rhp-manydot"), [[.2, .25, 6, 6]]);
    assert.equal(await foreign.evaluate(() => foreignSpan.isConnected && foreignText.isConnected), true);
    await foreign.locator("#hydration-foreign .app-owned").click();
    assert.equal(await foreign.evaluate(() => foreignClicks), 2);
    assert.deepEqual(foreign.errors, []);
  });
  await foreign.close();

  const standalone = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const standaloneErrors = [];
  standalone.on("pageerror", (e) => standaloneErrors.push(e.message));
  await standalone.route("http://rhp-manydots.test/**", (route) => {
    if (new URL(route.request().url()).pathname === "/standalone.js") {
      return route.fulfill({ path: path.join(here, "../dist/standalone.js"), contentType: "text/javascript" });
    }
    return route.fulfill({ contentType: "text/html", body: `<!doctype html><meta charset=utf-8><div id="app" style="width:600px"></div><script type="module">
      import { Chart, ManyDots, html, render, createSignal } from "./standalone.js";
      const [rows, setRows] = createSignal([{ id:"a", x:2, y:5, color:"rgb(210,30,70)" }, { id:"b", x:8, y:15, color:"rgb(30,90,220)" }]);
      window.setRows = setRows;
      window.ManyDotsExport = ManyDots;
      render(() => html\`<\${Chart} id="standalone" scale=\${[0,10]} cross=\${[0,20]} ticks=\${false} crossTicks=\${false} height=\${100}>
        <\${ManyDots} id="standalone-points" rows=\${rows} key=\${(d) => d.id} at=\${(d) => d.x} cross=\${(d) => d.y} color=\${(d) => d.color} size=\${6}
          style="opacity:.8;--custom-host:value;outline:2px solid red!important" />
      <//>\`, document.getElementById("app"));
    </script>` });
  });
  await standalone.goto("http://rhp-manydots.test/index.html");
  await standalone.waitForSelector("#standalone .rhp-manydot");
  await settle(standalone);
  await check("the standalone export supports HTML templates, reactive rows, and native string styles", async () => {
    assert.equal(await standalone.evaluate(() => typeof ManyDotsExport), "function");
    near(await geometry(standalone, "standalone", ".rhp-manydot"), [[.2, .25, 6, 6], [.8, .75, 6, 6]]);
    assert.deepEqual(await standalone.evaluate(() => {
      const host = document.getElementById("standalone-points"), s = getComputedStyle(host);
      return [s.opacity, s.getPropertyValue("--custom-host").trim(), s.outlineWidth, s.outlineColor,
        getComputedStyle(host.querySelector(".rhp-manydot")).width];
    }), ["0.8", "value", "2px", "rgb(255, 0, 0)", "6px"]);
    await standalone.evaluate(() => {
      window.standaloneA = document.querySelector("#standalone .rhp-manydot");
      setRows([{ id: "a", x: 4, y: 5, color: "rgb(20,150,80)" }]);
    });
    await settle(standalone);
    near(await geometry(standalone, "standalone", ".rhp-manydot"), [[.4, .25, 6, 6]]);
    assert.equal(await standalone.evaluate(() => document.querySelector("#standalone .rhp-manydot") === standaloneA), true);
    assert.equal(await standalone.locator("#standalone .rhp-manydot").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(20, 150, 80)");
    assert.deepEqual(standaloneErrors, []);
  });
  await standalone.close();

  const islandServer = await open("manydots-islands.html", "", { javaScriptEnabled: false });
  const islandImage = await islandServer.screenshot({ fullPage: true });
  await check("independent SSR islands own different scoped styles and render different appearances", async () => {
    assert.deepEqual(await islandServer.evaluate(() => ["island-a-points", "island-b-points"].map((id) => {
      const host = document.getElementById(id), st = host.querySelector(":scope > style[data-rhp-manydots]");
      return [st?.parentElement.id, host.querySelectorAll(":scope > style[data-rhp-manydots]").length];
    })), [["island-a-points", 1], ["island-b-points", 1]]);
    assert.deepEqual((await appearance(islandServer, "#island-a .rhp-manydot"))[0].slice(0, 3), ["rgb(160, 30, 70)", "6px", "6px"]);
    assert.deepEqual((await appearance(islandServer, "#island-b .rhp-manydot"))[0].slice(0, 3), ["rgb(20, 110, 190)", "10px", "10px"]);
    near(await geometry(islandServer, "island-a", ".rhp-manydot"), [[.2, .25, 6, 6]]);
    near(await geometry(islandServer, "island-b", ".rhp-manydot"), [[.8, .75, 10, 10]]);
  });
  const islandHydrated = await open("manydots-islands.html", "?wait");
  await islandHydrated.evaluate(() => {
    window.islandNodes = [...document.querySelectorAll(".rhp-manydot")];
    window.islandStyles = [...document.querySelectorAll("style[data-rhp-manydots]")]; window.go();
  });
  await settle(islandHydrated);
  await check("two independently hydrated islands reuse their point and scoped-style nodes with identical pixels", async () => {
    assert.deepEqual(await islandHydrated.evaluate(() => [[...document.querySelectorAll(".rhp-manydot")].every((el, i) => el === islandNodes[i]),
      [...document.querySelectorAll("style[data-rhp-manydots]")].every((el, i) => el === islandStyles[i])]), [true, true]);
    assert.equal((await islandHydrated.screenshot({ fullPage: true })).equals(islandImage), true);
    assert.deepEqual(islandHydrated.errors, []);
  });
  const islandFresh = await open("manydots-islands.html", "#fresh");
  await settle(islandFresh);
  await check("fresh independent roots match SSR island pixels and preserve isolated updates", async () => {
    assert.equal((await islandFresh.screenshot({ fullPage: true })).equals(islandImage), true);
    const other = await appearance(islandHydrated, "#island-b .rhp-manydot");
    const rules = await styleRuleCount(islandHydrated);
    await islandHydrated.evaluate(() => { ISLANDS["island-a"].setColor("rgb(40, 130, 80)"); ISLANDS["island-a"].setSize(14); ISLANDS["island-a"].setShape(undefined); });
    await settle(islandHydrated);
    assert.deepEqual((await appearance(islandHydrated, "#island-a .rhp-manydot"))[0], ["rgb(40, 130, 80)", "14px", "14px", "none"]);
    assert.deepEqual(await appearance(islandHydrated, "#island-b .rhp-manydot"), other);
    assert.equal(await styleRuleCount(islandHydrated), rules);
    assert.equal(await islandHydrated.evaluate(() => document.querySelector("#island-a .rhp-manydot") === islandNodes[0]), true);
    assert.deepEqual(islandHydrated.errors, []);
    assert.deepEqual(islandFresh.errors, []);
  });
  const islandPackage = await open("manydots-dist-islands.html", "?wait");
  await islandPackage.evaluate(() => { window.packageIslandPoints = [...document.querySelectorAll(".rhp-manydot")]; window.go(); });
  await settle(islandPackage);
  await check("package exports hydrate independent SSR island scopes without replacement or style bleed", async () => {
    assert.equal((await islandPackage.screenshot({ fullPage: true })).equals(islandImage), true);
    assert.equal(await islandPackage.evaluate(() => [...document.querySelectorAll(".rhp-manydot")].every((el, i) => el === packageIslandPoints[i])), true);
    const first = await appearance(islandPackage, "#island-a .rhp-manydot");
    await islandPackage.evaluate(() => { ISLANDS["island-b"].setSize(16); ISLANDS["island-b"].setColor("rgb(140, 80, 20)"); });
    await settle(islandPackage);
    assert.deepEqual(await appearance(islandPackage, "#island-a .rhp-manydot"), first);
    assert.deepEqual((await appearance(islandPackage, "#island-b .rhp-manydot"))[0].slice(0, 3), ["rgb(140, 80, 20)", "16px", "16px"]);
    assert.deepEqual(islandPackage.errors, []);
  });
  await Promise.all([islandServer.close(), islandHydrated.close(), islandFresh.close(), islandPackage.close()]);

  const stylePolicy = await open("manydots.html");
  await stylePolicy.evaluate(() => {
    const meta = document.createElement("meta"); meta.httpEquiv = "Content-Security-Policy";
    meta.content = "style-src-attr 'none'"; document.head.append(meta);
    const activeProbe = document.createElement("div"); document.body.append(activeProbe);
    activeProbe.innerHTML = '<div style="opacity:.5"></div>';
    window.activeStyleAttributeEnforced = getComputedStyle(activeProbe.firstElementChild).opacity === "1";
    activeProbe.remove();
    T.setMountedScope(true);
    const ownerProbe = T.lifecycleDocument.createElement("div");
    ownerProbe.innerHTML = '<div style="left:20%!important;opacity:.5"></div>';
    window.ownerStyleAttributesBlocked = ownerProbe.firstElementChild.style.getPropertyPriority("left") === "";
    ownerProbe.firstElementChild.style.setProperty("left", "50%", "important");
    window.ownerStylePropertyAccepted = ownerProbe.firstElementChild.style.getPropertyPriority("left") === "important";
  });
  await settle(stylePolicy);
  const policyContext = await stylePolicy.evaluate(() => ({ activeEnforced: activeStyleAttributeEnforced,
    ownerAttributeEnforced: ownerStyleAttributesBlocked, propertySetterAccepted: ownerStylePropertyAccepted, ownerDocumentIsActive: T.lifecycleDocument === document }));
  console.log(`ManyDots ${engine} style attribute policy: ${JSON.stringify(policyContext)}`);
  await check("native style property assignment preserves point rendering under a style attribute policy", async () => {
    assert.equal(policyContext.activeEnforced, true);
    assert.equal(policyContext.propertySetterAccepted, true);
    assert.deepEqual((await appearance(stylePolicy, "#scope-lifecycle .rhp-manydot"))[0].slice(0, 3), ["rgb(170, 85, 0)", "8px", "8px"]);
    near(await geometry(stylePolicy, "scope-lifecycle", ".rhp-manydot"), [[.5, .5, 8, 8]]);
    assert.equal(await stylePolicy.locator("#scope-lifecycle .rhp-manydot").evaluate((el) => el.style.getPropertyPriority("left")), "important");
    assert.deepEqual(stylePolicy.errors, []);
  });
  await stylePolicy.close();

  const trustProbe = await open("manydots.html");
  if (await trustProbe.evaluate(() => typeof trustedTypes !== "undefined")) {
    // Warm framework templates so enforcement covers new ManyDots leaves rather than Solid's cached static templates.
    await trustProbe.evaluate(() => {
      const meta = document.createElement("meta"); meta.httpEquiv = "Content-Security-Policy";
      meta.content = "require-trusted-types-for 'script'; trusted-types 'none'"; document.head.append(meta);
      let blocked = false;
      try { document.createElement("template").innerHTML = "<div></div>"; }
      catch (e) { blocked = e instanceof TypeError; }
      window.untrustedHtmlBlocked = blocked; T.setMountedScope(true);
    });
    await settle(trustProbe);
    await check("native point construction works under Trusted Types enforcement without a default policy", async () => {
      assert.deepEqual(await trustProbe.evaluate(() => [untrustedHtmlBlocked, trustedTypes.defaultPolicy]), [true, null]);
      near(await geometry(trustProbe, "scope-lifecycle", ".rhp-manydot"), [[.5, .5, 8, 8]]);
      assert.deepEqual((await appearance(trustProbe, "#scope-lifecycle .rhp-manydot"))[0].slice(0, 3), ["rgb(170, 85, 0)", "8px", "8px"]);
      await trustProbe.locator("#scope-lifecycle .rhp-manydot").click();
      assert.deepEqual(await trustProbe.evaluate(() => T.events.at(-1)), { target: true, index: "0", host: "" });
      assert.deepEqual(trustProbe.errors, []);
    });
    const defaultTrust = await open("manydots.html");
    await defaultTrust.evaluate(() => {
      window.appPolicyCalls = 0;
      trustedTypes.createPolicy("default", { createHTML: (value) => { window.appPolicyCalls++; return value; } });
      const meta = document.createElement("meta"); meta.httpEquiv = "Content-Security-Policy";
      meta.content = "require-trusted-types-for 'script'; trusted-types default"; document.head.append(meta);
      T.setMountedScope(true);
    });
    await settle(defaultTrust);
    await check("native point construction leaves the application Trusted Types policy unchanged and unused", async () => {
      assert.deepEqual(await defaultTrust.evaluate(() => [trustedTypes.defaultPolicy.name, appPolicyCalls]), ["default", 0]);
      near(await geometry(defaultTrust, "scope-lifecycle", ".rhp-manydot"), [[.5, .5, 8, 8]]);
      assert.deepEqual(defaultTrust.errors, []);
    });
    await defaultTrust.close();
  } else console.log(`skip ManyDots ${engine}: Trusted Types policies (the engine does not provide Trusted Types)`);
  await trustProbe.close();
} finally {
  await browser.close();
}

console.log(`ManyDots ${engine}: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;

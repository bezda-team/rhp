// The checker's tests (npm test). Fixed data only: no chart here draws anything random.
//   broken   each file in test/broken/ (or in a project folder there) is a chart broken in one way, and must report
//            exactly the codes its first lines name ("expect: code" or "code:level"; "none" for a clean chart, which
//            then reports no notes either). Every code in src/check/README.md has a file, so a probe that stops firing
//            fails the suite. When pointing at slats changes nothing, the report's screenshot must equal the one taken
//            while pointing.
//   gallery  the site's gallery examples check with no errors but the known ones (real problems the owner has been
//            told about); warnings are listed
//   recipes  each recipe in skills/rhp/recipes is checked and its findings listed (the recipes' authors fix them, so
//            they don't fail the suite)
//   guard    the guard changes nothing drawn: gallery examples and recipes drawn with and without it, pixel for pixel
//   skill    the chart in skills/rhp/SKILL.md checks with no findings
// node test/run.js [part ...] runs some of the parts. RHP_DOCS points at the documentation checkout (the gallery).
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { check } from "../src/check/index.js";
import { launch } from "../src/check/browser.js";
import { decode } from "../src/check/png.js";
import { examples, mount, DOCS } from "./gallery.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const BROKEN = path.join(here, "broken");
const SKILL = path.join(here, "../../skills/rhp");
const OUT = path.join(os.tmpdir(), "rhp-check-test");
const PARALLEL = 4;

// Errors in the gallery that are real: each was looked at in its screenshot, and the owner told (the gallery is theirs)
const KNOWN = [
  ["bar-chart/poster", "low-contrast", "v1's value labels take their bar's pale color: \"1\" in #ffc0cb on white is 1.54:1"],
  ["box-plot/poster", "low-contrast", "v1's whisker labels take their box's pale color: 1.26:1 to 2.57:1 on white"],
  ["gantt/poster", "low-contrast", "the orange kicker, #ff5a1f on #fbfaf7, is 2.99:1"],
  ["hover-values/poster", "low-contrast", "the coral kicker, #ff6b4a on #ebf5f8, is 2.54:1"],
  ["radial-bars/poster", "low-contrast", "white phase names on light ring colors (1.63:1 to 2.35:1), and numerals in pale ring colors"],
  ["pie-chart/simple", "low-contrast", "white \"21%\" on #1baf7a is 2.82:1"],
  ["pie-chart/simple horizontal", "text-overlap", "at 390px the shares run out of their segments and touch"],
  ["pie-chart/poster horizontal", "text-overlap", "at 390px \"Chores and errands\" runs out of its slice into \"Work and study\""],
  ["linked-views/poster horizontal", "sticks-out", "the name \"Millennials\" runs 8px past the chart's left edge"],
  ["linked-views/poster horizontal", "tiny-text", "the % after each share is 7.9px"],
];

const failures = [];
const fail = (what) => failures.push(what);
const seconds = (ms) => (ms / 1000).toFixed(1) + "s";
const levelOf = (f) => (f.level === "error" ? "error" : f.level === "warning" ? "warn " : "info ");
const findingLine = (f) => `      ${levelOf(f)} [${f.code}] ${f.message}${f.widths.length ? ` (${f.widths.join(", ")})` : ""}`;

// Runs fn over items, n at a time, keeping their order
async function pool(items, n, fn) {

  const out = new Array(items.length);
  let next = 0;

  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));

  return out;
}

// The codes src/check/README.md documents, from its table rows ("| `code` | level | ...")
function documentedCodes() {

  const text = fs.readFileSync(path.join(here, "../src/check/README.md"), "utf8");

  return new Set([...text.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]));
}

// What a broken file expects: its codes (with a level or not), the widths and whether to interact
function expectation(file) {

  const head = fs.readFileSync(file, "utf8").split("\n").slice(0, 3).join("\n");
  const expect = head.match(/expect:\s*([^;\n]*?)\s*(?:;|-->|$)/m)?.[1] ?? "";
  const widths = head.match(/widths:\s*([\d,\s]+)/)?.[1].split(",").map(Number);

  return {
    codes: expect === "none" ? [] : expect.split(/\s+/).filter(Boolean).map((x) => ({ code: x.split(":")[0], level: x.split(":")[1] ?? null })),
    widths,
    interact: !/interact:\s*false/.test(head),
  };
}

// The broken charts: each file in test/broken/, and in each folder there (a small project with its package.json) the
// file whose first lines say what it expects
function brokenFiles() {

  const out = [];

  for (const entry of fs.readdirSync(BROKEN, { withFileTypes: true })) {
    if (entry.isFile() && /\.(html|js|jsx)$/.test(entry.name)) out.push(entry.name);
    if (!entry.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(BROKEN, entry.name))) {
      const name = `${entry.name}/${f}`;
      if (/\.(html|js|jsx|tsx)$/.test(f) && /expect:/.test(fs.readFileSync(path.join(BROKEN, name), "utf8").split("\n").slice(0, 3).join("\n"))) out.push(name);
    }
  }

  return out.sort();
}

async function brokenPart(browser) {

  const files = brokenFiles();
  const covered = new Set();
  const seen = new Set();

  console.log(`\nbroken: ${files.length} charts, each broken in one way`);

  const results = await pool(files, PARALLEL, async (name) => {
    const file = path.join(BROKEN, name);
    const want = expectation(file);
    const r = await check({ file, browser, widths: want.widths, interact: want.interact, outDir: path.join(OUT, "broken", name.replace(/\.\w+$/, "").replace(/\//g, "-")) });
    return { name, want, r };
  });

  for (const { name, want, r } of results) {
    const wanted = new Set(want.codes.map((c) => c.code));
    // notes count when they are expected, and in a clean chart (none means none)
    const got = r.findings.filter((f) => f.level !== "info" || wanted.has(f.code) || !wanted.size);
    const codes = new Set(got.map((f) => f.code));
    const levels = want.codes.filter((c) => c.level && got.some((f) => f.code === c.code && f.level !== c.level));
    // pointing at slats that changed nothing leaves the picture as it was: the report's screenshot and the one taken
    // while pointing are the same (a probe that left the chart drawn wrong makes them differ)
    const hover = r.screenshots.find((s) => s.hover);
    const plain = hover && r.screenshots.find((s) => !s.hover && s.width === hover.width);
    const still = r.interactions.filter((x) => x.kind === "hover").every((x) => !x.changed);
    const pictured = !hover || !still || samePixels(plain.path, hover.path, 32);
    const ok = codes.size === wanted.size && [...wanted].every((c) => codes.has(c)) && !levels.length;

    for (const c of want.codes) {
      if (ok) covered.add(c.code);
    }
    for (const f of r.findings) {
      seen.add(f.code);
    }

    console.log(`  ${ok && pictured ? "ok  " : "FAIL"} ${name.padEnd(32)} ${want.codes.length ? want.codes.map((c) => c.code + (c.level ? ":" + c.level : "")).join(" ") : "no findings"}  ${seconds(r.timings.total)}`);
    if (!ok) {
      fail(`broken/${name}: expected ${want.codes.map((c) => c.code + (c.level ? ":" + c.level : "")).join(" ") || "no findings"}, got ${[...codes].join(" ") || "none"}`);
      for (const f of r.findings) {
        console.log(findingLine(f));
      }
    }
    if (!pictured) fail(`broken/${name}: pointing at slats changed nothing, but the report's screenshot differs from the one taken while pointing (${plain.path} vs ${hover.path})`);
  }

  // A file that doesn't exist
  const none = await check({ file: path.join(BROKEN, "no-such-chart.html"), browser });
  const noFile = none.findings.length === 1 && none.findings[0].code === "no-file";
  console.log(`  ${noFile ? "ok  " : "FAIL"} ${"(a path that doesn't exist)".padEnd(32)} no-file`);
  if (noFile) covered.add("no-file");
  else fail("no-file: a missing file was not reported as no-file");

  // Every documented code has a broken chart that shows it, and every code a check reports is documented
  const documented = documentedCodes();
  const untested = [...documented].filter((c) => !covered.has(c) && c !== "no-browser");
  const undocumented = [...seen].filter((c) => !documented.has(c));
  if (untested.length) fail(`codes with no broken chart that shows them: ${untested.join(", ")}`);
  if (undocumented.length) fail(`codes not in src/check/README.md: ${undocumented.join(", ")}`);
  console.log(`  ${documented.size} documented codes, ${documented.size - untested.length - (documented.has("no-browser") ? 1 : 0)} shown by a broken chart${untested.length ? `; missing: ${untested.join(", ")}` : " (no-browser needs a machine without a browser)"}`);
}

// The gallery mounts to check: every example horizontal, and in its best orientation when that is vertical
function galleryJobs() {

  const jobs = [];

  for (const e of examples()) {
    for (const o of new Set(["horizontal", e.orientation])) {
      jobs.push({ e, o, name: `${e.slug}/${e.version} ${o}` });
    }
  }

  return jobs;
}

async function galleryPart(browser) {

  const jobs = galleryJobs();
  if (!jobs.length) {
    console.log(`\ngallery: skipped (no gallery in ${DOCS}; set RHP_DOCS to the documentation checkout)`);
    return;
  }

  console.log(`\ngallery: ${jobs.length} renders of ${new Set(jobs.map((j) => j.e.slug + j.e.version)).size} examples, with the interaction pass`);

  const results = await pool(jobs, PARALLEL, async (job) => ({ job, r: await check({ file: mount(job.e, job.o), format: "solid", browser, outDir: path.join(OUT, "gallery", job.name.replace(/[/ ]/g, "-")) }) }));
  const known = new Map();
  let warnings = 0;

  for (const { job, r } of results) {
    const errors = r.findings.filter((f) => f.level === "error");
    const listed = r.findings.filter((f) => f.level === "warning");
    const unknown = errors.filter((f) => {
      const k = KNOWN.find(([where, code]) => code === f.code && (job.name.startsWith(where + " ") || job.name === where));
      if (k) known.set(k, [...(known.get(k) ?? []), job.name]);
      return !k;
    });
    warnings += listed.length;
    const mark = unknown.length ? "FAIL" : errors.length ? "known" : "ok  ";
    console.log(`  ${mark.padEnd(5)} ${job.name.padEnd(38)} ${errors.length} errors, ${listed.length} warnings  ${seconds(r.timings.total)}`);
    for (const f of [...unknown, ...listed]) {
      console.log(findingLine(f));
    }
    if (unknown.length) fail(`gallery ${job.name}: ${unknown.map((f) => `[${f.code}] ${f.message}`).join("; ")}`);
  }

  console.log(`  ${warnings} warnings in all; known errors (real, the owner's to fix):`);
  for (const [k, where] of known) {
    console.log(`    [${k[1]}] ${k[0]}: ${k[2]} (${[...new Set(where)].join("; ")})`);
  }
  for (const k of KNOWN.filter((x) => !known.has(x))) {
    console.log(`    no longer seen, remove it from KNOWN: [${k[1]}] ${k[0]}`);
  }
}

async function recipesPart(browser) {

  const dir = path.join(SKILL, "recipes");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort() : [];

  console.log(`\nrecipes: ${files.length} recipes (listed, not failed: their authors fix them)`);

  const results = await pool(files, PARALLEL, async (name) => ({ name, r: await check({ file: path.join(dir, name), browser, outDir: path.join(OUT, "recipes", name.replace(/\.html$/, "")) }) }));

  for (const { name, r } of results) {
    const count = (level) => r.findings.filter((f) => f.level === level).length;
    console.log(`  ${(count("error") ? "error" : count("warning") ? "warn" : "ok").padEnd(5)} ${name.padEnd(24)} ${count("error")} errors, ${count("warning")} warnings  ${seconds(r.timings.total)}`);
    for (const f of r.findings.filter((x) => x.level !== "info")) {
      console.log(findingLine(f));
    }
  }
}

// Whether two PNG files hold the same pixels, each channel within tolerance (drawing the same page twice can differ by
// a few units at the anti-aliased edges)
function samePixels(a, b, tolerance = 0) {

  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;

  const x = decode(fs.readFileSync(a));
  const y = decode(fs.readFileSync(b));
  if (x.width !== y.width || x.height !== y.height) return false;

  for (let i = 0; i < x.data.length; i++) {
    if (Math.abs(x.data[i] - y.data[i]) > tolerance) return false;
  }

  return true;
}

async function guardPart(browser) {

  const recipes = path.join(SKILL, "recipes");
  const jobs = [
    ...examples().map((e) => ({ name: `gallery ${e.slug}/${e.version}`, file: mount(e, e.orientation), format: "solid", code: [e.file, path.join(path.dirname(e.file), "styles.js")] })),
    ...(fs.existsSync(recipes) ? fs.readdirSync(recipes).filter((f) => f.endsWith(".html")).sort().map((f) => ({ name: `recipe ${f}`, file: path.join(recipes, f), format: "html", code: [path.join(recipes, f)] })) : []),
  ];

  // A chart that changes on a timer (an autoplay, live readings) draws something else at each moment, so a difference
  // there proves nothing: it is listed, not failed. Endless CSS animations (a blinking cursor) are stopped for the
  // screenshots (freeze).
  const timed = (job) => job.code.some((f) => fs.existsSync(f) && /\bsetInterval\s*\(/.test(fs.readFileSync(f, "utf8")));

  console.log(`\nguard: ${jobs.length} charts drawn with and without the guard, compared pixel for pixel at 1280 and 390px`);

  const results = await pool(jobs, PARALLEL, async (job) => {
    const dir = (run) => path.join(OUT, "guard", job.name.replace(/[/ .]/g, "-"), run);
    // (the widths are drawn side by side, so the screenshots come in any order: they are paired by name)
    // (offline: the fonts both drawings use are the machine's, so a slow download can't change one of them)
    const draw = async (guard, run) => (await check({ file: job.file, format: job.format, browser, guard, interact: false, freeze: true, offline: true, outDir: dir(run) })).screenshots.map((s) => s.path).sort();
    const guarded = await draw(true, "with");
    const plain = await draw(false, "without");
    const same = guarded.length > 0 && guarded.length === plain.length && guarded.every((p, i) => path.basename(p) === path.basename(plain[i]) && samePixels(p, plain[i]));
    return { job, same, shots: guarded.map((p, i) => `${p} vs ${plain[i]}`) };
  });

  const moving = [];
  for (const { job, same, shots } of results) {
    if (same) continue;
    if (timed(job)) {
      moving.push(job.name);
      continue;
    }
    fail(`guard changed what ${job.name} draws`);
    console.log(`  FAIL ${job.name}: ${shots.join("; ")}`);
  }
  console.log(`  ${results.filter((x) => x.same).length} of ${jobs.length} identical${moving.length ? `; ${moving.join(", ")} change on a timer, so their difference proves nothing` : ""}`);
}

async function skillPart(browser) {

  const text = fs.readFileSync(path.join(SKILL, "SKILL.md"), "utf8");
  const block = text.match(/```html\n([\s\S]*?)\n```/)?.[1];

  console.log("\nskill: the html example in SKILL.md");

  if (!block) {
    fail("skill: SKILL.md has no ```html block");
    return;
  }

  const dir = path.join(OUT, "skill");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "skill-example.html");
  fs.writeFileSync(file, block + "\n");

  const r = await check({ file, browser, outDir: dir });
  const ok = !r.findings.length;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${r.findings.length} findings, ${r.interactions.length} interactions  ${seconds(r.timings.total)}`);
  for (const f of r.findings) {
    console.log(findingLine(f));
  }
  for (const x of r.interactions) {
    console.log(`      ${x.kind} ${x.target}: ${x.how}`);
  }
  if (!ok) fail(`skill: the SKILL.md example has ${r.findings.length} findings`);
}

const PARTS = { broken: brokenPart, gallery: galleryPart, recipes: recipesPart, guard: guardPart, skill: skillPart };

async function main() {

  const asked = process.argv.slice(2);
  const unknown = asked.filter((p) => !PARTS[p]);
  if (unknown.length) {
    console.error(`unknown part: ${unknown.join(", ")} (parts: ${Object.keys(PARTS).join(", ")})`);
    return 2;
  }

  const started = performance.now();
  const launched = await launch();
  if (launched.error) {
    console.error(`No browser to test with: ${launched.error.join("; ")}`);
    return 1;
  }

  try {
    for (const name of asked.length ? asked : Object.keys(PARTS)) {
      const t = performance.now();
      await PARTS[name](launched.browser);
      console.log(`  (${name}: ${seconds(performance.now() - t)})`);
    }
  } finally {
    await launched.browser.close();
  }

  console.log(`\n${failures.length ? `${failures.length} failed` : "all passed"} in ${seconds(performance.now() - started)}`);
  for (const f of failures) {
    console.log(`- ${f}`);
  }

  return failures.length ? 1 : 0;
}

main().then((code) => {
  process.exitCode = code;
}, (e) => {
  console.error(e.stack ?? e);
  process.exitCode = 1;
});

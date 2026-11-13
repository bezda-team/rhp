// A chart drawn with rhp-react: the checker draws it with the project's rhp-react (here this repository's, built and
// linked into a small project), names it in the report, and doesn't claim the guard checked it (the guard wraps
// @bezda/rhp only). A Chart in a box that sizes to its content is reported once, as collapsed-chart.
import fs from "fs";
import os from "os";
import path from "path";
import assert from "assert";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { check } from "../src/check/index.js";
import { launch } from "../src/check/browser.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REACT = path.join(here, "../../react");

const built = spawnSync(process.execPath, [path.join(REACT, "build.mjs")], { encoding: "utf8" });
assert.equal(built.status, 0, built.stderr);

const project = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-react-check-"));
fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "^19", "react-dom": "^19", "@bezda/rhp-react": "file:" + REACT } }));
fs.mkdirSync(path.join(project, "node_modules/@bezda"), { recursive: true });
fs.symlinkSync(REACT, path.join(project, "node_modules/@bezda/rhp-react"));

// The chart in the boxes given (outermost first)
const chart = (boxes) => `import { Chart, Plot, Bar, Label, slat } from "@bezda/rhp-react";

const Fruit = slat({ thickness: 32, room: { start: 90, end: 40 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.sold} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));

export default function FruitChart() {
  return (
    ${boxes.map((b) => `<div style={${b}}>`).join("")}
      <Chart scale={[0, 30]} label="Fruit sold">
        <Plot name={["Apples", "Bananas", "Cherries"]} sold={[12, 18, 7]}>{Fruit}</Plot>
      </Chart>
    ${boxes.map(() => "</div>").join("")}
  );
}
`;
fs.writeFileSync(path.join(project, "fruit.jsx"), chart([`{ maxWidth: 640, margin: "24px auto", fontFamily: "system-ui" }`]));
// a flex item with margin: auto sizes to its content, as in Next.js's and Vite's starter pages
fs.writeFileSync(path.join(project, "squeezed.jsx"), chart([`{ display: "flex" }`, `{ margin: "0 auto" }`]));

const version = JSON.parse(fs.readFileSync(path.join(REACT, "package.json"), "utf8")).version;
const { browser, error } = await launch();
assert.ok(browser, error);

try {
  const r = await check({ file: path.join(project, "fruit.jsx"), browser, widths: [1280], interact: false, offline: true });
  assert.equal(r.format, "react");
  assert.equal(r.rhpReactVersion, version);
  assert.equal(r.guarded, false);
  assert.deepEqual(r.findings.map((f) => f.code), [], r.text);
  assert.equal(r.charts[0]?.slats, 3, r.text);
  assert.match(r.text, new RegExp(`\\(react, rhp-react ${version.replace(/\./g, "\\.")}, `));
  assert.doesNotMatch(r.text, /rhp used as documented/);
  console.log(`ok   an rhp-react chart is drawn with the project's rhp-react ${version}, and the report doesn't claim the guard checked it`);

  const s = await check({ file: path.join(project, "squeezed.jsx"), browser, widths: [1280], interact: false, offline: true });
  assert.deepEqual(s.findings.map((f) => f.code), ["collapsed-chart"], s.text);
  console.log("ok   a collapsed rhp-react chart is reported once, as collapsed-chart (not again for rhp's warning)");
} finally {
  await browser.close();
  fs.rmSync(project, { recursive: true, force: true });
}

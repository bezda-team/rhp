import assert from "node:assert/strict";
import { htmlProblems } from "../src/check/build.js";

const check = (body, map = {}) => htmlProblems("imports.html", `<script type="importmap">${JSON.stringify({ imports: map })}</script><script type="module">${body}</script>`);
const missing = async (body, map) => (await check(body, map)).filter((p) => p.code === "missing-import-map");

assert.deepEqual(await check(`
  const rows = [{ "from": "2026-09-19", "import": "data" }];
  const text = 'import "fake-package"';
  // import "comment-package";
  /* export * from "another-comment"; */
`), [], "JSON fields, strings and comments are not module imports");

for (const body of [
  'import value from "bare-package";',
  'import "bare-package";',
  'await import("bare-package");',
  'await import(`bare-package`);',
  'export { value } from "bare-package";',
  'export * from "bare-package";',
]) {
  const problems = await missing(body);
  assert.equal(problems.length, 1, body);
  assert(problems[0].message.includes('"bare-package"'), body);
}

assert.deepEqual(await check(`
  import "mapped";
  import "prefix/child";
  import "./local.js";
  import "../local.js";
  import "/local.js";
  import "https://example.com/module.js";
  await import("data:text/javascript,export default 1");
  const name = "computed";
  await import(name);
`, { mapped: "/mapped.js", "prefix/": "/modules/" }), []);

assert((await check("const broken = ;")).some((p) => p.code === "syntax-error"));
console.log("PASS HTML module imports: syntax nodes, maps, URLs and invalid syntax");

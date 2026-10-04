// The package and its MCP server, end to end. npm test runs it before test/run.js; node test/mcp.js runs it alone.
//   build      npm run build copies the skill into skill/, byte for byte
//   package    npm pack holds what the server needs and nothing else, and the packed `rhp-mcp guide` reads the packed
//              skill
//   plugin     the Claude Code marketplace and plugin manifests parse and point at real paths, and the plugin's folder
//              holds only its manifest and the skill
//   server     an MCP client over stdio starts the packed server, lists its tools and prompt and calls each tool; it
//              prints how long the server takes to start and a check takes
//   no browser on macOS, the server in a sandbox that hides every browser still answers rhp_check, with how to get one
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MCP = path.join(here, "..");
const REPO = path.join(MCP, "..");
const SKILL = path.join(REPO, "skills/rhp");
const BROKEN = path.join(here, "broken");
const BAR = path.join(SKILL, "recipes/bar.html");
const WORK = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rhp-mcp-test-")));

const failures = [];
const since = (t) => Math.round(performance.now() - t);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const textOf = (result) => result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
const imagesOf = (result) => result.content.filter((c) => c.type === "image");
const body = (file) => fs.readFileSync(file, "utf8").replace(/^---\n[\s\S]*?\n---\n+/, "");

function ok(pass, what) {

  console.log(`  ${pass ? "ok  " : "FAIL"} ${what}`);
  if (!pass) failures.push(what);
}

// The files under a folder, as relative paths, without dotfiles
function filesIn(dir, prefix = "") {

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      out.push(...filesIn(path.join(dir, entry.name), prefix + entry.name + "/"));
    } else {
      out.push(prefix + entry.name);
    }
  }

  return out.sort();
}

// What the build copies: the skill's folder without its dotfiles
const skillFiles = () => filesIn(SKILL);

// The size above which rhp_reference returns a reference's sections instead of the whole file (as in src/skill.js)
const WHOLE = 40 * 1024;

// A chart of 60 slats, inline: its screenshots are taller than 2000px at 390px and wider than 1280px at 1440px
const TALL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sixty items</title>
<script type="importmap">{ "imports": { "@bezda/rhp/standalone": "https://cdn.jsdelivr.net/npm/@bezda/rhp@2/dist/standalone.js" } }</script>
<style>
  body { margin: 0; padding: 24px 16px; font-family: system-ui, sans-serif; background: #fff; color: #222; }
  #chart { margin: 0 auto; }
</style>
</head>
<body>
<div id="chart"></div>
<script type="module">
import { Chart, Plot, Bar, Label, slat, html, render } from "@bezda/rhp/standalone";

const item = Array.from({ length: 60 }, (_, i) => "Item " + (i + 1));
const value = item.map((_, i) => (i * 37) % 100);

const Item = slat({ thickness: 28, room: { start: 70 } }, (d) => html\`
  <div>
    <\${Label} edge="start">\${() => d.item}<//>
    <\${Bar} to=\${() => d.value} />
  </div>\`);

render(() => html\`
  <\${Chart} scale=\${[0, 100]} label="Sixty items">
    <\${Plot} item=\${item} value=\${value}>\${Item}<//>
  <//>\`, document.getElementById("chart"));
</script>
</body>
</html>
`;

// A JPEG's size, from its start-of-frame marker
function jpegSize(buffer) {

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let i = 2;

  while (i + 9 < buffer.length) {
    const marker = buffer[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
    }
    i += 2 + buffer.readUInt16BE(i + 2);
  }

  return null;
}

const sizesOf = (result) => imagesOf(result).map((c) => jpegSize(Buffer.from(c.data, "base64")));

// The processes a process started (the server's browser)
function childrenOf(pid) {

  try {
    return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split("\n").filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

function running(pid) {

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function buildPart() {

  console.log("\nbuild: the skill's copy");
  execFileSync(process.execPath, [path.join(MCP, "scripts/build.js")], { stdio: "pipe" });

  const want = skillFiles();
  const copy = path.join(MCP, "skill");
  const got = filesIn(copy);
  const same = want.length === got.length && want.every((f, i) => f === got[i] && fs.readFileSync(path.join(SKILL, f)).equals(fs.readFileSync(path.join(copy, f))));
  ok(same, `npm run build copies the ${want.length} files of skills/rhp into skill/, byte for byte`);
  ok(fs.readFileSync(path.join(REPO, "LICENSE")).equals(fs.readFileSync(path.join(MCP, "LICENSE"))), "and rhp's LICENSE into the package's folder");
}

function packagePart() {

  console.log("\npackage: npm pack");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const [info] = JSON.parse(execFileSync(npm, ["pack", "--json", "--pack-destination", WORK], { cwd: MCP, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }));
  const list = info.files.map((f) => f.path);
  const need = ["package.json", "README.md", "LICENSE", "bin/rhp-mcp.js", "src/server.js", "src/skill.js", "src/check/index.js", "src/guard/rhp.js", ...skillFiles().map((f) => "skill/" + f)];
  const missing = need.filter((f) => !list.includes(f));
  const extra = list.filter((f) => /^(test|scripts|node_modules)\//.test(f) || f.split("/").some((part) => part.startsWith(".")));
  ok(!missing.length, `the package holds the server, the checker, the license and the skill's ${skillFiles().length} files${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
  ok(!extra.length, `and no tests, scripts or dotfiles (${list.length} files, ${Math.round(info.size / 1024)} KB packed)${extra.length ? `; found: ${extra.join(", ")}` : ""}`);

  // Unpacked beside this checkout's node_modules (an install from npm gets its own)
  execFileSync("tar", ["xzf", path.join(WORK, info.filename), "-C", WORK]);
  const pkg = path.join(WORK, "package");
  fs.symlinkSync(path.join(MCP, "node_modules"), path.join(pkg, "node_modules"), "dir");
  const guide = execFileSync(process.execPath, [path.join(pkg, "bin/rhp-mcp.js"), "guide"], { encoding: "utf8" });
  ok(guide === `The references/ and recipes/ this guide links are in ${path.join(pkg, "skill")}\n\n${body(path.join(SKILL, "SKILL.md"))}`, "the packed `rhp-mcp guide` prints SKILL.md from the packed skill/");

  return pkg;
}

function pluginPart() {

  console.log("\nplugin: the Claude Code marketplace and plugin");
  const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const market = json(path.join(REPO, ".claude-plugin/marketplace.json"));
  const entry = market.plugins?.find((p) => p.name === "rhp");
  ok(market.name === "rhp" && !!market.owner?.name && !!entry, "the marketplace rhp lists the plugin rhp");

  const root = path.join(REPO, entry?.source ?? "");
  const manifest = path.join(root, ".claude-plugin/plugin.json");
  ok(!!entry?.source?.startsWith("./") && fs.existsSync(manifest), `its source ${entry?.source} holds .claude-plugin/plugin.json`);
  if (!fs.existsSync(manifest)) return;

  const plugin = json(manifest);
  const skills = [plugin.skills].flat().filter(Boolean);
  const server = plugin.mcpServers?.rhp;
  const { name } = json(path.join(MCP, "package.json"));
  // A skills path is a skill's folder or a folder of skills; "./" is the plugin's root, which holds rhp/
  const holdsSkill = (s) => [path.resolve(root, s), path.resolve(root, s, "rhp")].includes(SKILL);
  // Claude Code copies the plugin's folder to its cache: what git would commit there
  const shipped = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "."], { cwd: root, encoding: "utf8" }).trim().split("\n");
  const allowed = [".claude-plugin/plugin.json", ...skillFiles().map((f) => "rhp/" + f)];
  const extra = shipped.filter((f) => !allowed.includes(f));
  ok(plugin.name === entry.name, "the plugin's name is the marketplace entry's");
  ok(skills.length > 0 && skills.every((s) => s.startsWith("./")) && skills.some(holdsSkill) && fs.existsSync(path.join(SKILL, "SKILL.md")), `its skills path (${skills.join(", ")}) holds skills/rhp`);
  // No version: Claude Code then takes the commit as the version, so a fix to the skill reaches users with the next push
  ok(plugin.version === undefined, "it has no version, so each commit is an update");
  ok(server?.command === "npx" && server.args?.join(" ") === `-y ${name}`, `it starts the MCP server with npx -y ${name}`);
  ok(!extra.length, `its folder holds only its manifest and the skill (${shipped.length} files)${extra.length ? `; found: ${extra.join(", ")}` : ""}`);
  ok(URL.canParse(plugin.homepage), "its homepage is a URL");
}

async function serverPart(pkg) {

  console.log("\nserver: an MCP client over stdio, with the packed server");
  const started = performance.now();
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(pkg, "bin/rhp-mcp.js")], stderr: "pipe" });
  let stderr = "";
  transport.stderr.on("data", (d) => (stderr += d));
  const client = new Client({ name: "rhp-mcp-test", version: "1.0.0" });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const startup = since(started);
  const call = (name, args = {}) => client.callTool({ name, arguments: args });

  try {
    const { version } = JSON.parse(fs.readFileSync(path.join(MCP, "package.json"), "utf8"));
    const names = tools.map((t) => t.name).sort();
    const instructions = client.getInstructions() ?? "";
    ok(client.getServerVersion()?.name === "rhp" && client.getServerVersion()?.version === version, `the server is rhp ${version}, ready in ${startup} ms (start to tools/list)`);
    ok(/rhp_guide/.test(instructions) && /rhp_check/.test(instructions) && /absolute path/.test(instructions), "its instructions send the agent to rhp_guide first and rhp_check after every edit");
    ok(names.join(" ") === "rhp_check rhp_guide rhp_recipe rhp_reference", `exactly four tools: ${names.join(", ")}`);
    ok(tools.every((t) => t.description.length > 100 && t.inputSchema?.type === "object" && !t.outputSchema), "each with a description and an input schema");
    ok(/ABSOLUTE path/.test(tools.find((t) => t.name === "rhp_check").description), "rhp_check's description asks for an absolute path");

    const { prompts } = await client.listPrompts();
    const prompt = await client.getPrompt({ name: "chart", arguments: { request: "a bar chart of the most spoken languages" } });
    const said = prompt.messages[0]?.content?.text ?? "";
    ok(prompts.map((p) => p.name).join(" ") === "chart" && said.includes("a bar chart of the most spoken languages") && /rhp_guide/.test(said) && /rhp_check/.test(said), "one prompt, chart, that asks for the chart through rhp_guide and rhp_check");

    // rhp_guide
    const guide = textOf(await call("rhp_guide"));
    const refs = fs.readdirSync(path.join(SKILL, "references")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
    const types = fs.readdirSync(path.join(SKILL, "recipes")).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).sort();
    ok(guide.startsWith("You are reading the rhp skill through the rhp MCP server") && guide.includes(body(path.join(SKILL, "SKILL.md")).trim()) && refs.every((r) => guide.includes(`\n- ${r}: `)) && guide.includes(`rhp_recipe types: ${types.join(", ")}.`), `rhp_guide: SKILL.md's body, a note on the tools, the ${refs.length} references and the ${types.length} recipes`);

    // rhp_reference: each reference whole, or its sections when it is over 40 KB, and one section by number and by
    // title; then wrong names
    const kb = (text) => `${Math.round(Buffer.byteLength(text) / 1024)} KB`;
    for (const name of refs) {
      const file = fs.readFileSync(path.join(SKILL, "references", name + ".md"), "utf8");
      const got = await call("rhp_reference", { name });
      if (Buffer.byteLength(file) <= WHOLE) {
        ok(!got.isError && textOf(got) === file, `rhp_reference ${name} (${kb(file)}): the whole file`);
        continue;
      }
      const headings = [...file.matchAll(/^## (\d+)\. (.+)$/gm)];
      const pick = headings[Math.floor(headings.length / 2)];
      ok(!got.isError && /too long to return whole/.test(textOf(got)) && headings.length > 1 && headings.every((h) => textOf(got).includes(`\n- ${h[1]}. ${h[2]} (`)) && textOf(got).length < 8000, `rhp_reference ${name} (${kb(file)}): its ${headings.length} sections, in ${textOf(got).length} characters`);
      const byNumber = textOf(await call("rhp_reference", { name, section: pick[1] }));
      const byTitle = textOf(await call("rhp_reference", { name: `${name}.md`, section: pick[2].toLowerCase() }));
      ok(byNumber.startsWith(pick[0] + "\n") && byNumber === byTitle && file.includes(byNumber.trimEnd()), `rhp_reference ${name} section "${pick[1]}" or "${pick[2].toLowerCase()}": the section "${pick[0]}" (${kb(byNumber)})`);
    }
    const noName = await call("rhp_reference", { name: "colours" });
    const noSection = await call("rhp_reference", { name: "api", section: "no such section" });
    ok(noName.isError && refs.every((r) => textOf(noName).includes(`- ${r}: `)) && noSection.isError && /\n- 1\. /.test(textOf(noSection)), "an unknown name or section: an error that lists the right ones");

    // rhp_recipe
    const list = textOf(await call("rhp_recipe"));
    ok(types.every((t) => list.includes(`\n- ${t}: "`)), `rhp_recipe: the ${types.length} recipes, each with its title and description`);
    ok(textOf(await call("rhp_recipe", { type: "bar" })) === fs.readFileSync(BAR, "utf8"), "rhp_recipe bar: the whole file");
    const noRecipe = await call("rhp_recipe", { type: "pie-of-pies" });
    ok(noRecipe.isError && textOf(noRecipe).includes("bar, "), "an unknown type: an error that lists the types");

    // rhp_check: a recipe three times. The second and third reuse the browser and take less time than the first; the
    // faster of the two is compared, so one slow font download cannot fail the test.
    const timed = async (args) => {
      const t = performance.now();
      const result = await call("rhp_check", args);
      return { result, ms: since(t) };
    };
    const first = await timed({ file: BAR });
    const browser = childrenOf(transport.pid);
    const second = await timed({ file: BAR });
    const third = await timed({ file: BAR });
    const report = textOf(first.result);
    const sizes = sizesOf(first.result);
    ok(!first.result.isError && report.startsWith("rhp check of bar.html") && /no problems found/.test(report), `rhp_check of the bar recipe: its report, no problems found (${first.ms} ms)`);
    ok(sizes.length >= 2 && imagesOf(first.result).every((c) => c.mimeType === "image/jpeg") && sizes.every((s) => s && s.width <= 1280 && s.height <= 2000), `and ${sizes.length} JPEG screenshots (${sizes.map((s) => s && `${s.width}x${s.height}`).join(", ")})`);
    // No structuredContent: Claude Code shows the model a tool's structuredContent in place of its text, and Codex in
    // place of all its content, so the report or the screenshots would never reach the agent
    ok(first.result.structuredContent === undefined && report.length < 20000 && !/[A-Za-z0-9+/]{400}/.test(report), "no structuredContent, and no base64 in the text");
    ok(!second.result.isError && !third.result.isError && browser.length > 0 && childrenOf(transport.pid).join() === browser.join(), "the next two checks use the same browser");
    ok(Math.min(second.ms, third.ms) < first.ms, `and take less time: ${second.ms} and ${third.ms} ms after ${first.ms} ms`);

    // A chart given as code; its screenshots wider than 1280px or taller than 2000px come back scaled down to fit
    const tall = await call("rhp_check", { code: TALL, widths: [1440, 390], interact: false });
    const pngs = [1440, 390].map((w) => textOf(tall).match(new RegExp(`^- ${w}px: (.+\\.png)$`, "m"))?.[1]).map((f) => f && fs.existsSync(f) && { width: fs.readFileSync(f).readUInt32BE(16), height: fs.readFileSync(f).readUInt32BE(20) });
    const jpegs = sizesOf(tall);
    const listed = (list) => list.map((s) => s && `${s.width}x${s.height}`).join(" and ");
    ok(!tall.isError && /no problems found/.test(textOf(tall)) && pngs[0]?.width > 1280 && pngs[1]?.height > 2000 && jpegs.length === 2 && jpegs.every((s) => s && s.width <= 1280 && s.height <= 2000), `a chart given as code: no problems found, and its ${listed(pngs)} screenshots come back ${listed(jpegs)}`);

    // A broken chart, as a file and as code
    const broken = await call("rhp_check", { file: path.join(BROKEN, "unknown-prop.html") });
    ok(!broken.isError && /\[unknown-prop\]/.test(textOf(broken)) && /Fix: /.test(textOf(broken)) && imagesOf(broken).length > 0, "a broken chart's file: the finding, its fix and the screenshots");
    const inline = await call("rhp_check", { code: fs.readFileSync(path.join(BROKEN, "missing-group.html"), "utf8"), interact: false });
    ok(!inline.isError && /\[missing-group\]/.test(textOf(inline)) && imagesOf(inline).length > 0, "a broken chart's code: the same");

    // What the agent gets wrong
    const relative = await call("rhp_check", { file: "skills/rhp/recipes/bar.html" });
    ok(relative.isError && /absolute path/.test(textOf(relative)), "a relative path: an error that asks for the absolute path");
    const both = await call("rhp_check", { file: BAR, code: "<p>chart</p>" });
    const neither = await call("rhp_check", {});
    const badWidth = await call("rhp_check", { file: BAR, widths: [10] });
    ok(both.isError && neither.isError && badWidth.isError, "file and code together, neither, or a width of 10px: errors");
    const missing = await call("rhp_check", { file: path.join(WORK, "no-such-chart.html") });
    ok(!missing.isError && /\[no-file\]/.test(textOf(missing)), "a file that doesn't exist: the report says so");
  } finally {
    const pid = transport.pid;
    const browser = childrenOf(pid);
    await client.close();
    for (let i = 0; i < 50 && [pid, ...browser].some(running); i++) {
      await wait(100);
    }
    ok(![pid, ...browser].some(running), "closing the client stops the server and its browser");
    const logged = stderr.trim().split("\n").filter(Boolean);
    ok(logged.length > 0 && logged.every((line) => line.startsWith("rhp-mcp ")), `the server logged only its own lines to stderr: ${logged.join(" / ")}`);
  }
}

// macOS only: sandbox-exec hides Chrome and Edge, and an empty Playwright folder hides Playwright's browsers
async function noBrowserPart(pkg) {

  const sandbox = "/usr/bin/sandbox-exec";
  console.log("\nno browser: rhp_check where no browser can be found");
  if (process.platform !== "darwin" || !fs.existsSync(sandbox)) {
    console.log("  skipped (it needs macOS's sandbox-exec to hide the browsers)");
    return;
  }

  const empty = fs.mkdtempSync(path.join(WORK, "no-browsers-"));
  const hidden = ["/Applications/Google Chrome.app", "/Applications/Google Chrome Beta.app", "/Applications/Microsoft Edge.app"];
  const profile = `(version 1)(allow default)${hidden.map((p) => `(deny file-read* (subpath "${p}"))`).join("")}`;
  const transport = new StdioClientTransport({ command: sandbox, args: ["-p", profile, process.execPath, path.join(pkg, "bin/rhp-mcp.js")], env: { PLAYWRIGHT_BROWSERS_PATH: empty }, stderr: "pipe" });
  const client = new Client({ name: "rhp-mcp-test", version: "1.0.0" });
  await client.connect(transport);

  try {
    const result = await client.callTool({ name: "rhp_check", arguments: { file: BAR } });
    ok(!result.isError && /\[no-browser\]/.test(textOf(result)) && /install-browser/.test(textOf(result)) && !imagesOf(result).length, "the report says there is no browser and how to install one");
    const guide = await client.callTool({ name: "rhp_guide", arguments: {} });
    ok(!guide.isError, "and the server keeps answering");
  } finally {
    await client.close();
  }
}

async function main() {

  const started = performance.now();
  buildPart();
  const pkg = packagePart();
  pluginPart();
  await serverPart(pkg);
  await noBrowserPart(pkg);

  console.log(`\n${failures.length ? `${failures.length} failed` : "all passed"} in ${(since(started) / 1000).toFixed(1)}s`);
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

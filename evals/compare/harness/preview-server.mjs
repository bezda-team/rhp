// Give every condition the same isolated browser, without launching it inside a CLI sandbox.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
const require = createRequire(import.meta.url);
const version = require("playwright-core/package.json").version;

export async function startPreview(project) {
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", "--save-dev", `playwright-core@${version}`], { cwd: project, stdio: "pipe" });
  const root = fs.realpathSync(project);
  const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
  const server = http.createServer((request, response) => {
    try {
      const file = path.resolve(root, "." + decodeURIComponent(new URL(request.url, "http://localhost").pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile() || !fs.realpathSync(file).startsWith(root + path.sep)) return response.writeHead(404).end();
      response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
    } catch { response.writeHead(400).end(); }
  }).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  let browserServer;
  try { browserServer = await chromium.launchServer({ headless: true, host: "127.0.0.1", executablePath: process.env.RENDER_BROWSER }); }
  catch (error) { server.close(); throw error; }
  const info = { endpoint: browserServer.wsEndpoint(), url: `http://127.0.0.1:${server.address().port}/poster.html`, playwrightVersion: version };
  fs.writeFileSync(path.join(project, "BROWSER.json"), JSON.stringify(info, null, 2));
  fs.writeFileSync(path.join(project, "browser.mjs"), `import fs from "node:fs";\nimport { chromium } from "playwright-core";\nconst { endpoint, url } = JSON.parse(fs.readFileSync(new URL("./BROWSER.json", import.meta.url)));\nexport { url };\nexport const browser = await chromium.connect(endpoint);\n`);
  return { ...info, close: async () => { await browserServer.close(); server.close(); } };
}

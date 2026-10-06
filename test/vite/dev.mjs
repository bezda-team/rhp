// Exercises development transforms and real application HMR, which a production Vite build cannot cover.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "vite";
import solid from "vite-plugin-solid";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "../..");

export async function runDevChecks({ browser, check }) {
  fs.mkdirSync(path.join(here, "out"), { recursive: true });
  const root = fs.mkdtempSync(path.join(here, "out/dev-"));
  let server, context;
  try {
    const link = path.join(here, "node_modules/@bezda/rhp");
    fs.mkdirSync(path.dirname(link), { recursive: true });
    if (!fs.existsSync(link)) fs.symlinkSync(path.relative(path.dirname(link), repo), link, "dir");
    for (const name of ["dev-app.jsx", "dev-entry.jsx"]) fs.copyFileSync(path.join(here, name), path.join(root, name));
    fs.writeFileSync(path.join(root, "index.html"), '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/dev-entry.jsx"></script></body></html>');
    server = await createServer({
      root, configFile: false, logLevel: "error", cacheDir: path.join(root, ".vite"),
      plugins: [solid({ ssr: true })],
      server: { host: "127.0.0.1", port: 0, strictPort: true, fs: { allow: [repo] } },
    });
    await server.listen();
    const resolved = await server.pluginContainer.resolveId("@bezda/rhp", path.join(root, "dev-app.jsx"));
    check("vite dev: package imports the Solid source", path.relative(repo, resolved.id), "dist/source/index.js");
    const transformed = await server.transformRequest("/dev-app.jsx");
    check("vite dev: application components retain Solid refresh", /@solid-refresh/.test(transformed.code) && /import\.meta\.hot\.accept/.test(transformed.code), true);

    context = await browser.newContext({ viewport: { width: 900, height: 600 } });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(30000);
    page.on("pageerror", (e) => errors.push(e.message));
    const address = server.httpServer.address();
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.waitForFunction(() => document.querySelector("#dev-line .rhp-plot > svg.rhp-line") && document.querySelector("#dev-area .rhp-plot > svg.rhp-area"));
    check("vite dev: direct Line and Area are native SVG slat roots", await page.evaluate(() => ["line", "area"].map((kind) => {
      const plot = document.querySelector(`#dev-${kind} .rhp-plot`), node = plot.firstElementChild;
      return [plot.children.length, node instanceof SVGElement, node.localName, node.classList.contains(`rhp-${kind}`), node.getAttribute("data-rhp-o")];
    })), [[1, true, "svg", true, "h"], [1, true, "svg", true, "h"]]);
    const changed = [[20, 40], [60, 50], [80, 90]];
    await page.evaluate((points) => {
      window.devLine = document.querySelector("#dev-line .rhp-line");
      window.devArea = document.querySelector("#dev-area .rhp-area");
      window.setDevPoints(points);
    }, changed);
    await page.waitForFunction(() => document.querySelector("#dev-line .rhp-line").style.getPropertyValue("--rhp-from") === "20"
      && document.querySelector("#dev-area .rhp-area").style.getPropertyValue("--rhp-to") === "80");
    check("vite dev: direct SVG roots update reactively in place", await page.evaluate(() => {
      const line = document.querySelector("#dev-line .rhp-line"), area = document.querySelector("#dev-area .rhp-area");
      return [line === window.devLine, area === window.devArea, line.querySelector(".rhp-stroke").getAttribute("d"), area.querySelector("path").getAttribute("d")];
    }), [true, true, "M0.0,1000.0L666.7,800.0L1000.0,0.0", "M0.0,1000.0L0.0,600.0L666.7,500.0L1000.0,100.0L1000.0,1000.0Z"]);

    await page.evaluate(() => { window.devDocumentMarker = "same-document"; });
    const app = path.join(root, "dev-app.jsx");
    fs.writeFileSync(app, fs.readFileSync(app, "utf8").replace('<p id="hmr-revision">before</p>', '<p id="hmr-revision">after</p>'));
    await page.waitForFunction(() => document.getElementById("hmr-revision")?.textContent === "after");
    check("vite dev: application HMR updates without reloading the document", await page.evaluate(() => [document.getElementById("hmr-revision").textContent, window.devDocumentMarker]), ["after", "same-document"]);
    await page.evaluate((points) => window.setDevPoints(points), [[5, 10], [30, 30], [70, 80]]);
    await page.waitForFunction(() => document.querySelector("#dev-line .rhp-line").style.getPropertyValue("--rhp-from") === "5"
      && document.querySelector("#dev-area .rhp-area").style.getPropertyValue("--rhp-to") === "70");
    check("vite dev: SVG data updates still work after application HMR", await page.evaluate(() => [
      document.querySelector("#dev-line .rhp-stroke").getAttribute("d"),
      document.querySelector("#dev-area path").getAttribute("d"),
    ]), ["M0.0,1000.0L384.6,714.3L1000.0,0.0", "M0.0,1000.0L0.0,900.0L384.6,700.0L1000.0,200.0L1000.0,1000.0Z"]);
    check("vite dev: no page errors", errors, []);
  } finally {
    try {
      await context?.close();
    } finally {
      try {
        await server?.close();
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium, firefox, webkit } = await import("playwright");
  const engine = process.env.BROWSER ?? "chromium";
  const browser = await { chromium, firefox, webkit }[engine].launch(engine === "chromium" ? { executablePath: process.env.CHROMIUM || undefined } : {});
  let failed = 0;
  try {
    await runDevChecks({ browser, check: (name, got, want) => {
      const ok = JSON.stringify(got) === JSON.stringify(want);
      if (!ok) failed++;
      console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
    } });
  } finally {
    await browser.close();
  }
  process.exitCode = failed ? 1 : 0;
}

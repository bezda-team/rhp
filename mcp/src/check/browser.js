// The browser a check runs in, found in this order: the path in RHP_CHECK_BROWSER, Playwright's own Chromium (its
// headless shell first, this playwright-core's revision first), the system's Chrome, then Edge.
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);

// Where Playwright keeps its browsers
function playwrightCache() {

  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== "0") return process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (process.platform === "darwin") return path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData/Local"), "ms-playwright");

  return path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache"), "ms-playwright");
}

// The executables inside one of Playwright's browser folders
const EXECUTABLES = [
  "chrome-headless-shell", "chrome-headless-shell.exe", "chrome", "chrome.exe",
  "Chromium.app/Contents/MacOS/Chromium", "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
];

function executableIn(folder) {

  if (!fs.existsSync(folder)) return null;

  for (const sub of fs.readdirSync(folder)) {
    for (const name of EXECUTABLES) {
      const file = path.join(folder, sub, name);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
    }
  }

  return null;
}

// Playwright's Chromium builds on this machine, best first
function playwrightChromiums() {

  const cache = playwrightCache();
  if (!fs.existsSync(cache)) return [];

  let revision = null;
  try {
    revision = JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve("playwright-core/package.json")), "browsers.json"), "utf8")).browsers.find((b) => b.name === "chromium").revision;
  } catch {
    // an unknown layout: any revision will do
  }

  const folders = fs.readdirSync(cache).filter((f) => /^chromium(_headless_shell)?-\d+$/.test(f));
  const rank = (f) => [f.endsWith("-" + revision) ? 0 : 1, f.startsWith("chromium_headless_shell") ? 0 : 1, -Number(f.split("-").pop())];
  folders.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });

  return folders.map((f) => ({ folder: f, file: executableIn(path.join(cache, f)) })).filter((c) => c.file);
}

// Launches a headless browser, or returns { error } saying how to get one
export async function launch() {

  const tries = [];

  if (process.env.RHP_CHECK_BROWSER) tries.push({ name: `RHP_CHECK_BROWSER (${process.env.RHP_CHECK_BROWSER})`, options: { executablePath: process.env.RHP_CHECK_BROWSER } });

  for (const c of playwrightChromiums()) {
    tries.push({ name: `Playwright's ${c.folder.startsWith("chromium_headless_shell") ? "Chromium headless shell" : "Chromium"} (${c.folder})`, options: { executablePath: c.file } });
  }

  tries.push({ name: "Google Chrome", options: { channel: "chrome" } });
  tries.push({ name: "Microsoft Edge", options: { channel: "msedge" } });

  const failures = [];

  for (const t of tries) {
    try {
      const browser = await chromium.launch({ headless: true, ...t.options, args: ["--hide-scrollbars", "--disable-lcd-text"] });
      return { browser, name: `${t.name} ${browser.version()}` };
    } catch (e) {
      failures.push(`${t.name}: ${String(e.message ?? e).split("\n")[0]}`);
    }
  }

  return { error: failures };
}

export const NO_BROWSER_FIX = "Install a browser for checking: run `npx -y @bezda/rhp-mcp install-browser` (it downloads Playwright's Chromium), or install Google Chrome, or set RHP_CHECK_BROWSER to the path of a Chrome, Chromium or Edge executable.";

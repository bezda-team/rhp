// A minimal WebDriver client for real Safari (safaridriver): open a URL, run an async script, close.
import { spawn } from "node:child_process";
const PORT = 4468;
export async function withSafari(fn) {
  const driver = spawn("safaridriver", ["-p", String(PORT)], { stdio: "ignore" });
  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; ; i++) { try { await fetch(base + "/status"); break; } catch { if (i > 50) throw new Error("safaridriver didn't start"); await new Promise((r) => setTimeout(r, 100)); } }
  const call = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
    const j = await r.json();
    if (j.value?.error) throw new Error(`${j.value.error}: ${j.value.message}`);
    return j.value;
  };
  const { sessionId } = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari" } } });
  const s = `/session/${sessionId}`;
  try {
    await call("POST", s + "/window/rect", { width: 1440, height: 1000, x: 0, y: 0 });
    return await fn({
      goto: (url) => call("POST", s + "/url", { url }),
      element: async (css) => Object.values(await call("POST", s + "/element", { using: "css selector", value: css }))[0],
      actions: (list) => call("POST", s + "/actions", { actions: list }),
      exec: (body) => call("POST", s + "/execute/sync", { script: body, args: [] }),
      // run `body` (the text of an async function taking no arguments) and return what it resolves to
      run: (body) => call("POST", s + "/execute/async", { script: `const done = arguments[arguments.length - 1]; (async () => { ${body} })().then(done, (e) => done({ error: String(e) }));`, args: [] }),
    });
  } finally {
    await call("DELETE", s).catch(() => {});
    driver.kill();
  }
}

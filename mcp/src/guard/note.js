// Where the guard puts what it finds: globalThis.__rhpCheck.findings, which the checker reads from the page.
export const store = (globalThis.__rhpCheck ??= { findings: [] });
const seen = new Set();
let checking = 0;

export function note(level, code, message, fix) {

  const key = code + "\n" + message;
  if (seen.has(key)) return;

  seen.add(key);
  store.findings.push({ level, code, message, fix, source: "guard" });
}

// Whether a check is running: what the guard reads itself is not what the chart reads
export const busy = () => checking > 0;

// Runs a check, so that a check that fails on something unexpected never reaches the app
export function safely(f) {

  checking++;

  try {
    f();
  } catch {
    // a check never breaks the chart
  } finally {
    checking--;
  }
}

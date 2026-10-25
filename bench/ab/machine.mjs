// The machine's state, recorded with every round: what can make one round slower than another apart from the code.
import os from "node:os";
import { execFileSync } from "node:child_process";

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 5000 });
  } catch {
    return "";
  }
};

const cpuTimes = () => os.cpus().reduce((sum, cpu) => {
  sum.idle += cpu.times.idle;
  sum.total += Object.values(cpu.times).reduce((a, b) => a + b, 0);
  return sum;
}, { idle: 0, total: 0 });

let last = cpuTimes();

// macOS: thermal limits (pmset -g therm prints a CPU speed limit once the machine has been throttled) and the power
// source (on battery the machine may run slower)
export function state() {

  const now = cpuTimes();
  const idle = now.total > last.total ? (now.idle - last.idle) / (now.total - last.total) : null;
  last = now;
  const out = { at: new Date().toISOString(), load: os.loadavg().map((x) => +x.toFixed(2)), idleSinceLast: idle == null ? null : +(idle * 100).toFixed(1) };

  if (os.platform() === "darwin") {
    const therm = run("pmset", ["-g", "therm"]);
    const speed = therm.match(/CPU_Speed_Limit\s*=\s*(\d+)/);
    out.cpuSpeedLimit = speed ? +speed[1] : 100;
    out.thermalWarning = /No thermal warning level has been recorded/.test(therm) ? null : therm.trim().split("\n").slice(-3).join(" | ");
    const batt = run("pmset", ["-g", "batt"]);
    out.power = /AC Power/.test(batt) ? "AC" : /Battery Power/.test(batt) ? "battery" : "unknown";
    out.lowPower = /lowpowermode\s+1/.test(run("pmset", ["-g"]));
  }

  return out;
}

// Waits until the machine's CPUs have been at least `share` idle for `need` samples of `ms` in a row (at most `max` ms)
export async function quiet({ share = 0.85, need = 2, ms = 1000, max = 30000 } = {}) {

  let prev = cpuTimes();
  let ok = 0;
  const start = Date.now();
  const samples = [];

  while (Date.now() - start < max) {
    await new Promise((r) => setTimeout(r, ms));
    const now = cpuTimes();
    const idle = (now.idle - prev.idle) / (now.total - prev.total);
    prev = now;
    samples.push(+(idle * 100).toFixed(1));
    ok = idle >= share ? ok + 1 : 0;
    if (ok >= need) return { waited: Date.now() - start, samples, met: true };
  }

  return { waited: Date.now() - start, samples, met: false };
}

// Optional idle gate between adapters, outside every timing window.
import os from "node:os";

const snapshot = () => os.cpus().reduce((sum, cpu) => {
  sum.idle += cpu.times.idle;
  sum.total += Object.values(cpu.times).reduce((a, b) => a + b, 0);
  return sum;
}, { idle: 0, total: 0 });

export async function idleGate(label) {
  if (process.env.BENCH_IDLE !== "1") return null;
  const samples = [];
  let consecutive = 0, previous = snapshot();
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const current = snapshot();
    const idle = (current.idle - previous.idle) / (current.total - previous.total);
    samples.push({ at: new Date().toISOString(), idlePercent: +(idle * 100).toFixed(2) });
    previous = current;
    consecutive = idle >= 0.9 ? consecutive + 1 : 0;
    if (consecutive === 3) return { label, criterion: "At least 90% aggregate CPU idle for three consecutive 2-second samples", samples };
  }
  throw Object.assign(new Error(`${label}: machine did not meet the CPU idle criterion within 120 seconds`), { samples });
}

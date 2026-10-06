// Capture the exact local inputs alongside a benchmark result directory.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const directory = process.env.BENCH_RESULTS;
if (!directory) throw new Error("Set BENCH_RESULTS to a fresh result directory");
fs.mkdirSync(directory, { recursive: true });
const command = (...args) => execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const inputs = process.env.BENCH_INPUTS ?? ".";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const workspaceLock = JSON.parse(fs.readFileSync("../package-lock.json", "utf8"));
const bundles = Object.fromEntries(["out", "out-scale"].flatMap(dir => fs.readdirSync(path.join(inputs, dir)).filter(f => f.endsWith(".js") && !f.endsWith(".entry.js")).map(f => [path.join(dir, f), hash(path.join(inputs, dir, f))])));
const sourceFiles = [...new Set([
  ...command("git", "ls-files", "../src", "../mcp/src", "../skills/rhp", "libs", "scale").split("\n"),
  "build.mjs", "run.mjs", "scale.mjs", "harness.js", "safari.mjs", "idle.mjs", "snapshot.mjs",
  "package.json", "package-lock.json", "../package.json", "../package-lock.json",
])];
const snapshot = {
  date: new Date().toISOString(), platform: os.platform(), arch: os.arch(), os: os.release(), cpu: os.cpus()[0].model,
  logicalCPUs: os.cpus().length, memoryGiB: os.totalmem() / 2 ** 30, node: process.version, load: os.loadavg(),
  commit: command("git", "rev-parse", "HEAD"), dirty: !!command("git", "status", "--porcelain"),
  packages: Object.fromEntries(Object.entries(lock.packages).filter(([p]) => p.startsWith("node_modules/")).map(([p, v]) => [p.slice(13), v.version])),
  workspacePackages: Object.fromEntries(Object.entries(workspaceLock.packages).filter(([p]) => p.startsWith("node_modules/")).map(([p, v]) => [p.slice(13), v.version])),
  inputs, bundles, sourceHashes: Object.fromEntries(sourceFiles.map(f => [f, hash(f)])),
  idleGateEnabled: process.env.BENCH_IDLE === "1",
  notes: ["Local working tree, including pre-existing user CSS edits, the clipping/grid/checker fixes, and the scatter adapter's wrapper removal.",
    "No poster generation or other benchmark jobs run concurrently.",
    process.env.BENCH_IDLE === "1" ? "CPU idle gates are saved with each adapter/scenario; they establish idle baselines, not exclusive use of the machine." : "CPU idle gates are disabled. This run does not establish an idle-machine baseline."]
};
if (os.platform() === "darwin") snapshot.macos = { version: command("sw_vers", "-productVersion"), build: command("sw_vers", "-buildVersion") };
fs.writeFileSync(path.join(directory, "environment.json"), JSON.stringify(snapshot, null, 2));
fs.copyFileSync(path.join(inputs, "out/sizes.json"), path.join(directory, "sizes.json"));

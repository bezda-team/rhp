// Fresh, isolated repetitions of the planned conditions in a distinct model cohort.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runCodex, resumeCodex } from "./codex-runner.mjs";
import { startPreview } from "./preview-server.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const lab = path.resolve(here, "..");
const output = path.resolve(process.env.COHORT ?? path.join(lab, "results/codex-high-browser-20261005"));
const runs = process.env.RUNS ?? "/tmp/rhp-codex-high-browser-20261005";
const repetitions = Number(process.env.EVAL_REPS ?? 3);
const concurrency = Number(process.env.EVAL_CONCURRENCY ?? 3);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("EVAL_CONCURRENCY must be 1 through 4");
const model = "gpt-6-astra", effort = "high";
const sourcePlan = JSON.parse(fs.readFileSync(path.join(lab, "results/local-20261005/plan.json"), "utf8"));
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(runs, { recursive: true });
// Freeze the published rhp documentation before the local, unpublished API additions.
const frozenSkill = path.join(runs, "published-skill");
if (!fs.existsSync(frozenSkill)) {
  const archive = execFileSync("git", ["archive", "HEAD", "skills/rhp"], { cwd: path.join(lab, "../..") });
  fs.mkdirSync(frozenSkill, { recursive: true });
  execFileSync("tar", ["xf", "-", "--strip-components=2", "-C", frozenSkill], { input: archive });
}
const jobs = [];
for (let rep = 1; rep <= repetitions; rep++) {
  // Rotate the order to spread time-of-run effects across conditions.
  const offset = (rep - 1) * 6 % sourcePlan.conditions.length;
  for (const condition of [...sourcePlan.conditions.slice(offset), ...sourcePlan.conditions.slice(0, offset)]) jobs.push({ ...condition, rep });
}
const planFile = path.join(output, "plan.json");
const plan = fs.existsSync(planFile) ? JSON.parse(fs.readFileSync(planFile, "utf8")) : {
  created: new Date().toISOString(), model, effort, repetitions, jobs, status: "running", runs, concurrency,
  libraryScope: "Published packages and frozen matching skills; local source fixes are tested and benchmarked separately.",
  originalCohort: "Original six Sonnet max-effort runs are excluded from this cohort.",
  isolation: "Fresh ephemeral CLI session per run, user config/plugins/apps/global skills disabled, only condition MCP servers enabled.",
  browser: "Every condition has an identical dedicated Chromium server and project-local Playwright client. The sandboxed agent connects over localhost; browser startup happens in the evaluation harness. The earlier sandbox-limited pilot is excluded.",
  cost: "Exact CLI token usage; dollar cost unavailable for subscription-backed runs."
};
fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
const resultsFile = path.join(output, "runs.json");
const results = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")) : [];
plan.concurrency = concurrency;
fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
const queue = [...jobs];
async function worker() {
while (queue.length && !stopping) {
  const job = queue.shift();
  const id = `${job.poster}-${job.condition}-${model}-${job.rep}`;
  if (results.some(r => r.runId === id)) continue;
  const run = path.join(runs, id);
  if (!fs.existsSync(run)) execFileSync(process.execPath, [path.join(here, "make-task.mjs"), job.condition, job.poster, String(job.rep), model], {
    env: { ...process.env, RUNS: runs, HEADLESS: "1", EVAL_CLIENT: "codex", SANDBOX_NOTE: "0", RHP_SKILL: frozenSkill }, stdio: "pipe"
  });
  const existing = fs.existsSync(path.join(run, "transcript.jsonl"));
  const meta = JSON.parse(fs.readFileSync(path.join(run, "meta.json"), "utf8"));
  const project = path.join(run, "project");
  const servers = fs.existsSync(path.join(run, "mcp.json")) ? JSON.parse(fs.readFileSync(path.join(run, "mcp.json"), "utf8")).mcpServers : {};
  const prompt = fs.readFileSync(path.join(run, "TASK.md"), "utf8") + `
# Browser available to every condition

An isolated Chromium browser and a local web server are already running for this project.
Playwright is installed locally.
For browser work, import { browser, url } from './browser.mjs' in a Node script, create a page or context, and open url to preview poster.html.
The url serves files from this project only.
For example: const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); await page.goto(url); await page.screenshot({ path: 'desktop.png', fullPage: true }); await browser.close();
View screenshots with your image-viewing tool.
Each script can import browser.mjs to reconnect.
Use this connection instead of launching or installing another browser, which the CLI sandbox does not permit.

Use the installed tools as needed.
Do not launch subagents.
Do not write em dashes.
Do not read outside this run directory.
`;
  console.log(`START ${id}`);
  let result, preview;
  try {
    if (!existing) preview = await startPreview(project);
    result = existing ? await resumeCodex(run) : await runCodex({ directory: run, project, prompt, model, effort, servers });
  } finally { await preview?.close(); }
  const poster = path.join(project, "poster.html");
  const row = { ...meta, ...result, effort, done: true, hasPoster: fs.existsSync(poster), preview: preview ? { playwrightVersion: preview.playwrightVersion, access: "dedicated browser connection" } : null };
  if (row.hasPoster) {
    const bytes = fs.readFileSync(poster);
    row.posterBytes = bytes.length;
    row.sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    fs.mkdirSync(path.join(output, "posters"), { recursive: true });
    fs.copyFileSync(poster, path.join(output, "posters", `${id}.html`));
  }
  fs.writeFileSync(path.join(run, "meta.json"), JSON.stringify(row, null, 2));
  results.push(row);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`END ${id} ${row.status} poster=${row.hasPoster} ${Math.round(row.wallSeconds)}s ${JSON.stringify(row.usage)}`);
  // Account limits and access failures affect the whole cohort, not poster quality.
  if (row.status === "failed" && !row.usage) {
    plan.status = "blocked";
    plan.error = row.error;
    fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
    process.exitCode = 1;
    stopping = true;
    break;
  }
}
}
const workers = await Promise.allSettled(Array.from({ length: concurrency }, () => worker().catch(error => { stopping = true; throw error; })));
const failures = workers.filter(result => result.status === "rejected");
if (failures.length) {
  plan.status = "interrupted";
  plan.errors = failures.map(result => result.reason.message);
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
  throw new AggregateError(failures.map(result => result.reason), "Evaluation batch interrupted; completed attempts were preserved");
}
if (results.length === jobs.length) {
  plan.status = "complete";
  plan.completed = new Date().toISOString();
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
}

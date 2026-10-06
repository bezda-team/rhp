// Independent, freshly initialized judges see only an anonymous packet, never the key.
import fs from "node:fs";
import path from "node:path";
import { runCodex } from "./codex-runner.mjs";
import { validateScores } from "./judge-scores.mjs";
if (!process.env.JUDGING) throw new Error("Set JUDGING to the prepared packet directory");
const root = path.resolve(process.env.JUDGING);
const output = path.join(root, "sessions");
const concurrency = Number(process.env.JUDGE_CONCURRENCY ?? 3);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("JUDGE_CONCURRENCY must be 1 through 4");
const queue = fs.readdirSync(root).sort();
let stopping = false;
async function worker() {
while (queue.length && !stopping) {
  const name = queue.shift();
  const project = path.join(root, name);
  const instructions = path.join(project, "JUDGE.md");
  if (!fs.existsSync(instructions)) continue;
  const key = JSON.parse(fs.readFileSync(path.join(root, "keys", `${name}.json`), "utf8"));
  const scoresFile = path.join(project, "scores.json");
  if (fs.existsSync(scoresFile)) { validateScores(JSON.parse(fs.readFileSync(scoresFile, "utf8")), key); continue; }
  const directory = path.join(output, name);
  if (fs.existsSync(path.join(directory, "transcript.jsonl"))) throw new Error(`Uncollected judge attempt: ${directory}`);
  console.log(`START judge ${name}`);
  const result = await runCodex({ directory, project, model: "gpt-6-astra", effort: "high", prompt: fs.readFileSync(instructions, "utf8") + "\nWork only in this packet directory. Do not inspect parent or sibling folders, source HTML, or any external sources. Open every listed image with view_image. Judge independently from these images. Do not launch subagents. Do not write em dashes.\n" });
  fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify(result, null, 2));
  if (result.status !== "complete") throw new Error(`Judge ${name} failed: ${result.error}`);
  validateScores(JSON.parse(fs.readFileSync(scoresFile, "utf8")), key);
  console.log(`END judge ${name} ${Math.round(result.wallSeconds)}s`);
}
}
const workers = await Promise.allSettled(Array.from({ length: concurrency }, () => worker().catch(error => { stopping = true; throw error; })));
const failures = workers.filter(result => result.status === "rejected");
if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Independent judging interrupted; finished scores were preserved");

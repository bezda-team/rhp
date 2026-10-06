// Isolated, fresh CLI sessions for the separate Codex evaluation cohort.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { turnOutcome } from "./codex-accounting.mjs";

export const binary = process.env.EVAL_CODEX ?? "/Applications/ChatGPT.app/Contents/Resources/codex";
const skillRoots = [path.join(os.homedir(), ".codex/skills"), path.join(os.homedir(), ".agents/skills")].filter(fs.existsSync);
const globalSkills = skillRoots.length ? execFileSync("rg", ["--files", "--hidden", "-L", ...skillRoots], { encoding: "utf8" }).split("\n").filter(p => p.endsWith("/SKILL.md")).map(path.dirname) : [];

export function argumentsFor({ project, model = "gpt-6-astra", effort = "high", servers = {}, readOnly = false }) {
  const args = ["exec", "--ignore-user-config", "--skip-git-repo-check", "--ephemeral", "--sandbox", readOnly ? "read-only" : "workspace-write",
    "--disable", "plugins", "--disable", "apps", "--disable", "remote_plugin", "--disable", "multi_agent",
    "--enable", "skip_host_skill_discovery", "--json", "-C", project, "-m", model,
    "-c", `model_reasoning_effort=${JSON.stringify(effort)}`, "-c", "project_doc_max_bytes=0", "-c", 'web_search="disabled"',
    "-c", "sandbox_workspace_write.network_access=true", "-c", "sandbox_workspace_write.exclude_slash_tmp=true", "-c", "sandbox_workspace_write.exclude_tmpdir_env_var=true",
    "-c", `skills.config=[${globalSkills.flatMap(p => [p, path.join(p, "SKILL.md")]).map(p => `{path=${JSON.stringify(p)},enabled=false}`).join(",")}]`];
  for (const [name, config] of Object.entries(servers)) {
    args.push("-c", `mcp_servers.${name}.command=${JSON.stringify(config.command)}`, "-c", `mcp_servers.${name}.args=${JSON.stringify(config.args ?? [])}`, "-c", `mcp_servers.${name}.required=true`);
    for (const [key, value] of Object.entries(config.env ?? {})) args.push("-c", `mcp_servers.${name}.env.${key}=${JSON.stringify(value)}`);
  }
  return args;
}

export async function runCodex({ directory, prompt, ...options }) {
  fs.mkdirSync(directory, { recursive: true });
  const started = Date.now();
  fs.writeFileSync(path.join(directory, "prompt.txt"), prompt);
  const args = argumentsFor(options);
  const launchFile = path.join(directory, "launch.json");
  const launch = { binary, version: execFileSync(binary, ["--version"], { encoding: "utf8" }).trim(), args, started };
  fs.writeFileSync(launchFile, JSON.stringify(launch, null, 2));
  const transcript = path.join(directory, "transcript.jsonl");
  const out = fs.openSync(transcript, "w"), err = fs.openSync(path.join(directory, "stderr.log"), "w");
  let exitCode;
  try {
    exitCode = await new Promise((resolve, reject) => {
      const child = spawn(binary, [...args, "-"], { cwd: options.project, stdio: ["pipe", out, err] });
      fs.writeFileSync(launchFile, JSON.stringify({ ...launch, pid: child.pid }, null, 2));
      child.on("error", reject);
      child.on("exit", (code) => resolve(code));
      child.stdin.end(prompt);
    });
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
  return readResult(directory, { exitCode, started });
}

function readEvents(transcript) {
  const lines = fs.readFileSync(transcript, "utf8").split("\n");
  return lines.filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { if (index !== lines.length - 1) throw error; return null; }
  }).filter(Boolean);
}

function readResult(directory, { exitCode = null, started, resumed = false }) {
  const transcript = path.join(directory, "transcript.jsonl");
  const events = readEvents(transcript);
  const outcome = turnOutcome(events);
  const ended = resumed ? fs.statSync(transcript).mtimeMs : Date.now();
  return { exitCode, status: (exitCode === 0 || resumed) && outcome.success ? "complete" : "failed", started: new Date(started).toISOString(), ended: new Date(ended).toISOString(), wallSeconds: (ended - started) / 1000, resumed,
    usage: outcome.usage, costUSD: null, error: outcome.error, warnings: outcome.warnings, finalText: outcome.finalText, transcript };
}

// A stopped batch can adopt an already-running attempt without regenerating it.
export async function resumeCodex(directory) {
  const transcript = path.join(directory, "transcript.jsonl");
  const launch = JSON.parse(fs.readFileSync(path.join(directory, "launch.json"), "utf8"));
  const started = launch.started ?? fs.statSync(transcript).birthtimeMs;
  while (true) {
    const events = readEvents(transcript);
    if (events.some(e => ["turn.completed", "turn.failed"].includes(e.type))) return readResult(directory, { started, resumed: true });
    if (!launch.pid) throw new Error(`Cannot adopt an unfinished attempt without its process ID: ${directory}`);
    try { process.kill(launch.pid, 0); }
    catch { throw new Error(`Attempt stopped without a completion event: ${directory}`); }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

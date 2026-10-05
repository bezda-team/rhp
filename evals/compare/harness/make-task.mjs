// Prepares one run of the poster experiment: an empty project folder, the condition's tooling, and TASK.md, the
// instructions the agent reads first. Every condition gets the same task text and the same machine notes; only the
// "Your tools" section differs.
//   node make-task.mjs <condition> <poster id> <rep> [model]   prints the run folder
// condition is <library>-<tooling>: library rhp, apex, flint, amcharts or semiotic; tooling skill-mcp, skill, mcp or none.
// By default the MCP tools are reached through the bridge (mcpd.mjs), for agents that cannot have MCP servers added,
// such as the subagents of one Claude Code session; HEADLESS=1 writes mcp.json for a real MCP client instead
// (run-headless.sh), and TASK.md then holds only the request. RUNS is where runs go (the system's temp folder by
// default, outside this repository, since the agents must not read rhp's own source); RHP_SKILL is the rhp skill to
// install (this repository's skills/rhp by default).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const lab = path.join(here, "..");
const RUNS = process.env.RUNS ?? path.join(os.tmpdir(), "rhp-compare-runs");
const HEADLESS = !!process.env.HEADLESS;
const REPO = path.join(lab, "..", "..");
const [condition, posterId, rep = "1", model = "sonnet"] = process.argv.slice(2);

const posters = JSON.parse(fs.readFileSync(path.join(here, "..", "posters.json"), "utf8"));
const poster = posters.find((p) => p.id === posterId);
if (!poster) throw new Error(`no poster "${posterId}"`);

const SKILLS = path.join(lab, "skills");
const LIBS = {
  rhp: { name: "rhp (@bezda/rhp)", short: "rhp", skills: [{ name: "rhp", dir: process.env.RHP_SKILL ?? path.join(REPO, "skills/rhp") }], server: "rhp", port: 8790 },
  apex: { name: "ApexCharts", short: "ApexCharts", skills: [{ name: "apexcharts", dir: path.join(lab, "node_modules/apexcharts-skill") }], server: "apexcharts", port: 8790 },
  flint: { name: "Flint (flint-chart, Microsoft's chart language, which compiles to Vega-Lite and other renderers)", short: "Flint and the renderer it compiles to", skills: [{ name: "flint-chart-author", dir: path.join(SKILLS, "flint-chart-author") }, { name: "flint-theme-author", dir: path.join(SKILLS, "flint-theme-author") }], server: "flint", port: 8791 },
  amcharts: { name: "amCharts 5 (@amcharts/amcharts5)", short: "amCharts 5", skills: [{ name: "amcharts5", dir: path.join(SKILLS, "amcharts5-skill") }], server: "amcharts5", port: 8791 },
  semiotic: { name: "Semiotic (semiotic, a React chart library)", short: "Semiotic and React", skills: [{ name: "semiotic-charts", dir: path.join(SKILLS, "semiotic-charts") }], server: "semiotic", port: 8791 },
};
// condition = <lib>-<tooling>, tooling one of: skill-mcp, skill, mcp, none
const m = condition.match(/^(rhp|apex|flint|amcharts|semiotic)-(skill-mcp|skill|mcp|none)$/);
if (!m) throw new Error(`unknown condition "${condition}"`);
const lib = LIBS[m[1]];
const tooling = m[2];

const runId = `${posterId}-${condition}-${model}-${rep}`;
const run = path.join(RUNS, runId);
if (fs.existsSync(run)) throw new Error(`${run} exists`);
const project = path.join(run, "project");
fs.mkdirSync(project, { recursive: true });
fs.mkdirSync(path.join(run, "tools"), { recursive: true });

const frontmatter = (file) => {
  const text = fs.readFileSync(file, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  // description may be a folded block (>) or one line
  const block = fm.match(/^description:\s*>\s*\n((?:\s{2,}.*\n?)+)/m);
  return block ? block[1].split("\n").map((l) => l.trim()).filter(Boolean).join(" ") : fm.match(/^description:\s*(.+)$/m)?.[1].trim();
};

const sections = [];
if (tooling.includes("skill")) {
  const listed = [];
  for (const sk of lib.skills) {
    const dest = path.join(project, ".claude/skills", sk.name);
    fs.cpSync(sk.dir, dest, { recursive: true, filter: (src) => !path.relative(sk.dir, src).includes("node_modules") });
    listed.push({ ...sk, dest, description: frontmatter(path.join(dest, "SKILL.md")) });
  }
  const one = listed.length === 1;
  sections.push(`## ${one ? `The ${listed[0].name} Agent Skill` : `${lib.short}: ${listed.length} Agent Skills`} (installed in this project)

Claude Code lists ${one ? "this skill" : "these skills"} for you as:

${listed.map((sk) => `- ${sk.name}: ${sk.description}`).join("\n")}

${listed.map((sk) => `\`${sk.name}\` is installed at ${sk.dest}/.`).join(" ")} Before you write any code, read the SKILL.md of every skill that applies to this task and follow it; open the files a skill refers to (references, recipes, examples) from its folder when it tells you to. This is exactly what invoking a skill does.`);
}
if (tooling.includes("mcp") && HEADLESS) {
  const { SERVERS } = await import("./servers.mjs");
  fs.writeFileSync(path.join(run, "mcp.json"), JSON.stringify({ mcpServers: { [lib.server]: SERVERS[lib.server] } }, null, 2));
} else if (tooling.includes("mcp")) {
  const defs = JSON.parse(fs.readFileSync(path.join(here, "tools", `${lib.server}.json`), "utf8"));
  const caller = path.join(run, "tools", "mcp-call");
  fs.writeFileSync(caller, `#!/usr/bin/env bash\nexport MCPD_PORT=${lib.port}\nexec node ${path.join(here, "mcp-call.mjs")} ${lib.server} "$@" --images ${path.join(run, "mcp-images")}\n`);
  fs.chmodSync(caller, 0o755);
  sections.push(`## The ${lib.server} MCP server (connected)

${defs.instructions ? `The server's instructions:\n\n> ${defs.instructions}\n\n` : ""}Its tools are listed below as the MCP client lists them to you (name, description, input schema). Call a tool from Bash:

    ${caller} <tool name> '<arguments as JSON>'

for example \`${caller} ${defs.tools[0].name} '{}'\` (put a long JSON argument in a file and pass it as '$(cat file.json)'). It prints the tool's result. An MCP client shows the images in a tool's result to you inline; here each image is saved to a file and its path is printed instead, so open every image a result gives you with the Read tool, as part of reading that result.

\`\`\`json
${JSON.stringify(defs.tools.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })), null, 1)}
\`\`\``);
}
if (tooling === "none") sections.push(`No skill and no MCP server for ${lib.short} is installed: you have only the tools every coding agent has.`);

const request = `${poster.prompt.split("\n").map((l) => "> " + l).join("\n")}`;
const deliverable = `Make it with ${lib.name}. Save it as ${project}/poster.html: one self-contained HTML page that loads ${lib.short} from jsDelivr (https://cdn.jsdelivr.net/npm/...) and, if you like, fonts from Google Fonts. It should look good on a desktop and on a phone. When you are done, reply with your handoff to the user, in a few lines.`;
// The machine notes describe the sandbox the published runs used (CDNs blocked, npm reachable); SANDBOX_NOTE=0 drops them
const machine = process.env.SANDBOX_NOTE === "0" ? "" : `
# The machine (the same for every agent given this task)

- Node 22 and npm work, and the npm registry is reachable. A headless Chromium is installed for Playwright.
- This sandbox blocks CDNs (cdn.jsdelivr.net, unpkg.com) and most websites, so a page that loads a library from a CDN cannot load it here, though Google Fonts works. The user's own browser will load the page from jsDelivr as usual.
${HEADLESS ? "" : "- Use only the Bash, Read, Write, Edit, Glob and Grep tools. Do not use web search or web fetch, the Skill tool, subagents, workflows, artifacts, ToolSearch or any MCP tool: the tools named above are all you have, and they run from Bash.\n"}- Work only in ${run}${HEADLESS ? "" : " and the paths this file names"}. Nothing else on this machine belongs to the task: do not read any other folder.
`;
const task = HEADLESS
  ? `${request.replace(/^> /gm, "")}\n\n${deliverable}\n${machine}`
  : `# Your task

You are a coding agent working for a user. The project folder is ${project} (empty${tooling.includes("skill") ? " apart from the installed skill" : ""}). The user asked:

${request}

${deliverable}

# Your tools

${sections.join("\n\n")}
${machine}`;
fs.writeFileSync(path.join(run, "TASK.md"), task);
fs.writeFileSync(path.join(run, "meta.json"), JSON.stringify({ runId, condition, lib: m[1], tooling, poster: posterId, rep: Number(rep), model, created: new Date().toISOString() }, null, 2));
console.log(run);

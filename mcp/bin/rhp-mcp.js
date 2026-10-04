#!/usr/bin/env node
// rhp-mcp: the MCP server (no arguments), or a command (rhp-mcp --help lists them).
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [command, ...args] = process.argv.slice(2);

const USAGE = `rhp-mcp: make charts with rhp from an AI agent.

  rhp-mcp                     the MCP server, over stdio
  rhp-mcp check <file>        render a chart and report what is wrong with it (exit code 1 when it has errors)
      --widths 1280,390       page widths to check (the interaction pass runs at the first)
      --dark                  emulate a dark color scheme
      --no-interact           skip the interaction pass
      --format <format>       html, solid, react or module (found from the file when left out)
      --json                  print the whole result as JSON
      --out <dir>             where the screenshots go (left out: a folder in the system's temp dir, so nothing is
                              written next to the chart; the report gives each screenshot's path)
  rhp-mcp guide               print the rhp skill's guide (SKILL.md), for an agent with no skill installed
  rhp-mcp install-browser     download Chromium's headless shell for checking (when no Chrome, Edge or Chromium is found)
  rhp-mcp --version           print this package's version
`;

const FLAGS = ["--dark", "--no-interact", "--json"];
const VALUES = ["--widths", "--format", "--out"];
const FORMATS = ["html", "solid", "react", "module"];

function usageError(message) {

  process.stderr.write(`rhp-mcp: ${message}\n\n${USAGE}`);

  return 2;
}

async function runCheck(argv) {

  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return 0;
  }

  const files = [];
  const value = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (VALUES.includes(arg)) {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) return usageError(`${arg} needs a value`);
      value[arg] = argv[++i];
    } else if (arg.startsWith("-") && !FLAGS.includes(arg)) {
      return usageError(`check has no option ${arg}`);
    } else if (!arg.startsWith("-")) {
      files.push(arg);
    }
  }

  const widths = value["--widths"]?.split(",").map(Number);
  if (files.length !== 1) return usageError(files.length ? `check takes one file, not ${files.length}` : "check needs the chart's file");
  if (widths && !widths.every((w) => Number.isInteger(w) && w >= 200 && w <= 2560)) return usageError("--widths takes page widths in px from 200 to 2560, for example 1280,390");
  if (value["--format"] && !FORMATS.includes(value["--format"])) return usageError(`--format is one of ${FORMATS.join(", ")}`);

  const { check } = await import("../src/check/index.js");
  const result = await check({
    file: files[0],
    format: value["--format"],
    widths,
    dark: argv.includes("--dark"),
    interact: !argv.includes("--no-interact"),
    outDir: value["--out"],
  });

  process.stdout.write(argv.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : result.text);

  return result.ok ? 0 : 1;
}

// SKILL.md's body, after a line that says where the files it links are
async function printGuide() {

  const { SKILL_DIR, skillBody } = await import("../src/skill.js");
  process.stdout.write(`The references/ and recipes/ this guide links are in ${SKILL_DIR}\n\n${skillBody()}`);

  return 0;
}

// Playwright's Chromium headless shell, for the version of playwright-core this package uses (other browsers are kept)
async function installBrowser(argv) {

  const { spawnSync } = await import("child_process");
  const { createRequire } = await import("module");
  const cli = path.join(path.dirname(createRequire(import.meta.url).resolve("playwright-core/package.json")), "cli.js");
  const r = spawnSync(process.execPath, [cli, "install", "--only-shell", "--no-remove", ...argv, "chromium"], { stdio: "inherit" });

  return r.status ?? 1;
}

async function main() {

  if (command === undefined) {
    await import("../src/server.js");
    return null;
  }
  if (command === "check") return runCheck(args);
  if (command === "guide") return printGuide();
  if (command === "install-browser") return installBrowser(args);
  if (command === "--version" || command === "-v") {
    process.stdout.write(JSON.parse(fs.readFileSync(path.join(here, "../package.json"), "utf8")).version + "\n");
    return 0;
  }
  if (command === "--help" || command === "-h" || command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  return usageError(`no command "${command}"`);
}

main().then((code) => {
  if (code != null) process.exitCode = code;
}, (e) => {
  process.stderr.write(`rhp-mcp: ${e.stack ?? e}\n`);
  process.exitCode = 2;
});

// The MCP server, over stdio: the rhp skill's guide, references and recipes, and the checker, as four tools and one
// prompt. stdout carries the protocol, so everything else goes to stderr.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SKILL_DIR, skillBody, references, recipes, reference, recipe } from "./skill.js";

console.log = console.info = console.debug = console.error;

const { version } = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// A check that runs longer than this (in seconds) is stuck, a page in an endless loop: it is stopped and reported.
// Checks take 3 to 11 seconds; many clients stop waiting for a tool at 60.
const LIMIT = 50;

// The screenshots go back at most 1280px wide and 2000px tall: Claude refuses a request holding over 20 images when
// one is larger than 2000px, and a few checks reach 20 images
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 2000;

const INSTRUCTIONS = `rhp 2 (@bezda/rhp) makes charts out of HTML elements and CSS with SolidJS. It came out in September 2026, after your training data, so what you remember about rhp is wrong or belongs to the unrelated rhp 1. Before you write or change any rhp code, call rhp_guide and follow its workflow. Take each chart's technique from the closest recipe (rhp_recipe) and design the chart for its own subject, and look up every prop you are unsure of with rhp_reference instead of guessing. After every edit, call rhp_check with the chart file's absolute path, fix what it reports and look at its screenshots, until it reports no errors and no warnings.`;

const text = (body) => ({ content: [{ type: "text", text: body }] });
const failure = (body) => ({ content: [{ type: "text", text: body }], isError: true });

// The guide: SKILL.md with a note on reading it through this server, and the names the other tools take
function guide() {

  return [
    "You are reading the rhp skill through the rhp MCP server, so:",
    "- where it says to run the checker, call the rhp_check tool with the chart file's absolute path;",
    '- where it links a reference such as references/api.md, call rhp_reference with its name ("api");',
    '- where it names a recipe such as recipes/bar.html or `bar`, call rhp_recipe with its type ("bar").',
    "",
    skillBody().trimEnd(),
    "",
    "## The references and recipes this server returns",
    "",
    "rhp_reference names:",
    ...references().map((r) => `- ${r.name}: ${r.about}`),
    "",
    `rhp_recipe types: ${recipes().map((r) => r.type).join(", ")}. Call rhp_recipe with no type to see what each is for.`,
    "",
  ].join("\n");
}

function recipeList() {

  const all = recipes();

  return [
    `${all.length} recipes. Each is a complete, tested chart page: call rhp_recipe with its type, for example { "type": "bar" }, to get the whole file.`,
    "",
    ...all.map((r) => `- ${r.type}: "${r.title}". ${r.description}`),
    "",
  ].join("\n");
}

// One browser for every check: launched by the first, launched again if it died, closed when the server stops.
// With no browser, { error } (the check then reports how to install one).
let launched = null;

async function sharedBrowser() {

  const current = (launched ??= import("./check/browser.js").then(({ launch }) => launch()).catch((e) => ({ error: [String(e?.message ?? e)] })));
  const got = await current;
  if (got.browser?.isConnected()) return got;
  if (launched === current) launched = null;

  return got.browser ? sharedBrowser() : got;
}

// Closes a browser (the shared one when none is given), and forgets it when it is the shared one
async function closeBrowser(browser) {

  const shared = (await launched)?.browser;
  if (!browser || browser === shared) launched = null;
  await (browser ?? shared)?.close().catch(() => {});
}

// The screenshots as JPEG images, drawn again on a canvas in the browser
async function images(browser, shots) {

  const page = await browser.newPage();
  const out = [];

  try {
    for (const shot of shots) {
      const data = await page.evaluate(async ({ png, width, height }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + png;
        await img.decode();
        const k = Math.min(1, width / img.naturalWidth, height / img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * k);
        canvas.height = Math.round(img.naturalHeight * k);
        const g = canvas.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      }, { png: fs.readFileSync(shot.path).toString("base64"), width: MAX_WIDTH, height: MAX_HEIGHT });
      out.push({ shot, data });
    }
  } finally {
    await page.close().catch(() => {});
  }

  return out;
}

// Checks a chart: the report, then each screenshot as an image after a line saying what it shows
async function checkTool({ file, code, format, widths, dark, interact, settleTimeout }) {

  if (file && code) return failure("Give file or code, not both.");
  if (!file && !code) return failure("Give the chart to check: file (the absolute path of its file) or code (its code).");

  if (file) {
    if (file.startsWith("file:")) {
      try {
        file = fileURLToPath(file);
      } catch {
        return failure(`${file} is not a file URL this server can read. Give the chart file's absolute path.`);
      }
    }
    if (!path.isAbsolute(file)) return failure(`"${file}" is a relative path. Give the chart file's absolute path (for example /home/me/project/chart.html): this server runs in its own folder, not in your project, so it cannot tell which file a relative path means.`);
  }

  const { check } = await import("./check/index.js");
  const got = await sharedBrowser();
  const browser = got.browser;
  const running = check({ file, code, format, widths, dark, interact, settleTimeout, browser }).then((result) => ({ result }), (error) => ({ error }));
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(resolve, LIMIT * 1000, { late: true });
  });
  const done = await Promise.race([running, late]);
  clearTimeout(timer);

  if (done.late) {
    if (browser) await closeBrowser(browser);
    return failure(`The check stopped after ${LIMIT} seconds: the chart's page never finished. A page stuck in an endless loop does this (a loop whose end never comes, or an effect that keeps setting a signal it reads). Find it, fix it and check again.`);
  }
  if ("error" in done) {
    console.error(`rhp-mcp: the check failed: ${done.error?.stack ?? done.error}`);
    if (browser) await closeBrowser(browser);
    return failure(`The check failed before it could report: ${done.error?.message ?? done.error}. Call rhp_check again; it starts a new browser.`);
  }

  const result = done.result;
  const content = [{ type: "text", text: result.text }];
  const shots = [...result.screenshots].sort((a, b) => b.width - a.width || a.hover - b.hover);

  if (browser && shots.length) {
    try {
      const first = new Map();
      for (const { shot, data } of await images(browser, shots)) {
        const label = `Screenshot at ${shot.width}px${shot.dark ? ", dark" : ""}${shot.hover ? ", pointing at a slat" : ""}`;
        if (shot.hover && first.get(shot.width) === data) {
          content.push({ type: "text", text: `${label}: the same as the one above (pointing at a slat changed nothing visible).` });
          continue;
        }
        if (!shot.hover) first.set(shot.width, data);
        content.push({ type: "text", text: `${label}:` });
        content.push({ type: "image", data, mimeType: "image/jpeg" });
      }
    } catch (e) {
      console.error(`rhp-mcp: the screenshots could not be attached: ${e.message}`);
      content.push({ type: "text", text: "The screenshots could not be attached here: open them at the paths above and look at them." });
    }
  }

  return { content };
}

const server = new McpServer({ name: "rhp", title: "rhp charts", version }, { instructions: INSTRUCTIONS });

server.registerTool("rhp_guide", {
  title: "How to make charts with rhp",
  description: "Start here, before you write or change any rhp chart code. Returns how to make a chart with rhp 2 (@bezda/rhp): the workflow from the request to a checked chart, the rules that prevent most bugs, the code format, and the names of the references and recipes the other tools return. rhp 2 is newer than your training data, so call this first, once per conversation in which you make or change an rhp chart, and follow it.",
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async () => text(guide()));

server.registerTool("rhp_reference", {
  title: "rhp reference",
  description: "Returns one of rhp's references by name: api (every component, prop, helper and CSS variable, exactly), design (the editorial poster, looks, color, type, layout), interaction (which interaction for which story, with code), environments (plain HTML, Solid, React, Next.js, Vue, Svelte, Angular, Astro), forms (which chart for which data and story), pitfalls (mistakes and their fixes). Look props up here instead of guessing. A long reference comes back as its list of sections: call again with section to get the one you need.",
  inputSchema: {
    name: z.string().describe("The reference: api, design, environments, forms, interaction or pitfalls"),
    section: z.string().optional().describe('One "##" section of the reference, by its number or title, for example "4" or "Plot"'),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ name, section }) => {

  const got = reference(name, section);

  return got.error ? failure(got.error) : text(got.text);
});

server.registerTool("rhp_recipe", {
  title: "rhp recipe",
  description: 'Lists rhp\'s recipes (call it with no type), or returns one recipe\'s complete HTML file (type, for example "bar"). A recipe is a tested chart page that shows the technique for one kind of chart: take its technique (how its Plots, slats and blocks are composed, its interaction, its phone rules) and leave its design, which was made for its own subject.',
  inputSchema: {
    type: z.string().optional().describe('The recipe, for example "bar", "line" or "donut"; leave it out for the list'),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async ({ type }) => {

  if (type === undefined || !type.trim()) return text(recipeList());
  const got = recipe(type);

  return got.error ? failure(got.error) : text(got.text);
});

server.registerTool("rhp_check", {
  title: "Check an rhp chart",
  description: "Renders an rhp chart in a headless browser at 1280px and 390px wide, tries its interactions, and reports what is wrong: errors and warnings, each with what to change, then screenshots to look at. Call it after every edit to a chart until it reports no errors and no warnings, and look at the screenshots each time. Give file, the chart file's ABSOLUTE path (an .html page, a Solid or React .jsx/.tsx component, or a .js module that uses @bezda/rhp/standalone), or code when you cannot write files.",
  inputSchema: {
    file: z.string().optional().describe("The chart file's absolute path"),
    code: z.string().optional().describe("The chart's code, instead of a file, when you cannot write files"),
    format: z.enum(["html", "solid", "react", "module"]).optional().describe("What the code is; found from the file's extension and the code when left out"),
    widths: z.array(z.number().int().min(200).max(2560)).min(1).max(4).optional().describe("Page widths in px, [1280, 390] by default; the interactions are tried at the first, and slats are tapped at phone widths (600px or less)"),
    dark: z.boolean().optional().describe("Render with a dark color scheme (prefers-color-scheme: dark)"),
    interact: z.boolean().optional().describe("Try the chart's interactions (true by default)"),
    settleTimeout: z.number().int().min(100).max(30000).optional().describe("Maximum milliseconds per readiness wait, 10000 by default. Increase for a slow machine; the overall check still has a 50-second limit."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, checkTool);

server.registerPrompt("chart", {
  title: "Make a chart with rhp",
  description: "Make a chart with rhp, following rhp_guide, checked with rhp_check until it is clean",
  argsSchema: {
    request: z.string().describe("The chart: its subject and data, and anything about its look, interaction or framework"),
  },
}, ({ request }) => ({
  messages: [{
    role: "user",
    content: {
      type: "text",
      text: `Make this chart with rhp (@bezda/rhp): ${request}\n\nFirst call rhp_guide and follow its workflow: write the brief, take the technique from the closest recipe (rhp_recipe), design the chart for its own subject, and look up props with rhp_reference instead of guessing. After every edit, call rhp_check with the chart file's absolute path, fix what it reports and look at its screenshots, until it reports no errors and no warnings.`,
    },
  }],
}));

// Stop when the client goes: close the browser first, so no Chromium is left running
let stopping = false;

async function stop() {

  if (stopping) return;
  stopping = true;
  await closeBrowser();
  process.exit(0);
}

process.stdin.on("end", stop);
process.stdin.on("close", stop);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("unhandledRejection", (e) => console.error(`rhp-mcp: ${e?.stack ?? e}`));
server.server.onclose = stop;

await server.connect(new StdioServerTransport());
console.error(`rhp-mcp ${version}: ready, serving the skill in ${SKILL_DIR}`);

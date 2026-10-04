// The rhp skill's text, as the MCP server and `rhp-mcp guide` serve it: SKILL.md, its references and its recipes.
// In rhp's repository it is read from skills/rhp itself, so it is never stale; in the published package, from the copy
// `npm run build` makes in skill/.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, "../../skills/rhp");
const COPY = path.join(here, "../skill");

export const SKILL_DIR = fs.existsSync(path.join(REPO, "SKILL.md")) ? REPO : COPY;

// A reference longer than this comes back as its list of sections (it would cost the agent over 10,000 tokens)
const WHOLE = 40 * 1024;

const read = (file) => fs.readFileSync(path.join(SKILL_DIR, file), "utf8");
const kb = (text) => `${Math.max(1, Math.round(Buffer.byteLength(text) / 1024))} KB`;
const entities = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };
const decode = (text) => (text ?? "").replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => entities[e]);

// SKILL.md without its frontmatter
export function skillBody() {

  return read("SKILL.md").replace(/^---\n[\s\S]*?\n---\n+/, "");
}

// The references: [{ name, about, file }], about from SKILL.md's list of references, else the file's title
export function references() {

  const dir = path.join(SKILL_DIR, "references");
  const listed = new Map([...read("SKILL.md").matchAll(/^- \[[^\]]*\]\(references\/([\w-]+)\.md\):\s*(.+)$/gm)].map((m) => [m[1], m[2]]));

  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const name = f.slice(0, -3);
    const about = listed.get(name) ?? fs.readFileSync(path.join(dir, f), "utf8").match(/^# (.+)$/m)?.[1] ?? "";
    return { name, about, file: path.join(dir, f) };
  });
}

// The recipes: [{ type, title, description, file }]
export function recipes() {

  const dir = path.join(SKILL_DIR, "recipes");

  return fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort().map((f) => {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    return {
      type: f.slice(0, -5),
      title: decode(text.match(/<title>([^<]*)<\/title>/)?.[1]),
      description: decode(text.match(/<meta name="description" content="([^"]*)"/)?.[1]),
      file: path.join(dir, f),
    };
  });
}

// A markdown file's "## " sections, each with its first line of prose (headings inside code blocks don't count)
function sections(text) {

  const lines = text.split("\n");
  const found = [];
  let fenced = false;

  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && line.startsWith("## ")) found.push({ title: line.slice(3).trim(), start: i });
  });

  return found.map((s, k) => {
    const body = lines.slice(s.start, found[k + 1]?.start ?? lines.length);
    let inCode = false;
    const first = body.slice(1).find((line) => {
      if (/^\s*```/.test(line)) inCode = !inCode;
      return !inCode && line.trim() && !/^\s*(```|#|\||<!--)/.test(line);
    });
    return { title: s.title, first: first?.trim() ?? "", text: body.join("\n").trimEnd() + "\n" };
  });
}

// The section a query names: its number ("4"), its title ("Plot"), the start of its title, or words in it
function findSection(list, query) {

  const q = query.trim().toLowerCase().replace(/^§\s*/, "");
  const number = /^\d+\.?$/.test(q) ? parseInt(q, 10) : null;
  const title = (s) => s.title.toLowerCase().replace(/^\d+\.\s*/, "");

  return list.find((s) => number !== null && parseInt(s.title, 10) === number)
    ?? list.find((s) => title(s) === q)
    ?? list.find((s) => title(s).startsWith(q))
    ?? list.find((s) => s.title.toLowerCase().includes(q));
}

// One reference: { text } (the whole file, its list of sections when it is long, or the section asked for) or { error }
export function reference(name, section) {

  const all = references();
  const key = String(name ?? "").trim().toLowerCase().replace(/^references\//, "").replace(/\.md$/, "");
  const ref = all.find((r) => r.name === key);
  if (!ref) return { error: `There is no reference "${name}". The references are:\n${all.map((r) => `- ${r.name}: ${r.about}`).join("\n")}` };

  const text = fs.readFileSync(ref.file, "utf8");
  const list = sections(text).filter((s) => !/^contents$/i.test(s.title));

  if (section !== undefined && section !== null && String(section).trim()) {
    const found = findSection(list, String(section));
    if (found) return { text: found.text };
    return { error: `references/${ref.name}.md has no section "${section}". Its sections are:\n${list.map((s) => `- ${s.title}`).join("\n")}` };
  }

  if (Buffer.byteLength(text) <= WHOLE || !list.length) return { text };

  const intro = text.slice(0, text.indexOf("\n## ") + 1).split("\n")
    .filter((line) => !/^Contents\b/.test(line) && !/^\s*(?:[-*]|\d+\.)\s*\[[^\]]*\]\(#/.test(line))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const pick = list[Math.min(3, list.length - 1)].title;
  const examples = [parseInt(pick, 10), pick.replace(/^\d+\.\s*/, "")].filter((x) => !Number.isNaN(x));

  return {
    text: [
      intro,
      "",
      `This reference is ${kb(text)}, too long to return whole, so here are its sections.`,
      `Ask for the ones you need: call rhp_reference again with name "${ref.name}" and section set to a section's number or title, for example ${examples.map((x) => `{ "name": "${ref.name}", "section": "${x}" }`).join(" or ")}.`,
      "",
      ...list.map((s) => `- ${s.title} (${kb(s.text)})${s.first ? `: ${s.first}` : ""}`),
      "",
    ].join("\n"),
  };
}

// One recipe's whole file: { text } or { error }
export function recipe(type) {

  const all = recipes();
  const key = String(type ?? "").trim().toLowerCase().replace(/^recipes\//, "").replace(/\.html$/, "").replace(/\s+/g, "-");
  const found = all.find((r) => r.type === key);
  if (!found) return { error: `There is no recipe "${type}". The recipes are: ${all.map((r) => r.type).join(", ")}. Call rhp_recipe with no type to see what each is for.` };

  return { text: fs.readFileSync(found.file, "utf8") };
}

// Fetches the competitors' official Agent Skills into skills/: amCharts 5 and Semiotic from their GitHub repositories,
// Flint's from its MCP package. rhp's and ApexCharts' skills come from npm (@bezda/rhp-mcp, apexcharts-skill).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const out = path.join(root, "skills");
const raw = (repo, file) => `https://raw.githubusercontent.com/${repo}/${file}`;

async function get(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return fs.readFileSync(dest, "utf8");
}

// amCharts 5: SKILL.md and every references/*.md it links
const am = await get(raw("amcharts/amcharts5-skill", "main/amcharts5-skill/SKILL.md"), path.join(out, "amcharts5-skill/SKILL.md"));
for (const ref of new Set(am.match(/references\/[\w./-]+\.md/g) ?? [])) {
  await get(raw("amcharts/amcharts5-skill", `main/amcharts5-skill/${ref}`), path.join(out, "amcharts5-skill", ref));
}
// Semiotic: the skill the library ships (the same file is in the package's agent-skill/ folder)
await get(raw("nteract/semiotic", "main/agent-skill/semiotic-charts/SKILL.md"), path.join(out, "semiotic-charts/SKILL.md"));
// Flint: the two skills its MCP server serves as resources
for (const name of ["flint-chart-author", "flint-theme-author"]) {
  const src = path.join(root, "node_modules/flint-chart-mcp/assets", `${name}.SKILL.md`);
  fs.mkdirSync(path.join(out, name), { recursive: true });
  fs.copyFileSync(src, path.join(out, name, "SKILL.md"));
}
console.log("skills in", out);

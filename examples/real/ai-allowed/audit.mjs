// Checks every claim the posters and post.txt make against the data the pages carry, and prints the numbers.
// usage: node audit.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageData = (file) => JSON.parse(fs.readFileSync(path.join(here, file), "utf8").match(/const DATA = (\{.*?\});\n/s)[1]);
const { readAt, projects } = pageData("ai-allowed-infographic.html");
const checked = JSON.parse(fs.readFileSync(path.join(here, "checked.json"), "utf8")).projects;
const failures = [];
const check = (ok, claim) => { if (!ok) failures.push(claim); };
const named = (name) => projects.find((p) => p.name === name);

// The population
check(projects.length === 50, "50 projects");
check(projects.every((p, i) => i === 0 || projects[i - 1].stars >= p.stars), "the 50 are in order of stars");
check(JSON.stringify(pageData("ai-allowed-chart.html").projects) === JSON.stringify(projects), "both posters carry the same data");

// The counts in the headlines, the keys and the post
const ai = projects.filter((p) => p.ai);
const others = projects.filter((p) => !p.ai);
const allow = others.filter((p) => p.stance === "allows");
const count = (xs, stance, basis) => xs.filter((p) => p.stance === stance && (!basis || p.basis === basis)).length;
check(ai.length === 21 && others.length === 29, "21 AI projects and 29 others");
check(ai.length + allow.length === 43, "43 of 50 use AI or are built for it");
check(allow.length === 22 && count(others, "allows", "policy") === 11 && count(others, "allows", "practice") === 11, "22 others allow it, 11 by policy and 11 in practice");
check(count(others, "forbids") === 1 && count(others, "limits") === 2, "yt-dlp forbids; Godot and Immich limit");
check(["yt-dlp", "Godot", "Immich"].every((n) => ["forbids", "limits"].includes(named(n).stance)), "the three that limit or forbid are named right");
check(count(others, "none") === 4 && ["Microsoft Activation Scripts", "scrcpy", "youtube-dl", "D3"].every((n) => named(n).stance === "none"), "the four with no sign are named right");
check(count(ai, "allows") === 20, "20 of the AI projects allow it");

// The chart's headline and the cards
for (const n of ["Linux", "React", "VS Code", "Flutter", "Go", "Kubernetes"]) check(named(n).stance === "allows" && !named(n).ai, `${n} allows AI-assisted code and is not an AI project`);
check(projects.slice(0, 16).some((p) => p.name === "VS Code"), "VS Code is among the chart's 16 bars");

// Every quote printed is part of what verify.mjs matched against the file
for (const p of projects) {
  const verified = checked[p.full].file?.quote ?? [];
  for (const words of [...(p.file?.quote ?? []), ...(p.file?.card ?? []), ...(p.file?.box ?? [])]) check(verified.some((q) => q.includes(words)), `${p.name}: "${words}" is verified`);
}

console.log(`Read ${readAt}: ${projects.length} projects, ${ai.length} AI projects (${count(ai, "allows")} allow AI-assisted code), ${others.length} others: ${allow.length} allow it (${count(others, "allows", "policy")} by policy, ${count(others, "allows", "practice")} in practice), ${count(others, "forbids")} forbids, ${count(others, "limits")} limit, ${count(others, "none")} show no sign. 50th: ${projects[49].name}, ${projects[49].stars} stars.`);
if (failures.length) {
  console.log(`${failures.length} failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("All checks pass");

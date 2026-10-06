// Preserve score evidence outside ignored working directories, with image hashes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = process.env.JUDGING, target = process.env.JUDGE_RESULTS;
if (!root || !target) throw new Error("Set JUDGING and JUDGE_RESULTS");
const scoreFile = path.join(root, "scores.json");
const scores = JSON.parse(fs.readFileSync(scoreFile, "utf8"));
const sessions = [];
for (const name of [...new Set(scores.map(s => s.judging))]) {
  const packet = path.join(root, name);
  const session = path.join(root, "sessions", name);
  const result = JSON.parse(fs.readFileSync(path.join(session, "result.json"), "utf8"));
  const launch = JSON.parse(fs.readFileSync(path.join(session, "launch.json"), "utf8"));
  const images = Object.fromEntries(fs.readdirSync(packet).filter(f => f.endsWith(".jpg")).map(f => [f, crypto.createHash("sha256").update(fs.readFileSync(path.join(packet, f))).digest("hex")]));
  const notes = JSON.parse(fs.readFileSync(path.join(packet, "scores.json"), "utf8")).notes;
  const evidenceFile = path.join(root, "keys", `${name}.evidence.json`);
  const redactionEvidence = fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile, "utf8")) : null;
  sessions.push({ packet: name, key: JSON.parse(fs.readFileSync(path.join(root, "keys", `${name}.json`), "utf8")), model: launch.args[launch.args.indexOf("-m") + 1], effort: "high", cli: launch.version, images, redactionEvidence, notes, result });
}
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "judging.json"), JSON.stringify({ collected: new Date().toISOString(), method: "Independent ephemeral model sessions; anonymous shuffled entries; visible library credit text and identifiable logos hidden in separate screenshots. Visual style may reveal the library. Desktop and phone crops follow the fixed rubric.", scores, sessions }, null, 2));

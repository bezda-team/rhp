// Reads the Super Mario Bros. Any% (NTSC) leaderboard from speedrun.com and the world record history from Wikipedia,
// works out each run's frames off a perfect run, checks the two sources agree, and writes data.json.
// usage: node fetch-data.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = "om1m3625"; // Super Mario Bros. on speedrun.com
const ANY = "w20p0zkn"; // its Any% category
const NTSC = "var-onvvdymn=013zwgxq"; // the Version subcategory: NTSC (the main board)
const PERFECT = 294.265; // 4:54.265, the fastest tool-assisted run within the real-time rules (2019), thought to be the best possible
const FPS = 60.0988; // the NES's frame rate (NTSC)

const get = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "rhp-example/1.0 (https://github.com/bezda/rhp)" } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
};

// The top of the board, each runner's best verified run
const board = (await get(`https://www.speedrun.com/api/v1/leaderboards/${GAME}/category/${ANY}?${NTSC}&top=12&embed=players`)).data;
const names = Object.fromEntries(board.players.data.map((p) => [p.id, p.names?.international ?? p.name]));
const runs = board.runs.map(({ place, run }) => {
  const seconds = run.times.primary_t;
  const off = (seconds - PERFECT) * FPS;
  // Times are whole frames, printed to the millisecond: anything else means the perfect time or the frame rate is wrong
  if (Math.abs(off - Math.round(off)) > 0.1) throw new Error(`${run.weblink}: ${off} frames is not a whole number`);
  return {
    place,
    runner: run.players.map((p) => names[p.id] ?? p.name).join(" & "),
    seconds,
    frames: Math.round(off),
    date: run.date,
    run: run.weblink,
    video: run.videos?.links?.at(-1)?.uri ?? null,
  };
}).filter((r) => r.place <= 10);

// The world record history, from Wikipedia's table (the page's own sources are the runs and the press)
const wiki = await get("https://en.wikipedia.org/w/api.php?action=parse&page=Super_Mario_Bros._speedrunning&prop=wikitext&format=json&formatversion=2");
const table = wiki.parse.wikitext.split("== Any% world record progression ==")[1].split("|}")[0];
const records = table.split("\n|-").slice(1).map((row) => {
  const cells = row.split("\n|").slice(1).map((c) => c.replace(/\{\{efn[^}]*\}\}/g, "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").trim());
  return { date: cells[0], time: cells[1], runner: cells[2] };
}).filter((r) => /^\d:\d\d\.\d{3}$/.test(r.time));
const seconds = (time) => { const [m, s] = time.split(":"); return +m * 60 + +s; };
const record = records.at(-1), previous = records.at(-2);
if (record.runner !== runs[0].runner || seconds(record.time) !== runs[0].seconds) throw new Error(`Wikipedia's record (${record.runner} ${record.time}) is not the board's first run`);

const data = {
  retrieved: new Date().toLocaleDateString("en-CA"), // the local date, YYYY-MM-DD
  game: "Super Mario Bros. (NES, 1985)",
  category: "Any%, NTSC",
  board: "https://www.speedrun.com/smb1",
  perfect: PERFECT,
  fps: FPS,
  runs,
  previous: { runner: previous.runner, seconds: seconds(previous.time), frames: Math.round((seconds(previous.time) - PERFECT) * FPS), date: previous.date },
  records: records.map((r) => ({ ...r, seconds: seconds(r.time) })),
  sources: {
    leaderboard: `https://www.speedrun.com/api/v1/leaderboards/${GAME}/category/${ANY}?${NTSC}`,
    history: "https://en.wikipedia.org/wiki/Super_Mario_Bros._speedrunning#Any%_world_record_progression",
    perfect: "https://kotaku.com/speedrunner-smashes-a-computer-assisted-super-mario-bro-1834457319",
    record: "https://www.polygon.com/super-mario-bros-niftski-speedrun-world-record/",
  },
};
fs.writeFileSync(path.join(here, "data.json"), JSON.stringify(data, null, 1) + "\n");
for (const r of runs) console.log(`${String(r.place).padStart(2)} ${r.runner.padEnd(16)} ${r.seconds.toFixed(3)} ${String(r.frames).padStart(3)} frames  ${r.date}`);
console.log(`previous record: ${data.previous.runner} ${previous.time} (${data.previous.frames} frames off), ${previous.date}`);

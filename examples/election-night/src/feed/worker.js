// The feed, in a worker: it downloads the results files (the House's is 9 MB), reads them and posts the page only
// what it draws, so the page never parses them itself.
//   in:  { type: "watch", id, slug }  a race page is open: its file every 15 s (id null: none)
//   out: { type: "overview", ... }, { type: "race", ... }, { type: "status", ... }

import { race, closingTimes, control, countyShifts, counties, timeline, voteTypes, officeFile, raceFile } from "./normalize.js";
import { SOURCES, applyCalls, keyOf } from "./desks.js";

const EVERY = { S: 20000, G: 20000, H: 45000 };
const RACE_EVERY = 15000;

const files = {};
const due = { S: 0, G: 0, H: 0 };
let closings = {};
let watched = null;
let raceDue = 0;
let failures = 0;
let busy = false;

// The other desks' calls, key -> org -> { party, last, at }. A desk's file gives no call time, so a call is timed
// when this page first sees it; calls already made when the page opened are marked "before" that time.
const deskCalls = {};
let seen = {};
let deskDue = 0;
let desk = "any";
let firstDeskRead = true;

async function get(url) {

  // no-cache revalidates with the CDN (a 304 when nothing changed) instead of downloading again
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function overview() {

  const races = [];

  for (const office of ["S", "G", "H"]) {
    for (const r of files[office]?.races || []) {
      if (r.top_reporting_unit?.level === "national") continue;
      const x = race(r, closings);
      races.push(applyCalls(x, deskCalls[keyOf(x)] || {}, desk));
    }
  }

  const ctrl = {
    S: control("S", races, files.S),
    G: control("G", races, null),
    H: control("H", races, files.H),
  };
  const updated = ["S", "G", "H"].map((o) => files[o]?.resultsMeta?.resultsUpdatedAt).filter(Boolean).sort().pop() || null;
  const houseVotes = files.H?.partyControlData?.results?.[0]?.offices?.H?.party_balance;
  const popular = houseVotes ? { D: houseVotes.DEM?.votes || 0, R: houseVotes.GOP?.votes || 0, I: houseVotes.OTH?.votes || 0 } : null;

  postMessage({
    type: "overview",
    races,
    control: ctrl,
    closings,
    shifts: files.H ? countyShifts(files.H) : [],
    seen,
    popular,
    updatedAt: updated,
    fetchedAt: new Date().toISOString(),
  });
}

async function refreshOffice(office) {

  files[office] = await get(officeFile(office));
  if (office === "S") closings = closingTimes(files.S);
}

async function refreshDesks() {

  const now = new Date().toISOString();
  const fresh = {};

  for (const [org, src] of Object.entries(SOURCES)) {
    if (!src.read) continue;
    for (const url of src.files) {
      try {
        const calls = src.read(await get(url));
        for (const [key, call] of Object.entries(calls)) {
          const id = `${org}:${key}:${call.last}`;
          if (!seen[id]) seen[id] = { at: now, before: firstDeskRead };
          ((fresh[key] ||= {})[org] = { ...call, at: seen[id].at, before: seen[id].before });
        }
      } catch {
        // A desk that fails keeps its last calls; the AP's results go on
        for (const [key, calls] of Object.entries(deskCalls)) {
          if (calls[org]) (fresh[key] ||= {})[org] = calls[org];
        }
      }
    }
  }

  firstDeskRead = false;
  for (const key of Object.keys(deskCalls)) {
    delete deskCalls[key];
  }
  Object.assign(deskCalls, fresh);
}

async function refreshRace() {

  if (!watched) return;
  const { id, slug } = watched;
  const file = await get(raceFile(slug));
  if (watched?.id !== id) return;
  const r = file.races.find((x) => x.nyt_id === id) || file.races[0];
  const x = race(r, closings);
  postMessage({
    type: "race",
    id,
    race: applyCalls(x, deskCalls[keyOf(x)] || {}, desk),
    counties: counties(r),
    timeline: timeline(file, r.nyt_id),
    voteTypes: voteTypes(r),
  });
}

async function tick() {

  if (busy) return;
  busy = true;
  const now = Date.now();
  const offices = ["S", "G", "H"].filter((o) => due[o] <= now);
  let changed = false;

  try {
    // The Senate's file first: it carries the poll closing times every race reads
    if (offices.includes("S") || !files.S) {
      await refreshOffice("S");
      due.S = now + EVERY.S;
      changed = true;
    }
    for (const o of offices.filter((o) => o !== "S")) {
      await refreshOffice(o);
      due[o] = now + EVERY[o];
      changed = true;
    }
    if (deskDue <= now) {
      deskDue = now + EVERY.S;
      await refreshDesks();
      changed = true;
    }
    if (changed) overview();
    if (watched && raceDue <= now) {
      raceDue = now + RACE_EVERY;
      await refreshRace();
    }
    failures = 0;
    postMessage({ type: "status", ok: true, at: new Date().toISOString(), next: Math.min(due.S, due.G) });
  } catch (err) {
    failures++;
    // Try again soon, a little later after each failure
    for (const o of offices) {
      due[o] = now + Math.min(60000, 5000 * failures);
    }
    postMessage({ type: "status", ok: false, error: String(err.message || err), at: new Date().toISOString(), next: now + 5000 * failures });
  }
  busy = false;
}

onmessage = (e) => {

  const m = e.data;
  if (m.type === "watch") {
    watched = m.id ? { id: m.id, slug: m.slug } : null;
    raceDue = 0;
    if (watched) refreshRace().catch(() => {});
  }
  if (m.type === "seen") {
    seen = { ...m.seen, ...seen };
  }
  if (m.type === "desk") {
    desk = m.desk;
    if (files.S) overview();
    if (watched) refreshRace().catch(() => {});
  }
  if (m.type === "now") {
    for (const o of Object.keys(due)) {
      due[o] = 0;
    }
  }
};

tick();
setInterval(tick, 2500);

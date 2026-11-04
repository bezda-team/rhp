// The page's copy of the feed, and the night's events found by comparing each update with the one before.

import { createSignal, createMemo, createRoot, batch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import FeedWorker from "./worker.js?worker&inline";

export const [feed, setFeed] = createStore({
  races: [],
  control: { S: null, G: null, H: null },
  closings: {},
  shifts: [],
  popular: null,
  updatedAt: null,
  fetchedAt: null,
});

export const [detail, setDetail] = createStore({ id: null, race: null, counties: [], timeline: [], voteTypes: {} });
export const [status, setStatus] = createSignal({ ok: true, at: null, next: null });
export const [events, setEvents] = createSignal([]);
export const [toasts, setToasts] = createSignal([]);
export const ready = () => feed.races.length > 0;
// When each race's count last changed, for the flash that shows where new votes just came in
export const [changed, setChanged] = createStore({});

const byId = createRoot(() => createMemo(() => new Map(feed.races.map((r) => [r.id, r]))));
export const raceById = (id) => byId().get(id);

const worker = new FeedWorker();

// When this browser first saw each desk's calls (the desks' files carry no call time), kept across reloads
const SEEN = "election-night-2026-seen";
try {
  worker.postMessage({ type: "seen", seen: JSON.parse(localStorage.getItem(SEEN) || "{}") });
} catch {
  worker.postMessage({ type: "seen", seen: {} });
}

// Whose calls the page counts: the first desk to call a race ("any"), or one desk
export const [desk, setDeskSignal] = createSignal((() => {
  try {
    return localStorage.getItem("election-night-desk") || "any";
  } catch {
    return "any";
  }
})());
worker.postMessage({ type: "desk", desk: desk() });
export function setDesk(d) {

  setDeskSignal(d);
  try {
    localStorage.setItem("election-night-desk", d);
  } catch {}
  worker.postMessage({ type: "desk", desk: d });
}
let previous = null;
let describeEvent = null;
export const setDescribe = (fn) => (describeEvent = fn);
let demoed = false;
const KEEP = "election-night-2026-events";

// Events seen live (lead changes, first votes) are kept in this browser, so a reload keeps the night's wire.
// Calls and poll closings come back from the feed itself.
function stored() {

  try {
    return JSON.parse(localStorage.getItem(KEEP) || "[]");
  } catch {
    return [];
  }
}

function store(list) {

  try {
    localStorage.setItem(KEEP, JSON.stringify(list.filter((e) => e.kind === "lead" || e.kind === "first").slice(0, 300)));
  } catch {}
}

// Is a race worth a notification? Every Senate and governor race, and the competitive House ones.
const notable = (r) => r.office !== "H" || r.closeness <= 2 || r.flip;

// One desk's call on a race
function callEvent(r, call, live, first) {

  const w = r.cands.find((c) => c.id === call.cand);
  const flip = r.holder && call.party !== r.holder;
  return {
    id: `call:${call.org}:${r.id}:${call.cand}`,
    kind: flip ? "flip" : "call",
    race: r.id,
    party: call.party,
    at: call.at || new Date().toISOString(),
    before: !!call.before,
    live,
    first,
    who: w ? `${w.first} ${w.last}` : null,
    cand: call.cand,
    by: call.org,
  };
}

// Poll closings: one event per closing time already past, naming its states
function closingEvents(closings, now) {

  const groups = {};
  for (const [st, t] of Object.entries(closings)) {
    if (Date.parse(t) <= now) (groups[t] ||= []).push(st);
  }

  return Object.entries(groups).map(([t, states]) => ({ id: `polls:${t}`, kind: "polls", at: t, states: states.sort(), live: false }));
}

function diff(races) {

  const now = Date.now();
  const found = [];

  if (!previous) {
    // The first update: rebuild the wire from what the feed already says, with no notifications
    for (const r of races) {
      if (r.uncontested) continue;
      r.calls.forEach((c, i) => found.push(callEvent(r, c, false, i === 0)));
    }
  } else {
    const bumped = {};
    for (const r of races) {
      const was = previous.get(r.id);
      if (!was) continue;
      if (was.total !== r.total || was.status !== r.status) bumped[r.id] = now;
      if (!r.uncontested) {
        for (const c of r.calls) {
          if (!was.calls.some((w) => w.org === c.org && w.cand === c.cand)) found.push(callEvent(r, c, !c.before, was.calls.length === 0 && c === r.calls.find((x) => !was.calls.some((w) => w.org === x.org))));
        }
      }
      if (r.office !== "H" && was.total === 0 && r.total > 0) {
        found.push({ id: `first:${r.id}`, kind: "first", race: r.id, at: new Date(now).toISOString(), live: true });
      }
      if (r.status === "counting" && was.leader && r.leader && was.leader !== r.leader && r.eevp >= 2 && notable(r)) {
        const lead = r.cands[0];
        found.push({ id: `lead:${r.id}:${now}`, kind: "lead", race: r.id, party: r.leader, who: `${lead.first} ${lead.last}`, cand: lead.id, eevp: r.eevp, at: new Date(now).toISOString(), live: true });
      }
    }

    if (Object.keys(bumped).length) setChanged(bumped);
  }

  previous = new Map(races.map((r) => [r.id, r]));
  return found;
}

function merge(found) {

  const seen = new Map([...stored(), ...events()].map((e) => [e.id, e]));
  for (const e of found) {
    if (!seen.has(e.id)) seen.set(e.id, e);
  }
  for (const e of closingEvents(feed.closings, Date.now())) {
    if (!seen.has(e.id)) seen.set(e.id, e);
  }
  // A call a desk no longer reports (taken back, or released by mistake) leaves the wire
  const standing = (e) => {
    if (e.kind !== "call" && e.kind !== "flip") return true;
    const r = raceById(e.race);
    return !r || r.calls.some((c) => e.id === `call:${c.org}:${r.id}:${c.cand}`);
  };
  const list = [...seen.values()].filter(standing).sort((a, b) => (a.at < b.at ? 1 : -1));
  setEvents(list);
  store(list);

  // In development, ?demo replays the latest calls as notifications, to see them without waiting for one
  if (import.meta.env.DEV && location.search.includes("demo") && !demoed && list.length) {
    demoed = true;
    notify(list.filter((e) => e.kind === "call" || e.kind === "flip").slice(0, 3).reverse());
  }

  // Notifications for what just happened, not for what the first update rebuilt
  // A race's first call notifies; later desks agreeing go to the wire only. A desk the reader chose notifies too.
  const fresh = found.filter((e) => e.live && notable(raceById(e.race) || {}) && (e.kind === "lead" || ((e.kind === "call" || e.kind === "flip") && (e.first || e.by === desk()))));
  if (fresh.length) notify(fresh, describeEvent);
}

// System notifications, once the reader asks for them: only while the page is in the background
export const [alerts, setAlerts] = createSignal(typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("election-night-alerts") === "on");

export async function askAlerts() {

  if (typeof Notification === "undefined") return;
  if (alerts()) {
    setAlerts(false);
    localStorage.setItem("election-night-alerts", "off");
    return;
  }
  const answer = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  setAlerts(answer === "granted");
  localStorage.setItem("election-night-alerts", answer === "granted" ? "on" : "off");
}

export const [unseen, setUnseen] = createSignal(0);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setUnseen(0);
});

let toastId = 0;
export function notify(list, describe) {

  const now = Date.now();
  if (document.hidden) {
    setUnseen((n) => n + list.length);
    if (alerts() && describe) {
      for (const e of list) {
        const d = describe(e);
        if (d) new Notification(d.text, { body: `${d.what}${d.small ? ` · ${d.small}` : ""}`, tag: e.id });
      }
    }
  }
  const add = [...list].sort((a, b) => (a.at < b.at ? 1 : -1)).map((e) => ({ ...e, toast: ++toastId, until: now + 10000 }));
  setToasts((t) => [...add, ...t].slice(0, 4));
}

export const dismiss = (toast) => setToasts((t) => t.filter((x) => x.toast !== toast));

setInterval(() => {
  const now = Date.now();
  if (toasts().some((t) => t.until <= now && !t.held)) setToasts((t) => t.filter((x) => x.until > now || x.held));
}, 1000);

worker.onmessage = (e) => {

  const m = e.data;
  if (m.type === "overview") {
    try {
      localStorage.setItem(SEEN, JSON.stringify(m.seen));
    } catch {}
    // A desk switch redraws the races, not the night: compare calls, which every desk keeps
    const found = diff(m.races);
    batch(() => {
      setFeed("races", reconcile(m.races, { key: "id" }));
      setFeed("control", reconcile(m.control));
      setFeed("closings", m.closings);
      setFeed("shifts", reconcile(m.shifts));
      setFeed("popular", m.popular);
      setFeed("updatedAt", m.updatedAt);
      setFeed("fetchedAt", m.fetchedAt);
    });
    merge(found);
  }
  if (m.type === "race" && m.id === detail.id) {
    batch(() => {
      setDetail("race", reconcile(m.race));
      setDetail("counties", reconcile(m.counties, { key: "id" }));
      setDetail("timeline", reconcile(m.timeline));
      setDetail("voteTypes", reconcile(m.voteTypes));
    });
  }
  if (m.type === "status") setStatus(m);
};

// A race page asks for its race's own file (counties, the count over time); null stops it
export function watch(r) {

  if (detail.id === (r?.id || null)) return;
  setDetail({ id: r?.id || null, race: null, counties: [], timeline: [], voteTypes: {} });
  worker.postMessage({ type: "watch", id: r?.id || null, slug: r?.slug || null });
}

// Poll closings pass between updates too: check every half minute
setInterval(() => merge([]), 30000);

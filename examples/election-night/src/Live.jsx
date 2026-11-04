// The live bug, the wire and the notifications

import { For, Show, createSignal, onCleanup, createMemo } from "solid-js";
import { status, events, toasts, dismiss, raceById, feed, setDescribe, alerts, askAlerts, desk, setDesk, liveDesks } from "./feed/store.js";
import { deskOf } from "./feed/desks.js";
import { et, etSec, etHour, PARTY, PARTIES, officeName } from "./format.js";
import { STATES } from "./feed/normalize.js";
import { portrait } from "./people.js";
import { go, raceLink } from "./route.js";

const [now, setNow] = createSignal(Date.now());
setInterval(() => setNow(Date.now()), 1000);
export { now };

export function LiveBug() {

  const left = () => {
    const s = status();
    if (!s.next) return 0;
    return Math.max(0, Math.min(1, (s.next - now()) / 20000));
  };
  return (
    <div class={status().ok ? "live" : "live off"} role="status" aria-live="off">
      <span class="dot" />
      {/* While a refresh fails: a short word on a narrow bar, so the bug keeps its width and its row */}
      <b>{status().ok ? "LIVE" : <><span class="long">RECONNECTING</span><span class="short">RETRY</span></>}</b>
      <span class="num">
        <Show when={feed.updatedAt} fallback="Loading results"><span class="as">Results as of </span>{etSec(feed.updatedAt)}<span class="as"> ET</span></Show>
      </span>
      <span class="ring" style={{ "--left": left() }} title="Next update" />
    </div>
  );
}

// One event as words: what kind it is, and its sentence
export function describe(e) {

  const r = e.race && raceById(e.race);
  // "the Alaska Senate race", "the Georgia governor's race", "Georgia 7"
  const where = r ? (r.office === "H" ? `${r.label}` : `the ${r.label} ${r.office === "S" ? "Senate" : "governor's"} race`) : "";
  if (e.kind === "polls") {
    return { what: "Polls close", text: `Polls have closed in ${e.states.length === 1 ? feedState(e.states[0]) : `${e.states.length} states`}`, small: e.states.join(", ") };
  }
  if (!r) return null;
  const seat = r.office === "H" ? `${r.label}` : `${r.label} ${r.office === "S" ? "Senate" : "governor"}`;
  if (e.kind === "call" || e.kind === "flip") {
    const verb = r.office === "G" ? "wins the governorship" : r.office === "S" ? "wins the Senate seat" : "wins the House seat";
    const cand = r.calls.find((c) => c.org === e.by)?.cand;
    const others = r.calls.filter((c) => c.org !== e.by && c.cand === cand).map((c) => c.org);
    const against = r.calls.filter((c) => c.cand !== cand).map((c) => c.org);
    const desk = e.by === "AP" ? "AP call" : `${e.by} projection`;
    return {
      big: r.office !== "H" || e.kind === "flip",
      key: r.office !== "H" || e.kind === "flip" || r.closeness <= 2,
      what: e.kind === "flip" ? `${desk} · ${PARTIES[e.party]} flip a seat` : `${desk} · ${officeName(r.office)}`,
      text: `${e.who} ${verb} in ${r.label}`,
      small: [
        e.kind === "flip" ? `A ${PARTY[e.party]} gain` : `${PARTY[e.party]}${r.holder === e.party ? " hold" : ""}`,
        others.length ? `also called by ${others.join(", ")}` : "",
        against.length ? `${against.join(", ")} called it the other way` : "",
      ].filter(Boolean).join(" · "),
      // The wire lists the desks as links instead
      plain: [
        e.kind === "flip" ? `A ${PARTY[e.party]} gain` : `${PARTY[e.party]}${r.holder === e.party ? " hold" : ""}`,
        against.length ? `${against.join(", ")} called it the other way` : "",
      ].filter(Boolean).join(" · "),
      party: e.party,
      source: { label: deskOf(e.by)?.source || e.by, href: deskOf(e.by)?.link(r) },
      // Every desk that called it this way, first one first, each linked to its own results page
      sources: r.calls.filter((c) => c.cand === cand).map((c) => ({ label: c.org, href: deskOf(c.org)?.link(r) })),
    };
  }
  if (e.kind === "lead") {
    return { big: true, key: true, what: `Lead change · ${officeName(r.office)}`, text: `${e.who} takes the lead in ${where}`, small: `${e.eevp}% of the expected vote counted`, party: e.party, source: { label: deskOf("AP").source, href: r.url } };
  }
  if (e.kind === "first") return { what: "First votes", text: `The first votes are in from ${where}`, small: "", source: { label: deskOf("AP").source, href: r.url } };
  return null;
}

const feedState = (st) => STATES[st] || st;
setDescribe(describe);

export function Wire(props) {

  const [only, setOnly] = createSignal(true);
  // One entry per call: the first desk's, with the desks that agreed after it; a desk that disagrees gets its own
  const shown = createMemo(() => {
    const seen = new Set();
    return events().filter((e) => {
      if (props.race && e.race !== props.race) return false;
      const d = describe(e);
      if (!d || (only() && !d.key && e.kind !== "polls" && e.kind !== "first")) return false;
      if (e.kind === "call" || e.kind === "flip") {
        const r = raceById(e.race);
        const first = r?.calls.find((c) => c.cand === e.cand);
        if (first && first.org !== e.by) return false;
        if (seen.has(`${e.race}:${e.cand}`)) return false;
        seen.add(`${e.race}:${e.cand}`);
      }
      return true;
    }).slice(0, props.limit || 80);
  });
  const first = Date.now();
  return (
    <aside class="wire" aria-label="The wire: tonight's calls and changes">
      <div class="wire-head">
        <h2>{props.title || "The wire"}</h2>
        <Show when={!props.race && typeof Notification !== "undefined"}>
          <button class={alerts() ? "bell on" : "bell"} aria-pressed={alerts()} onClick={askAlerts}
            title="Notifications for calls and flips while this page is in the background">
            {alerts() ? "Notifying" : "Notify me"}
          </button>
        </Show>
        <Show when={!props.race}>
          <div class="seg small" role="group" aria-label="Which events to list">
            <button aria-pressed={only()} onClick={() => setOnly(true)}>Key races</button>
            <button aria-pressed={!only()} onClick={() => setOnly(false)}>All</button>
          </div>
        </Show>
      </div>
      <Show when={shown().length} fallback={<p class="hint">{only() ? "No key race called yet. Calls, flips and lead changes appear here as they happen." : "Calls, flips and lead changes appear here as they happen."}</p>}>
        <ol>
          <For each={shown()}>
            {(e) => {
              const d = describe(e);
              const body = (
                <>
                  <span class={`what ${d.party || ""}`}>{d.what}</span>
                  <b>{d.text}</b>
                  <Show when={d.plain ?? d.small}><div class="hint">{d.plain ?? d.small}</div></Show>
                </>
              );
              return (
                <li class={`${e.live && Date.parse(e.at) >= first ? "new" : ""} ${d.big ? "big" : ""}`}>
                  <time datetime={e.at} title={e.before ? "Called before this page first saw it" : undefined}>{e.before ? "By " : ""}{et(e.at)} ET</time>
                  <div>
                    {e.race ? <a href={raceLink(e.race)}>{body}</a> : body}
                    <Show when={d.sources?.length} fallback={
                      <Show when={d.source?.href}>
                        {/* A space before it: kept when the link follows the title on its line, dropped when it starts one */}
                        {" "}<a class="src" href={d.source.href} target="_blank" rel="noopener">{d.source.label} ↗</a>
                      </Show>
                    }>
                      <div class="srcs">
                        <For each={d.sources}>{(x) => <a class="src" href={x.href} target="_blank" rel="noopener">{x.label} ↗</a>}</For>
                      </div>
                    </Show>
                  </div>
                </li>
              );
            }}
          </For>
        </ol>
      </Show>
    </aside>
  );
}

// "now", "2 min", "1 hr": how long ago, for a notification
const ago = (iso, t) => {
  const m = Math.floor((t - Date.parse(iso)) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr`;
};

export function Toasts() {

  return (
    <div class="toasts" aria-live="polite">
      <For each={toasts()}>
        {(t) => {
          const d = describe(t);
          if (!d) return null;
          const r = raceById(t.race);
          const c = r?.cands.find((x) => x.id === t.cand);
          const face = c && portrait(c.cid);
          const desk = t.kind === "lead" ? "Lead change" : t.by === "AP" ? "AP call" : `${t.by} projection`;
          return (
            <div class={`toast ${d.party || ""}`} role="status" tabindex="0"
              onClick={() => { dismiss(t.toast); if (t.race) go(raceLink(t.race)); }}
              onKeyDown={(e) => { if (e.key === "Enter") { dismiss(t.toast); if (t.race) go(raceLink(t.race)); } }}>
              <div class={`avatar ${d.party || ""}`} aria-hidden="true">
                <Show when={face} fallback={c ? `${c.first[0] || ""}${c.last[0] || ""}` : "•"}>
                  <img src={`./${face.file}`} alt="" />
                </Show>
              </div>
              <div class="body">
                <div class="meta">
                  <span class="pill">{desk}</span>
                  <span>{r ? (r.office === "H" ? r.short : `${r.stateName} ${r.office === "S" ? "Senate" : "governor"}`) : ""}</span>
                  <span class="when">{t.before ? `by ${et(t.at)} ET` : ago(t.at, now())}</span>
                </div>
                <div class="title">{d.text}</div>
                <div class="sub">
                  <Show when={d.small}><span>{d.small}</span></Show>
                  <Show when={d.source?.href}>
                    <a class="src" href={d.source.href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Source ↗</a>
                  </Show>
                </div>
              </div>
              <button class="x" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); dismiss(t.toast); }}>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
              </button>
            </div>
          );
        }}
      </For>
    </div>
  );
}

// Whose calls the page counts, everywhere: the first desk to call each race, or one desk
export function DeskSwitch() {

  return (
    <label class="desk">
      <span>Calls</span>
      <select value={desk()} onChange={(e) => setDesk(e.currentTarget.value)} aria-label="Whose race calls to count">
        <option value="any">First to call</option>
        <For each={liveDesks()}>{(d) => <option value={d.id}>{d.id === "AP" ? "AP only" : `${d.name} only`}</option>}</For>
      </select>
    </label>
  );
}

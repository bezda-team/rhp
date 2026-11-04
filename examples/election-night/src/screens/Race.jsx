// One race: its candidates, the count against the expected vote, how the lead moved, and its counties

import { Show, For, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { feed, raceById, watch, detail, ready, liveDesks } from "../feed/store.js";
import { officeLong, statusText, votes, pct, pts, short, et, etHour, sides, PARTY, PARTIES } from "../format.js";
import { officePage } from "../route.js";
import { Sources } from "./Nation.jsx";
import { Wire } from "../Live.jsx";
import { Board } from "../charts/Board.jsx";
import { Count, catchUp } from "../charts/race/Count.jsx";
import { LeadLine } from "../charts/race/LeadLine.jsx";
import { Counties } from "../charts/race/Counties.jsx";
import { Left } from "../charts/race/Left.jsx";
import { Cast, castRows } from "../charts/race/Cast.jsx";
import "../race.css";

import { portrait, person, hasPortraits } from "../people.js";

const CHAMBER = { S: "Senate", H: "House", G: "Governors" };
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");

// "the Georgia Senate race", "the governor's race in Georgia", "Georgia's 7th District"
function seatName(r) {

  if (r.office === "S") return `the ${r.stateName} Senate ${r.special ? "special election" : "race"}`;
  if (r.office === "G") return `the governor's race in ${r.stateName}`;
  return r.district && r.label.indexOf("at large") < 0 ? `${r.stateName}'s ${ordinal(r.district)} District` : `${r.stateName}'s at-large House seat`;
}

export function raceHeadline(r) {

  const [lead, next] = r.cands;
  const seat = seatName(r);
  if (r.status === "called") {
    const w = r.cands.find((c) => c.won) || lead;
    if (w.incumbent) return `${w.first} ${w.last} wins re-election${r.office === "H" ? ` in ${seat}` : ` in ${r.stateName}`}`;
    if (r.flip) return `${w.first} ${w.last} wins ${seat}, a ${PARTY[w.party]} gain`;
    return `${w.first} ${w.last} wins ${seat}`;
  }
  if (r.status === "runoff") return `${seat[0].toUpperCase()}${seat.slice(1)} heads to a runoff`;
  if (r.status === "counting") {
    if (!next) return `${lead.first} ${lead.last} leads with ${pct(r.eevp)} counted`;
    if (r.margin < 1) return `${lead.last} and ${next.last} are close with ${pct(r.eevp)} counted`;
    return `${lead.last} leads ${next.last} with ${pct(r.eevp)} counted`;
  }
  if (r.status === "closed") return `Polls have closed in ${r.stateName}. The count is about to begin.`;
  return r.closesAt ? `Polls in ${r.stateName} close at ${etHour(r.closesAt)}` : `${seat[0].toUpperCase()}${seat.slice(1)}`;
}

function statusLine(r) {

  const parts = [];
  const list = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);
  if (r.status === "called") parts.push(`Called by ${list(r.calledBy)}${r.calledAt ? `${r.calledBy.length > 1 ? "; first" : ""} at ${et(r.calledAt)}` : ""}`);
  if (r.total > 0) parts.push(`${pct(r.eevp)} of the expected vote counted`, `${votes(r.total)} votes`);
  else if (r.status === "upcoming" && r.closesAt) parts.push(`Polls close at ${etHour(r.closesAt)} Eastern`);
  if (r.updatedAt && r.total > 0) parts.push(`updated ${et(r.updatedAt)}`);
  return parts.join(" · ");
}

function Face(props) {

  const c = () => props.c;
  const p = () => portrait(c().cid);
  const [broken, setBroken] = createSignal(false);
  return (
    <div class={`face ${c().party}`} aria-hidden="true">
      <Show when={p() && !broken()} fallback={`${c().first[0] || ""}${c().last[0] || ""}`}>
        <img src={`./${p().file}`} alt="" loading="lazy" onError={() => setBroken(true)} />
      </Show>
    </div>
  );
}

function Candidate(props) {

  const c = () => props.c;
  const r = () => props.r;
  const color = () => ({ D: "var(--dem)", R: "var(--rep)", I: "var(--ind)" })[c().party];
  return (
    <div class={c().won ? "cand won" : "cand"} style={c().won ? { color: color() } : undefined}>
      <Face c={c()} />
      <div class="who" style={{ color: "var(--ink)" }}>
        {c().first} {c().last}
        <small>{c().partyName || PARTY[c().party]}{c().incumbent ? " · incumbent" : ""}</small>
      </div>
      <div class="share" style={{ color: "var(--ink)" }}>
        <Show when={r().total > 0} fallback={<span class="hint">No votes yet</span>}>
          {pct(c().pct)}<small>{votes(c().votes)}</small>
        </Show>
      </div>
      <Show when={c().won}><span class="check">✓ Won</span></Show>
      <Show when={c().runoff}><span class="check">Runoff</span></Show>
      <Show when={props.led != null && r().total > 0}>
        <div class="led">Leads in {props.led} of {props.units} {props.unit}</div>
      </Show>
      <Show when={person(c().cid)?.bio}>
        <p class="bio" style={{ color: "var(--ink-2)" }}>
          {person(c().cid).bio}
          <a href={person(c().cid).wiki} target="_blank" rel="noopener">Wikipedia ↗</a>
        </p>
      </Show>
    </div>
  );
}

// The 2024 presidential result here, and tonight's margin beside it
function then(r) {

  const p = r.pres24;
  const was = `In 2024, ${p >= 0 ? "Kamala Harris" : "Donald Trump"} won ${r.office === "H" ? "this district" : r.stateName} by ${pts(p)} points.`;
  if (!r.total || r.dm == null) return was;
  return `${was} Tonight the ${r.office === "S" ? "Senate" : r.office === "G" ? "governor's" : "House"} margin is ${r.dm >= 0 ? "D" : "R"}+${pts(r.dm)} with ${pct(r.eevp)} counted. Each dot below is a ${r.office === "H" ? "county part" : "county"}: across, its 2024 margin; up, its margin now.`;
}

// The race at a glance: the numbers a reader asks for first
function Glance(props) {

  const r = () => props.r;
  const pair = () => r().cands.slice(0, 2);
  const lead = () => (r().total && pair()[1] ? pair()[0].votes - pair()[1].votes : null);
  const done = () => props.units.filter((u) => u.eevp >= 95).length;
  const holder = () => r().cands.find((c) => c.incumbent);
  return (
    <dl class="glance">
      <Show when={lead() != null}>
        <div><dt>Margin</dt><dd>{votes(lead())}<small>{pair()[0].last} +{pts(r().margin)} points</small></dd></div>
      </Show>
      <div><dt>Counted</dt><dd>{r().total ? pct(r().eevp) : "–"}<small>{votes(r().total)} votes</small></dd></div>
      <Show when={r().total && r().remaining > 0}>
        <div><dt>Still expected</dt><dd>≈ {short(r().remaining)}<small>votes, by the AP's estimate</small></dd></div>
      </Show>
      <Show when={props.units.length > 1}>
        <div><dt>{props.unit[0].toUpperCase() + props.unit.slice(1)} done</dt><dd>{done()} of {props.units.length}<small>95% or more counted</small></dd></div>
      </Show>
      <div><dt>Seat held by</dt><dd>{holder() ? holder().last : "Open seat"}<small>{holder() ? `${PARTY[holder().party]}, running again` : "No incumbent on the ballot"}</small></dd></div>
      <div><dt>Rated before tonight</dt><dd>{r().ratingLabel}<small>{r().closesAt ? `Polls closed at ${etHour(r().closesAt)}` : ""}</small></dd></div>
    </dl>
  );
}

export function Race(props) {

  const r = () => raceById(props.id);
  createEffect(() => {
    if (r()) watch(r());
  });
  onCleanup(() => watch(null));
  const live = () => (detail.id === props.id ? detail : null);
  // The places the race reports by. New Hampshire also reports its cities' wards, inside towns already listed.
  const units = createMemo(() => (live() ? live().counties.filter((c) => c.level !== "ward") : []));
  const cast = createMemo(() => (live() ? castRows(r(), live().voteTypes) : []));
  const main = () => sides(r()).filter(Boolean);
  const minor = () => r().cands.filter((c) => !main().includes(c));
  const gap = createMemo(() => (r() ? catchUp(r()) : null));
  const others = createMemo(() => {
    const x = r();
    if (!x) return [];
    return feed.races
      .filter((o) => o.state === x.state && o.id !== x.id)
      .sort((a, b) => (a.office === "H") - (b.office === "H") || a.closeness - b.closeness || (a.district || 0) - (b.district || 0));
  });
  const [allOthers, setAllOthers] = createSignal(false);
  // How many counties each candidate leads
  const led = createMemo(() => {
    const out = {};
    for (const u of units()) {
      if (!u.total) continue;
      const [id] = Object.entries(u.votes).sort((a, b) => b[1] - a[1])[0] || [];
      if (id) out[id] = (out[id] || 0) + 1;
    }
    return out;
  });
  // What the race's results are reported by: counties, mostly
  const unit = () => {
    const level = units()[0]?.level;
    if (level === "state_house_district") return "districts";
    if (level === "township" || level === "city") return "towns";
    return r()?.office === "H" ? "county parts" : level === "county" ? "counties" : "areas";
  };

  return (
    <main class="page race-page">
      <Show when={r()} fallback={<p class="empty">{ready() ? "No such race." : "Loading results…"}</p>}>
        <nav class="crumbs">
          <a href="#/">Nation</a>
          <span><a href={`#/${officePage[r().office]}`}>{CHAMBER[r().office]}</a></span>
          <span>{r().label}</span>
        </nav>
        <section class="hero">
          <div>
            <div class="kicker">
              <Show when={r().status === "counting"}><span class="on">● Counting</span> · </Show>
              {r().stateName} · {officeLong(r())} · {r().ratingLabel}
            </div>
            <h1 class="headline">{raceHeadline(r())}</h1>
            <p class="byline status-line">{statusLine(r())}</p>
            <Show when={r().status !== "upcoming"}>
              <ul class="desks" aria-label="Calls by news organization">
                <For each={liveDesks()}>
                  {(d) => {
                    const call = () => r().calls.find((c) => c.org === d.id);
                    const cand = () => call() && r().cands.find((c) => c.id === call().cand);
                    return (
                      <li class={call() ? `called ${call().party}` : ""}>
                        <a href={d.link(r())} target="_blank" rel="noopener" title={`${d.source}, in a new tab`}>
                          <b>{d.id === "AP" ? "AP" : d.name}</b>
                          <Show when={call()} fallback={<span>Not called</span>}>
                            <span>✓ {cand()?.last} · {call().before ? "by " : ""}{et(call().at)}</span>
                          </Show>
                          <span class="out" aria-hidden="true">↗</span>
                        </a>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Show>

            <div class="ballot">
              <For each={main()}>{(c) => <Candidate c={c} r={r()} led={live() ? led()[c.id] || 0 : null} units={units().filter((u) => u.total > 0).length} unit={unit()} />}</For>
            </div>
            <Show when={minor().length}>
              <ul class="minor">
                <For each={minor()}>
                  {(c) => (
                    <li>
                      <span class={`tag ${c.party}`}>{c.party}</span> {c.first} {c.last}
                      <span class="hint"> · {c.partyName || PARTY[c.party]}</span>
                      <Show when={r().total > 0}><b class="num">{pct(c.pct)}</b></Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <Show when={r().total > 0}>
              <div class="race-block">
                <h2 class="h3">The count</h2>
                <Count race={r()} />
                <p class="lede count-text">
                  <Show when={gap()} fallback={r().status === "called" ? `${votes(r().total)} votes counted, ${pct(r().eevp)} of the vote the AP expects.` : ""}>
                    {(g) => (
                      <Show when={g().need != null} fallback={`${g().lead.last} leads by ${votes(g().lead.votes - g().next.votes)} votes, and the AP expects few or no votes left to count.`}>
                        About {short(g().remaining)} votes are left to count. {g().lead.last} leads by {votes(g().lead.votes - g().next.votes)}.{" "}
                        <Show when={g().need <= 100} fallback={`${g().next.last} would need more votes than the AP expects are left to catch up.`}>
                          {g().next.last} would need {Math.ceil(g().need)}% of them to catch up, after winning {Math.round(g().sofar)}% of the two candidates' votes so far.
                        </Show>
                      </Show>
                    )}
                  </Show>
                </p>
                <p class="hint">The expected vote is the AP's estimate of all the votes that will be counted; it changes through the night.</p>
              </div>
            </Show>
            <Glance r={r()} units={units()} unit={unit()} />
          </div>
          <Wire race={props.id} title="This race tonight" limit={30} />
        </section>

        <Show when={live() && live().timeline.length >= 2 && main().length === 2}>
          <section class="section">
            <div class="kicker">The night so far</div>
            <h2>How the lead moved</h2>
            <p class="lede">The margin between {main()[0].last} and {main()[1].last} after each batch of votes. Point at the chart to read any update; click to keep it.</p>
            <LeadLine race={r()} timeline={live().timeline} />
          </section>
        </Show>

        <Show when={live() && units().length > 1}>
          <section class="section">
            <div class="kicker">{unit() === "counties" || unit() === "county parts" ? "County by county" : unit() === "districts" ? "District by district" : "Town by town"}</div>
            <h2>Where each candidate is winning</h2>
            <p class="lede">
              The leader's margin in each of the {units().length} {unit()}, as counted so far.
              <Show when={units().some((c) => c.total > 0)} fallback=" No votes are counted yet."> Pale bars are still counting; solid ones have counted 95% of their expected vote.</Show>
            </p>
            <Counties race={r()} counties={units()} unit={unit()} />
          </section>
        </Show>

        <Show when={live() && units().filter((c) => c.remaining > 0).length >= 2 && r().total > 0 && r().status !== "called"}>
          <section class="section">
            <div class="kicker">Still to count</div>
            <h2>Where the vote is left</h2>
            <Left race={r()} counties={units()} />
          </section>
        </Show>

        <Show when={cast().length >= 2}>
          <section class="section cast">
            <div class="kicker">How the votes were cast</div>
            <h2>By mail, early and on election day</h2>
            <p class="lede">The share of each kind of vote counted so far that went to each of the two main candidates. Counties often count one kind before the others, which moves the lead through the night.</p>
            <Cast rows={cast()} />
          </section>
        </Show>

        <Show when={live() && units().some((c) => c.total > 0 && c.pres24 != null) && r().pres24 != null}>
          <section class="section secondary">
            <div class="kicker">For context</div>
            <h2>Compared with 2024</h2>
            <p class="lede">{then(r())}</p>
            <Counties race={r()} counties={units()} unit={unit()} compare={true} board={false} />
          </section>
        </Show>

        <Show when={others().length}>
          <section class="section">
            <div class="kicker">Also on the ballot</div>
            <h2>Other races in {r().stateName}</h2>
            <Board races={allOthers() ? others() : others().slice(0, 8)} tools={false} start={170} label={`Other races in ${r().stateName}`} />
            <Show when={others().length > 8}>
              <button class="more" onClick={() => setAllOthers(!allOthers())}>{allOthers() ? "Show fewer" : `All ${others().length} races in ${r().stateName}`}</button>
            </Show>
          </section>
        </Show>
      </Show>
      <Sources />
      <Show when={hasPortraits}>
        <p class="note portraits-credit">Candidate portraits: Wikimedia Commons, under free licenses (public domain, CC BY or CC BY-SA). Candidate introductions: the opening of each one's Wikipedia article (CC BY-SA), linked beside it.</p>
      </Show>
    </main>
  );
}

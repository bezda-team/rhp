// One chamber: its balance of power, the seats in order, and all its races

import { Show, For, createMemo, createSignal } from "solid-js";
import { feed, ready } from "../feed/store.js";
import { Board } from "../charts/Board.jsx";
import { TileMap } from "../charts/TileMap.jsx";
import { Ladder, tippingRace } from "../charts/chamber/Ladder.jsx";
import { SEAT } from "../charts/chamber/order.js";
import { Seats } from "../charts/chamber/Seats.jsx";
import { Swing } from "../charts/chamber/Swing.jsx";
import { Power, Sources } from "./Nation.jsx";
import { Wire } from "../Live.jsx";
import { chamber } from "../story.js";
import { PARTIES, pct, statusText } from "../format.js";
import { STATES } from "../feed/normalize.js";
import { narrow } from "../narrow.js";
import "../chamber.css";

const TITLE = { S: "Senate", H: "House", G: "Governors" };
const PAGE = { S: "senate", H: "house", G: "governors" };
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
const uncalled = (c) => c.open + c.leading.D + c.leading.R + c.leading.I;

// The headline: the finding of the moment, true for any state of the count
function headline(office, c, races) {

  const s = chamber(c);
  const name = office === "S" ? "the Senate" : "the House";
  if (office === "G") {
    const d = c.notUp.D + c.won.D + c.leading.D, r = c.notUp.R + c.won.R + c.leading.R;
    if (!races.some((x) => x.total > 0)) return "Thirty-six governor's races, and the count is about to begin";
    if (uncalled(c) === 0) return `${PARTIES[d > r ? "D" : "R"]} will hold ${Math.max(d, r)} governorships`;
    // Until half the races have votes, say only who leads where: the seats not up would decide an "on track"
    const a = c.won.D + c.leading.D, b = c.won.R + c.leading.R;
    if (a + b < 18) {
      if (a === b) return `Democrats and Republicans each lead in ${a} governor's ${a === 1 ? "race" : "races"} so far`;
      return a > b ? `Democrats lead in ${a} governor's races so far, Republicans in ${b}` : `Republicans lead in ${b} governor's races so far, Democrats in ${a}`;
    }
    return d === r ? "The governorships are split evenly in the count" : `${PARTIES[d > r ? "D" : "R"]} are on track to hold more governorships`;
  }
  if (s.decided) return `${PARTIES[s.decided]} ${s.decided === "R" ? "keep" : "win"} control of ${name}`;
  if (!races.some((x) => x.total > 0)) return `The count for ${name} is about to begin`;
  if (s.ifLeads) return `${PARTIES[s.ifLeads]} lead the count for ${name}`;
  return `Control of ${name} is too close to call`;
}

function dek(office, c, races) {

  const open = uncalled(c);
  if (office === "S") {
    const tip = tippingRace("S");
    const t = tip
      ? ` If every race went the way it leans now, the ${c.toWin.D}st seat would be ${tip.label}'s: ${tip.status === "called" ? `already called for ${tip.cands.find((x) => x.won)?.last}.` : tip.total > 0 ? `${tip.cands[0].last} leads there with ${pct(tip.eevp)} of the expected vote counted.` : `${statusText(tip).toLowerCase().replace(/\.$/, "")}.`}`
      : "";
    return `Democrats have ${c.notUp.D + c.won.D} seats, counting the ${c.notUp.D} not up tonight, and lead the count for ${c.leading.D} more; Republicans have ${c.notUp.R + c.won.R} and lead for ${c.leading.R}. ${n(open, "race is", "races are")} uncalled.${t}`;
  }
  if (office === "H") {
    const none = races.filter((r) => r.total === 0 && r.status !== "called").length;
    return `Democrats have won ${c.won.D} seats and lead the count in ${c.leading.D}; Republicans have won ${c.won.R} and lead in ${c.leading.R}. A majority takes 218. ${n(none, "district has", "districts have")} no results yet.`;
  }
  const d = c.notUp.D + c.won.D + c.leading.D, r = c.notUp.R + c.won.R + c.leading.R;
  return `If every lead held, Democrats would hold ${d} governorships and Republicans ${r}, counting the 14 not on the ballot tonight (${c.notUp.D} Democrats, ${c.notUp.R} Republicans). ${n(open, "race is", "races are")} uncalled.`;
}

export function Chamber(props) {

  const races = createMemo(() => feed.races.filter((r) => r.office === props.office));
  const c = () => feed.control[props.office];
  const uncalledFoot = (c) => `${uncalled(c)} of ${props.office === "H" ? c.total : props.office === "S" ? c.total - c.notUp.D - c.notUp.R - c.notUp.I : 36} races uncalled`;
  return (
    <main class="page chamber">
      <nav class="crumbs"><a href="#/">Nation</a><span>{TITLE[props.office]}</span></nav>
      <section class="hero">
        <div>
          <div class="kicker"><span class="on">● Live</span> · {props.office === "G" ? "Governors" : `U.S. ${TITLE[props.office]}`} · Nov. 3, 2026</div>
          <h1 class="headline">
            <Show when={ready() && c()} fallback={TITLE[props.office]}>{headline(props.office, c(), races())}</Show>
          </h1>
          <Show when={ready() && c()}>
            <p class="dek">{dek(props.office, c(), races())}</p>
          </Show>
          <div class="powers">
            <Power office={props.office} title={props.office === "G" ? "Governorships" : `${TITLE[props.office]} seats`} href={`#/${PAGE[props.office]}`}
              need={props.office === "S" ? "51 for Democrats, 50 for Republicans" : props.office === "H" ? "218 for a majority" : "50 governors"}
              foot={uncalledFoot} />
          </div>
          <Balance office={props.office} />
        </div>
        <Wire limit={narrow() ? 5 : 40} />
      </section>
      <Body office={props.office} races={races()} />
      <Sources />
    </main>
  );
}

const DEFAULT_VIEW = { S: "line", H: "grid", G: "grid" };

// The seats in a line (the path to a majority) or in a grid (a square each): the same seats, two ways
function Balance(props) {

  const key = `election-night-seats-${props.office}`;
  const saved = (() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  })();
  const [view, setView] = createSignal(saved === "line" || saved === "grid" ? saved : DEFAULT_VIEW[props.office]);
  const pick = (v) => {
    setView(v);
    try {
      localStorage.setItem(key, v);
    } catch {}
  };
  const majority = () => (props.office === "S" ? "51st seat" : props.office === "H" ? "218th seat" : "26th governorship");
  const notUp = () => (props.office === "S" ? " The 65 seats not up tonight sit at the two ends." : props.office === "G" ? " The 14 governors not up tonight sit at the two ends." : "");
  return (
    <div class="balance">
      <div class="balance-head">
        <h2 class="h3">{props.office === "G" ? "Every governorship, in order" : `Every ${props.office === "S" ? "Senate" : "House"} seat, in order`}</h2>
        <div class="seg" role="group" aria-label="Show the seats as">
          <button aria-pressed={view() === "line"} onClick={() => pick("line")}>Line</button>
          <button aria-pressed={view() === "grid"} onClick={() => pick("grid")}>Grid</button>
        </div>
      </div>
      <p class="hint balance-say">
        {view() === "line"
          ? `From the safest Democratic ${SEAT[props.office]} to the safest Republican one: called races at their winner's end, the rest by their margin in the count, leaning on the pre-election rating while little is counted.${notUp()} ${props.office === "H" ? `Each row continues the one above, numbered by its first seat. The ringed block is the ${majority()}` : `The flag marks the ${majority()}`}: the race there decides the majority if every other race goes the way it leans.`
          : `A square for each ${SEAT[props.office]}, grouped from the Democrats' side to the Republicans': ${props.office === "H" ? "" : "not up tonight, "}called, leading the count, no result, leading, called. The ringed square is the ${majority()}; when a race is called, its square moves to its winner's side.`}
      </p>
      <Show when={view() === "line"} fallback={<Seats office={props.office} />}>
        <Ladder office={props.office} />
      </Show>
    </div>
  );
}

const NOUN = { S: ["Senate race", "Senate races"], H: ["House race", "House races"], G: ["governor's race", "governor's races"] };

function Body(props) {

  const office = () => props.office;
  const flips = createMemo(() => props.races.filter((r) => (r.status === "called" && (r.flip || r.gained === true)) || wouldFlip(r)));
  const flipCount = () => {
    const out = { D: 0, R: 0, I: 0, would: 0 };
    for (const r of flips()) {
      if (r.status === "called") out[r.winner]++;
      else out.would++;
    }
    return out;
  };
  const seat = () => SEAT[office()];
  const [q, setQ] = createSignal("");
  const found = createMemo(() => {
    const t = q().trim().toLowerCase();
    if (!t) return office() === "H" ? props.races.filter((r) => r.closeness <= 1) : props.races;
    return props.races.filter((r) => match(r, t));
  });
  const shown = createMemo(() => found().slice(0, 60));

  return (
    <>
      <Show when={office() !== "H"}>
        <section class="section">
          <div class="kicker">The map</div>
          <h2>{office() === "S" ? "Senate races by state" : "Governor's races by state"}</h2>
          <Show when={office() === "G"}>
            <p class="lede">Thirty-six states elect a governor tonight. The other 14 governors are not up: Democrats in Delaware, Kentucky, New Jersey, North Carolina, Virginia and Washington, Republicans in Indiana, Louisiana, Mississippi, Missouri, Montana, North Dakota, Utah and West Virginia.</p>
          </Show>
          <div class="split">
            <TileMap office={office()} />
            <div class="side">
              <h3 class="h3">Called so far</h3>
              <Called races={props.races} />
            </div>
          </div>
        </section>
      </Show>

      <section class="section">
        <div class="kicker">Flips</div>
        <h2>{office() === "G" ? "Governorships changing hands" : "Seats changing hands"}</h2>
        <p class="lede">
          <Show when={flipCount().D + flipCount().R + flipCount().I + flipCount().would} fallback={`No ${seat()} has changed party yet, and no incumbent party trails the count in a race with a tenth of its vote counted.`}>
            {flipCount().D + flipCount().R + flipCount().I ? `Democrats have flipped ${n(flipCount().D, seat(), `${seat()}s`)} and Republicans ${flipCount().R}.` : "No race has been called as a flip yet."}
            <Show when={flipCount().would}>
              {" "}In {n(flipCount().would, `${flipCount().D + flipCount().R + flipCount().I ? "more " : ""}${NOUN[office()][0]}`, `${flipCount().D + flipCount().R + flipCount().I ? "more " : ""}${NOUN[office()][1]}`)}, the party holding the {seat()} trails the count with at least a tenth of the expected vote counted.
            </Show>
          </Show>
          {" "}An open {seat()} counts once a desk calls it and the AP marks it a gain.
        </p>
        <Show when={flips().length}>
          <Board races={flips()} office={office()} label={`${NOUN[office()][1]} changing hands`} hint="Called flips, and races where the party holding the seat trails the count. Click a race to open it." />
        </Show>
      </section>

      <section class="section">
        <div class="kicker">{office() === "H" ? "Find a district" : "Every race"}</div>
        <h2>All {props.races.length} {NOUN[office()][1]}</h2>
        <div class="search">
          <input type="search" placeholder={office() === "H" ? "A state, a district (TX-28) or a candidate" : "A state or a candidate"}
            aria-label={`Find a ${NOUN[office()][0]}`} value={q()} onInput={(e) => setQ(e.currentTarget.value)} />
          <span class="hint num">
            {q().trim()
              ? `${n(found().length, "race matches", "races match")}${found().length > 60 ? ", the first 60 shown" : ""}`
              : office() === "H" ? `The ${found().length} closest races before tonight. Search to find any of the 435.` : `All ${found().length} races. Search by state or candidate.`}
          </span>
        </div>
        <Board races={shown()} office={office()} label={NOUN[office()][1]} empty="No race matches." hint="Click a race to open it." />
      </section>

      {/* Governor's races turn on the candidates far more than on the presidential vote (Vermont keeps electing a
          Republican), so the governors' page has no comparison with 2024 */}
      <Show when={office() !== "G"}>
      <section class="section">
        <div class="kicker">Compared with 2024</div>
        <h2>Tonight against the 2024 presidential vote</h2>
        <p class="lede">Each dot is a {office() === "H" ? "district" : "state's Senate race"}: across, how {office() === "H" ? "it" : "the state"} voted for president in 2024; up, the margin tonight. Dots above the dashed line are running more Democratic than in 2024, dots below it more Republican. Partial counts can lean one way while early or mail votes are counted first.</p>
        <Swing office={office()} />
      </section>
      </Show>
    </>
  );
}

// The called races of a chamber, as a short list of winners
function Called(props) {

  const called = createMemo(() => props.races.filter((r) => r.status === "called" && !r.uncontested).sort((a, b) => (a.calledAt < b.calledAt ? 1 : -1)));
  return (
    <Show when={called().length} fallback={<p class="hint">No race has been called yet.</p>}>
      <ul class="called">
        <For each={called()}>
          {(r) => {
            const w = () => r.cands.find((x) => x.won);
            return (
              <li>
                <a href={`#/race/${encodeURIComponent(r.id)}`}>
                  <span class={`tag ${r.winner}`}>{r.winner}</span>
                  <b>{r.label}</b> {w() ? `${w().first} ${w().last}` : ""}
                  <Show when={r.flip}> <span class="chip flip">Flip</span></Show>
                </a>
              </li>
            );
          }}
        </For>
      </ul>
    </Show>
  );
}

const wouldFlip = (r) => r.status === "counting" && r.holder && r.leader && r.leader !== r.holder && r.eevp >= 10;

// A search matches a state's name or postal code, a district (TX-28, TX 28, Texas 28) or a candidate's name
function match(r, t) {

  const code = t.replace(/\s+/g, "").replace("-", "");
  if (`${r.state}${r.district ?? "al"}`.toLowerCase() === code) return true;
  if (r.state.toLowerCase() === t || STATES[r.state].toLowerCase().startsWith(t)) return true;
  if (r.label.toLowerCase().startsWith(t)) return true;
  return r.cands.some((c) => `${c.first} ${c.last}`.toLowerCase().includes(t));
}

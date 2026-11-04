// The nation: who is winning each chamber, what just happened, and the races that decide it

import { Show, For, createMemo, createSignal } from "solid-js";
import { feed, ready, liveDesks } from "../feed/store.js";
import { Control, seats } from "../charts/Control.jsx";
import { Board } from "../charts/Board.jsx";
import { TileMap } from "../charts/TileMap.jsx";
import { Wire, now } from "../Live.jsx";
import { Shift } from "../charts/Shift.jsx";
import { Calls } from "../charts/Calls.jsx";
import { Engagement } from "../Engagement.jsx";
import { etHour } from "../format.js";
import { nationHeadline, nationDek, popular } from "../story.js";
import { pts, votes } from "../format.js";

const key = (r) => r.closeness <= 2 || r.rating == null;

export function Power(props) {

  const c = () => feed.control[props.office];
  const s = () => seats(c());
  const flag = () => (props.office === "S" ? "50" : props.office === "H" ? "218" : "26");
  return (
    <Show when={c()}>
      <a class="power" href={props.href}>
        <div class="power-head">
          <h3>{props.title}</h3>
          <span>{props.need}</span>
        </div>
        <div class="power-nums">
          <span class="d"><b class="num">{s().D}</b> Dem.<Show when={s().leadD}><small class="num"> · leading {s().leadD}</small></Show></span>
          <Show when={s().I || s().leadI}><span class="i"><b class="num">{s().I}</b> Ind.<Show when={s().leadI}><small class="num"> · leading {s().leadI}</small></Show></span></Show>
          <span class="r"><Show when={s().leadR}><small class="num">leading {s().leadR} · </small></Show>Rep. <b class="num">{s().R}</b></span>
        </div>
        <Control c={c()} flag={flag()} label={`${props.title}: Democrats ${s().D}, Republicans ${s().R}`} />
        <div class="power-foot hint">{props.foot(c())}</div>
      </a>
    </Show>
  );
}

export function Nation() {

  const [mapOffice, setMapOffice] = createSignal("S");
  const senate = createMemo(() => feed.races.filter((r) => r.office === "S" && key(r)));
  const governors = createMemo(() => feed.races.filter((r) => r.office === "G" && key(r)));
  const house = createMemo(() => feed.races.filter((r) => r.office === "H" && r.closeness <= 1));
  const pop = () => popular(feed.popular);
  const uncalled = (c) => c.open + c.leading.D + c.leading.R + c.leading.I;

  return (
    <main class="page">
      <section class="hero">
        <div class="hero-main">
          <div class="kicker"><span class="on">● Live</span> · Midterm elections · Nov. 3, 2026</div>
          <h1 class="headline">
            <Show when={ready()} fallback="Election night 2026">{nationHeadline(feed.control, feed.races)}</Show>
          </h1>
          <Show when={ready()}>
            <p class="dek">{nationDek(feed.control)}</p>
          </Show>
          <p class="byline">Vote counts from The Associated Press, race calls from {liveDesks().length} news organizations, updated every 20 seconds. All times Eastern.</p>
          <Engagement />
          <Next />
          <div class="powers">
            <Power office="S" title="Senate" href="#/senate" need="51 for Democrats, 50 for Republicans"
              foot={(c) => `${uncalled(c)} of ${c.total - c.notUp.D - c.notUp.R - c.notUp.I} races uncalled · ${c.notUp.D + c.notUp.R + c.notUp.I} seats not up this year`} />
            <Power office="H" title="House" href="#/house" need="218 for a majority"
              foot={(c) => `${uncalled(c)} of ${c.total} races uncalled${c.flips.D + c.flips.R ? ` · flips: Dem. ${c.flips.D}, Rep. ${c.flips.R}` : ""}`} />
            <Power office="G" title="Governors" href="#/governors" need="36 races tonight"
              foot={(c) => `${uncalled(c)} of 36 races uncalled · ${c.notUp.D + c.notUp.R} governors not up this year`} />
          </div>
          <Show when={pop()}>
            {(p) => (
              <p class="hint pop">
                House popular vote so far: <b class={p().lead === "D" ? "d" : "r"}>{p().lead === "D" ? "Democrats" : "Republicans"} +{pts(p().margin)}</b> of {p().total} votes counted.
              </p>
            )}
          </Show>
        </div>
        <Wire limit={60} />
      </section>

      <section class="section" id="senate-races">
        <div class="kicker">The Senate</div>
        <h2>The races that decide the Senate</h2>
        <p class="lede">The toss-ups, the leaning races and the special elections. Each bar is a candidate's share of the votes counted so far: pale while the count goes on, solid once the race is called.</p>
        <Board races={senate()} office="S" label="Key Senate races" />
      </section>

      <section class="section" id="calls">
        <div class="kicker">The decision desks</div>
        <h2>Who has called what</h2>
        <p class="lede">News organizations call races on their own, each from its own analysis of the count, and not always at the same time. These are the calls of {liveDesks().map((d) => (d.id === "AP" ? "the AP" : d.name)).join(", ").replace(/, ([^,]*)$/, " and $1")} for the Senate and governor's races. The switch at the top of the page chooses whose calls the whole page counts.</p>
        <Calls />
      </section>

      <section class="section" id="map">
        <div class="tools">
          <div>
            <div class="kicker">Across the country</div>
            <h2 class="h2">Every {mapOffice() === "S" ? "Senate" : "governor's"} race on one map</h2>
          </div>
          <div class="seg" role="group" aria-label="Choose the races on the map">
            <button aria-pressed={mapOffice() === "S"} onClick={() => setMapOffice("S")}>Senate</button>
            <button aria-pressed={mapOffice() === "G"} onClick={() => setMapOffice("G")}>Governors</button>
          </div>
        </div>
        <div class="split">
          <Show when={mapOffice()} keyed>{(o) => <TileMap office={o} />}</Show>
          <div class="side">
            <h3 class="h3">{mapOffice() === "S" ? "Governor's races to watch" : "Senate races to watch"}</h3>
            <Board races={mapOffice() === "S" ? governors() : senate()} office={mapOffice() === "S" ? "G" : "S"} tools={false} compact={true} />
          </div>
        </div>
      </section>

      <section class="section" id="shift">
        <div class="kicker">The swing</div>
        <h2>How far the vote has moved since 2024</h2>
        <p class="lede">Where a county has finished counting, its House result tonight can be set against the presidential vote there two years ago. These are only the counties done so far, and a House race is not a presidential one: incumbents and uncontested seats move the numbers. But the dots fill in all night.</p>
        <Shift />
      </section>

      <section class="section" id="house-races">
        <div class="kicker">The House</div>
        <h2>The closest House races</h2>
        <p class="lede">The {house().length} districts rated toss-ups or leaning to one party before tonight. A majority takes 218 of the 435 seats.</p>
        <Board races={house()} office="H" label="Key House races" />
        <a class="more" href="#/house">All 435 House races →</a>
      </section>

      <Sources />
    </main>
  );
}

// The next poll closing, counting down, with the races it opens
function Next() {

  const next = createMemo(() => {
    const t = now();
    const times = [...new Set(Object.values(feed.closings))].filter((x) => Date.parse(x) > t).sort();
    if (!times.length) return null;
    const at = times[0];
    const states = Object.entries(feed.closings).filter(([, x]) => x === at).map(([st]) => st).sort();
    const races = feed.races.filter((r) => r.office !== "H" && states.includes(r.state)).sort((a, b) => a.closeness - b.closeness || a.office.localeCompare(b.office));
    return { at, states, races, left: Date.parse(at) - t };
  });
  const clock = (ms) => {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${String(s).padStart(2, "0")}`;
  };
  return (
    <Show when={next()}>
      {(n) => (
        <div class="next">
          <div class="next-time">
            <span class="kicker">Next poll closing</span>
            <b class="num">{etHour(n().at)} <span class="zone">ET</span></b>
            <span class="num hint">in {clock(n().left)}</span>
          </div>
          <div class="next-what">
            Polls close in <b>{n().states.length} {n().states.length === 1 ? "state" : "states"}</b>{n().races.length ? ", opening " : "."}
            <For each={n().races.slice(0, 8)}>
              {(r, i) => <>{i() ? ", " : ""}<a href={`#/race/${encodeURIComponent(r.id)}`}>{r.state} {r.office === "S" ? "Senate" : "governor"}</a></>}
            </For>
            {n().races.length > 8 ? ` and ${n().races.length - 8} more.` : n().races.length ? "." : ""}
          </div>
        </div>
      )}
    </Show>
  );
}

export function Sources() {

  return (
    <footer class="note">
      <p>Vote counts: The Associated Press, from the results files The New York Times publishes for its live pages. Race calls: each news organization's own decision desk, from the files its live results pages read ({liveDesks().map((d) => d.name).join(", ")}). NBC News and CBS News let no other site read theirs from a browser, so the article's server reads them and passes on their calls only. A desk's call is timed when this page first sees it, except the AP's, which carry their time; "by" marks a call made before the page was opened. Ratings are the race ratings in the AP data. "Counted" is the share of the expected vote counted so far, as the AP estimates it.</p>
      <p>Built with rhp, charts drawn from HTML elements. The page checks for new results every 20 seconds (the House every 45). Lead changes are noticed by this page as they happen, so the wire lists only those it saw while open.</p>
    </footer>
  );
}

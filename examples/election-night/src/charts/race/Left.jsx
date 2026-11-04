// Where the vote is left: the counties with the most votes still expected, colored by who leads the count there

import { Show, createMemo } from "solid-js";
import { Chart, Plot, Bar, Label, slat, nice } from "@bezda/rhp";
import { THEME } from "../../theme.js";
import { tone, short, pts } from "../../format.js";
import { narrow } from "../../narrow.js";
import { focusCounty, setHotCounty, unitLabel } from "./Counties.jsx";

const makeRow = (wide) => slat({
  thickness: 30,
  room: wide ? { start: 128, end: 116 } : { start: 84, end: 58 },
  inset: 0.2,
  css: `
    .slat { border-radius: 6px; }
    .slat.hot { background: color-mix(in srgb, var(--rhp-ink) 8%, transparent); }
    .name { font-size: 13px; font-weight: 600; }
    .bar { --rhp-radius: 3px; }
    .n { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .who { font-size: 12px; color: var(--rhp-muted); font-variant-numeric: tabular-nums; }
  `,
}, (c) => (
  <div class={focusCounty() === c.id ? "slat hot" : "slat"} data-county={c.id}>
    <Label edge="start" class="name">{unitLabel(c)}</Label>
    <Bar class="bar" to={c.remaining} color={c.total ? tone(c.leader, false) : "surface"} />
    <Label class="n" at={c.remaining}>{short(c.remaining)}</Label>
    <Label edge="end" class="who">{c.total ? `${wide ? c.leadName : c.leader} +${pts(c.margin)}` : wide ? "no votes yet" : "–"}</Label>
  </div>
));

export function Left(props) {

  const r = () => props.race;
  // The candidate ahead in a county: the one with the most votes there
  const leadOf = (c) => {
    const [id] = Object.entries(c.votes).sort((a, b) => b[1] - a[1])[0] || [];
    return r().cands.find((x) => x.id === id)?.last || "";
  };
  const top = createMemo(() => [...props.counties]
    .filter((c) => c.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 10)
    .map((c) => ({ ...c, leadName: c.total ? leadOf(c) : "" })));
  const all = () => props.counties.reduce((s, c) => s + c.remaining, 0);
  // Room past the longest bar for its number
  const scale = () => nice(0, Math.max(1, ...top().map((c) => c.remaining)) * (narrow() ? 1.7 : 1.12));
  const Row = createMemo(() => makeRow(!narrow()));

  // The takeaway: where the most votes are left, and who leads there
  const takeaway = createMemo(() => {
    const [a, b] = top();
    if (!a) return null;
    const pair = b ? [a, b] : [a];
    const share = (pair.reduce((s, c) => s + c.remaining, 0) / all()) * 100;
    const names = pair.map(unitLabel).join(" and ");
    const leaders = [...new Set(pair.map((c) => c.leadName || null))];
    const say = (c) => (c.total ? `${c.leadName} leads ${unitLabel(c)}` : `${unitLabel(c)} has counted no votes yet`);
    const where = leaders.length === 1 ? (leaders[0] ? `, where ${leaders[0]} leads` : ", where no votes are counted yet") : `: ${pair.map(say).join(", ")}`;
    const head = share >= 50 ? `Most of the vote left is in ${names}` : `The most votes left are in ${names}, ${Math.round(share)}% of what remains`;
    return `${head}${where}.`;
  });

  return (
    <Show when={top().length >= 2 && all() > 0}>
      <div class="left-vote">
        <p class="lede">{takeaway()}</p>
        <div onPointerMove={(e) => e.pointerType !== "touch" && setHotCounty(e.target.closest?.("[data-county]")?.dataset.county || null)}
          onPointerLeave={() => setHotCounty(null)}>
          <Show when={Row()} keyed>
            {(S) => (
              <Chart scale={[0, scale().max]} ticks={narrow() ? scale().ticks.filter((_, i, all) => i === 0 || i === all.length - 1 || i === Math.floor(all.length / 2)) : scale().ticks} format={short} theme={THEME} label="Counties with the most votes left to count">
                <Plot rows={top()} key="id">{S}</Plot>
              </Chart>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
}

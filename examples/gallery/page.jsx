import { render } from "solid-js/web";
import { createSignal, For, Show } from "solid-js";
import { Theme } from "../../src/index.js";
import CODE from "./out/code.json";
import * as G from "./gallery.jsx";

// v1 replicas (look: "v1") span the grid and get v1's theme; their code starts with the scale slat they share.
const CARDS = [
  { id: "dots", C: G.Dots, v1: true, look: "v1", title: "Animated dots", what: <>v1's logo: 9 rows of 30 Dots behind a window 11 dots wide. The scale is that window, and each row clips its dots to it, so the rows can shift up to 5 dots and the window stays full. Every 5 s the rows scatter or come back; hover to hold the logo.</> },
  { id: "fruit", C: G.Fruit, v1: true, look: "v1", code: ["v1scale", "fruit"], title: "Fruit bars", what: <>v1's live demo, with its data, colors and fruit art. The art is an <code>&lt;img&gt;</code> inside the Bar, which crops it. v1's scale is a <code>Scale</code> in the Chart: a slat per tick, <code>every(5, {"{"} ends: true {"}"})</code>, ending at the largest value. Drag Fruit A to watch the scale refit and the rows re-rank. Fruit art: <a href="https://www.freevector.com/flat-colorful-fruits-26803">FreeVector.com</a>.</> },
  { id: "clouds", C: G.Clouds, v1: true, look: "v1", code: ["v1scale", "clouds"], title: "Box and whisker", what: <>v1's cloud plot, with its data, colors and photos. <code>d.box</code> is <code>[low, box start, box end, high]</code>: two 6px Bars for the whiskers, Ticks for the caps, and the box a Bar with the name inside. The photo sits in the start gutter, in a Label. Ranked by the box's end, as in v1; the slider moves one box's end.</> },
  { id: "tutorial", C: G.Tutorial, v1: true, title: "Values on hover", what: <>v1's tutorial chart as a harbour's weather board. The knots hide until you hover a row, with CSS the slat owns; each compass needle is an element in the start gutter, turned by its row's data.</> },
  { id: "grouped", C: G.Grouped, title: "Grouped bars", what: <>A Plot inside each team's slat, one medal per metal: a 3px ribbon Bar and a Dot with the count struck on it. The table ranks by golds with <code>sortBy</code>.</> },
  { id: "stacked", C: G.Stacked, title: "Stacked bars", what: <><code>stackUp(d.ml)</code> in a memo per slat gives each layer its from and to; an overlap Plot lays them on one band, and a shared data group tells the last full layer to round the cup's end. Sorted by the total.</> },
  { id: "segmented", C: G.Segmented, title: "Segmented bars (100%)", what: <>Each person's apps as shares of 100, stacked into a battery: a shell Bar a little larger than the track, a Tick for the nub. A share's number shows only where it fits.</> },
  { id: "units", C: G.Units, title: "Unit bars", what: <>An overlap Plot with a slat per five books (<code>slats={"{"}Math.ceil(d.books / 5){"}"}</code>). Each spine's height and shade are fixed functions of its index, so the shelf looks lived in.</> },
  { id: "pyramid", C: G.Pyramid, title: "Population pyramid", what: <>Two Bars per age band, men left of 0 and women right, each starting a few units out so the ages fit on a spine between them. Horizontal puts the oldest on top with a list of positions.</> },
  { id: "diverging", C: G.Diverging, title: "Diverging bars", what: <>Each month's Bar and band are colored by its own value on a diverging scale. The scale is a <code>Scale</code>: a hairline each degree, with 0 drawn as the normal.</> },
  { id: "waterfall", C: G.Waterfall, title: "Waterfall", what: <><code>running()</code> turns the month into from and to; a hairline Tick at each step's end links it to the next. The dek's figure is the last total, live.</> },
  { id: "bullet", C: G.Bullet, title: "Bullet chart", what: <>A track, the day's progress glowing along it, and a white Tick at the goal. The icons are SVG in the start gutter, colored by the row's <code>--rhp-color</code>.</> },
  { id: "histogram", C: G.Histogram, title: "Histogram", what: <><code>bins()</code> over 365 days; each Bar takes its own temperature as its color. Horizontal puts the hottest bins on top, like a thermometer.</> },
  { id: "violin", C: G.Violin, title: "Violin plot", what: <><code>density()</code> feeds a mirrored Area per instrument. The pitch scale is a keyboard: a <code>Scale</code> with a slat per semitone, each key a Bar from <code>d.at</code> to <code>d.next</code>.</> },
  { id: "strip", C: G.Strip, title: "Strip plot", what: <>An overlap Plot of Dots per group, each drawn as a capsule; its place across the band and its tilt are fixed functions of its index. The mean is a Tick, its number in the end gutter.</> },
  { id: "stem", C: G.Stem, title: "Stem plot", what: <>A 4px Bar from 0 to y and a glowing Dot at y, fading with time through a CSS variable set on each slat. A one-tick <code>Scale</code> draws the resting line.</> },
  { id: "range", C: G.Range, title: "Range (dumbbell)", what: <>Real summits and usual base camps. A 3px Bar from camp to summit, with the tent and the peak drawn as clipped Dots. The button re-sorts by the climb; rows are keyed, so they slide.</> },
  { id: "heatmap", C: G.Heatmap, title: "Heatmap", what: <>Each day is a slat holding a Plot with <code>orientation="across"</code> of 24 Cells, colored on the Chart's scale by CSS. Hover a cell for its title attribute.</> },
  { id: "gantt", C: G.Gantt, title: "Gantt timeline", what: <>The months are a <code>Scale</code> of intervals: ticks every 4 weeks, each slat a Bar from <code>d.at</code> to <code>d.next</code>, every other one shaded. Trades are keyed and sorted by start; a second Plot draws today.</> },
  { id: "candles", C: G.Candles, title: "Candlestick", what: <>Row objects passed as <code>rows={"{"}days(){"}"}</code>, and a scale fitted to the month with <code>nice()</code>. The last day carries its closing price.</> },
];

// a small JSX highlighter for the code blocks
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function highlight(src) {
  const re = /(\/\/[^\n]*|\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(<\/?[A-Z][A-Za-z]*)|\b(const|let|return|export|function|import|from)\b/g;
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const [t] = m;
    out += m[1] ? `<span class="c">${esc(t)}</span>` : m[2] ? `<span class="s">${esc(t)}</span>` : m[3] ? `<span class="t">${esc(t)}</span>` : `<span class="k">${t}</span>`;
    last = m.index + t.length;
  }
  return out + esc(src.slice(last));
}

function Seg(props) {
  return (
    <fieldset class="seg">
      <legend>{props.label}</legend>
      <div class="seg-opts">
        <For each={props.options}>
          {([value, text]) => (
            <label classList={{ on: props.value() === value }}>
              <input type="radio" name={props.name} id={props.name + "-" + value} value={value}
                checked={props.value() === value} onChange={() => props.set(value)} />
              {text}
            </label>
          )}
        </For>
      </div>
    </fieldset>
  );
}

function Gallery() {
  const [o, setO] = createSignal("horizontal");
  const [motion, setMotion] = createSignal("css");
  const [seed, setSeed] = createSignal(0);
  const js = () => motion() === "js";
  return (
    <>
      <div class="controls" role="group" aria-label="Gallery controls">
        <Seg label="Orientation" name="orient" value={o} set={setO} options={[["horizontal", "Horizontal"], ["vertical", "Vertical"]]} />
        <Seg label="Animate with" name="motion" value={motion} set={setMotion} options={[["css", "CSS version"], ["js", "JS version"]]} />
        <button class="primary" id="new-data" onClick={() => setSeed(seed() + 1)}>New data</button>
      </div>
      <div class="cards">
        <For each={CARDS}>
          {(c) => (
            <article class={c.look === "v1" ? "card wide" : "card"} id={c.id}>
              <header>
                <h3>{c.title}<Show when={c.v1}><span class="tag">v1 example</span></Show></h3>
                <p>{c.what}</p>
              </header>
              <div class="stage">
                <Show when={c.look === "v1"} fallback={<c.C o={o} js={js} seed={seed} />}>
                  <Theme value={dark() ? V1_DARK : V1_LIGHT}><c.C o={o} js={js} seed={seed} /></Theme>
                </Show>
              </div>
              <details>
                <summary>Code</summary>
                <pre><code innerHTML={highlight((c.code ?? [c.id]).map((k) => CODE[k] ?? "").join("\n\n"))} /></pre>
              </details>
            </article>
          )}
        </For>
      </div>
    </>
  );
}

// The page hands rhp its colors once, as a theme object. No slat reads a page CSS variable.
const LIGHT = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#c2419a", "#7b5cd6", "#d39a12"],
  positive: "#13894f", negative: "#c62828", ink: "#3a4048", muted: "#6a717b", grid: "#e2e5e0",
  surface: "#ffffff", low: "#eaf0f8", high: "#173f8a", font: '"IBM Plex Sans", system-ui, sans-serif',
};
const DARK = {
  ...LIGHT,
  series: ["#3f8ce8", "#e0652f", "#22b07e", "#d25aac", "#9277e6", "#e0ad2a"],
  positive: "#4fd18f", negative: "#ff7b72", ink: "#d5d9de", muted: "#8e959e", grid: "#2a2e33",
  surface: "#181b1e", low: "#1c2430", high: "#7fb0ff",
};
// v1's demos ran on Chakra UI's defaults: its system font, #555 for text and axis lines, black on hover,
// #00000011 for faint lines. Its slats read those as muted, ink and grid. v1 had no dark mode; this one keeps the contrasts.
const CHAKRA_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
const V1_LIGHT = { font: CHAKRA_FONT, muted: "#555555", ink: "#000000", grid: "#00000011" };
const V1_DARK = { font: CHAKRA_FONT, muted: "#b4bac1", ink: "#ffffff", grid: "#ffffff1f" };
const media = matchMedia("(prefers-color-scheme: dark)"), root = document.documentElement;
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : media.matches);
const [dark, setDark] = createSignal(isDark());
media.addEventListener("change", () => setDark(isDark()));
new MutationObserver(() => setDark(isDark())).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

render(() => <Theme value={dark() ? DARK : LIGHT}><Gallery /></Theme>, document.getElementById("gallery"));

import { render } from "solid-js/web";
import { createSignal, For, Show } from "solid-js";
import { Theme } from "../../src/index.js";
import CODE from "./out/code.json";
import * as G from "./gallery.jsx";

const CARDS = [
  { id: "fruit", C: G.Fruit, v1: true, title: "Fruit bars", what: <>v1's live demo. Ranked with <code>order={"{"}sortBy("value", "desc"){"}"}</code>; the icon is a child of the Bar, so it rides the bar's end. The button turns the order input off and the rows go back to data order.</> },
  { id: "clouds", C: G.Clouds, v1: true, title: "Cloud altitudes", what: <>v1's box and whisker. One data group of <code>summary()</code> objects, read as <code>d.box.q1</code>. Whiskers are 2px Bars, the median a Tick, outliers a nested overlap Plot of Dots. Sorted by median and keyed by name.</> },
  { id: "dots", C: G.Dots, v1: true, title: "Animated dots", what: <>v1's quick-start picture: 9 rows of 30 Dots. Each row's offset changes every 1.5 s; each dot's position is a computed group, <code>x={"{"}(c) =&gt; d.offset + c.index{"}"}</code>. Hover to hold it still. Vertical turns the picture on its side.</> },
  { id: "tutorial", C: G.Tutorial, v1: true, title: "Values on hover", what: <>v1's tutorial chart. The value Label is hidden until the slat is hovered, with CSS the slat owns (its <code>css</code>). Two colors wrap over four rows.</> },
  { id: "grouped", C: G.Grouped, title: "Grouped bars", what: <>A Plot inside each slat, one Bar per year. The inner Plot splits the slat's band; <code>thick={"{"}0.8{"}"}</code> on it leaves a gap between groups.</> },
  { id: "stacked", C: G.Stacked, title: "Stacked bars", what: <><code>stackUp(d.values)</code> in a memo per slat gives from and to; an <code>overlap</code> Plot lays the segments on one band. Sorted by total.</> },
  { id: "segmented", C: G.Segmented, title: "Segmented bars (100%)", what: <>Each value as a share of 100 with <code>shares()</code>, then stacked. The percentage is a child of each segment.</> },
  { id: "units", C: G.Units, title: "Unit bars", what: <>A bar cut into blocks of 5: an overlap Plot with <code>slats={"{"}Math.ceil(d.value / 5){"}"}</code> and computed from and to groups.</> },
  { id: "pyramid", C: G.Pyramid, title: "Population pyramid", what: <>Bidirectional: two Bars from 0, one to <code>-d.male</code> and one to <code>d.female</code>, on a −10 to 10 scale. Horizontal uses a fixed list of positions, oldest first.</> },
  { id: "diverging", C: G.Diverging, title: "Diverging bars", what: <><code>Bar to={"{"}d.net{"}"}</code> runs either side of 0. The color and the label's side come from the sign.</> },
  { id: "waterfall", C: G.Waterfall, title: "Waterfall", what: <><code>running()</code> turns the changes into from and to; the first and last steps are totals. The order is fixed, since sorting would misstate it.</> },
  { id: "bullet", C: G.Bullet, title: "Bullet chart", what: <>Three background Bars for the poor, fair and good ranges, a thin measure Bar, and a target Tick at 100%.</> },
  { id: "histogram", C: G.Histogram, title: "Histogram", what: <><code>bins()</code> turns 400 samples into <code>x0</code>, <code>x1</code> and <code>tally</code> groups. The bars touch because the slat's <code>inset</code> is <code>"1px"</code>.</> },
  { id: "violin", C: G.Violin, title: "Violin plot", what: <><code>density()</code> in a memo per slat feeds a mirrored Area; the box is a 5px Bar from q1 to q3 with a Dot at the median. One shared peak keeps the widths comparable.</> },
  { id: "strip", C: G.Strip, title: "Strip plot", what: <>An overlap Plot of Dots per group, spread across the band with <code>across</code>. A Tick marks the mean.</> },
  { id: "stem", C: G.Stem, title: "Stem plot", what: <>A 2px Bar from 0 to y and a Dot at y: 32 samples of a damped cosine on a −1 to 1 scale.</> },
  { id: "range", C: G.Range, title: "Range (dumbbell)", what: <>A 3px Bar from before to after, and a Dot at each end. Sorted by the change, keyed by name.</> },
  { id: "heatmap", C: G.Heatmap, title: "Heatmap", what: <>Each day is a slat holding a Plot with <code>orientation="across"</code> of 24 Cells, colored on the Chart's scale by CSS. Hover a cell for its title attribute.</> },
  { id: "gantt", C: G.Gantt, title: "Gantt timeline", what: <>Bars from start to end, with a thinner progress Bar. A second Plot in the same Chart draws the today line. Sorted by start.</> },
  { id: "candles", C: G.Candles, title: "Candlestick", what: <>Row objects passed as <code>rows={"{"}days(){"}"}</code> and read as <code>d.open</code>, <code>d.close</code>: a 1.5px wick Bar and a body Bar.</> },
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
            <article class="card" id={c.id}>
              <header>
                <h3>{c.title}<Show when={c.v1}><span class="tag">v1 example</span></Show></h3>
                <p>{c.what}</p>
              </header>
              <div class="stage">
                <c.C o={o} js={js} seed={seed} />
              </div>
              <details>
                <summary>Code</summary>
                <pre><code innerHTML={highlight(CODE[c.id] ?? "")} /></pre>
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
const media = matchMedia("(prefers-color-scheme: dark)"), root = document.documentElement;
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : media.matches);
const [dark, setDark] = createSignal(isDark());
media.addEventListener("change", () => setDark(isDark()));
new MutationObserver(() => setDark(isDark())).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

render(() => <Theme value={dark() ? DARK : LIGHT}><Gallery /></Theme>, document.getElementById("gallery"));

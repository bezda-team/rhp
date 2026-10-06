// One app exercises browser rendering, server rendering, and hydration with the same point collection.
import { createSignal, Show } from "solid-js";
import { Chart, Dot, Label, ManyDots, Plot, Theme, shape, slat } from "../src/index.js";

const triangle = shape(["M", 0, 0], ["L", 1, 0.5], ["L", 0, 1], ["Z"]);
const diamond = shape(["M", 0, 0.5], ["L", 0.5, 0], ["L", 1, 0.5], ["L", 0.5, 1], ["Z"]);
const MixedSlat = slat({ css: ".scope-regression-text { color: rgb(200, 30, 50); }" }, (d) =>
  <div><Label edge="start" class="scope-regression-text">Layer order</Label><Dot at={d.x} size="6px" /></div>);
export const initialRows = () => [
  { id: "a", x: 2, y: 5, color: "rgb(210, 30, 70)", size: "6px", category: "a", shape: triangle },
  { id: "b", x: 5, y: 10, color: "rgb(20, 150, 80)", size: "10px", category: "b", shape: diamond },
  { id: "c", x: 8, y: 15, color: "rgb(30, 90, 220)", size: "14px", category: "a" },
];
export const initialCenteringRows = () => [
  { id: "numeric", x: 1, y: 2, size: 4 },
  { id: "pixels", x: 2, y: 4, size: "9.5px" },
  { id: "percent", x: 3, y: 6, size: "10%" },
  { id: "calc", x: 4, y: 8, size: "calc(5% + 4px)" },
  { id: "em", x: 5, y: 10, size: "1em" },
  { id: "rem", x: 6, y: 12, size: "1rem" },
  { id: "variable", x: 7, y: 14, size: "var(--marker-size)", style: { "--marker-size": "12px" } },
  { id: "variable-calc", x: 8, y: 16, size: "calc(var(--marker-size) + 2px)", style: { "--marker-size": "10px" } },
  { id: "intrinsic", x: 9, y: 18, size: "auto" },
  { id: "negative-calc", x: 9, y: 1, size: "calc(2px - 10%)" },
  { id: "negative-clamp", x: 9, y: 3, size: "clamp(-20px, -10px, -5px)" },
];
export const escapingRows = () => [
  { x: 2, y: 5, cls: 'quote" onclick="window.ManyDotsInjected=1', style: { "--quoted": '"a; b & c <tag> >"' } },
  { x: 8, y: 15, cls: 'amp&entity&quot;<img src=x onerror=window.ManyDotsInjected=1>', style: { "--quoted": '"</div><img src=x onerror=window.ManyDotsInjected=1>"' } },
];

const CSS = `
  body { margin: 0; background: white; }
  main { width: min(720px, calc(100vw - 32px)); margin: 16px; }
  .case { margin-bottom: 12px; }
  .category-a { background-color: rgb(190, 45, 90); border-radius: 20%; }
  .category-b { background-color: rgb(20, 140, 70); }
  .app-opacity { opacity: .45; }
  .app-filter { filter: brightness(.8); }
  .app-transform { transform: scale(1.25); }
  .origin-start { transform: scale(2); transform-origin: 0 0; }
  .selected { outline: 2px solid rgb(90, 20, 140); }
`;

export default function ManyDotsApp() {
  const [rows, setRows] = createSignal(initialRows());
  const [scale, setScale] = createSignal([0, 10]);
  const [cross, setCross] = createSignal([0, 20]);
  const [orientation, setOrientation] = createSignal("horizontal");
  const [series, setSeries] = createSignal("rgb(110, 65, 210)");
  const [selected, setSelected] = createSignal("");
  const [pointStyle, setPointStyle] = createSignal({ opacity: "0.8" });
  const [hostClass, setHostClass] = createSignal("host-utility");
  const [title, setTitle] = createSignal("bulk points");
  const [classes, setClasses] = createSignal(true);
  const [themeColor, setThemeColor] = createSignal(false);
  const [stringStyle, setStringStyle] = createSignal("opacity:.8;--rhp-manydot-size:12px!important;--custom-host:value;outline:2px solid red!important");
  const [wideScale, setWideScale] = createSignal([-1e308, 1e308]);
  const [wideCross, setWideCross] = createSignal([-1e308, 1e308]);
  const [centeringRows, setCenteringRows] = createSignal(initialCenteringRows());
  const [relativeFont, setRelativeFont] = createSignal(20);
  const [sharedSize, setSharedSize] = createSignal(4);
  const [scopeColor, setScopeColor] = createSignal("rgb(180, 20, 40)");
  const [scopeSize, setScopeSize] = createSignal(6);
  const [scopeShape, setScopeShape] = createSignal(triangle);
  const [scopePointStyle, setScopePointStyle] = createSignal({});
  const [mountedScope, setMountedScope] = createSignal(false);
  const [empty, setEmpty] = createSignal([]);
  const [invalidRows, setInvalidRows] = createSignal([
    { x: NaN, y: 10 }, { x: 1, y: Infinity }, { x: -Infinity, y: 1 }, { x: 5, y: 10 },
  ]);
  const controls = {
    setRows, setScale, setCross, setOrientation, setSeries, setSelected, setPointStyle, setHostClass,
    setTitle, setClasses, setThemeColor, setStringStyle, setWideScale, setWideCross, setCenteringRows, setRelativeFont, setSharedSize,
    setScopeColor, setScopeSize, setScopeShape, setScopePointStyle, setMountedScope, triangle, diamond,
    setEmpty, setInvalidRows, initialRows, initialCenteringRows, escapingRows,
    reset() {
      setRows(initialRows()); setScale([0, 10]); setCross([0, 20]); setOrientation("horizontal");
      setSelected(""); setPointStyle({ opacity: "0.8" }); setThemeColor(false);
    },
  };
  if (typeof window !== "undefined") {
    window.T = controls;
    window.T.events = [];
    document.addEventListener("click", (e) => {
      const point = e.target.closest?.(".rhp-manydot");
      if (point) window.T.events.push({ target: e.target === point, index: point.dataset.rhpIndex, host: point.closest(".rhp-manydots").id });
    });
  }

  const pointClass = (d) => `point-${d.id}${classes() ? " custom-point" : ""}${selected() === d.id ? " selected" : ""}`;
  const color = (d) => themeColor() ? "series-1" : d.color;
  const reference = (d) => <Dot class={`reference-${d.id}`} at={d.x} cross={d.y} size={d.size} color={color(d)} shape={d.shape} />;

  return (
    <main>
      <style>{CSS}</style>
      <Theme value={{ series: [series()] }}>
        <Chart id="primary" class="case" scale={scale()} cross={cross()} orientation={orientation()} height={140} ticks={false} crossTicks={false}>
          <ManyDots id="primary-points" rows={rows()} key={(d) => d.id} at={(d) => d.x} cross={(d) => d.y}
            size={(d) => d.size} color={color} shape={(d) => d.shape} pointClass={pointClass} pointStyle={pointStyle()}
            class={hostClass()} classList={{ "host-selected": selected() !== "" }} title={title()} data-native="kept" aria-label="Individual sample points"
            style={{ "--native-style": "kept" }} ref={(el) => { controls.host = el; }}
            onClick={(e) => { controls.hostClicked = e.currentTarget.id; }} />
        </Chart>
        <Chart id="reference" class="case" scale={scale()} cross={cross()} orientation={orientation()} height={140} ticks={false} crossTicks={false}>
          <Plot overlap rows={rows()} key={(d) => d.id}>{reference}</Plot>
        </Chart>
        <Chart id="vertical" class="case" scale={[0, 10]} cross={[0, 20]} orientation="vertical" height={140} ticks={false} crossTicks={false}>
          <ManyDots rows={initialRows()} at={(d) => d.x} cross={(d) => d.y} size={(d) => d.size} color={(d) => d.color} shape={(d) => d.shape} />
        </Chart>
        <Chart id="vertical-reference" class="case" scale={[0, 10]} cross={[0, 20]} orientation="vertical" height={140} ticks={false} crossTicks={false}>
          <Plot overlap rows={initialRows()}>{(d) => <Dot at={d.x} cross={d.y} size={d.size} color={d.color} shape={d.shape} />}</Plot>
        </Chart>
        <Chart id="categories" class="case" scale={[0, 10]} cross={[0, 20]} height={90} ticks={false} crossTicks={false}>
          <ManyDots rows={rows()} key={(d) => d.id} at={(d) => d.x} cross={(d) => d.y} size="8px" pointClass={(d) => `category-${d.category}`}
            pointStyle={(d, i) => ({ "outline-color": i === 0 ? "rgb(10, 20, 30)" : d.color, "outline-width": "1px", "outline-style": "solid" })} />
        </Chart>
        <Chart id="uniform" class="case" scale={[0, 10]} cross={[0, 20]} height={90} ticks={false} crossTicks={false}>
          <ManyDots rows={rows()} at={(d) => d.x} cross={(d) => d.y} size={4} color="series-1" shape={diamond} pointClass="uniform-point"
            pointStyle={{ opacity: "0.6" }} />
        </Chart>
        <Chart id="utilities" class="case" scale={[0, 10]} cross={[0, 20]} height={60} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 5, y: 10 }]} at={5} cross={10} size="8px" pointClass="app-opacity app-filter app-transform" />
        </Chart>
        <Chart id="invalid" class="case" scale={[0, 10]} cross={[0, 20]} height={60} ticks={false} crossTicks={false}>
          <ManyDots rows={invalidRows()} at={(d) => d.x} cross={(d) => d.y} size="4px" />
        </Chart>
        <Chart id="empty" class="case" scale={[0, 10]} cross={[0, 20]} height={60} ticks={false} crossTicks={false}>
          <ManyDots rows={empty()} at={(d) => d.x} cross={(d) => d.y} size="4px" />
        </Chart>
        <Chart id="string-style" class="case" scale={[0, 10]} cross={[0, 20]} height={60} ticks={false} crossTicks={false}>
          <ManyDots id="string-style-points" rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y} size={6} style={stringStyle()} />
        </Chart>
        <Chart id="wide" class="case" scale={wideScale()} cross={wideCross()} height={60} ticks={false} crossTicks={false}>
          <ManyDots rows={[-1e308, 0, 1e308]} at={(d) => d} cross={(d) => d} size={4} />
        </Chart>
        <Chart id="centering-default" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 1, y: 2 }, { x: 5, y: 10 }, { x: 9, y: 18 }]} at={(d) => d.x} cross={(d) => d.y} />
        </Chart>
        <Chart id="centering-cases" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false}>
          <ManyDots id="centering-points" rows={centeringRows()} key={(d) => d.id} at={(d) => d.x} cross={(d) => d.y}
            size={(d) => d.size} pointClass={(d) => `center-${d.id}`}
            pointStyle={(d) => ({ ...d.style, "font-size": relativeFont() + "px" })} />
        </Chart>
        <Chart id="centering-unequal" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 2, y: 4, w: "12px", h: "6px" }, { x: 5, y: 10, w: "6px", h: "18px" }, { x: 8, y: 16, w: "10%", h: "calc(10% + 4px)" }]}
            at={(d) => d.x} cross={(d) => d.y} pointStyle={(d) => ({ width: d.w, height: d.h })} />
        </Chart>
        <Chart id="centering-origin" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y} size={8} pointClass="origin-start" />
        </Chart>
        <Chart id="centering-shared" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false}>
          <ManyDots id="centering-shared-points" rows={[{ x: 2, y: 4 }, { x: 5, y: 10 }, { x: 8, y: 16 }]}
            at={(d) => d.x} cross={(d) => d.y} size={sharedSize()} style={{ "--shared-size": "12px" }} />
        </Chart>
        <Chart id="centering-shared-reference" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false} style={{ "--rhp-length-time": "0s" }}>
          <Plot class="centering-shared-reference-points" overlap rows={[{ x: 2, y: 4 }, { x: 5, y: 10 }, { x: 8, y: 16 }]} style={{ "--shared-size": "12px" }}>
            {(d) => <Dot at={d.x} cross={d.y} size={typeof sharedSize() === "number" ? sharedSize() + "px" : sharedSize()} />}
          </Plot>
        </Chart>
        <Chart id="centering-protected" class="case" scale={[0, 10]} cross={[0, 20]} height={120} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y} size={8}
            pointStyle={{ width: "12px", height: "6px", margin: "30px", "margin-left": "50px", "margin-bottom": "60px", translate: "100px 100px" }} />
        </Chart>
        <Chart id="scopes" class="case" scale={[0, 10]} cross={[0, 20]} height={100} ticks={false} crossTicks={false}>
          <ManyDots id="scope-a-points" rows={[{ id: "a1", x: 2, y: 5 }, { id: "a2", x: 3, y: 10 }]} key={(d) => d.id}
            at={(d) => d.x} cross={(d) => d.y} color={scopeColor()} size={scopeSize()} shape={scopeShape()}
            pointClass={(d) => d.id === "a2" ? "category-b" : "scope-plain"}
            pointStyle={(d) => d.id === "a1" ? scopePointStyle() : {}} />
          <ManyDots id="scope-b-points" rows={[{ id: "b1", x: 8, y: 15 }]} key={(d) => d.id}
            at={(d) => d.x} cross={(d) => d.y} color="rgb(20, 100, 200)" size={10} shape={diamond} />
        </Chart>
        <Chart id="mixed-primitives" class="case" scale={[0, 10]} height={60} ticks={false}>
          <Plot rows={[{ x: 5 }]}>{MixedSlat}</Plot>
        </Chart>
        <Chart id="literal-styles" class="case" scale={[0, 10]} cross={[0, 20]} height={100} ticks={false} crossTicks={false}>
          <ManyDots id="literal-styles-points" rows={escapingRows()} at={(d) => d.x} cross={(d) => d.y}
            pointClass={(d) => d.cls} pointStyle={(d) => d.style} />
        </Chart>
        <Chart id="invalid-declarations" class="case" scale={[0, 10]} cross={[0, 20]} height={100} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y}
            pointStyle={{ opacity: "0.5;outline:99px solid rgb(1,2,3)", color: "rgb(1, 2, 3)" }} />
        </Chart>
        <Chart id="commented-styles" class="case" scale={[0, 10]} cross={[0, 20]} height={100} ticks={false} crossTicks={false}>
          <ManyDots rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y} pointStyle={{ opacity: "/**/ .5" }} />
        </Chart>
        <Show when={mountedScope()}>
          <Chart id="scope-lifecycle" class="case" scale={[0, 10]} cross={[0, 20]} height={100} ticks={false} crossTicks={false}>
            <ManyDots rows={[{ x: 5, y: 10 }]} at={(d) => d.x} cross={(d) => d.y} color="rgb(170, 85, 0)" size={8}
              ref={(el) => { controls.lifecycleDocument = el.ownerDocument; }} />
          </Chart>
        </Show>
      </Theme>
    </main>
  );
}

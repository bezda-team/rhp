// The code that runs in the checked page. install() is serialized by Playwright and run there, so it uses nothing from
// outside its own body. It puts window.__rhpProbe in the page: settle(), measure(), hiding text and marks for the
// screenshots the colors are read from, and what the interaction pass needs (its targets, a change recorder, where the
// controls are).
export function install() {

  if (window.__rhpProbe) return;

  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const BLOCK = { "rhp-bar": "Bar", "rhp-dot": "Dot", "rhp-tick": "Tick", "rhp-label": "Label", "rhp-cell": "Cell", "rhp-place": "Place", "rhp-area": "Area", "rhp-line": "Line" };
  const MARKS = ".rhp-bar, .rhp-dot, .rhp-tick, .rhp-area, .rhp-line";
  const CONTROLS = "button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=switch], [role=tab], [role=radio], [role=checkbox], [role=slider]";
  const SKIP_TEXT = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE", "HEAD", "OPTION", "TEXTAREA"]);
  const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system|blinkmacsystemfont|inherit|initial)$/i;

  let mutations = 0;
  const quiet = new MutationObserver((list) => {
    mutations += list.length;
  });
  quiet.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });

  // Waits for fonts, two frames, the animations that end (CSS transitions, a slat's own animations) and a DOM that
  // stays still for two frames (the JS version moves numbers on its own clock), up to max ms. Says whether the page
  // came to rest.
  async function settle(max = 2000) {

    const start = performance.now();
    const left = () => max - (performance.now() - start);

    await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, Math.max(0, left())))]);
    await frame();
    await frame();

    let still = 0;
    while (left() > 0 && still < 2) {
      const before = mutations;
      const moving = document.getAnimations().some((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime ?? Infinity));
      await frame();
      still = !moving && mutations === before ? still + 1 : 0;
    }

    return { ms: Math.round(performance.now() - start), rest: still >= 2 };
  }

  // A full-page screenshot lays the page out at another size for a moment (Chromium does, to draw what is past the
  // window), so the page's resize and matchMedia handlers run: a chart whose orientation follows the width turns and
  // turns back. calm(since) waits for the page to come to rest again when that made it change, since resized() said
  // since.
  let resizes = 0;
  addEventListener("resize", () => resizes++);
  async function calm([r, m]) {

    await frame();
    const moving = document.getAnimations().some((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime ?? Infinity));
    if (resizes !== r && (mutations !== m || moving)) await settle(500);
  }

  const visible = (el) => !!el && el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) !== false;

  // The part of a box that its clipping ancestors leave visible, up to (not including) stop, and the first ancestor
  // that cut it along each axis (and whether that one scrolls along it)
  function clipped(box, from, stop) {

    let { left, top, right, bottom } = box;
    let byX = null;
    let byY = null;

    for (let a = from; a && a !== stop && a.nodeType === 1; a = a.parentElement) {
      const s = getComputedStyle(a);
      const paint = s.clipPath !== "none" || /paint|strict|content/.test(s.contain);
      if (s.overflowX === "visible" && s.overflowY === "visible" && !paint) continue;
      // overflow on the root or the body clips at the edges of the page, not at the body's box
      const root = a === document.documentElement || a === document.body;
      const k = root ? { left: -scrollX, top: -scrollY, right: document.documentElement.clientWidth - scrollX, bottom: document.documentElement.scrollHeight - scrollY } : a.getBoundingClientRect();
      if (s.overflowX !== "visible" || paint) {
        const [l, r] = [Math.max(left, k.left), Math.min(right, k.right)];
        if (!byX && (l > left + 0.01 || r < right - 0.01)) byX = { el: a, scrolls: /auto|scroll/.test(s.overflowX) };
        left = l;
        right = r;
      }
      if (s.overflowY !== "visible" || paint) {
        const [t, b] = [Math.max(top, k.top), Math.min(bottom, k.bottom)];
        if (!byY && (t > top + 0.01 || b < bottom - 0.01)) byY = { el: a, scrolls: /auto|scroll/.test(s.overflowY) };
        top = t;
        bottom = b;
      }
    }

    return { left, top, right, bottom, byX, byY, empty: right - left < 0.5 || bottom - top < 0.5 };
  }

  const describe = (el) => {
    if (!el || el.nodeType !== 1) return "";
    const cls = [...el.classList].filter((c) => !/^rhp-s/.test(c)).slice(0, 3).map((c) => "." + c).join("");
    const block = [...el.classList].map((c) => BLOCK[c]).find(Boolean);
    return block ? `${block}${cls ? ` (${cls})` : ""}` : `<${el.localName}${el.id ? "#" + el.id : ""}>${cls ? ` (${cls})` : ""}`;
  };

  const matches = (el, selector) => {
    try {
      return el.matches(selector);
    } catch {
      return false;
    }
  };

  // The style rules of some sheets that apply now (their @media and @supports conditions met), with the cascade layer
  // each is in and the properties it declares (custom properties left out)
  function styleRules(sheets) {

    const out = [];
    const walk = (rules, layer) => {
      for (const r of rules) {
        if (r instanceof CSSLayerBlockRule) walk(r.cssRules, layer ? layer + "." + r.name : r.name);
        else if (r instanceof CSSMediaRule && matchMedia(r.media.mediaText).matches) walk(r.cssRules, layer);
        else if (r instanceof CSSSupportsRule && CSS.supports(r.conditionText)) walk(r.cssRules, layer);
        else if (r instanceof CSSStyleRule) {
          const props = [];
          for (let i = 0; i < r.style.length; i++) {
            if (!r.style[i].startsWith("--")) props.push(r.style[i]);
          }
          out.push({ rule: r, selector: r.selectorText, layer: layer ?? "", props });
        }
      }
    };

    for (const sheet of sheets) {
      try {
        walk(sheet.cssRules, null);
      } catch {
        // a sheet from another origin can't be read
      }
    }

    return out;
  }

  // rhp's own rules: its sheets adopted by the document, each rule in one of its layers (rhp.core, rhp.slat, rhp.place).
  // Every declaration in them is !important, so no page rule beats them.
  const ownRules = () => styleRules(document.adoptedStyleSheets ?? []).filter((r) => /^rhp(\.|$)/.test(r.layer));

  // An element's text with a space between its parts ("English" and "Anglais" in two spans read "English Anglais")
  const textOf = (el) => {
    const parts = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.data.trim()) parts.push(node.data.trim());
    }
    return parts.join(" ");
  };

  const snippet = (text) => {
    const t = text.replace(/\s+/g, " ").trim();
    return t.length > 40 ? t.slice(0, 39) + "…" : t;
  };

  // The text a screen reader reads in an element: its text and its images' alt, but not what is hidden from it
  // (aria-hidden, hidden, display: none) nor the controls inside a label; an element with an aria-label reads as that,
  // and parts that are not inline are read apart
  function spoken(root) {

    const parts = [];
    const walk = (node) => {
      if (node.nodeType === 3) parts.push(node.data);
      if (node.nodeType !== 1) return;
      if (node !== root && (node.getAttribute("aria-hidden") === "true" || /^(input|select|textarea|button)$/.test(node.localName) || node.checkVisibility?.({ visibilityProperty: true }) === false)) return;
      const label = node !== root && node.getAttribute("aria-label")?.trim();
      const apart = node !== root && !/^inline/.test(getComputedStyle(node).display) ? " " : "";
      parts.push(apart);
      if (label || node.localName === "img") parts.push(" ", label || node.alt || "", " ");
      else node.childNodes.forEach(walk);
      parts.push(apart);
    };

    walk(root);

    return parts.join("").replace(/\s+/g, " ").trim();
  }

  // A control's accessible name, as a screen reader gets it (simplified): aria-labelledby, aria-label, its labels, its
  // own text (a button), its value (an input button), title, placeholder
  function nameOf(el) {

    const ids = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => id && document.getElementById(id)).filter(Boolean);
    const own = /^(button|summary)$/.test(el.localName) || /^(button|switch|tab|radio|checkbox)$/.test(el.getAttribute("role") ?? "");
    const names = [
      ids.map(spoken).join(" "),
      el.getAttribute("aria-label"),
      [...(el.labels ?? [])].map(spoken).join(" "),
      own ? spoken(el) : "",
      el.localName === "input" && /^(button|submit|reset)$/.test(el.type) ? el.value : "",
      el.localName === "input" && el.type === "image" ? el.alt : "",
      el.getAttribute("title"),
      el.getAttribute("placeholder"),
    ];

    return names.map((n) => (n ?? "").replace(/\s+/g, " ").trim()).find(Boolean) ?? "";
  }

  // A CSS color as [r, g, b, a] in sRGB (0 to 255, a 0 to 1), through a canvas so every color space works
  const ink = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const colors = new Map();
  function rgba(css) {

    if (colors.has(css)) return colors.get(css);

    ink.clearRect(0, 0, 1, 1);
    ink.fillStyle = "#000";
    ink.fillStyle = css;
    ink.fillRect(0, 0, 1, 1);
    // (ImageData is not premultiplied: its channels are the color's own)
    const [r, g, b, a] = ink.getImageData(0, 0, 1, 1).data;
    const out = a ? [r, g, b, a / 255] : [0, 0, 0, 0];
    colors.set(css, out);

    return out;
  }

  const opacityOf = (el) => {
    let o = 1;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      o *= parseFloat(getComputedStyle(a).opacity) || 0;
    }
    return o;
  };

  // How tall a font's line box and its glyphs are, from canvas metrics (cached per font and text)
  const metrics = new Map();
  function fontBox(style, text) {

    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const key = font + "\n" + text;
    if (metrics.has(key)) return metrics.get(key);

    ink.font = font;
    const m = ink.measureText(text);
    const out = { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent, inkAscent: m.actualBoundingBoxAscent, inkDescent: m.actualBoundingBoxDescent };
    metrics.set(key, out);

    return out;
  }

  // How an element is turned and scaled by its own and its ancestors' transforms (kept per element)
  const turns = new Map();
  function turnOf(el) {

    if (!el || el.nodeType !== 1) return { turned: false, scale: 1 };
    if (turns.has(el)) return turns.get(el);

    const up = turnOf(el.parentElement);
    const s = getComputedStyle(el);
    let turned = up.turned || /vertical|sideways/.test(s.writingMode);
    let scale = up.scale;

    if (s.transform !== "none") {
      const m = new DOMMatrixReadOnly(s.transform);
      turned ||= Math.abs(m.b) > 1e-3 || Math.abs(m.c) > 1e-3;
      scale *= Math.hypot(m.a, m.b);
    }
    if (s.rotate !== "none" && !/^0(deg|rad|grad|turn)?$/.test(s.rotate)) turned = true;
    if (s.scale !== "none") scale *= parseFloat(s.scale) || 1;

    const out = { turned, scale };
    turns.set(el, out);

    return out;
  }

  // The box of each character of a text (a turned text's bounding boxes are much larger than its glyphs)
  function characters(node) {

    const out = [];
    const range = document.createRange();

    for (let i = 0; i < Math.min(node.data.length, 300); i++) {
      if (!node.data[i].trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push(r);
    }

    return out;
  }

  // Every visible text in the page: its fragments (one per line, or one per character when it is turned), the part of
  // each its clipping ancestors leave, and the box its glyphs fill
  function texts() {

    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.data;
      if (!text.trim()) continue;
      const el = node.parentElement;
      if (!el || SKIP_TEXT.has(el.tagName) || el.closest("svg, select, textarea")) continue;
      if (!visible(el)) continue;

      const range = document.createRange();
      range.selectNodeContents(node);
      const style = getComputedStyle(el);
      const size = parseFloat(style.fontSize);
      const fb = fontBox(style, text.trim());
      const content = fb.ascent + fb.descent;
      const turn = turnOf(el);
      const fragments = [];

      for (const r of turn.turned ? characters(node) : range.getClientRects()) {
        if (r.width < 0.5 || r.height < 0.5) continue;
        const v = clipped(r, el, null);
        const scale = turn.turned || !(content > 0) ? turn.scale : r.height / content;
        const w = r.right - r.left;
        const h = r.bottom - r.top;
        const glyphs = turn.turned
          ? { left: r.left + w * 0.15, right: r.right - w * 0.15, top: r.top + h * 0.15, bottom: r.bottom - h * 0.15 }
          : { left: r.left, right: r.right, top: r.top + Math.max(0, fb.ascent - fb.inkAscent) * scale, bottom: Math.min(r.bottom, r.top + (fb.ascent + fb.inkDescent) * scale) };
        fragments.push({ rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, visible: v, glyphs, scale });
      }

      if (!fragments.length) continue;
      const shown = fragments.filter((f) => !f.visible.empty && f.visible.right - f.visible.left >= 2 && f.visible.bottom - f.visible.top >= 2);
      out.push({ node, el, text: snippet(text), size, effective: size * Math.min(...fragments.map((f) => f.scale)), fragments, shown, style, turned: turn.turned });
    }

    return out;
  }

  const inside = (a, b) => a === b || a.contains(b) || b.contains(a);

  // What the page shows at this width: the charts, and every problem the probes can see in the DOM
  function measure() {

    const found = [];
    const add = (f) => found.push(f);
    const doc = document.documentElement;
    const all = [...document.querySelectorAll(".rhp-chart")];
    const charts = all.filter((c) => !c.parentElement?.closest(".rhp-chart"));

    const summary = charts.map((c) => {
      const box = c.getBoundingClientRect();
      const plots = [...c.querySelectorAll(":scope > .rhp-body > .rhp-plot")].filter((p) => !p.classList.contains("rhp-scale"));
      const blocks = {};
      for (const el of c.querySelectorAll(Object.keys(BLOCK).map((k) => "." + k).join(","))) {
        if (el.closest(".rhp-scale") || el.closest("[hidden]")) continue;
        const name = BLOCK[[...el.classList].find((k) => BLOCK[k])].toLowerCase();
        blocks[name] = (blocks[name] ?? 0) + 1;
      }
      const slats = plots.reduce((n, p) => n + [...p.children].filter((s) => !s.hidden).length, 0);
      return { slats, blocks, box: { width: Math.round(box.width), height: Math.round(box.height) }, orientation: c.dataset.rhpO === "v" ? "vertical" : "horizontal" };
    });

    // Plots drawn outside any Chart get no scale and none of rhp's CSS
    const lost = [...document.querySelectorAll(".rhp-plot")].filter((p) => !p.closest(".rhp-chart"));
    if (lost.length) add({ code: "plot-outside-chart", count: lost.length });
    if (!charts.length && !lost.length) add({ code: "no-chart" });

    // A chart in a box that shrinks to its content (a flex item, an inline-block, a float, width: fit-content) is only
    // as wide as its room, with nothing left for the plot. What is drawn in it then is no use to measure.
    const collapsed = new Set();
    for (const c of charts) {
      const plots = [...c.querySelectorAll(":scope > .rhp-body > .rhp-plot")].filter((p) => !p.classList.contains("rhp-scale"));
      if (!plots.length || !plots.every((p) => p.getBoundingClientRect().width < 2)) continue;
      collapsed.add(c);
      // the box that shrinks to fit: an item of a flex row, an inline-block or a float
      let why = "";
      for (let a = c; a && a !== document.body && !why; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (/flex/.test(getComputedStyle(a.parentElement ?? a).display)) why = a === c ? `it is an item of the flex row ${describe(a.parentElement)}` : `it sits in ${describe(a)}, an item of a flex row`;
        else if (/inline/.test(s.display)) why = `it sits in ${describe(a)}, an inline-block`;
        else if (s.float !== "none") why = `it sits in ${describe(a)}, a float`;
      }
      add({ code: "collapsed-chart", width: Math.round(c.getBoundingClientRect().width), why });
    }

    for (const c of charts) {
      if (collapsed.has(c)) continue;
      const plots = [...c.querySelectorAll(":scope > .rhp-body > .rhp-plot")].filter((p) => !p.classList.contains("rhp-scale"));
      // an overlap Plot may be empty (a pointer's readout, drawn only while pointing); a chart with nothing in any Plot,
      // or a Plot of slats with none, draws no data
      const empty = (p) => ![...p.children].some((s) => !s.hidden);
      if (plots.length && (plots.every(empty) || plots.some((p) => empty(p) && !p.hasAttribute("data-rhp-overlap")))) add({ code: "empty-plot", chart: describe(c) });
      for (const p of plots) {
        const shown = [...p.children].filter((s) => !s.hidden);
        if (!shown.length) continue;
        const r = p.getBoundingClientRect();
        const vertical = p.dataset.rhpO === "v";
        const length = vertical ? r.height : r.width;
        const first = shown[0].getBoundingClientRect();
        const band = p.hasAttribute("data-rhp-overlap") ? Infinity : vertical ? first.width : first.height;
        // (slats as thin as 3px are fine: a histogram's many bins, or the per-year slats a line chart is pointed through)
        if (length < 40 || band < 2) {
          add({ code: "small-plot", vertical, thin: band < 2, length: Math.round(length), band: Math.round(band * 10) / 10, chart: describe(c) });
        } else if (!vertical && band < 18 && shown.filter((s) => [...s.querySelectorAll(".rhp-label")].some((l) => visible(l) && l.textContent.trim())).length * 2 > shown.length) {
          // a horizontal chart whose slats are too thin for the text most of them hold (one tag on one slat fits)
          add({ code: "cramped", vertical: false, band: Math.round(band * 10) / 10, chart: describe(c) });
        }
      }
    }

    // CSS variables that came out as NaN or undefined, and values past the Chart's scale
    const VALUE = { "--rhp-from": "from", "--rhp-to": "to", "--rhp-at": "at", "--rhp-value": "value", "--rhp-size": "size", "--rhp-across": "across", "--rhp-cross": "cross", "--rhp-min": "scale", "--rhp-max": "scale", "--rhp-thick": "thick" };
    for (const c of all) {
      for (const el of [c, ...c.querySelectorAll("[style]")]) {
        for (let i = 0; i < el.style.length; i++) {
          const name = el.style[i];
          if (!name.startsWith("--rhp-")) continue;
          const value = el.style.getPropertyValue(name).trim();
          if (/(^|[^\w-])(NaN|undefined|Infinity)([^\w-]|$)/.test(value)) {
            const block = el === c ? "Chart" : [...el.classList].map((k) => BLOCK[k]).find(Boolean) ?? describe(el);
            add({ code: "nan-value", block, prop: VALUE[name] ?? name, value });
          }
        }
      }
    }

    // (only what clipping leaves visible: a slat may show a window of its marks, and clip the rest)
    const past = new Map();
    for (const el of document.querySelectorAll(".rhp-bar, .rhp-dot, .rhp-tick, .rhp-place, .rhp-area, .rhp-line")) {
      if (el.closest("[hidden], .rhp-scale")) continue;
      const c = el.closest(".rhp-chart");
      if (!c) continue;
      const box = el.getBoundingClientRect();
      const point = !/rhp-(bar|area|line)/.test(el.className.baseVal ?? el.className);
      if (point ? clipped(box, el.parentElement, null).empty : box.width * box.height === 0 || clipped(box, el.parentElement, null).empty) continue;
      const num = (e, k) => parseFloat(e.style.getPropertyValue(k));
      const min = num(c, "--rhp-min");
      const max = num(c, "--rhp-max");
      if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
      const eps = Math.abs(max - min) * 1e-6;
      const block = BLOCK[[...el.classList].find((k) => BLOCK[k])];
      const values = ["--rhp-from", "--rhp-to", "--rhp-at"].map((k) => num(el, k)).filter(Number.isFinite);
      for (const v of values) {
        if (v < min - eps || v > max + eps) {
          const key = block;
          const had = past.get(key);
          const worst = !had ? v : Math.abs(v - (v > max ? max : min)) > Math.abs(had.value - (had.value > max ? max : min)) ? v : had.value;
          past.set(key, { block, value: worst, min, max, count: (had?.count ?? 0) + 1 });
        }
      }
      const cmin = num(c, "--rhp-cross-min");
      const cmax = num(c, "--rhp-cross-max");
      if (Number.isFinite(cmin) && Number.isFinite(cmax)) {
        const ceps = Math.abs(cmax - cmin) * 1e-6;
        for (const v of ["--rhp-cross", "--rhp-cross-from", "--rhp-cross-to"].map((k) => num(el, k)).filter(Number.isFinite)) {
          if (v < cmin - ceps || v > cmax + ceps) past.set(block + " cross", { block, value: v, min: cmin, max: cmax, cross: true, count: (past.get(block + " cross")?.count ?? 0) + 1 });
        }
      }
    }
    // (an Area or a Line is squeezed into the scale rather than cut, so it has a code of its own)
    for (const p of past.values()) {
      add({ code: /Area|Line/.test(p.block) ? "points-past-scale" : "value-past-scale", ...p });
    }

    const list = texts();
    const inCollapsed = (el) => [...collapsed].some((c) => c.contains(el));

    // Marks and labels outside their chart's box (only the part clipping leaves visible counts), and every text in the
    // chart by its glyphs (axis numbers included), since a text can run past its own element
    for (const c of charts) {
      if (collapsed.has(c)) continue;
      const box = c.getBoundingClientRect();
      let worst = null;
      const out = new Set();
      const beyond = (v, el, text) => {
        const by = { right: v.right - box.right, left: box.left - v.left, bottom: v.bottom - box.bottom, top: box.top - v.top };
        const side = Object.keys(by).reduce((a, k) => (by[k] > by[a] ? k : a));
        if (by[side] <= 1) return false;
        out.add(el);
        if (!worst || by[side] > worst.by) worst = { by: Math.round(by[side] * 10) / 10, side, what: describe(el), text: snippet(text), axis: !!el.closest(".rhp-axis"), label: !!el.closest(".rhp-label"), edge: !!el.closest(".rhp-label[data-rhp-edge]"), vertical: c.dataset.rhpO === "v" };
        return true;
      };
      for (const e of c.querySelectorAll("*")) {
        const b = e.getBoundingClientRect();
        if (!b.width && !b.height) continue;
        if (!visible(e) || getComputedStyle(e).position === "fixed") continue;
        const v = clipped(b, e.parentElement, c);
        if (v.right < v.left || v.bottom < v.top) continue;
        beyond(v, e, e.textContent ?? "");
      }
      for (const t of list) {
        if (!c.contains(t.el)) continue;
        for (const f of t.shown) {
          const v = clipped(f.rect, t.el, c);
          const g = { left: Math.max(f.glyphs.left, v.left), right: Math.min(f.glyphs.right, v.right), top: Math.max(f.glyphs.top, v.top), bottom: Math.min(f.glyphs.bottom, v.bottom) };
          if (g.right - g.left >= 0.5 && g.bottom - g.top >= 0.5 && beyond(g, t.el, t.node.data)) break;
        }
      }
      if (worst) add({ code: "sticks-out", ...worst, count: out.size, chart: describe(c) });
    }

    // NaN, undefined or Infinity printed in a chart: a value that was missing, or worked out from nothing
    for (const t of list) {
      if (t.el.closest(".rhp-chart") && /(^|[^\w$])(NaN|undefined|Infinity)(?![\w$])/.test(t.node.data)) add({ code: "nan-value", printed: true, text: t.text, what: describe(t.el) });
    }

    // Text outside its poster
    for (const poster of document.querySelectorAll(".poster")) {
      const box = poster.getBoundingClientRect();
      for (const t of list) {
        if (!poster.contains(t.el)) continue;
        for (const f of t.fragments) {
          const v = clipped(f.rect, t.el, poster);
          if (v.empty) continue;
          const by = Math.max(v.right - box.right, box.left - v.left, v.bottom - box.bottom, box.top - v.top);
          if (by > 1) {
            add({ code: "text-outside-poster", text: t.text, by: Math.round(by), what: describe(t.el) });
            break;
          }
        }
      }
    }

    // Text cut off by an ancestor's overflow (an ellipsis, a box too small): not by a box that scrolls that way, and
    // not the little a tight line-height takes off the space above and below the glyphs. With text-overflow: ellipsis
    // any overflow cuts letters (the browser draws the ellipsis over them), and the line comes as two fragments, the
    // whole and what is shown.
    // (text with no part shown is hidden on purpose, for screen readers or until it is needed: not cut off)
    for (const t of list) {
      if (inCollapsed(t.el) || !t.shown.length) continue;
      for (const f of t.fragments) {
        const v = f.visible;
        const ellipsis = !!v.byX && getComputedStyle(v.byX.el).textOverflow === "ellipsis";
        const lostX = v.byX && !v.byX.scrolls ? Math.max(0, v.left - f.rect.left) + Math.max(0, f.rect.right - v.right) : 0;
        const lostY = v.byY && !v.byY.scrolls ? Math.max(0, v.top - f.glyphs.top) + Math.max(0, f.glyphs.bottom - v.bottom) : 0;
        if (lostX > (ellipsis ? 0.05 : 1) || lostY > Math.max(1.5, t.size * 0.15)) {
          const by = lostX > (ellipsis ? 0.05 : 1) ? v.byX.el : v.byY.el;
          const width = f.rect.right - f.rect.left;
          const shownWidth = ellipsis && t.fragments.length > 1 ? Math.min(...t.fragments.map((g) => g.rect.right - g.rect.left)) : width - lostX;
          const lost = by === v.byX?.el ? width - shownWidth : lostY;
          add({ code: "text-cut-off", text: t.text, lost: Math.max(1, Math.round(lost)), ellipsis: ellipsis && by === v.byX.el, by: describe(by), edge: !!by.closest(".rhp-label[data-rhp-edge]"), label: !!by.closest(".rhp-label"), vertical: by.closest("[data-rhp-o]")?.dataset.rhpO === "v" });
          break;
        }
      }
    }

    // Text over other text: the glyph boxes of two elements, neither inside the other
    const boxes = [];
    for (const t of list) {
      for (const f of t.shown) {
        const g = { left: Math.max(f.glyphs.left, f.visible.left), right: Math.min(f.glyphs.right, f.visible.right), top: Math.max(f.glyphs.top, f.visible.top), bottom: Math.min(f.glyphs.bottom, f.visible.bottom) };
        if (g.right - g.left > 0.5 && g.bottom - g.top > 0.5) boxes.push({ t, g });
      }
    }
    boxes.sort((a, b) => a.g.left - b.g.left);
    const pairs = new Set();
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      for (let j = i + 1; j < boxes.length && boxes[j].g.left < a.g.right; j++) {
        const b = boxes[j];
        if (a.t.el === b.t.el || inside(a.t.el, b.t.el) || inCollapsed(a.t.el) || inCollapsed(b.t.el)) continue;
        const x = Math.min(a.g.right, b.g.right) - Math.max(a.g.left, b.g.left);
        const y = Math.min(a.g.bottom, b.g.bottom) - Math.max(a.g.top, b.g.top);
        if (x <= 1 || y <= 1) continue;
        const key = [a.t.text, b.t.text].sort().join("\n");
        if (pairs.has(key)) continue;
        pairs.add(key);
        add({ code: "text-overlap", a: a.t.text, b: b.t.text, x: Math.round(x), y: Math.round(y), whatA: describe(a.t.el), whatB: describe(b.t.el) });
      }
    }

    // A vertical chart left at the default height (240px) whose slats' labels crowd each other
    for (const c of charts) {
      if (collapsed.has(c) || c.dataset.rhpO !== "v" || c.hasAttribute("data-rhp-aspect") || c.style.getPropertyValue("--rhp-height").trim() !== "240px") continue;
      // the labels' glyph boxes, each with the slat of the chart's own Plot it is in (stacked parts are slats of a Plot
      // inside it)
      const labels = boxes.filter((x) => c.contains(x.t.el) && x.t.el.closest(".rhp-label")).map((x) => ({ ...x, slat: x.t.el.closest(".rhp-body > .rhp-plot > *") }));
      const crowded = labels.some((a, i) => labels.some((b, j) => j > i && a.slat && a.slat === b.slat && a.t.el !== b.t.el
        && Math.min(a.g.right, b.g.right) - Math.max(a.g.left, b.g.left) > 1 && Math.min(a.g.bottom, b.g.bottom) - Math.max(a.g.top, b.g.top) > 1));
      if (crowded) add({ code: "cramped", vertical: true, chart: describe(c) });
    }

    const own = ownRules();

    // Colors series-n past the theme's series: rhp has no color for them, and they fall back to series-1
    for (const c of charts) {
      const cs = getComputedStyle(c);
      let have = 0;
      while (cs.getPropertyValue(`--rhp-series-${have + 1}`).trim()) {
        have++;
      }
      const past = new Map();
      for (const el of c.querySelectorAll("[style*='--rhp-color']")) {
        const n = +(el.style.getPropertyValue("--rhp-color").match(/var\(--rhp-series-(\d+)\)/)?.[1] ?? 0);
        if (n > have && !getComputedStyle(el).getPropertyValue(`--rhp-series-${n}`).trim()) past.set(n, (past.get(n) ?? 0) + 1);
      }
      if (past.size) add({ code: "series-past-theme", keys: [...past.keys()].sort((a, b) => a - b), count: [...past.values()].reduce((a, b) => a + b, 0), have });
    }

    // Page CSS that reaches into a chart and sets what rhp's own CSS sets there: it loses, so it changes nothing
    const byProp = new Map();
    for (const r of own) {
      for (const p of r.props) {
        if (!byProp.has(p)) byProp.set(p, []);
        byProp.get(p).push(r.selector);
      }
    }
    const pageSheets = [...document.styleSheets].filter((s) => !s.ownerNode?.matches?.("[data-rhp-layers], [data-rhp-server]"));
    for (const r of styleRules(pageSheets)) {
      if (/^rhp(\.|$)/.test(r.layer) || !r.props.length) continue;
      let matched = [];
      try {
        matched = [...document.querySelectorAll(r.selector)];
      } catch {
        continue;
      }
      const reached = matched.filter((el) => el.closest(".rhp-chart")).slice(0, 60);
      if (!reached.length) continue;
      // only a rule aimed at the chart: one that names rhp's classes, or one with a class, an id or an attribute on its
      // subject that reaches only elements in charts (a reset such as svg { display: block } is not aimed at it)
      const subjects = r.selector.split(/,(?![^(]*\))/).map((x) => x.trim().split(/\s*[\s>+~]\s*(?![^(]*\))/).pop());
      if (!/\.rhp-/.test(r.selector) && !(reached.length === matched.length && subjects.every((x) => /[.#[]/.test(x)))) continue;
      const dead = r.props.filter((p) => byProp.has(p) && reached.every((el) => byProp.get(p).some((sel) => matches(el, sel))));
      if (!dead.length) continue;
      const family = (p) => p.match(/^(background|border|margin|padding|font|outline|text-decoration|transition|animation|inset|overflow|grid|flex|columns?|list-style)/)?.[1] ?? p;
      add({ code: "page-css-ignored", selector: snippet(r.selector), props: [...new Set(dead.map(family))], what: describe(reached[0]), count: reached.length });
    }

    // Text too small to read
    let tiny = null;
    let tinyCount = 0;
    for (const t of list) {
      if (!t.shown.length || t.effective >= 9) continue;
      tinyCount++;
      if (!tiny || t.effective < tiny.size) tiny = { text: t.text, size: Math.round(t.effective * 10) / 10, what: describe(t.el) };
    }
    if (tiny) add({ code: "tiny-text", ...tiny, count: tinyCount });

    // The page scrolling sideways, and the outermost element that reaches furthest past it
    const overflow = doc.scrollWidth - doc.clientWidth;
    if (overflow > 1) {
      let widest = null;
      for (const e of document.body.querySelectorAll("*")) {
        const r = e.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 && visible(e) && (!widest || r.right > widest.right + 0.5)) widest = { el: e, right: r.right, width: r.width };
      }
      add({ code: "page-scrolls-sideways", by: Math.round(overflow), what: widest ? describe(widest.el) : "", width: widest ? Math.round(widest.width) : 0, viewport: doc.clientWidth });
    }

    // Controls a screen reader can only call "button" or "slider": no text, aria-label, aria-labelledby or label
    const unnamed = [...document.querySelectorAll(CONTROLS)].filter((el) => visible(el) && !nameOf(el));
    if (unnamed.length) add({ code: "unnamed-control", what: describe(unnamed[0]), count: unnamed.length });

    // Fonts the page asks for that are not there: a web font none of whose faces loaded (a family split by
    // unicode-range, as Google Fonts serves CJK ones, loads only the faces its text needs, and document.fonts.check()
    // says false while another face is unused), or a font named in a stack that this machine doesn't have (it measures
    // like the fallbacks)
    const familyOf = (f) => f.family.replace(/^["']|["']$/g, "");
    const faces = [...(document.fonts ?? [])];
    const declared = new Set(faces.map(familyOf));
    const loaded = new Set(faces.filter((f) => f.status === "loaded").map(familyOf));
    const missing = new Map();
    const tried = new Set();
    for (const t of list) {
      const family = t.style.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (!family || GENERIC.test(family) || loaded.has(family)) continue;
      const font = `${t.style.fontStyle} ${t.style.fontWeight} 16px "${family}"`;
      if (tried.has(font)) continue;
      tried.add(font);
      if (declared.has(family)) {
        missing.set(family, faces.some((f) => familyOf(f) === family && f.status === "error"));
        continue;
      }
      const probe = "mmmmmmmmmmlli1WW@#";
      const absent = ["monospace", "serif"].every((fallback) => {
        ink.font = `${t.style.fontStyle} ${t.style.fontWeight} 72px ${fallback}`;
        const base = ink.measureText(probe).width;
        ink.font = `${t.style.fontStyle} ${t.style.fontWeight} 72px "${family}", ${fallback}`;
        return ink.measureText(probe).width === base;
      });
      if (absent) missing.set(family, false);
    }
    for (const [family, failed] of missing) {
      add({ code: "font-not-loaded", family, failed });
    }

    return { found, charts: summary };
  }

  // A transition the slat's CSS sets on a block itself replaces rhp's (left and width, or bottom and height, or an
  // outline's d), so the block jumps to new values. Not in the JS version (nothing is transitioned there), not with
  // transition: none (a choice), and not when the slat's CSS places the block itself (a radial layout). It is read
  // with motion on: with reduced motion, rhp turns every block's transition off.
  function transitions() {

    const found = [];
    const own = ownRules();
    const PLACE = /^(left|right|top|bottom|width|height|inset)/;
    const jumps = new Map();

    for (const el of document.querySelectorAll(".rhp-bar, .rhp-dot, .rhp-tick, .rhp-label[data-rhp-at], .rhp-place, .rhp-area, .rhp-line, .rhp-cell, .rhp-area path, .rhp-line path")) {
      if (!el.closest(".rhp-chart") || el.closest("[data-rhp-animate='js'], [data-rhp-turning], .rhp-scale, [hidden]")) continue;
      const s = getComputedStyle(el);
      const names = s.transitionProperty.split(/\s*,\s*/);
      const times = s.transitionDuration.split(/\s*,\s*/).map((x) => parseFloat(x) || 0);
      const live = names.filter((n, i) => n !== "none" && times[i % times.length] > 0);
      if (!live.length || live.includes("all")) continue;
      const path = el.localName === "path";
      const block = BLOCK[[...(path ? el.closest(".rhp-area, .rhp-line") : el).classList].find((k) => BLOCK[k])];
      const vertical = el.closest("[data-rhp-o]")?.dataset.rhpO === "v";
      const span = block === "Bar" || block === "Area" || block === "Line";
      const needs = path ? ["d"] : block === "Cell" ? ["background-color"] : vertical ? (span ? ["bottom", "height"] : ["bottom"]) : span ? ["left", "width"] : ["left"];
      const dropped = needs.filter((p) => !live.includes(p));
      if (!dropped.length) continue;
      if (!path && own.some((r) => r.layer === "rhp.slat" && r.props.some((p) => PLACE.test(p)) && matches(el, r.selector))) continue;
      const key = block + (path ? " path" : "") + "\n" + s.transitionProperty;
      jumps.set(key, { block, path, set: live.join(", "), dropped, what: describe(path ? el.parentElement : el), count: (jumps.get(key)?.count ?? 0) + 1 });
    }

    for (const j of jumps.values()) {
      found.push({ code: "block-transition", ...j });
    }

    return found;
  }

  // A box-shadow's layers that reach out of the box (not inset), with their colors
  function shadows(value) {

    const out = [];
    if (!value || value === "none") return out;

    for (const layer of value.split(/,(?![^(]*\))/)) {
      if (/\binset\b/.test(layer)) continue;
      const color = layer.match(/(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)|#[0-9a-f]{3,8}\b/i)?.[0];
      const [x = 0, y = 0, blur = 0, spread = 0] = [...layer.replace(color ?? "", "").matchAll(/-?[\d.]+px/g)].map((m) => parseFloat(m[0]));
      if (color && Math.max(Math.abs(x), Math.abs(y)) + spread + blur / 2 >= 1) out.push({ kind: "shadow", color: rgba(color) });
    }

    return out;
  }

  // What draws a mark's edge: its borders, its outline and its box-shadows
  function edges(s) {

    const out = [];

    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const style = s[`border${side}Style`];
      if (parseFloat(s[`border${side}Width`]) >= 1 && style !== "none" && style !== "hidden") out.push({ kind: "border", color: rgba(s[`border${side}Color`]) });
    }
    if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 1) out.push({ kind: "outline", color: rgba(s.outlineColor) });

    return [...out, ...shadows(s.boxShadow)];
  }

  // The texts and marks whose colors are read from screenshots, in page px. The text's own color is kept here; the
  // screenshot with the glyphs hidden gives what is behind each.
  function colorItems() {

    const items = [];
    const slats = new Map();

    for (const t of texts()) {
      if (!t.shown.length || t.el.closest(":disabled, [aria-disabled='true'], [inert]")) continue;
      const color = rgba(t.style.webkitTextFillColor || t.style.color);
      if (color[3] === 0) continue;
      const weight = parseInt(t.style.fontWeight, 10) || 400;
      items.push({
        kind: "text",
        text: t.text,
        what: describe(t.el),
        color,
        opacity: opacityOf(t.el),
        size: t.effective,
        bold: weight >= 700,
        boxes: t.shown.map((f) => ({ left: Math.max(f.glyphs.left, f.visible.left), top: Math.max(f.glyphs.top, f.visible.top), right: Math.min(f.glyphs.right, f.visible.right), bottom: Math.min(f.glyphs.bottom, f.visible.bottom) })),
      });
    }

    for (const el of document.querySelectorAll(MARKS)) {
      if (el.closest("[hidden], .rhp-scale") || !visible(el)) continue;
      const c = el.closest(".rhp-chart");
      const r = el.getBoundingClientRect();
      const v = clipped(r, el.parentElement, null);
      if (v.empty || r.width * r.height < 4) continue;
      const block = BLOCK[[...el.classList].find((k) => BLOCK[k])];
      const s = getComputedStyle(el);
      let fill = s.backgroundColor;
      if (block === "Area") fill = s.stroke;
      if (block === "Line") fill = getComputedStyle(el.querySelector(".rhp-stroke") ?? el).stroke;
      const color = /^(rgb|color|oklch|oklab|lab|lch|hsl|hwb|#)/.test(fill) ? rgba(fill) : [0, 0, 0, 0];
      // a Bar across the whole scale is a track behind the values, which is meant to be faint
      const plot = el.closest(".rhp-plot");
      const pr = plot?.getBoundingClientRect();
      const vertical = el.dataset.rhpO === "v";
      const track = block === "Bar" && pr && (vertical ? r.height >= pr.height * 0.99 : r.width >= pr.width * 0.99);
      // the labels that name what a mark shows: words (not numbers) in the slat it is drawn in
      const slat = el.parentElement?.closest(".rhp-plot > *");
      const names = slat && slat !== el
        ? [...slat.querySelectorAll(".rhp-label")].filter((l) => !l.contains(el) && visible(l)).map((l) => l.textContent.trim()).filter((x) => x && !/^[\s\d.,%+\-\u2212\u2013$\u20ac\u00a3\u00a5:/()kKMmBb]*$/.test(x))
        : [];
      if (slat && !slats.has(slat)) slats.set(slat, slats.size);
      items.push({
        kind: "mark", block, what: describe(el), color, opacity: opacityOf(el), track, names, chart: all().indexOf(c), slat: slat ? slats.get(slat) : null,
        edges: /Area|Line/.test(block) ? [] : edges(s), boxes: [{ left: v.left, top: v.top, right: v.right, bottom: v.bottom }],
      });
    }

    return items;
  }

  const all = () => [...document.querySelectorAll(".rhp-chart")];

  // Hiding the glyphs (for the screenshot of what is behind text) or the marks (for what is behind marks), and
  // putting them back. Inline !important beats rhp's layered rules; transitions this starts are finished at once.
  // Only the properties set here are put back, so what the page changed in the meantime stays.
  let undo = [];
  const sheet = document.createElement("style");
  const set = (el, name, value) => {
    const had = el.hasAttribute("style");
    const was = el.style.getPropertyValue(name);
    const priority = el.style.getPropertyPriority(name);
    el.style.setProperty(name, value, "important");
    undo.push(() => {
      if (was) el.style.setProperty(name, was, priority);
      else el.style.removeProperty(name);
      if (!had && !el.getAttribute("style")) el.removeAttribute("style");
    });
  };
  function hide(what) {

    show();

    if (what === "text") {
      // a text's shadow stays: a halo is what the glyphs are read against
      sheet.textContent = "*, *::before, *::after { -webkit-text-stroke-color: transparent !important; text-decoration-color: transparent !important; caret-color: transparent !important; } ::marker { -webkit-text-fill-color: transparent !important; color: transparent !important; }";
      document.head.append(sheet);
      undo.push(() => sheet.remove());
      // on each element that holds text (rhp's chart body resets what it would inherit), and on the root for the rest
      const holders = new Set([document.documentElement, ...document.querySelectorAll(".rhp-body")]);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.data.trim() && node.parentElement) holders.add(node.parentElement);
      }
      for (const el of holders) {
        set(el, "-webkit-text-fill-color", "transparent");
        set(el, "-webkit-text-stroke-color", "transparent");
        set(el, "text-decoration-color", "transparent");
      }
    }

    if (what === "marks") {
      for (const el of document.querySelectorAll(MARKS)) {
        set(el, "visibility", "hidden");
      }
    }

    finish();
  }

  function show() {

    for (const f of undo.splice(0).reverse()) {
      f();
    }

    finish();
  }

  const finish = () => {
    for (const a of document.getAnimations()) {
      if (a instanceof CSSTransition && /text-fill-color|visibility|color|text-shadow|text-decoration/.test(a.transitionProperty)) {
        try {
          a.finish();
        } catch {
          // an animation that can't finish is left to run
        }
      }
    }
  };

  // The content's box, for the screenshots (what is drawn, not the empty page around it)
  function contentBox() {

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    for (const e of document.body.querySelectorAll("*")) {
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || !visible(e)) continue;
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }

    if (!Number.isFinite(left)) return null;

    return { left: left + scrollX, top: top + scrollY, right: right + scrollX, bottom: bottom + scrollY };
  }

  // What the interaction pass works on: slats to point at (the first, the middle and the last of the largest chart),
  // buttons and toggles, ranges, selects, a slider for the arrow keys, Plots with keyboard. Controls go by their
  // accessible name.
  function targets() {

    const list = (window.__rhpTargets = []);
    const keep = (el) => list.push(el) - 1;
    const out = { slats: [], buttons: [], ranges: [], selects: [], slider: null, keyboard: null };
    const label = (el) => (nameOf(el) ? `"${snippet(nameOf(el))}"` : describe(el));

    // the largest chart (a size key drawn as a chart of its own comes before the chart it explains)
    const area = (el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height;
    const chart = all().filter((c) => visible(c) && !c.parentElement?.closest(".rhp-chart")).sort((a, b) => area(b) - area(a))[0];
    // its first Plot with slats that takes the pointer (an overlay of guides or a readout takes none)
    const plots = chart ? [...chart.querySelectorAll(":scope > .rhp-body > .rhp-plot")].filter((p) => !p.classList.contains("rhp-scale") && [...p.children].some((s) => !s.hidden)) : [];
    const plot = plots.find((p) => getComputedStyle(p).pointerEvents !== "none") ?? plots[0];
    if (plot) {
      const vertical = plot.dataset.rhpO === "v";
      const slats = [...plot.children].filter((s) => !s.hidden && visible(s));
      slats.sort((a, b) => (vertical ? a.getBoundingClientRect().left - b.getBoundingClientRect().left : a.getBoundingClientRect().top - b.getBoundingClientRect().top));
      const picks = [...new Set([0, Math.floor((slats.length - 1) / 2), slats.length - 1])].filter((i) => slats[i]);
      for (const i of picks) {
        const name = [...slats[i].querySelectorAll(".rhp-label")].map(textOf).find((x) => x) ?? "";
        out.slats.push({ index: i + 1, of: slats.length, name: snippet(name), target: keep(slats[i]) });
      }
    }

    const usable = (el) => visible(el) && !el.disabled && el.getAttribute("aria-disabled") !== "true";
    const buttons = [...document.querySelectorAll("button, [role=button], [role=switch], [role=tab], [role=radio], [role=checkbox], input[type=checkbox], input[type=radio], summary")]
      .filter((b) => usable(b) && !(b.type === "submit" && b.form) && !b.closest("a[href]"));
    for (const b of buttons.slice(0, 12)) {
      out.buttons.push({ label: label(b), role: b.getAttribute("role") ?? b.type ?? b.localName, target: keep(b) });
    }

    for (const r of [...document.querySelectorAll("input[type=range]")].filter(usable).slice(0, 6)) {
      const min = parseFloat(r.min || "0");
      const max = parseFloat(r.max || "100");
      const now = parseFloat(r.value);
      out.ranges.push({ label: label(r), value: now <= (min + max) / 2 ? max : min, target: keep(r) });
    }

    for (const s of [...document.querySelectorAll("select")].filter(usable).slice(0, 6)) {
      if (s.options.length > 1) out.selects.push({ label: label(s), value: s.options[(s.selectedIndex + 1) % s.options.length].value, target: keep(s) });
    }

    // a slider of the page's own (role=slider) first: nothing else tries it
    const slider = [...document.querySelectorAll("[role=slider]"), ...document.querySelectorAll("input[type=range]")].find(usable);
    if (slider) out.slider = { label: label(slider), target: keep(slider) };

    const focusable = [...document.querySelectorAll(".rhp-plot > [tabindex]")].filter(visible);
    if (focusable.length) out.keyboard = { count: focusable.length, vertical: focusable[0].parentElement.dataset.rhpO === "v" };

    return out;
  }

  // A point in the window on a mark of a slat (a target), where a reader would point or tap. The slat is scrolled into
  // view, and the point is the first of a few on its marks that reaches the slat (a donut's wedge or a bubble sits away
  // from the slat's center), else the first on its first mark (its slats may take no pointer), else the slat's center.
  // The marks with a pointer cursor come first, in the page's order (the one shown at rest is often drawn larger), then
  // the largest. The first point on a mark is across it (a share of its width: the middle, or one side so that two taps
  // in a row land on different values), and on a Line it is on the line itself (a sloped line crosses its box).
  function pointAt(n, across = 0.5) {

    const slat = window.__rhpTargets[n];
    slat.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const marks = [...slat.querySelectorAll(MARKS + ", .rhp-cell")].filter(visible)
      .map((m) => ({ m, r: m.getBoundingClientRect(), pointer: getComputedStyle(m).cursor === "pointer" }))
      .filter(({ r }) => r.width * r.height > 0);
    marks.sort((a, b) => b.pointer - a.pointer || (a.pointer ? 0 : b.r.width * b.r.height - a.r.width * a.r.height));
    const grid = [0.1, 0.3, 0.5, 0.7, 0.9].flatMap((x) => [0.1, 0.3, 0.5, 0.7, 0.9].map((y) => [x, y]));
    const pointsOn = ({ m, r }) => {
      const line = m.matches(".rhp-line") && m.querySelector(".rhp-stroke");
      if (line) {
        const length = line.getTotalLength();
        return [across, 0.5, 0.1, 0.3, 0.7, 0.9].map((f) => line.getPointAtLength(length * f).matrixTransform(line.getScreenCTM()));
      }
      return [[across, 0.5], ...grid].map(([fx, fy]) => ({ x: r.left + r.width * fx, y: r.top + r.height * fy }));
    };

    for (const mark of marks.slice(0, 3)) {
      for (const { x, y } of pointsOn(mark)) {
        if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && slat.contains(document.elementFromPoint(x, y))) return { x, y };
      }
    }

    const r = slat.getBoundingClientRect();
    const { x, y } = marks.length ? pointsOn(marks[0])[0] : { x: r.left + r.width / 2, y: r.top + r.height / 2 };

    return { x, y };
  }

  // Where the controls and the charts are on the page (in page px), before an interaction. moved(n) then says which
  // of them the interaction moved by more than 2px: a control other than the one it used (a target), or a chart's top.
  // What is fixed or sticky moves with scrolling, so it is left out.
  let placed = [];
  function place() {

    const pinned = (el) => {
      for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
        if (/fixed|sticky/.test(getComputedStyle(a).position)) return true;
      }
      return false;
    };
    const charts = all().filter((c) => !c.parentElement?.closest(".rhp-chart"));
    placed = [...document.querySelectorAll(CONTROLS), ...charts].filter((el) => visible(el) && !pinned(el)).map((el) => {
      const r = el.getBoundingClientRect();
      return { el, chart: charts.includes(el), x: r.left + scrollX, y: r.top + scrollY };
    });
  }

  function moved(n) {

    const used = window.__rhpTargets[n];
    const out = [];

    for (const p of placed) {
      if (p.el === used || !p.el.isConnected || !visible(p.el)) continue;
      const r = p.el.getBoundingClientRect();
      const dx = p.chart ? 0 : Math.round(r.left + scrollX - p.x);
      const dy = Math.round(r.top + scrollY - p.y);
      if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) continue;
      const name = p.chart ? "" : snippet(nameOf(p.el));
      out.push({ what: p.chart ? "the chart" : name ? `"${name}"` : describe(p.el), dx, dy });
    }

    return out;
  }

  // A change recorder for one interaction: what changed in the DOM (text, attributes, inline styles, elements)
  let recorder = null;
  function record() {

    const seen = { text: 0, attributes: 0, styles: 0, elements: 0 };
    recorder = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") {
          seen.text++;
        } else if (m.type === "childList") {
          seen.elements += m.addedNodes.length + m.removedNodes.length;
        } else if (m.attributeName === "style") {
          seen.styles++;
        } else {
          seen.attributes++;
        }
      }
    });
    recorder.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    recorder.seen = seen;
  }

  function stop() {

    if (!recorder) return null;

    for (const m of recorder.takeRecords()) {
      recorder.seen.attributes += m.type === "attributes" && m.attributeName !== "style" ? 1 : 0;
      recorder.seen.styles += m.attributeName === "style" ? 1 : 0;
      recorder.seen.text += m.type === "characterData" ? 1 : 0;
      recorder.seen.elements += m.type === "childList" ? m.addedNodes.length + m.removedNodes.length : 0;
    }
    recorder.disconnect();
    const seen = recorder.seen;
    recorder = null;

    return seen;
  }

  // Where the focus is: which slat of which Plot, if it is on one
  function focused() {

    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const plot = el.parentElement?.classList.contains("rhp-plot") ? el.parentElement : null;
    if (!plot) return { slat: false };

    return { slat: true, index: [...plot.children].indexOf(el) + 1, name: snippet([...el.querySelectorAll(".rhp-label")].map(textOf).find((x) => x) ?? "") };
  }

  window.__rhpProbe = { settle, calm, resized: () => [resizes, mutations], measure, transitions, colorItems, hide, show, contentBox, targets, pointAt, place, moved, record, stop, focused };
}

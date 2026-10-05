// The interaction pass: point at a mark of the first, middle and last slat (and of the slat whose edge Label is
// widest), click each button and toggle (up to 12), change each range and select, press an arrow key on a slider, and
// press Tab and the arrow keys when slats take focus. Then Tab through the page, and note each stop where focus shows
// nothing. On a phone (taps), tap a mark of the first and the last slat. For each, what changed (the DOM, or only the
// look), what threw, and what moved: a control other than the one used, a chart's top, or the plot while a slat is
// lit (the layout jumps); for a tap, also whether the reader sees none of the text it changed (unseen): all of it lies
// outside the window.
import { decode } from "./png.js";

const changes = (seen) => {

  if (!seen) return "";

  const parts = [];
  if (seen.text) parts.push(`${seen.text} text${seen.text > 1 ? "s" : ""}`);
  if (seen.elements) parts.push(`${seen.elements} element${seen.elements > 1 ? "s" : ""}`);
  if (seen.attributes) parts.push(`${seen.attributes} attribute${seen.attributes > 1 ? "s" : ""}`);
  if (seen.styles) parts.push(`${seen.styles} style${seen.styles > 1 ? "s" : ""}`);

  return parts.join(", ");
};

// How many pixels of two screenshots of one box differ enough to see (their channels by more than 24 in all: a
// tint of 6% of the ink over the paper shows, drawing one page twice changes nothing)
function seenPixels(a, b) {

  if (a.equals(b)) return 0;

  const x = decode(a);
  const y = decode(b);
  if (x.width !== y.width || x.height !== y.height) return Infinity;

  let n = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 24) n++;
  }

  return n;
}

// Tab through the page (up to 8 stops, until it comes back to one): each stop's box, with room around it for an
// outline, is pictured focused and then blurred (Tab goes on from an element blurred). A stop where under 20 pixels
// change shows the keyboard reader nothing (outline: none, and nothing in its place).
async function focusRings(page) {

  const hidden = [];
  const settle = () => page.evaluate(() => window.__rhpProbe.settle(1000)).catch(() => {});
  const shot = (clip) => page.screenshot({ clip, scale: "css", animations: "allow" }).catch(() => null);

  // (the pointer away from the page, so that no slat is lit by it)
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.__rhpProbe.focusStop(true);
  });

  for (let press = 0, stops = 0; press < 30 && stops < 8; press++) {
    await page.keyboard.press("Tab");
    const at = await page.evaluate(() => window.__rhpProbe.focusStop()).catch(() => null);
    if (!at) continue;
    if (at.again) break;
    stops++;
    if (!at.clip) continue;
    await settle();
    const focused = await shot(at.clip);
    await page.evaluate(() => document.activeElement?.blur?.());
    await settle();
    const blurred = await shot(at.clip);
    if (focused && blurred && seenPixels(focused, blurred) < 20) hidden.push(at.what);
  }

  return hidden;
}

// interact(page, { events, capture, shoot, taps }) -> { interactions: [{ kind, target, changed, how, error, moved,
// unseen }], unfocused: [what focus showed nothing on] }
//   events   the page's list of errors, which this tags with the interaction that raised them
//   capture  takes a screenshot of the page (and lets it come to rest after)
//   shoot    saves the report's screenshot of the page as it is ("hover")
//   taps     tap the slats (a phone) instead of the whole pass
export async function interact(page, { events, capture, shoot, taps = false }) {

  const list = [];
  const t = await page.evaluate(() => window.__rhpProbe.targets());
  const handle = (i) => page.evaluateHandle((n) => window.__rhpTargets[n], i);
  const look = () => capture({ type: "png", fullPage: true, animations: "allow" }).catch(() => null);
  // (a slat that something covers is not pointed at: the pointer would land on what covers it)
  let covered = null;
  const pointAt = async (n, across) => {
    const point = await page.evaluate(([i, x]) => window.__rhpProbe.pointAt(i, x), [n, across]);
    covered = point.covered ?? null;
    if (covered) throw new Error("covered");
    return point;
  };

  // ready runs before the layout is noted (it scrolls the target into view), act is the interaction itself. lit: the
  // interaction lights a slat (no data changes), so the plot must stay where it is; texts: note the texts it changes
  const step = async (kind, target, { ready, act, compareLook = false, used = null, lit = false, texts = false }) => {
    const before = events.length;
    const rest = compareLook ? await look() : null;
    let error = null;
    const attempt = async (f) => {
      try {
        await f?.();
      } catch (e) {
        error = String(e.message ?? e).split("\n")[0];
      }
    };
    await attempt(ready);
    await page.evaluate((keep) => {
      window.__rhpProbe.place();
      window.__rhpProbe.record(keep);
    }, texts);
    if (!error) await attempt(act);
    await page.evaluate(() => window.__rhpProbe.settle(1500)).catch(() => {});
    const seen = await page.evaluate(() => window.__rhpProbe.stop()).catch(() => null);
    const moved = await page.evaluate(([n, l]) => window.__rhpProbe.moved(n, l), [used, lit]).catch(() => []);
    // a value a slat read once, and that this interaction changed, is shown stale (the guard reads them again)
    await page.evaluate(() => globalThis.__rhpCheck?.recheck?.()).catch(() => {});
    const thrown = events.slice(before).filter((e) => e.kind === "pageerror" || e.kind === "console-error");
    for (const e of thrown) {
      e.during = `${kind} ${target}`;
    }
    const dom = changes(seen);
    let how = dom ? `changed ${dom}` : "";
    if (!dom && compareLook) {
      const now = await look();
      if (rest && now && !rest.equals(now)) how = "changed the look (CSS only)";
    }
    const entry = { kind, target, changed: !!how, how: how || "nothing changed", error: thrown[0]?.text ?? null, moved, could: error };
    list.push(entry);
    return entry;
  };

  const slatName = (s) => `slat ${s.index} of ${s.of}${s.name ? ` (${s.name})` : ""}`;

  // a slat no point of which is under the pointer, and what covers it
  const unreached = (entry, s) => {
    if (entry.could !== "covered") return;
    entry.how = covered === "slat"
      ? `could not reach slat ${s.index}: the other slats of its Plot cover it (overlap slats that take the pointer: give the slat's root pointer-events: none and its marks auto)`
      : `could not reach slat ${s.index}: ${covered} covers its marks`;
    entry.changed = false;
    entry.missed = true;
  };

  // (two taps in a row, with no rest between them as a pointer gets: one left of the middle, one right of it, so a
  // chart that reads the value under the finger shows another. The last slat is the one furthest from a readout above
  // the chart.)
  if (taps) {
    for (const [k, s] of [...new Set([t.slats[0], t.slats.at(-1)])].filter(Boolean).entries()) {
      let point = null;
      const entry = await step("tap", slatName(s), {
        ready: async () => {
          point = await pointAt(s.target, k ? 0.7 : 0.3);
        },
        act: () => page.touchscreen.tap(point.x, point.y),
        compareLook: true,
        lit: true,
        texts: true,
      });
      unreached(entry, s);
      // a tap the reader sees none of the text of: all the text it changed lies outside the window
      entry.unseen = entry.changed ? await page.evaluate((n) => window.__rhpProbe.unseen(n), s.target).catch(() => null) : null;
      if (entry.unseen) entry.how += ", all of its text out of view";
    }
    return { interactions: list.map(({ could, ...rest }) => rest), unfocused: [] };
  }

  for (const [k, s] of [...t.slats, t.widest].filter(Boolean).entries()) {
    let point = null;
    const entry = await step("hover", slatName(s), {
      ready: async () => {
        await page.mouse.move(0, 0);
        point = await pointAt(s.target);
      },
      act: () => page.mouse.move(point.x, point.y, { steps: 2 }),
      compareLook: true,
      lit: true,
    });
    unreached(entry, s);
    if (k === Math.min(1, t.slats.length - 1) && shoot) await shoot("hover");
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.__rhpProbe.settle(1000)).catch(() => {});
  }

  for (const b of t.buttons) {
    const el = await handle(b.target);
    const role = b.role === "checkbox" || b.role === "radio" || b.role === "switch" ? b.role : "button";
    const entry = await step("click", `${role} ${b.label}`, {
      ready: () => el.asElement().scrollIntoViewIfNeeded({ timeout: 1500 }),
      act: () => el.asElement().click({ timeout: 1500 }),
      used: b.target,
    });
    if (entry.could) entry.how = `could not be clicked (${/intercepts pointer|covered|not visible|outside of the viewport/.test(entry.could) ? "covered or out of view" : entry.could})`;
  }

  for (const r of t.ranges) {
    const el = await handle(r.target);
    await step("input", `range ${r.label} to ${r.value}`, {
      act: () => el.asElement().evaluate((input, v) => {
        input.value = String(v);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, r.value),
      used: r.target,
    });
  }

  for (const s of t.selects) {
    const el = await handle(s.target);
    await step("select", `select ${s.label} to ${JSON.stringify(s.value)}`, { act: () => el.asElement().selectOption(s.value), used: s.target });
  }

  // an arrow key on a slider, away from the end it is at
  if (t.slider) {
    const el = (await handle(t.slider.target)).asElement();
    const key = await el.evaluate((s) => {
      const range = s.localName === "input";
      const now = parseFloat(range ? s.value : s.getAttribute("aria-valuenow"));
      const max = parseFloat(range ? s.max || "100" : s.getAttribute("aria-valuemax"));
      return now >= max ? "ArrowLeft" : "ArrowRight";
    });
    await step("key", `${key} on slider ${t.slider.label}`, {
      ready: () => el.focus(),
      act: () => page.keyboard.press(key),
      used: t.slider.target,
    });
  }

  if (t.keyboard) {
    await page.evaluate(() => document.activeElement?.blur?.());
    let at = null;
    let presses = 0;
    const tab = await step("key", "Tab", {
      act: async () => {
        for (presses = 1; presses <= 25; presses++) {
          await page.keyboard.press("Tab");
          at = await page.evaluate(() => window.__rhpProbe.focused());
          if (at?.slat) break;
        }
      },
      lit: true,
    });
    tab.how = at?.slat ? `reached slat ${at.index}${at.name ? ` (${at.name})` : ""} after ${presses} press${presses > 1 ? "es" : ""}` : "never reached a slat";
    tab.changed = !!at?.slat;
    if (at?.slat) {
      const key = t.keyboard.vertical ? "ArrowRight" : "ArrowDown";
      let next = null;
      const arrow = await step("key", key, {
        act: async () => {
          await page.keyboard.press(key);
          next = await page.evaluate(() => window.__rhpProbe.focused());
        },
        lit: true,
      });
      const moved = next?.slat && next.index !== at.index;
      arrow.how = moved ? `focus moved to slat ${next.index}${next.name ? ` (${next.name})` : ""}${arrow.how !== "nothing changed" ? `, ${arrow.how}` : ""}` : "focus did not move";
      arrow.changed = !!moved;
    }
  }

  const unfocused = await focusRings(page);

  return { interactions: list.map(({ could, ...rest }) => rest), unfocused };
}

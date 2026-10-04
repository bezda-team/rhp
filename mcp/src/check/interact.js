// The interaction pass: point at a mark of the first, middle and last slat, click each button and toggle (up to 12),
// change each range and select, press an arrow key on a slider, and press Tab and the arrow keys when slats take focus.
// On a phone (taps), tap a mark of the first and the middle slat. For each, what changed (the DOM, or only the look),
// what threw, and what moved: a control other than the one used, or a chart's top (the layout jumps).

const changes = (seen) => {

  if (!seen) return "";

  const parts = [];
  if (seen.text) parts.push(`${seen.text} text${seen.text > 1 ? "s" : ""}`);
  if (seen.elements) parts.push(`${seen.elements} element${seen.elements > 1 ? "s" : ""}`);
  if (seen.attributes) parts.push(`${seen.attributes} attribute${seen.attributes > 1 ? "s" : ""}`);
  if (seen.styles) parts.push(`${seen.styles} style${seen.styles > 1 ? "s" : ""}`);

  return parts.join(", ");
};

// interact(page, { events, capture, shoot, taps }) -> interactions [{ kind, target, changed, how, error, moved }]
//   events   the page's list of errors, which this tags with the interaction that raised them
//   capture  takes a screenshot of the page (and lets it come to rest after)
//   shoot    saves the report's screenshot of the page as it is ("hover")
//   taps     tap the slats (a phone) instead of the whole pass
export async function interact(page, { events, capture, shoot, taps = false }) {

  const list = [];
  const t = await page.evaluate(() => window.__rhpProbe.targets());
  const handle = (i) => page.evaluateHandle((n) => window.__rhpTargets[n], i);
  const look = () => capture({ type: "png", fullPage: true, animations: "allow" }).catch(() => null);
  const pointAt = (n, across) => page.evaluate(([i, x]) => window.__rhpProbe.pointAt(i, x), [n, across]);

  // ready runs before the layout is noted (it scrolls the target into view), act is the interaction itself
  const step = async (kind, target, { ready, act, compareLook = false, used = null }) => {
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
    await page.evaluate(() => {
      window.__rhpProbe.place();
      window.__rhpProbe.record();
    });
    if (!error) await attempt(act);
    await page.evaluate(() => window.__rhpProbe.settle(1500)).catch(() => {});
    const seen = await page.evaluate(() => window.__rhpProbe.stop()).catch(() => null);
    const moved = await page.evaluate((n) => window.__rhpProbe.moved(n), used).catch(() => []);
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

  // (two taps in a row, with no rest between them as a pointer gets: one left of the middle, one right of it, so a
  // chart that reads the value under the finger shows another)
  if (taps) {
    let point = null;
    for (const [k, s] of t.slats.slice(0, 2).entries()) {
      await step("tap", slatName(s), {
        ready: async () => (point = await pointAt(s.target, k ? 0.7 : 0.3)),
        act: () => page.touchscreen.tap(point.x, point.y),
        compareLook: true,
      });
    }
    return list.map(({ could, ...rest }) => rest);
  }

  for (const [k, s] of t.slats.entries()) {
    let point = null;
    await step("hover", slatName(s), {
      ready: async () => {
        await page.mouse.move(0, 0);
        point = await pointAt(s.target);
      },
      act: () => page.mouse.move(point.x, point.y, { steps: 2 }),
      compareLook: true,
    });
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
      });
      const moved = next?.slat && next.index !== at.index;
      arrow.how = moved ? `focus moved to slat ${next.index}${next.name ? ` (${next.name})` : ""}${arrow.how !== "nothing changed" ? `, ${arrow.how}` : ""}` : "focus did not move";
      arrow.changed = !!moved;
    }
  }

  return list.map(({ could, ...rest }) => rest);
}

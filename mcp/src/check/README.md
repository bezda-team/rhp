# The checker, for maintainers

`check()` (index.js) renders a chart in headless Chromium and reports what is wrong with it, as findings: `{ level, code, message, fix, widths }`.
The CLI (`rhp-mcp check`) and the MCP tool (`rhp_check`) print the same report.

## How a check runs

1. **Load and build** (build.js): an html page is read as it is, and its module scripts are parsed; a Solid, React or module file is bundled with esbuild.
   A `.jsx` or `.tsx` file is React or Solid as the nearest package.json that names `react`, `solid-js` or `vite-plugin-solid` says (react without solid-js is React; solid-js or its Vite plugin without react is Solid), then as its own imports say: a React file with the automatic JSX runtime imports nothing from react.
2. **Read the code** (source.js): the module code is parsed with Babel, and its html templates and imports are checked for what fails with no error.
3. **Guard** (../guard/): `@bezda/rhp` and `@bezda/rhp/standalone` resolve to a wrapper that checks how each component is used, and records what slats read on `d`.
   It never throws and never changes what is drawn (the `guard` test compares screenshots with and without it, pixel for pixel).
4. **Render** at each width (1280 and 390 by default; 600px or less is a phone, drawn as a touch screen) with reduced motion asked for, and wait for fonts and for the page to come to rest.
   With reduced motion rhp's moves end at once, and a page that moves on its own waits (an autoplay that honors the setting) or changes in steps (a live feed), so the screenshots show what was measured.
5. **Probe** (inpage.js runs in the page; colors.js reads screenshots): layout, text, controls, rhp's CSS, colors.
   The report's screenshot is taken first, before any probe hides or restyles anything; then the screenshots the colors are read from.
   A slat's own transition on a block is read last, with motion asked for again (with reduced motion rhp turns every block's transition off).
6. **Interact** (interact.js), on a fresh page with motion on, as a reader gets it.
   At the first width: point at a mark of the first, middle and last slat of the largest chart (in its first Plot that takes the pointer), click each button and toggle, change each range and select, press an arrow key on a slider (`role=slider` first, else a range), and press Tab and the arrow keys when slats take focus.
   At a phone's width: tap a mark of the first and the last slat, and note when everything a tap changed lies outside the window while the tapped slat is in it, and the window looks as it did (the reader cannot see what the tap changed).
   After each step the guard reads again what the slats read once (stale values, static charts), and the pass notes what moved on the page (the layout jumps).
   Controls go by their accessible name.
7. **Report** (findings.js turns probe results into findings, report.js writes the text): errors first, then warnings, then notes, what passed, the interactions and the screenshots.
   When pointing at slats (and tapping them) changes nothing but buttons or a slider change the chart, the report says so in one line.
   When nothing changes and the page has no controls, it says "no interaction found (fine when none was asked for)" in one line, instead of a line per slat.

### Screenshots, and the page they move

A full-page screenshot of a page taller than the window makes Chromium lay the page out at another size for a moment (1 by 1 px, after most captures), so the page's resize, ResizeObserver and matchMedia handlers run: a chart whose orientation follows the width turns and turns back.
So every screenshot goes through `capture()` (index.js), which lets the page come to rest again when the capture made it change (`calm()` in inpage.js), and `hide()` and `show()` put back only the style properties they set, never a whole `style` attribute saved before (that undid what the page did meanwhile and left such a chart drawn wrong).

## Levels

- **error**: the chart is broken, wrong or unreadable for someone: it throws, draws nothing, shows a wrong value, hides or overlaps text, or uses rhp in a way that does nothing.
- **warning**: the chart works, but worse than it should: under WCAG AA, a name that ends in an ellipsis, a block that jumps instead of moving, CSS that has no effect.
- **info**: a note that changes nothing by itself (a font that did not load, a remote file that could not be fetched).

Zero false positives is a hard rule: every recipe and every gallery example must check clean, except for problems someone has looked at in the screenshot and found real.
`ok` in the result is false when there is an error.

## Codes

The tests read this table: every code in it must have a chart in `test/broken/` that reports it (except `no-browser`), and every code a check reports must be in it.

### Loading the chart

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `no-file` | error | The path doesn't exist, or no code was given. | Pass the path of the chart's file. |
| `syntax-error` | error | A module script or a file that doesn't parse (esbuild), or an import map that is not JSON. | Fix the code at the line given. |
| `missing-import` | error | In a bundled file, an import that doesn't resolve from the file's folder or from the checker's packages. | Install the package, or fix the path. |
| `missing-import-map` | error | A page's module script imports a bare name that no import map maps. | Add the import map with the standalone URL. |
| `plain-script-tag` | error | rhp loaded with a plain `<script src>`, although it is an ES module. | An import map and a `type="module"` script. |
| `cdn-version` | error | The page loads another major version of rhp from a CDN. | Load `@bezda/rhp@2` in the import map. |
| `no-browser` | error | No Chromium, Chrome or Edge to render in. | `npx @bezda/rhp-mcp install-browser`, or `RHP_CHECK_BROWSER`. |

### The code (source.js, read before it runs)

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `missing-export` | error | A name imported from `@bezda/rhp/standalone` that it doesn't export, so the module fails to load. | What to use instead (a per-row data group for `createSelector`, `createMemo` for `createComputed`...), or the closest export. |
| `two-solids` | error | `@bezda/rhp/standalone` and `solid-js` imported in the same code: two copies of Solid, and the signals of one are not tracked by the other. | Import everything from the standalone module. |
| `bare-boolean` | error | `overlap`, `static`, `keyboard`, `animate`, `mirror`, `smooth`, `fill` or `keyed` written bare on a component in an html template: it passes `""`, which is false. | `name=${true}`. |
| `handler-at-render` | error | An `on...` prop on a component in an html template given a function with no parameter (inline, or a function named in the file): it is read as a value, runs at render and is never attached. | Give the handler a parameter: `(e) => ...`. |
| `style-string` | error | `style="..."` (or a string) on a Chart or a Plot, which take only a style object. | `style=${{ "pointer-events": "none" }}`. |
| `class-name` | error | `className` in an html template: on a block it replaces rhp's class and the block is not drawn, elsewhere it sets nothing. | `class`. |

### What the page throws or prints

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `runtime-error` | error | The page threw while loading (with the place in the user's file, through the bundle's source map). | A fix for common messages (a name not defined or not imported, a property of undefined read...). |
| `console-error` | error | The page logged an error. | As for `runtime-error`. |
| `interaction-error` | error | A step of the interaction pass threw or logged an error. | As for `runtime-error`. |
| `rhp-warning` | error | rhp printed one of its `rhp:` warnings. | Do what the warning says. |
| `request-failed` | error | A file next to the chart (or in the bundle) failed to load. | Fix the path, or add the file. |
| `remote-failed` | info | A remote file (fonts, a CDN) could not be fetched; the check goes on without it. | Check the URL; offline, fonts fall back. |

### How rhp is used (the guard)

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `unknown-prop` | error | A prop a component doesn't have (HTML attributes, `data-*`, `aria-*`, handlers, `class`, `style` and `ref` pass on blocks), or a theme key or slat setting rhp doesn't have. | The prop it means (`Bar`'s value is `to`), the closest name, or the list. |
| `bad-prop` | error | A value of the wrong kind: a block's number that is a function or a string, a color that is not a color, an orientation, reorder, side or edge rhp doesn't have, rows that are not objects, a key that is no data group. A number given as a string is a warning. | The kind of value it takes, with an example. |
| `bad-scale` | error | A Chart's `scale` or `cross` that is not two finite numbers, or whose first number is not the smaller (no Bar length, no axis). | The two numbers in order, or a scale built with `nice()`. |
| `dot-size` | error | A Dot's `size` given as a number: a share of the slat's width and of its height, so an oval. | A length: `size="12px"`. |
| `missing-group` | error | A slat reads `d.x` and the Plot has no data group `x` (nor rows with it); or `sortBy` by a name that is no data group. | The closest data group, `rows=` when a group holds objects, or passing the group. |
| `plot-typo` | warning | A Plot prop that is a typo of a Plot setting, with a value of that setting's kind (`overlpa=${true}`): rhp takes it as a data group. | The setting it means. |
| `group-lengths` | warning | A Plot's data groups (lists of 3 or more, not palettes) have different lengths, and rhp repeats the shorter ones. | One item per row in every group. |
| `no-component` | error | A Solid, React or module file exports several components and no default one. | Export the chart as the default. |
| `nan-value` | error | A block's number is NaN; a block's `at` or `to` is given but null or undefined (a row with no value, drawn at the start of the scale); a `--rhp-*` value of a block or the Chart came out as NaN, undefined or Infinity; or a text in a chart prints NaN, undefined or Infinity. | Check the data the value is worked out from; leave rows with no value out, or draw the block in a `Show`. |
| `stale-read` | error | A slat read `d.x` once, while it was drawn and outside any function (`${d.x}` in an html template), and the interaction pass changed it: the slat still shows the old value. | `${() => d.x}`, and never destructure `d`. |
| `static-chart` | error | A static Chart or Plot whose per-row function (`on=${(d) => on() === d.index}`) changed during the interaction pass: static draws each row once, so the interaction changes nothing. | Take `static` off. |

### Layout

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `no-chart` | error | No `.rhp-chart` in the page (not reported when the code can't load, since that reason is reported instead). | Render into an element the page has, or fix the errors above. |
| `empty-plot` | error | A Plot with no slats shown (an empty overlap Plot is fine: a readout drawn only while pointing). | Give the Plot its data. |
| `small-plot` | error | A plot under 40px along its value axis, or slats under 2px thick (3px slats are fine: a histogram's many bins, a line chart's slats for pointing). | A height or an aspect, a thickness, or fewer rows. |
| `collapsed-chart` | error | A chart whose plot is under 2px wide: it sits in a flex row, an inline-block or a float that shrinks it to its room. | `flex: 1; min-width: 0`, or a box with a width. |
| `plot-outside-chart` | error | A `.rhp-plot` with no `.rhp-chart` around it: no scale and none of rhp's CSS. | Put the Plot in a Chart. |
| `cramped` | warning | A horizontal chart whose slats are under 18px thick while most of them hold text, or a vertical chart at the default 240px whose labels in one slat overlap (lines of one label don't count). | A thickness of 24px or more; a height or an aspect. |
| `value-past-scale` | error | A value of a Bar, Dot, Tick, Place or Label (placed with `at`) outside the Chart's scale (or cross scale), whatever the block's size: a Bar is cut at the end of the scale (to nothing when all of it is past one end, so it draws nothing), a point is drawn outside the plot, a Label is kept at one end of the scale or drawn outside the plot. Left out: a block with no box (display: none), and one with a size that clipping hides (a slat that shows a window of its marks). A reversed or equal scale is `bad-scale`'s, so nothing is compared with it. | A scale that covers the data, built with `nice()`; for a Label, the value its mark shows. |
| `points-past-scale` | error | An Area's or a Line's points outside the scale: rhp squeezes the whole outline into it, so every point is drawn in the wrong place. | A scale that covers the points, or points cut to the scale (`density()` and `bins()` take a domain). |
| `sticks-out` | error | An element, or the glyphs of a text (axis numbers included), visible more than 1px outside its chart's box. | By what sticks out: room for names (`room: { start }` or `"auto"`), room at the end for values, thickness, shorter axis numbers. |
| `text-outside-poster` | error | Text more than 1px outside its `.poster`. | Let it wrap, or make it smaller at narrow widths. |
| `text-cut-off` | warning or error | Text partly hidden by an ancestor's overflow (not by a box that scrolls that way; text with no part shown is hidden on purpose, such as screen-reader text). With `text-overflow: ellipsis` a warning (the reader loses the rest of the name); clipped with no sign of it, an error. | Room for names, wrapping, a shorter label, or a horizontal chart on narrow screens (a vertical chart's names are as wide as their columns). |
| `text-overlap` | error | The glyphs of two texts in different blocks overlap by more than 1px both ways (neither inside the other; invisible text ignored). Texts that share their nearest block-level ancestor are lines of one heading, paragraph or label: a tight line-height (a headline set at .9) brings their glyph boxes together without the letters touching, so they are not reported. | Room or thickness, a smaller font, shorter text. |
| `page-scrolls-sideways` | error | The page is wider than the window. | `max-width: 100%`, and no fixed width wider than a phone. |
| `tiny-text` | error | Text under 9px as drawn (transforms counted). | 9px at least, data labels 11px or more. |
| `font-not-loaded` | info | A web font the text asks for none of whose faces loaded, or a font named in a stack that the machine doesn't have. (A family split by unicode-range, as Google Fonts serves CJK ones, loads only the faces its text needs, so one face loaded is enough; `document.fonts.check()` says false there.) | Load it with a Google Fonts link, or drop it from the stack. |

### rhp's CSS

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `series-past-theme` | error | A block's color is `series-n` with no `--rhp-series-n` in its chart, so it falls back to `series-1`. | `series(n)` for a theme of n colors, or more theme colors. |
| `block-transition` | warning | A slat's CSS sets a transition on a block (or on an Area's or a Line's path) that drops rhp's own (left and width, bottom and height, a Cell's background-color, a path's d), so the block jumps to new values. Not in the JS version, not with `transition: none`, and not when the slat's CSS places the block itself (a radial layout). Read with motion on. | A transition on an element inside the block, or rhp's properties named too. |
| `page-css-ignored` | warning | A page rule aimed at a chart (it names an `.rhp-` class, or its subject has a class, an id or an attribute and it reaches only elements in charts) sets properties that rhp's own rules set on every element it reaches. rhp's are `!important` in its layers, so the page's change nothing. | The slat type's `css`, the block's `color`, the Chart's theme. |

### Controls and interactions

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `unnamed-control` | warning | A button, input, select or control with a role (slider, switch, tab...) that has no accessible name: no text, aria-label, aria-labelledby or label, so a screen reader says only what kind of control it is. | Visible text, an aria-label on an icon button, or a `<label>` around an input or a select. |
| `layout-jump` | warning | An interaction of the pass moves a control other than the one it used, or a chart's top, by more than 2px (a readout that takes a second line, a button whose label changes its width). Fixed and sticky elements are left out. | A box that keeps its size: a readout on one line with an ellipsis, or a min-height for its longest text; buttons that keep their width. |
| `out-of-view` | warning | At a phone's width, a tap on a slat that is in the window changes only elements outside the window (every changed element the reader could see is above, below or beside it), and the window looks as it did (no CSS effect such as a `:hover` style shows in it either): a readout above a tall chart, when the last slat is tapped. | A readout next to the slat (in the slat, or in a Label of it), or one kept in view (`position: sticky`). |

### Colors (read from screenshots)

| Code | Level | What triggers it | Fix it gives |
|---|---|---|---|
| `low-contrast` | error or warning | Text against what is behind it (the median of a screenshot with the glyphs hidden). Under 3:1 (2:1 for large text: 24px, or 18.66px bold) an error; from there up to WCAG AA (4.5:1, 3:1 for large text) a warning. | The nearest color to the text, and to what is behind it, that reaches AA. |
| `faint-marks` | warning | A mark whose drawn pixels reach under 1.25:1 against the same pixels without the marks (a tenth of its pixels is enough, so an outline or a two-tone mark is seen), unless it, or a mark it lies in, has a border, an outline or a box-shadow that reaches 3:1 against the background. Tracks (a Bar across the whole scale) are left out. | A color that reaches 3:1, or an edge that does. |
| `colorblind` | warning | Two of 2 to 8 series colors, not told apart by labels in their slats, under a CIEDE2000 difference of 10 where their marks touch (5 anywhere), for normal vision or simulated protanopia, deuteranopia or tritanopia. | Colors that differ in lightness too, or names next to the marks. |

## Adding a probe

1. Find the problem in the page (inpage.js `measure()`, or interact.js for what an interaction does), in the screenshots (colors.js), in the code (source.js) or in the guard, and give it a code.
2. Write its message and fix in findings.js (or where it is found): the message says what is wrong in the reader's terms, and the fix names the rhp knob that fixes it.
3. Add a row above, and a chart in `test/broken/` broken in that one way, whose first lines say `expect: <code>` (or `code:level`).
4. Run `npm test`: the broken chart must report exactly its code, and the gallery and the SKILL.md example must stay clean.

## Tests

`node test/run.js` runs the checker's tests (`npm test` runs them after the MCP server's); `node test/run.js broken` (or `gallery`, `recipes`, `guard`, `skill`) runs one part.
GitHub Actions runs them on every pull request and push to master (the `checker` job in `.github/workflows/test.yml`), with rhp built from the commit; the gallery part needs the documentation checkout, so it is skipped there.

- **broken**: each chart in `test/broken/` reports exactly the codes it expects, and nothing else; a `clean*` chart (and `expect: none`) reports nothing at all, notes included.
  A chart whose first lines also say `says: <text>` must have that line in its report (`clean.html` pins the one line of a chart with no interaction).
  A folder there is a small project (its own package.json), and the file in it whose first lines say what it expects is the chart: `react-project/` is a React app's chart checked as React because of its package.json.
  When pointing at slats changes nothing, the report's screenshot must match the one taken while pointing (each channel within 32 of 255: two drawings of a page differ a little at anti-aliased edges), so a probe that leaves the chart drawn wrong fails the test.
- **gallery**: the site's examples (from `RHP_DOCS`, the documentation checkout), each horizontal and in its best orientation, with the interaction pass.
  An error fails the test unless it is in `KNOWN` in run.js: a problem looked at in the screenshot, found real, and reported to the owner (the gallery is theirs).
- **recipes**: the skill's recipes, listed with their findings; they don't fail the test, since the recipes' authors fix them.
- **guard**: the gallery examples and the recipes drawn with and without the guard, compared pixel for pixel at both widths (a chart that changes on a timer is listed, not failed: its two drawings may fall on either side of a change).
- **skill**: the html example in `skills/rhp/SKILL.md` checks with no findings.

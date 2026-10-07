# Design: posters, looks, color, type and layout

How an rhp chart looks: an original editorial poster when the user asks for no style, exactly the style they ask for when they do, and the app's own look inside an app.
In all three the chart is designed for its subject: section 2 is the procedure, and it comes before any look.
Every code block was tested on a page of its own with the checker at 1280px and 390px; the sketches in section 2 are excerpts of tested recipes.

1. [The editorial poster](#1-the-editorial-poster): its five parts, the base CSS and the theme every look shares
2. [Art direction from the subject](#2-art-direction-from-the-subject): five decisions (idea, marks, composition, palette, type), two tests, worked examples
3. [Writing a look](#3-writing-a-look): tokens, fonts and texture for your subject; looks.md has eight worked examples, not a menu
4. [Color](#4-color): accent and context, palettes, ramps, dark mode
5. [Typography](#5-typography): voices, sizes, numbers
6. [Layout](#6-layout): placing the poster's parts, widths, phones, long labels, orientation
7. [Annotation](#7-annotation): call out the key value, label directly, reference lines, units
8. [Inside an existing app](#8-inside-an-existing-app): the app's fonts and colors, and a chart still designed for its subject
9. [A style the user asks for](#9-a-style-the-user-asks-for): follow it exactly, and design what they left open
10. [Anti-patterns](#10-anti-patterns): what makes a chart look generic or wrong

## 1. The editorial poster

With no style given and no app around it, a chart is an editorial poster: a page from a magazine, an advertisement or a feature article, designed for its subject.
It has five parts.
They are content, not a layout: the table gives their usual order, and where each one sits is a decision you make for the subject (sections 2 and 6).

| Part | What it says | Good | Bad |
|---|---|---|---|
| kicker | the topic, 2 to 5 words | "Screen time, by age" | "Chart", "Data visualization" |
| headline | the finding, as a sentence with a verb, under about 70 characters | "Weekends add the most screen time for 25 to 44 year olds" | "Screen time by age group" (a label, not a finding) |
| dek | one or two sentences: what is measured, in which unit, and how to read or use the chart | "Average minutes a day on screens outside work and school. Sort the groups with the switch." | repeating the headline; a paragraph of method |
| chart | the data, with direct labels and the key value called out (section 7) | | |
| note | the source and its year, or "Illustrative data"; no source line when the user gave the data and no source | "Source: Ethnologue, 2023." | no source; invented numbers presented as fact; how to use the chart |

- The headline must be true for the data on screen: check it against the numbers (and again after an interaction changes them).
- Put the unit in the dek or the chart's `label`, not in the headline.
- Sentence case everywhere; capitals only in the kicker, letterspaced.
- No kicker or dek when the user asks for "no title", "minimal" or "no poster" (section 9).
- How to use the chart sits beside the control, in words that fit every device: the readout's resting text ("Tap or point at a tower"), the end of the dek right above the chart, or a group's label; never in the source note.

`Poster` (api.md, section 10) renders `<figure class="poster">` with a `<figcaption>` holding `span.kicker`, `span.headline` and `span.dek`, then its children, then `span.note`.
It brings no CSS: the page styles it.
A legend and buttons go in a `div.tools` element above the chart, as children of the Poster.

```js
html`<${Poster} kicker="Screen time, by age" title="Weekends add the most screen time for 25 to 44 year olds"
  dek="Average minutes a day on screens outside work and school. Sort the groups with the switch." note="Illustrative data.">
  <div class="tools">
    <p class="keys"><span><i style="background: var(--accent)"></i>Weekend</span><span><i style="background: var(--quiet)"></i>Weekday</span></p>
    <div class="choice" role="group" aria-label="Sort by">
      <button type="button" aria-pressed=${() => !byGain()} onClick=${() => setByGain(false)}>Age</button>
      <button type="button" aria-pressed=${() => byGain()} onClick=${() => setByGain(true)}>Weekend gain</button>
    </div>
  </div>
  <${Chart} theme=${THEME} ...>...<//>
<//>`
```

**Base CSS.** A starting block for the page and the poster's parts: it makes them legible and safe on a phone, and it decides nothing.
The look and the composition you design for the subject (section 2) go on top of it and may change any line of it, the poster's width, padding and part order included.

```css
/* Base: the page and the poster's parts. A look (section 3) sets the tokens. */
* { box-sizing: border-box; }
body { margin: 0; padding: 48px 16px; background: var(--page); }
.poster { max-width: 960px; margin: 0 auto; padding: 48px 52px 28px; background-color: var(--paper); color: var(--ink); font: 16px/1.5 var(--text); }
.poster figcaption { display: grid; gap: 12px; margin-bottom: 28px; }
.poster .kicker { font: 700 12px/1.3 var(--text); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.poster .headline { max-width: 20em; font: 700 clamp(34px, 5vw, 48px)/1.04 var(--display); text-wrap: balance; }
.poster .dek { max-width: 60ch; font-size: 17px; line-height: 1.5; color: var(--soft); }
.poster .note { display: block; margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--rule); font-size: 12px; line-height: 1.5; color: var(--soft); }
.poster .tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 24px; margin: 0 0 18px; }
.poster .keys { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0; font-size: 14px; }
.poster .keys i { display: inline-block; width: 12px; height: 12px; margin-right: 7px; vertical-align: -1px; }
.poster .choice { display: inline-flex; flex-wrap: wrap; }
.poster .choice button { margin-left: -1px; padding: 7px 14px; border: 1px solid var(--soft); background: none; color: var(--ink); font: 600 14px/1 var(--text); cursor: pointer; }
.poster .choice button:first-child { margin-left: 0; }
.poster .choice button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.poster :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
@media (max-width: 640px) {
  body { padding: 16px 16px 32px; }
  .poster { padding: 26px 18px 18px; }
  .poster figcaption { margin-bottom: 20px; }
  .poster .dek { font-size: 15px; }
}
```

**Tokens.** A look is a set of CSS variables on `:root`, and the chart reads the same variables through its theme, so one change (a look, a brand, dark mode) reaches the poster and the chart together.

| Token | Use | Rule |
|---|---|---|
| `--page` | the page around the poster | a deeper or a paler shade of the paper, about 1.2 to 1.5:1 from it |
| `--paper` | the poster's background (a look adds texture as `background-image`) | near neutral, or the material's own color (kraft, blueprint blue, slate): never a hue the marks use |
| `--ink` | headline, labels, the strongest marks | 7:1 or more on the paper |
| `--soft` | dek, note, axis numbers, small secondary text in the chart | 4.5:1 on flat paper, 5:1 on textured paper |
| `--rule` | hairlines, grid lines | about 1.35:1, quiet |
| `--accent` | the story: the key mark, its label, the kicker | 4.5:1 (5:1 textured), so it works for text and marks |
| `--s2`, `--s3` | other series, when several series are the story | 3:1 on the paper; apart for color-blind readers (section 4) |
| `--quiet` | context marks, and the last series ("other") | about 3.3:1: the lightest a mark may be at rest |
| `--display`, `--text` | the headline's font stack, everything else's | each with system fallbacks |

**The theme.** One theme object serves every look, every brand and dark mode, because it reads the tokens:

```js
// The chart's font and colors, read from the page's tokens
const THEME = {
  font: "var(--text)", ink: "var(--ink)", muted: "var(--soft)", grid: "var(--rule)", surface: "var(--paper)",
  series: ["var(--accent)", "var(--s2)", "var(--s3)", "var(--quiet)"],
};
const ACCENT = "series-1"; // the key value's mark
const QUIET = "series-4"; // every other mark
```

- Pass it to every Chart: `theme=${THEME}`.
- On blocks, use theme keys: `color=${() => (d.lit ? ACCENT : QUIET)}`, or `color=${series(4)}` for series (three hues, then the quiet one for "other"; the theme has four colors, so `series(4)`, not `series()`).
- In slat CSS, use `var(--rhp-series-1)` (the accent), `var(--rhp-series-4)` (quiet), `var(--rhp-ink)`, `var(--rhp-muted)`.
- Never write `color="var(--accent)"` on a block: it works, but rhp warns that the slat reads a page variable.
- Focus on a slat is slat CSS: `.slat:focus-visible { outline: 2px solid var(--rhp-ink); outline-offset: 2px; }`.

## 2. Art direction from the subject

A chart is original when a reader could not trace it back to a recipe, and when it still says what it is about with its words covered.
New colors and a new font on the same page do not get there.
It comes from the subject, in five decisions.
Make them in this order and write them in the brief's Design lines; each comes from this subject, and each differs from the recipe you start from.

1. **Idea.** One sentence a reader would use to tell a friend about the chart: "every lighthouse drawn at its real height along one coast", "a year of rain poured into twelve gauges", "the budget as the ledger page it is kept in".
   Find it by asking three questions about the subject:
   - *What shape does it have?* A cycle turns (a week, a season, an orbit), a depth hangs below a surface, a route runs from a start to an end, a crowd is a count of people.
   - *What objects does a reader know it by?* A ticket, a scoreboard, a gauge, a seed packet, a boarding pass, a pay slip.
   - *How do the people who work with it already draw this data?* A tide table, a tasting sheet, a growth chart, a ship's log, a league table.

   Pass over the answer that every chart on the topic gets: a newspaper page for anything in the news, a dark screen for anything technical, a notebook for anything personal.
   It names the topic's category, not this data; keep asking until the answer belongs to this subject only.
   The idea must help the reading: the marks are easier to recognize, the comparison easier to see, or the finding easier to remember.
   It shows in the form or the marks, where the reader looks, not only in the frame around them.
   forms.md lists the shapes rhp draws and the recipe that has the technique for each.

2. **Marks.** Draw the marks so that they carry the idea: this is where a reader meets it first.
   - **Its own outline.** When the items are things a reader knows by their shape (buildings, animals, ships, bottles), each wears its own simple silhouette, drawn roughly to proportion: a `shape()` per row, passed as data and read with `shape=${() => d.outline}`.
     One shared outline for every item is a bar with a hat; `silhouettes` gives each of its ten towers its own outline.
   - **Counted units.** A bar cut into the subject's units (hours, coins, floors, seats) by a mask, so the reader can count them.
     Cut each bar into its rounded count of equal parts (the code below, and `unit-stack`): the bar keeps its exact length, and no sliver is left after the last whole unit.
   - **A container and its content.** A Bar to the top of the scale as the vessel and a Bar to the value inside it (a gauge, a tank, a battery, a glass), as `column` does.
   - **One small picture per unit.** An inline SVG in each Cell, as `waffle` does with its drops.
   - **The stroke of the subject's instrument.** Dotted leaders for a receipt, round caps for a transit line, hollow bodies for the days a stock rose, a slanted end for speed.

   ```js
   // Slat CSS: the bar in --n equal parts, 2px apart, with no gap after the last one
   //   .bar:horizontal { mask: linear-gradient(to right, #000 calc(100% - 2px), #0000 0) 0 0 / calc((100% + 2px) / var(--n)) 100%; }
   //   .bar:vertical { mask: linear-gradient(to top, #000 calc(100% - 2px), #0000 0) 0 100% / 100% calc((100% + 2px) / var(--n)); }
   html`<${Bar} to=${() => d.hours} class="bar" style=${() => ({ "--n": Math.max(1, Math.round(d.hours)) })} />`
   ```

   One treatment for all the marks of a chart.
   Marks stay flat and honest: the value is read from a length, a position or a count, with no gradient, texture or shadow on data, and a picture is repeated or cropped, never stretched with the value.
   Textures stay out of the plot area, where lines read as grid lines and specks as data: on paper with rules, a grid or specks, give the chart the paper's flat color (`.poster .rhp-chart { background-color: var(--paper); }`), as two of the looks in looks.md do; a fine grain or a soft glow may stay under it.

3. **Composition.** Where the parts sit comes from the idea, not from the recipe.
   A recipe's order (kicker, headline, dek, a band, the chart, a note, in a card on a gray page) is one answer among many, and keeping it is what makes a chart read as that recipe.
   Take the composition from the idea's object: a ticket has a stub, a drawing sheet has a title block at its foot, a scoreboard is rows of big numerals, a label is a narrow strip, a field guide sets its plate beside the text.
   Decide what the reader sees first (the form itself, one big number, or the headline) and give it the most room.
   Section 6 shows how to place the parts freely.
   At most one ornament, at the edge and away from the data (a torn edge, a staple, corner brackets): it finishes the object, and it is never the idea.
   Then decide the phone: the idea is still there at 390px (the silhouettes carried into the turned bars, the ring kept and its labels moved below it), never a fallback to plain bars.

4. **Palette.** The subject's paper and ink first, and the paper is not white, cream or black by default.
   Ask what color the subject's own ground has: the object the idea names (blueprint blue, a chalkboard's green, kraft, pink newsprint, a ticket's stock), the scene (a night sky, grass, the sea, a clay court), or a color the subject owns (a team, a crop, a flag, a brand's packaging).
   When it has one, the paper takes it, pale or deep, with the ink light on a deep paper and dark on a pale one; section 4 says how to build the rest of the palette from that color so that every floor holds.
   Neutral paper is for subjects whose own ground is paper (a report, a receipt, a ledger), not the fallback for everything.
   One accent the subject owns (the register's red, a team's color, the fruit's color) for the story; up to two more hues only when several series are the story.
   Context marks are quiet, and need not be gray: a tint of the accent, an outline in ink or the material's second ink keeps them back without turning the chart into a wall of gray slabs.
   Check every color against the token rules (section 1).

5. **Type.** A display face with the subject's voice for the headline and the big numbers, and a plain text face for the rest (section 5).
   Not the faces of the recipe you start from.

Then put the result to the two tests of SKILL.md step 7, on the screenshots.
The recipe test: beside the starting recipe's screenshot, a reader could not tell that yours started from it.
The subject test: with the words covered, at 1280px and at 390px, the page still says its subject; if it could hold any chart, the idea is too weak, and if the ornament draws the eye before the data, it is too strong.

**The reasoning, once in full.** The request: a chart of the world's deepest lakes.

- The answer every nature topic gets is a field guide page with blue bars; it would fit rivers, birds or rainfall as well, so pass over it.
- Shape: a depth hangs down from a surface that all lakes share.
  Object: the sounding line, a weighted rope let down to the bottom.
  Convention: a nautical chart prints depths as small numbers on pale water.
- Idea: every lake sounded from one waterline, the lines hanging down to their depths.
  It helps the reading: deeper is lower, as in the world, and the surface is the shared baseline.
- Marks: a thin line per lake from the surface down, a lead weight (a Dot) at its depth, the depth printed under the weight.
  The depths are negative values under a 0 line at the top of a vertical chart, printed without their sign.
- Composition: the names sit on the waterline, and the headline goes in the lower left, in the empty water under the shallow lakes.
  On a phone the lines still hang: they carry numbers, and the names are a numbered list under the chart.
- Palette: the chart paper's pale blue-green for the water, navy ink, the red of a chart's danger marks for the deepest lake.
- Type: an engraver's serif for the headline, a small sans for the depths, as on a chart.

Nothing here is the `column` recipe's rain gauges, though the technique (vertical Bars, a readout) comes from it.

Four more, each a recipe, so open it for the whole page.

**Big Mac prices in twelve countries** (`lollipop`, The Economist's Big Mac index of July 2026).
Idea: the prices printed as the till receipt a burger comes with, one country per line.
Marks: lollipops whose stems are the receipt's dotted leaders, from the name to the price.
Composition: a narrow strip with everything centered like a receipt's header, torn at the top and the bottom, a barcode at the foot.
Palette: thermal white, black, the register's red for the countries cheaper than the US.
Type: Space Mono throughout, bold capitals for the headline.

```css
.poster { background: #fbfaf7; font-family: "Space Mono", ui-monospace, Menlo, monospace;
  mask: linear-gradient(#000 0 0) 0 9px / 100% calc(100% - 18px) no-repeat,
    conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 18px 9px repeat-x,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 18px 9px repeat-x; }
/* slat CSS: the stem is a line of dots in the mark's color */
.stem { background: radial-gradient(circle, var(--rhp-color) 1.2px, transparent 1.7px) 0 50% / 7px 100% repeat-x; }
```

**How six invented cities get to work** (`stacked-100`, illustrative data).
Idea: the ways to commute drawn as the lines of a metro map.
Marks: the modes end to end in one band, each in its line's color, its share written inside when it fits.
Composition: the key is a metro line between the dek and the bars, and its stations are the buttons.
Palette: white enamel with faint 45 degree hatching, one line color per mode.
Type: Jost, a geometric sans like a metro's signs.

```css
.poster { background: repeating-linear-gradient(45deg, rgb(29 27 23 / .028) 0 1px, transparent 1px 11px), #fbfbf9; }
.route button:not(:last-child)::before { content: ""; position: absolute; top: 8px; left: 11px; width: 100%; height: 6px; background: var(--c); }
.route i { position: relative; width: 22px; height: 22px; border: 5px solid var(--c); border-radius: 50%; background: #fbfbf9; }
```

**A stock's month** (`candlestick`).
Idea: the month printed on the engraved share certificate that the stock is.
Marks: candles with hairline wicks, hollow on the days that rose and solid on the days that fell, so color is never the only difference.
Composition: the headline centered inside a double rule, as on a certificate, the day's prices on one ticker line.
Palette: ivory paper, a sepia frame, green for the days that rose and red for the days that fell.
Type: Cormorant Garamond for the headline, IBM Plex Mono for the prices.

```css
.poster { background: repeating-linear-gradient(45deg, rgb(80 64 32 / .028) 0 1px, transparent 1px 5px), #f5efe0;
  box-shadow: inset 0 0 0 12px #f5efe0, inset 0 0 0 13px #8f7f5f, inset 0 0 0 17px #f5efe0, inset 0 0 0 19px #8f7f5f; }
/* slat CSS: a day that rose is hollow */
.rose .body { background: var(--rhp-surface); box-shadow: inset 0 0 0 1.5px var(--move); }
```

**A monsoon year** (`column`).
Idea: twelve rain gauges standing in the night rain, one per month.
Marks: each month a glass tube up to the top of the scale, with its rain inside.
Composition: the running total as the big number above the gauges, a bracket under the monsoon months.
Palette: near-black paper with fine slanting rain, white type, the water in blue.
Type: Archivo, wide for the headline.

```css
.poster { background: repeating-linear-gradient(104deg, transparent 0 26px, rgb(255 255 255 / .035) 26px 27px), #141618; color: #eef2f5; }
/* slat CSS: the tube is a Bar to the top of the scale, the water a Bar to the month's value */
.tube { background: rgb(255 255 255 / .04); box-shadow: inset 0 0 0 1px rgb(255 255 255 / .14); }
```

## 3. Writing a look

A look is the palette and the type of section 2 (decisions 4 and 5) written out: the tokens, the fonts, a paper texture, and the poster's parts restyled with them.
Write it for your subject.
[looks.md](looks.md) has eight looks written out in full, each tested with the checker, to show how far a look goes and to borrow from what is hard to get right: paper and ink values that pass the contrast floors, a texture, the CSS of a key or a button group.
They are examples, not a menu.
A look picked because it matches the topic (newsprint for anything in the news, a dark screen for anything technical) is the look every chart on that topic gets, and it leaves the idea, the marks and the composition undesigned.

How a look goes onto a page:

1. The look's font link goes after the two preconnect links below, and the page's `<style>` holds the base CSS (section 1), the look, and the page's own parts (readout, key, buttons) written with the tokens.
2. Declare `THEME`, `ACCENT` and `QUIET` before the slat types, and give every Chart `theme=${THEME}`.
3. Use theme keys in slat CSS and data (`series-1`, `var(--rhp-series-4)`, `var(--rhp-surface)`), and the tokens outside the chart (`var(--accent)`); a legend is `.keys`, a button group `.choice`.
4. Keep the token rules when you choose a color (section 4), and run the checker.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

## 4. Color

- One accent for the story: the value the headline names, the series it is about.
  Everything else is quiet: the quiet color, ink, a tint of the accent, or an outline.
  A chart of one lit bar among rows of heavy mid-gray slabs is quiet in the wrong place: lighten the context marks to a tint (3:1 on the paper) or draw them as outlines, so the story is not outweighed.
- Color several series only when comparing them is the story, six at most; with more, label the marks directly and group the small ones as "Other" in the quiet color.
- Give meaning a second channel where it matters: filled against hollow, solid against dashed, a label.
- Never red against green as the only difference; use blue against orange for good and bad, up and down.
- The paper and the page stay quiet: neutral, or the subject's own color (section 2), and never the hue of a mark that has to stand out from it.
  On a colored paper the accent is a hue from the other side of the wheel (yellow on blue, red on mint, teal on salmon) and the quiet marks are a tint or a shade of the paper itself, so the page reads as one material.

**A colored paper, built from the subject's color.** The paper's hue is the subject's own (section 2), and the rest follows from it:

1. Keep the paper pale or deep, never in the middle: a paper of middle lightness (a saturated tan, yellow or red) gets neither a dark nor a light ink far enough from it, and its text looks muddy even where the numbers pass.
2. The ink is near white on a deep paper and near black on a pale one, tinted a little toward the paper's hue, at 7:1 or more (10:1 reads as crisp).
3. The soft text is the ink moved a third of the way toward the paper (5:1 or more), and the rule the paper moved a little toward the ink (about 1.4:1).
4. The accent comes from the other side of the color wheel (yellow on blue, red on mint, teal on salmon), light on a deep paper and deep on a pale one, at 4.5:1 or more.
5. The quiet marks are the paper itself moved toward the ink until they reach 3.3:1 or more, so the context stays the material's own.
6. The page around the poster is the paper moved a little toward the ink (about 1.2 to 1.5:1).
7. Run the checker; a second and a third series need their own check (the floors above and the color-blind distances).

The fourteen rows below show that the range works, from deep blue to pale tan, with values measured against the floors and checked on a poster page.
They are anchors, not a menu: a reader will meet them again, so take the row nearest the subject's hue as the starting lightness and move its hue to the subject's own color (the sea of this coast, the green of this team, the red of this label), then check.

| Hue | `--paper` | `--page` | `--ink` | `--soft` | `--rule` | `--accent` | `--quiet` |
|---|---|---|---|---|---|---|---|
| deep blue | `#1d3f8c` | `#102659` | `#f4f6fb` | `#c9d4ee` | `#3a5aa6` | `#ffd45c` | `#8fa5db` |
| deep navy | `#0f1f3d` | `#080f1f` | `#eef2fa` | `#b9c4dc` | `#283a5e` | `#ffb547` | `#7f8fb3` |
| deep teal | `#0f4c5c` | `#08303a` | `#eaf4f4` | `#b8d3d6` | `#2a6472` | `#f6c344` | `#7bacb5` |
| deep gray-green | `#2b4a3c` | `#1b2f26` | `#f3efe3` | `#c4d1c6` | `#3f604f` | `#f4c95d` | `#8fae98` |
| deep green | `#1f4d2e` | `#143320` | `#f0f5ec` | `#bfd3c2` | `#346343` | `#ffcf5c` | `#86a98e` |
| deep violet | `#4a1f4e` | `#32153a` | `#f7eef7` | `#d9c3da` | `#633868` | `#ffc46b` | `#a680a9` |
| deep wine | `#6b1d22` | `#4a1316` | `#fbeeea` | `#e8c4bd` | `#843a3e` | `#ffd1a1` | `#c98b84` |
| deep red | `#8a2d1c` | `#6b2114` | `#fff3ea` | `#f0c9bc` | `#a2463a` | `#ffd166` | `#d99a8a` |
| pale pink | `#f8dcc8` | `#e9c3aa` | `#2a1c15` | `#6b5248` | `#e2bba3` | `#0f5f63` | `#96705f` |
| pale yellow | `#edc965` | `#d1ad44` | `#231a05` | `#4a3a0e` | `#d4b33c` | `#163077` | `#6b5617` |
| pale blue | `#d7e6f4` | `#b9cfe4` | `#0f2540` | `#44607f` | `#b7cde2` | `#c8102e` | `#5b789c` |
| pale green | `#dfeee0` | `#c6dfc8` | `#14301c` | `#4a6650` | `#bcd6bf` | `#b8233a` | `#568466` |
| pale violet | `#e6e0f3` | `#d2c9ea` | `#221a3a` | `#5a5273` | `#c9bfe0` | `#9c3a1a` | `#76699e` |
| pale tan | `#e2caa6` | `#cdb08a` | `#2a1a0a` | `#4a3618` | `#cbb08a` | `#7a160f` | `#6a5020` |

The deep papers set `color-scheme: dark` on `:root`.

What the checker measures, and the floor for each:

| What | Floor | Finding |
|---|---|---|
| text under 24px (18.66px bold) | 4.5:1; 5:1 on textured or gradient paper, which is darker in places | `low-contrast` |
| text 24px and larger | 3:1 | `low-contrast` |
| a mark that carries data | 3:1 against the plot's background (the checker warns under 1.25:1) | `faint-marks` |
| a mark an interaction dims | 1.5:1, in its own hue (`color-mix(in oklab, var(--rhp-series-2) 40%, var(--rhp-surface))`); the checker reads colors before any interaction, so it sees only marks drawn dimmed from the start | `faint-marks` |
| two series whose marks touch (stacked parts, mixed dots) | CIEDE2000 10 apart, for normal vision and simulated protanopia, deuteranopia and tritanopia | `colorblind` |
| two series anywhere | 5 apart, with the same visions | `colorblind` |

Text in a series color must pass 4.5:1 too, so only the accent (and ink) may color text; the other series and the quiet color are for marks.
Text on a mark is `var(--rhp-surface)` (the paper) or `var(--rhp-ink)` rather than `#fff`, so it flips with dark mode.

**Categorical palettes.**
Series that have colors of their own in the world (coal is dark and hydro blue, a party, a team or a metro line has its color) take those, checked like any other.
When the headline is about one series, that series takes the accent and the others take tints of one quiet hue, not a hue each.
When the series have no colors of their own and comparing them all is the story, these two palettes are measured with the checker's own color math; use them in this order, from the first color:

| Paper | Colors | Contrast | Closest pair, worst vision |
|---|---|---|---|
| light (`#f7f5f0`, white, the papers of looks.md) | `#3271c3` `#d65203` `#0d765a` `#743589` `#9a7d4e` `#b6487f` | 3.9 to 8.0:1 | 10.2 |
| dark (`#171614`) | `#468eef` `#eb9c58` `#07986f` `#c9abfc` `#efd9a0` `#e6619b` | 4.9 to 13:1 | 10.8 |

The first two colors of each are 48 or more apart for every vision, and any first three, four or five stay at 10 or more.
Use them as the theme's series, `theme=${{ ...THEME, series: SIX }}` with `color=${series(6)}`; series with a meaning (coal dark, hydro blue) may take them in another order, then check the page.

**Sequential ramps.** A Cell runs from the theme's `low` to its `high`, mixed in oklab:

| Paper | `low` to `high` | Lightest step | Darkest step |
|---|---|---|---|
| light | blue `#c6d6ec` to `#123a73`; heat `#eed08a` to `#651a0c` | 1.35:1 | 10 to 11:1 |
| dark | blue `#263449` to `#a9cdfb`; heat `#4a2a1c` to `#f7d48a` | 1.4:1 | 11 to 13:1 |

Five steps along each ramp stay 10 or more apart for every vision.
Pick ends of neighbouring hues: the mix runs straight through oklab, so opposite hues (yellow to blue) meet in grey.
On a dark ground more is brighter, so `low` is the dark end; a dek that says "darker means more" must change with it.
Set them with the theme, `theme=${{ ...THEME, low: "#c6d6ec", high: "#123a73" }}`, and draw the key with the same two colors (`linear-gradient(90deg in oklab, #c6d6ec, #123a73)`).

**Diverging.** Values either side of zero take blue and orange: on light paper `#1f5ba8` and `#b4501d` (6.2:1 and 4.7:1), on dark `#6aa6f2` and `#f0965a`, through a neutral middle (`#d6d2c9` light, `#4a4741` dark) when there are steps between.
Set them as the theme's `positive` and `negative` (`color="positive"` on a block); rhp's defaults are green and red.

**Theme keys.** THEME (section 1) maps the tokens:

| Token | Theme key | In the chart |
|---|---|---|
| `--text` | `font` | every text |
| `--ink` | `ink` | labels, values, a Tick's default color |
| `--soft` | `muted` | axis numbers; `var(--rhp-muted)` for secondary labels |
| `--rule` | `grid` | grid lines |
| `--paper` | `surface` | text on a mark, the ring around a dot, hollow marks |
| `--accent`, `--s2`, `--s3`, `--quiet` | `series` 1 to 4 | marks; Bar, Dot, Area and Line default to `series-1` |
| (add per chart) | `low`, `high`, `positive`, `negative` | Cells; blocks that ask for them |

Inside the chart use the theme keys; outside it (a key's swatch, a button) use the tokens (`style="background: var(--s2)"`), because `--rhp-*` variables exist only inside the chart.

**Dark mode.**
A poster page is light unless the user asks for dark, the subject is dark by nature (a night sky, a chalkboard, a control room), or it goes into an app that has a dark mode, where both are required.
Write the same tokens again under `prefers-color-scheme: dark` (or under the app's own `.dark` class): THEME reads the tokens, so the chart follows with no script.
Use a near-black neutral paper (not `#000`), an off-white ink, lighter accents (a dark accent sinks), a darker quiet color, and no shadows.
Check that the story still stands out: in the dark the accent must be brighter than the quiet color.
Check both: the checker without and with `--dark`.

```css
/* Dark: the Swiss grid look of looks.md after dark. The same tokens with dark values; THEME follows them. */
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark; --page: #0b0b0b; --paper: #161616; --ink: #f2f2ef; --soft: #a3a3a0; --rule: #333333;
    --accent: #ff5a4a; --s2: #e8e8e4; --s3: #6f9bff; --quiet: #6c6c69; }
  .poster { background-image: repeating-linear-gradient(90deg, rgb(255 255 255 / .04) 0 1px, transparent 1px calc(100% / 12)); }
}
```

## 5. Typography

The type takes its voice from the subject's own lettering: how the object of the idea (section 2) is printed, painted, stamped or displayed.
Choose the display face for that voice from all of Google Fonts, and a plain text face beside it.
The pairings that the looks of looks.md and the recipes use are below as examples of a voice; they are the ones a reader has already seen, so prefer a face of your own.

| Voice | Display (headline, big numbers) | Text (dek, labels, values) | Used by |
|---|---|---|---|
| news | Noto Serif Display, condensed | Libre Franklin | Broadsheet |
| neutral, modern | Host Grotesk 800 | Host Grotesk 400 | Swiss grid |
| bookish | Alegreya 800 | Alegreya Sans | Field guide |
| luxury | Playfair (high contrast at large sizes) | Urbanist | Luxury magazine |
| fast | Sofia Sans Extra Condensed, italic | Sofia Sans | Sports page |
| precise | IBM Plex Sans 700 | IBM Plex Sans, STIX Two Text for captions | Scientific figure |
| technical | B612 | B612, with B612 Mono for short labels | Night instrument |
| raw | Anton | Courier Prime | Photocopied zine |
| warm editorial | Instrument Serif | Instrument Sans | `bar` |
| report | Newsreader | Public Sans | `multi-line` |
| poster | Big Shoulders Display | Work Sans | `area` |

More lettering to start from, by where it comes from (each a Google Font; check that it loaded, the checker says so):

| The subject's lettering | Display faces |
|---|---|
| engraved (certificates, maps, banknotes) | Cormorant Garamond, Old Standard TT, IM Fell English, Cinzel |
| wood type and slabs (posters, labels, railways) | Alfa Slab One, Zilla Slab, Rokkitt, Bitter |
| signs and boards (roads, stations, shops) | Oswald, Barlow Condensed, Bebas Neue, Bungee |
| stencil and stamps (crates, freight, military) | Saira Stencil One, Stardos Stencil, Black Ops One |
| typewriter and forms (files, cards, tickets) | Special Elite, Cutive Mono, Courier Prime |
| screens (terminals, dot matrix, arcades) | VT323, Share Tech Mono, DotGothic16, Press Start 2P |
| fashion and deco (mastheads, cinemas, perfume) | Bodoni Moda, Abril Fatface, Limelight, Poiret One |
| hand lettering (chalk, markers, notes), short labels only | Permanent Marker, Caveat, Rock Salt, Patrick Hand |
| friendly and round (toys, food, apps) | Fredoka, Baloo 2, Bricolage Grotesque |

- Two families at most; a mono for numbers may be a third.
- Every stack ends in system fonts of the same kind: `"Libre Franklin", "Franklin Gothic Medium", Arial, sans-serif`.
- Load only the weights and styles you use, with `display=swap`.
- The chart's text uses the theme's `font`, one family; a second family inside the chart is named in slat CSS (`.age { font: italic 900 20px/1 "Sofia Sans Extra Condensed", "Arial Narrow", sans-serif; }`).
- Monospace for short labels and numbers, never for sentences.
- Sentence case; capitals only for the kicker and short labels, letterspaced .06em to .32em.
- `text-wrap: balance` on headlines, except a headline that has its own background (the box keeps the unbalanced width).
- Headline sizes are fluid: `font-size: clamp(34px, 5vw, 48px)` is the phone size on a phone, grows with the window, and stops at the desktop size.
  Pick the middle value so the desktop size comes when the poster reaches its full width (48px on a 960px poster: 48 / 960 = 5vw).
  One breakpoint instead puts a desktop headline in a 700px window.

| Text | Desktop | Phone (390px) |
|---|---|---|
| headline, full width | 44 to 84px, condensed faces at the top of the range | 30 to 54px, three lines at most |
| headline beside the chart | about two thirds of the full-width size | as full width (the columns stack) |
| dek | 16 to 21px, line-height 1.45 to 1.55, 40 to 60 characters a line | 15 to 17px |
| kicker | 11 to 14px | 11 to 14px |
| names and values in slats | 13 to 15px | 12 to 13px, in slat CSS under `@container (max-width: 420px)` |
| axis numbers (rhp's) | 11px | 11px |
| note | 11.5 to 13px | 11.5 to 13px |

Nothing in a chart under 11px, and nothing anywhere under 9px (the checker's floor).

Numbers line up when they use `font-variant-numeric: tabular-nums` (values, readouts, tables; rhp's axis already does).
Format every number with an `Intl.NumberFormat` made once, in the user's locale when you know it:

```js
const count = new Intl.NumberFormat("en-US"); // 1,456
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }); // 12K, 1.2M, 3.4B
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }); // 0.183 -> 18.3%
const change = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero" }); // +12%, -4%, 0%
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }); // $26M
const euros = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }); // 1.456,70 €
const speed = new Intl.NumberFormat("en-US", { style: "unit", unit: "kilometer-per-hour" }); // 120 km/h
const minus = (text) => text.replace("-", "\u2212"); // -$61M becomes −$61M, with a real minus sign
```

Axis numbers have fixed room (42px left of a vertical chart, 24px under a horizontal one): keep them to about five characters with `compact`, and expect a wide font (B612, any mono) to need it sooner.

## 6. Layout

**Placing the parts.** `Poster` renders the kicker, the headline and the dek inside a `<figcaption>`, then its children, then the note.
With `display: contents` on the figcaption and a grid on the poster, every part is a grid item, and you place each one where the composition (section 2) wants it.
Wrap the Chart, with its key and its readout, in one element of your own (`<div class="stage">`), so that the chart is one grid item.

```css
/* Free the parts: the caption's three spans become grid items of the poster, beside the chart and the note */
.poster { display: grid; grid-template-columns: minmax(0, 1fr); }
.poster figcaption { display: contents; }
.poster .kicker { grid-area: kicker; }
.poster .headline { grid-area: headline; }
.poster .dek { grid-area: dek; }
.poster .stage { grid-area: chart; min-width: 0; }
.poster .note { grid-area: note; }
```

Then one map of the areas says where they sit. Three to start from, each over the block above:

```css
/* The chart first: the form is what the reader sees, and the words caption it */
.poster { row-gap: 12px; grid-template-areas: "kicker" "chart" "headline" "dek" "note"; }
.poster .stage { margin-bottom: 12px; }
```

```css
/* A rail: the words in a column beside the chart from 860px, stacked under 860px */
.poster { row-gap: 12px; grid-template-areas: "kicker" "headline" "dek" "chart" "note"; }
@media (min-width: 860px) {
  .poster { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); grid-template-rows: auto auto 1fr auto; column-gap: 48px;
    grid-template-areas: "kicker chart" "headline chart" "dek chart" "note chart"; }
  .poster .note { margin-top: 0; }
}
```

```css
/* A title block at the foot, as on a drawing sheet or a label: the chart above, the words ruled off below it */
.poster { row-gap: 10px; grid-template-areas: "chart" "kicker" "headline" "dek" "note"; }
.poster .kicker { margin-top: 18px; padding-top: 16px; border-top: 2px solid var(--ink); }
.poster .note { margin-top: 0; border-top: 0; padding-top: 0; }
@media (min-width: 860px) {
  .poster { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); column-gap: 40px;
    grid-template-areas: "chart chart" "kicker kicker" "headline dek" "headline note"; }
  .poster .note { align-self: end; }
}
```

- A fourth: one number as the hero. Add an element of your own to the Poster's children (`<b class="figure">62%</b>`), give it a grid area and the largest type on the page, and let the headline caption it.
- These are starting points, not a second menu: take the composition from the idea's object, and change the poster's `max-width`, padding and proportions with it (a narrow strip for a receipt or a label, a wide sheet for a timeline).
- The chart never gets smaller when the window gets wider: beside a rail the chart keeps two thirds of the width or more, and the rail starts only where the chart stays at least as wide as it was just under the breakpoint.
- On a phone the parts stack in one column, with the chart in the first screen.

| Form | Poster `max-width` |
|---|---|
| ranked bars, a few series | 880 to 960px |
| chart beside the text (donut, waffle, radial bars, pyramid), two columns from 860px | 940 to 1000px |
| time series, heatmaps, tables of sparklines | 960 to 1040px |
| a scientific figure | 880px |

- The page around the poster: `--page` behind it, 48px above and below, the poster centered; one poster per page unless asked.
- Text runs left-aligned in one column; controls (keys, buttons) sit on one line right above the chart, with the readout, so the eye stays near the data.
- A readout that changes keeps its height (`min-height: 2lh`, or one line with `white-space: nowrap`) so the chart under it never jumps.

At 390px:

- The base CSS gives a 16px gutter and about 18px of poster padding; nothing may scroll sideways (the checker fails it).
- The chart is in the first screen: the headline, the dek, then the chart; tables, long keys and secondary text come after it.
  A phone's first screen is about 390 by 660px (375 by 548 on a small iPhone), so the headline takes three lines at most and the dek two or three, and the plot's top and the lit mark show below them.
- A phone layout may shorten what defines a number (its period, its unit, whether it is a total or an average: "per yr", "avg"), but never drops it.
- A slat's `@container` rule and the page's `@media` rule that belong together switch at the same window width: the container's width is the chart's width at the media breakpoint (the breakpoint less the gutters and the poster's padding).
  Otherwise, between the two, the slats have their phone layout in the desktop poster, or the reverse.
- Check at 360 and 320px too (SKILL.md step 8): narrower phone layouts expose wrapping, and at 320px fixed room leaves the plot narrowest.
- Two-column posters stack: caption, controls, chart, note.
- Buttons at least 24px in both directions (44px for a play button), wrapping onto a second line when needed.
- Long names: let them wrap onto two lines in slat CSS (`.name { max-width: 7em; white-space: normal; line-height: 1.1; }` under `@container (max-width: 420px)`), as `stacked-bars` does; or set the name above its bar in a thicker slat, as `diverging-bars` does.
  Use an ellipsis only when the full name is in the slat's `aria-label` and in the readout.
- `room: { start: "auto" }` sizes the names' room to the longest name, up to `--rhp-gutter-max` (40% of the chart).

How many slats:

- Horizontal slats of 28 to 50px; up to about 15 read at a glance, about 30 at 22px each.
  Beyond that, show the top ones and group the rest as "Other", or switch to a table of sparklines.
- Vertical columns need about 24px each: 12 fit at 390px.
  With more columns, or names under them, turn the chart on phones (`heatmap` does it the other way, so its 24 hours run down a phone):

```js
const wide = matchMedia("(min-width: 640px)");
const [desktop, setDesktop] = createSignal(wide.matches);
wide.addEventListener("change", (e) => setDesktop(e.matches));
// <${Chart} orientation=${() => (desktop() ? "vertical" : "horizontal")} ...>
```

Style both orientations in the slat CSS with `:horizontal` and `:vertical`.
The turned form keeps the idea: towers stay towers and gauges stay gauges (their silhouettes carried into the bars, or an upright row of shorter marks with the names in a list below); it never falls back to plain bars.

## 7. Annotation

- **The key value, on its slat.** The slat the headline is about gets the accent on its mark and its label, bolder, and a short note in the slat when it helps ("record", "since 2019"):
  `color=${() => (d.lit ? ACCENT : QUIET)}`, with `.lit .value { color: var(--rhp-series-1); font-weight: 700; }` in the slat CSS.
  A name that turns bold in a `room.start` of "auto" widens the room and slides every bar: keep its bold width at rest (pitfalls.md, "The layout jumps").
- **The rest muted.** Quiet marks, labels in ink at normal weight, secondary numbers in `var(--rhp-muted)`.
- **Direct labels before legends.** Names at the start of bars, at the end of lines (`Label at=${last} cross=${value}`), inside a segment when the number fits (hide it with a class when the segment is narrow, as `stacked-100` does).
- **Every part is named at rest, however small.** Hiding a label that does not fit is never the only fallback: a small slice or segment gets its name outside, with a short leader, or in a key beside the chart in the marks' order, so nothing needs a tap to be read.
  Decide by the room the label has (its measured width against its mark's, with a few px to spare), not by a fixed value or one breakpoint.
  On a phone, short codes come before dropping names, and a mark that stands alone (an outlier, the one dot far from the others) always keeps its name.
- **A legend only when the marks cannot carry names** (stacked parts, dots in several colors): a `.keys` line right above the chart, in the marks' order, each swatch drawn like its mark (a dot, a short line, a square).
  Make its items buttons when picking a series helps (`stacked-bars`).
- **Reference lines** (an average, a target, today): one slat in an overlap Plot, a dashed Tick and its name at the top, as `lollipop` draws its base price:

```js
const Reference = slat({
  room: { before: 24 },
  css: `
    .rule { --rhp-tick-width: 2px; background: repeating-linear-gradient(0deg, var(--rhp-ink) 0 5px, transparent 5px 9px); }
    .tag { top: 0; translate: -50% -100%; padding: 0 0 5px; font-size: 11px; font-weight: 700; }
  `,
}, (r) => html`
  <div>
    <${Tick} at=${() => r.at} thick=${1} class="rule" />
    <${Label} at=${() => r.at} class="tag">${() => r.text}<//>
  </div>`);
// in the Chart, before the data's Plot, so the data draws over the line:
// <${Plot} overlap=${true} slats=${1} at=${average} text="Average" style=${{ "pointer-events": "none" }}>${Reference}<//>
```

- **Labels never cover a reference line.** Give value labels near it no background that cuts the line; when bar ends sit around the line, print their values inside the bars or in the room, so the line stays whole.
- **Units** once, where the reader looks first: in the dek, the Chart's `label` and the axis `format`.
  A short symbol ($, %, °C) may repeat on every value; a unit word ("megawatts", "TWh") goes in the dek or a column head, or after the first value only.
- **Numbers** rounded to what matters (two or three significant figures), with the same decimals down a column.

## 8. Inside an existing app

In an app with a look of its own, the chart takes the app's look; it is not a magazine poster dropped into a dashboard.

1. **Read the app's look first**: its global CSS variables (shadcn/ui's `--background`, `--foreground`, `--card`, `--muted-foreground`, `--border`, `--chart-1` to `--chart-5`), its Tailwind theme (`@theme { --color-*; --font-* }` in Tailwind 4, `theme.extend` in `tailwind.config`), its component library's theme (MUI's `palette`, Chakra's or Mantine's tokens), its body font, its card component, its spacing and its corner radius.
2. **Wire the chart's theme to them**, so the app's own dark mode reaches the chart too:

```js
// The app's fonts and colors (shadcn/ui variables shown), read in the browser when the chart renders
// (not at module level, which a server render runs without a document)
const appTheme = () => ({
  font: getComputedStyle(document.body).fontFamily,
  ink: "var(--foreground, oklch(0.145 0 0))", muted: "var(--muted-foreground, oklch(0.556 0 0))",
  grid: "var(--border, oklch(0.922 0 0))", surface: "var(--card, oklch(1 0 0))",
  series: ["var(--chart-1, oklch(0.646 0.222 41.116))", "var(--chart-2, oklch(0.6 0.118 184.704))", "var(--chart-3, oklch(0.398 0.07 227.392))", "var(--muted-foreground, oklch(0.556 0 0))"],
});
```

   - Give each variable a fallback with the app's own value, as above (shadcn/ui's defaults on Tailwind 4; put in the app's): without one, a page that lacks the app's CSS (the checker's, a test, Storybook) draws every mark transparent.
   - shadcn/ui on Tailwind 3 stores bare numbers (`--foreground: 222 47% 11%`): wrap them, with the fallback in the same bare numbers, `"hsl(var(--foreground, 222 47% 11%))"`; a hex inside `hsl()` is invalid and draws nothing.
   - With fixed colors only (a `tailwind.config` palette, a design token file), copy the hex values into the theme.
   - Check the app's colors like any other: shadcn/ui's default `--chart-4` and `--chart-5` are yellow and amber at 1.7:1 and 2.1:1 on white, so `appTheme` takes the first three and the muted foreground for the rest; run the checker in both of the app's themes.
3. **Keep the editorial habits that help any chart**: a title that states the finding, in the app's card-title style; a one-line description with the unit; direct labels; the source in small muted text at the foot; the app's primary color (or `--chart-1`) for the story.
4. **Leave out the poster's dress**: no kicker, no paper, no texture, no ornament, no display font, no page background.
   The app's card holds the chart, with the app's padding and radius, and the chart fills the card's width.
5. **Still design it for its subject.** The app fixes the palette and the type (decisions 4 and 5 of section 2).
   The idea, the marks and the composition inside the card are yours, and they are what keeps the chart from being a stock widget in the app's colors:
   - **The idea**, from the subject's own shape or object: storage as vessels filling toward their quotas, a release plan as the weeks it covers, depths hanging below a surface.
   - **The marks**, in the app's colors: each item's own outline, counted units, a container and its content.
     The story takes the app's primary color, and the context marks a tint of it (`color-mix(in oklab, var(--primary, oklch(0.205 0 0)) 40%, var(--card, oklch(1 0 0)))`, at 3:1 on the card or with an outline), not rows of mid-gray slabs.
   - **The composition**, with the app's own type scale: one key number in the app's heading font at its largest size; the fact the data is remembered for written on the mark it belongs to (a short note in the slat), not left in a footnote; a readout that says at rest something the title does not.
   - The reader sees the app's own component, and still could not take the chart for a library's default.

```js
// Inside the app's card component, or plain markup with the app's classes
html`<section class="card">
  <h3 class="card-title">Support tickets doubled in March</h3>
  <p class="card-description">Tickets opened per week, 2026</p>
  <${Chart} theme=${appTheme()} scale=${[0, 400]} label="Support tickets opened per week, 2026">...<//>
  <p class="card-footer">Source: help desk export, April 2026</p>
</section>`
```

**Worked example.** Storage per team, in an admin dashboard built with shadcn/ui.
Fixed: the app's font, `--primary`, `--muted-foreground`, `--border`, its Card.
Idea: every team's storage is a vessel that fills toward its quota.
Marks: a Bar to the quota, outlined in `--border`, and a Bar to the usage inside it in a tint of `--primary`; the team over its quota in `--destructive`, with "12 GB over" written on its bar.
Composition: the card's title states the finding ("Design is over its quota"), the total in use is the big number in the card's header, and the vessels sort fullest first.
Nothing in it is a poster, and nothing is a default bar chart.

## 9. A style the user asks for

The user's words beat every default in this file: do exactly what they asked, and keep only what they did not mention.
Colors or fonts fix the palette and the type (decisions 4 and 5 of section 2), and only those: the idea, the marks and the composition still come from the subject.
The user's four colors on a rounded dark card with pill buttons follow the palette and design nothing.

- Give their colors a plan: which one is the story and which are context.
  Build the page's own neutrals (paper, rules, soft text) as tints and shades of their colors instead of stock grays, so the whole page belongs to the palette.
- Give their font a range: one family still has a voice through weight, width, size and case (a headline at weight 800 and 72px, labels at weight 500 in letterspaced capitals).
- Keep their words exactly (a title they gave is the headline; a legend "at the top" is at the top), and build the idea around them.

| They say | Do |
|---|---|
| brand colors ("our blue is #0047ab") | put them in the tokens as the accent and the series; a color under 3:1 stays a fill with an outline that stands out from the paper (darker on light paper, lighter on dark) or a direct label, a text color under 4.5:1 becomes ink beside it, and the handoff says so; the series the headline names still leads at rest |
| a font ("use Futura") | load it from Google Fonts when it is there; otherwise name it first with close fallbacks (`"Futura", "Jost", "Century Gothic", sans-serif`) and say it shows only where it is installed |
| "minimal", "clean" | no kicker, texture or ornament; white or the page's own color; one accent; drawn as the plain chart below; keep the headline that states the finding and the source line |
| "dark" | dark tokens (section 4) for a ground the subject has (a night sky, a chalkboard, a control room, a stage), dark only unless they want both; "dark" fixes the ground, not the design |
| "plain", "no poster", "just the chart" | the Chart alone, with its `label`, drawn as the plain chart below; a title above it only if they did not also say "no title" |
| "like The Economist", "like the FT" | take the publication's traits in your own words and colors (a red rule and tag at the top left, a sans headline, blue bars, horizontal grid lines, the source at the bottom left; or salmon paper, a serif headline, teal and claret); never their name, logo or fonts as branding |
| a screenshot or a site to match | its palette, type, spacing and corner radius, measured from the reference, then checked like any other |

**Worked example.** "Cups sold per hour at our cafe, in our green #0f766e, font Poppins."
Fixed: the green and Poppins.
Idea: each hour is a stack of cups.
Marks: columns cut into units of ten cups by a mask; the busiest hour in their green, the others in a lighter tint of it that still reaches 3:1 on the paper.
Composition: the hours run along the foot as on the opening-hours sign of the shop's door, and the busiest hour's count is the big number beside the headline.
Palette: the paper is a pale tint of their green and the ink a deep shade of it, both checked.
Type: Poppins 800 for the number and the headline, Poppins 400 for the rest.

Whatever they did not mention keeps the defaults: text at 4.5:1 and marks at 3:1, labels of 11px or more, no sideways scroll at 390px, direct labels, the source line (none when the user gave the data and no source), and a clean check.

**A plain or minimal chart** still looks decided:

- One value system: the numbers on the bars with `ticks=${false}`, or an axis with hairlines and no numbers on the bars, never both.
- A baseline in ink at 0, with square bar ends there (`--rhp-start-radius: 0px`).
- A size that fits the content (about 480 to 640px wide for a few bars), centered with room around it (`#chart { max-width: 480px; margin: 0 auto; }` and `body { padding: 64px 16px; }`), not pinned to the top of an empty page.

```js
import { Chart, Plot, Bar, Label, Tick, slat, nice, html, render } from "@bezda/rhp/standalone";

// Data
const NAME = ["A", "B", "C"];
const VALUE = [3, 7, 5];
const scale = nice(Math.min(0, ...VALUE), Math.max(0, ...VALUE));

// Slat types: columns with their numbers (no axis numbers) and square feet, and a baseline, a Tick at 0 across the plot
const Column = slat({
  room: { start: 28, end: 24 },
  css: `
    .bar { --rhp-start-radius: 0px; }
    .name { font-size: 14px; }
    .value { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
  `,
}, (d) => html`
  <div>
    <${Label} edge="start" class="name">${() => d.name}<//>
    <${Bar} to=${() => d.value} class="bar" color="#808080" />
    <${Label} at=${() => d.value} class="value">${() => d.value}<//>
  </div>`);
const Baseline = slat({ room: {} }, () => html`<${Tick} at=${0} thick=${1} />`);

// Chart component
const Bars = () => html`
  <${Chart} orientation="vertical" height=${280} scale=${[scale.min, scale.max]} ticks=${false} static=${true}
    label="Values of A, B and C" theme=${{ ink: "#1f1f1f" }}>
    <${Plot} name=${NAME} value=${VALUE}>${Column}<//>
    <${Plot} overlap=${true} slats=${1}>${Baseline}<//>
  <//>`;

render(() => html`<${Bars} />`, document.getElementById("chart"));
```

## 10. Anti-patterns

| Don't | Why | Instead |
|---|---|---|
| purple-to-blue gradients, glassmorphism (frosted panels, blur), neon glows | the generic AI look: it says nothing about the subject | a material from the subject (section 2) |
| Inter, or one system sans, for everything | no voice; every chart looks the same | a display face with the subject's voice and a plain text face (section 5) |
| emoji as bullets, icons or decoration | noisy, drawn differently on every system | words, or a small inline SVG drawn for the subject |
| rounded cards with drop shadows around every part; the same card layout for every chart; a dark rounded card with pill buttons | dashboard sameness; boxes compete with the data | one poster, parts separated by space and hairlines |
| a recipe's page in a new skin: its parts in their places, its band above the chart, its marks, in new colors and fonts | the reader sees the recipe with new data | a composition and marks from this subject's idea (section 2) |
| a recipe's headline formula, kicker wording or readout band, as they are | the page reads as the skill's template with a new subject | words and parts written for this subject |
| an idea that shows only in the frame (a clipped corner, a barcode, a border, a mono face) | with the words covered, the page could hold any chart | carry the idea into the form or the marks |
| a look picked by topic (newsprint for the news, a dark screen for anything technical) | every chart on the topic gets it | the shape or object that only this subject has |
| one outline shared by every item (bars with hats) | no item is recognizable | each item's own silhouette, or honest plain bars |
| one lit bar among rows of heavy mid-gray slabs, as the whole design | the gray mass outweighs the story | context marks as tints or outlines (section 4) |
| one look for every chart | a template, not a design | a new idea, composition, accent and type per subject |
| a rainbow, or a color per bar of one series | color with no meaning | one accent for the story, the quiet color for the rest |
| gradients, textures or shadows on data marks; 3D | they distort the values and the comparison | flat marks; texture belongs to the paper |
| heavy or colored shadows | a shadow takes the color of the surface it falls on: a colored one reads as neon | a soft shadow in a darker shade of the page, or none |
| a background that shares the chart's hues (a blue page for blue bars) | the marks lose contrast and the page fights the data | a paper in the subject's color with the marks in a hue from the other side of the wheel (section 4), or neutral paper |
| white, cream or black paper for every chart | the posters all look like the same stock | the subject's own ground: a colored paper built from the subject's color (section 4) |
| one of section 4's fourteen papers taken as it is, chart after chart | they become the stock too | the subject's own hue, with a row of the table only as its starting lightness |
| a legend far from the data, or a legend for a single series | the eye travels back and forth | direct labels; a key right above the chart, in the marks' order |
| grid lines everywhere, a box around the plot | clutter that outweighs the data | a few hairlines along the value axis |
| centered paragraphs, sentences in capitals | slow to read | left-aligned text; capitals only for short labels |
| tiny or light grey type | unreadable on a phone | the sizes in section 5, the contrast floors in section 4 |
| a headline that only labels ("Sales by region") | the reader has to find the point | a headline that states the finding |
| false precision (12.3456%), mixed decimals in a column | noise that hides the comparison | two or three significant figures, the same decimals down a column |

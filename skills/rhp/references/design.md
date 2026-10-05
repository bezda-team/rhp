# Design: posters, looks, color, type and layout

How an rhp chart looks: an original editorial poster when the user asks for no style, exactly the style they ask for when they do, and the app's own look inside an app.
In all three the chart is designed for its subject: section 2 is the procedure, and it comes before any look.
Each kit was tested on two recipes, and every other code block on a page of its own, with the checker at 1280px and 390px; the sketches in section 2 are excerpts of tested recipes.

1. [The editorial poster](#1-the-editorial-poster): its five parts, the base CSS and the theme every look shares
2. [Art direction from the subject](#2-art-direction-from-the-subject): five decisions (idea, marks, composition, palette, type), two tests, worked examples
3. [Look kits](#3-look-kits): eight worked looks, examples and not a menu
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
/* Base: the page and the poster's parts. A kit (section 3) sets the tokens and the look. */
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

**Tokens.** A look is a set of CSS variables on `:root`, and the chart reads the same variables through its theme, so one change (a kit, a brand, dark mode) reaches the poster and the chart together.

| Token | Use | Rule |
|---|---|---|
| `--page` | the page around the poster | darker or lighter than the paper, near neutral |
| `--paper` | the poster's background (a look adds texture as `background-image`) | near neutral, or the material's own color (kraft, blueprint blue, slate): never a hue the marks use |
| `--ink` | headline, labels, the strongest marks | 7:1 or more on the paper |
| `--soft` | dek, note, axis numbers, small secondary text in the chart | 4.5:1 on flat paper, 5:1 on textured paper |
| `--rule` | hairlines, grid lines | about 1.35:1, quiet |
| `--accent` | the story: the key mark, its label, the kicker | 4.5:1 (5:1 textured), so it works for text and marks |
| `--s2`, `--s3` | other series, when several series are the story | 3:1 on the paper; apart for color-blind readers (section 4) |
| `--quiet` | context marks, and the last series ("other") | about 3.3:1: the lightest a mark may be at rest |
| `--display`, `--text` | the headline's font stack, everything else's | each with system fallbacks |

**The theme.** One theme object serves every kit, every brand and dark mode, because it reads the tokens:

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
     One shared outline for every item is a bar with a hat.
   - **Counted units.** A bar cut into the subject's units (hours, coins, floors, seats) by a mask, so the reader can count them.
     Cut each bar into its rounded count of equal parts (the code below): the bar keeps its exact length, and no sliver is left after the last whole unit.
   - **A container and its content.** A Bar to the top of the scale as the vessel and a Bar to the value inside it (a gauge, a tank, a battery, a glass), as `column` does.
   - **One small picture per unit.** An inline SVG in each Cell, as `waffle` does with its drops.
   - **The stroke of the subject's instrument.** Dotted leaders for a receipt, round caps for a transit line, hollow bodies for the days a stock rose, a slanted end for speed.

   ```js
   // Slat CSS: the bar in --n equal parts, 2px apart, with no gap after the last one
   //   .bar:horizontal { mask: linear-gradient(to right, #000 calc(100% - 2px), #0000 0) 0 0 / calc((100% + 2px) / var(--n)) 100%; }
   //   .bar:vertical { mask: linear-gradient(to top, #000 calc(100% - 2px), #0000 0) 0 100% / 100% calc((100% + 2px) / var(--n)); }
   html`<${Bar} to=${() => d.hours} class="bar" style=${() => `--n: ${Math.max(1, Math.round(d.hours))}`} />`
   ```

   One treatment for all the marks of a chart.
   Marks stay flat and honest: the value is read from a length, a position or a count, with no gradient, texture or shadow on data, and a picture is repeated or cropped, never stretched with the value.
   Textures stay out of the plot area, where lines read as grid lines and specks as data: on paper with rules, a grid or specks, give the chart the paper's flat color (`.poster .rhp-chart { background-color: var(--paper); }`), as the Swiss grid and zine kits do; a fine grain or a soft glow may stay under it.

3. **Composition.** Where the parts sit comes from the idea, not from the recipe.
   A recipe's order (kicker, headline, dek, a band, the chart, a note, in a card on a gray page) is one answer among many, and keeping it is what makes a chart read as that recipe.
   Take the composition from the idea's object: a ticket has a stub, a drawing sheet has a title block at its foot, a scoreboard is rows of big numerals, a label is a narrow strip, a field guide sets its plate beside the text.
   Decide what the reader sees first (the form itself, one big number, or the headline) and give it the most room.
   Section 6 shows how to place the parts freely.
   At most one ornament, at the edge and away from the data (a torn edge, a staple, corner brackets): it finishes the object, and it is never the idea.
   Then decide the phone: the idea is still there at 390px (the silhouettes carried into the turned bars, the ring kept and its labels moved below it), never a fallback to plain bars.

4. **Palette.** The subject's paper and ink: thermal white, blueprint blue, a chalkboard's slate, kraft, pink newsprint, a jersey's color.
   A paper with a color of its own is fine when no mark shares its hue and every floor of section 4 holds.
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

## 3. Look kits

A kit is a look written out in full: tokens, fonts, paper texture, type and one ornament, tested with the checker.
The eight here are worked examples, not a menu.
A kit picked because it matches the topic (newsprint for anything in the news, a dark screen for anything technical) gives the chart the look every chart on that topic gets, and a reader sees the template.
A kit is also only decisions 4 and 5 of section 2: the idea, the marks and the composition are not in it.
So write the look for your subject, and take from the kits what is hard to get right: paper and ink values that pass the contrast floors, a texture, the CSS of a key or a button group.

How a look written as tokens goes onto a page (how each kit here was tested on a recipe):

1. The look's font link goes after the two preconnect links below, and the page's `<style>` holds the base CSS (section 1), the look, and the page's own parts (readout, key, buttons) written with the tokens.
2. Declare `THEME`, `ACCENT` and `QUIET` before the slat types, and give every Chart `theme=${THEME}`.
3. Use theme keys in slat CSS and data (`series-1`, `var(--rhp-series-4)`, `var(--rhp-surface)`), and the tokens outside the chart (`var(--accent)`); a legend is `.keys`, a button group `.choice`.
4. Keep the token rules when you choose a color (section 4), and run the checker.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

| Kit | The object it is taken from | Tested on |
|---|---|---|
| Broadsheet | a newspaper's front page | bar, diverging-bars |
| Swiss grid | a 1960s typographic poster | stacked-100 (light and dark), stacked-bars |
| Field guide | a naturalist's plate | column, waffle |
| Luxury magazine | a fashion monthly's feature page | donut, waterfall |
| Sports page | a matchday programme | race, grouped-bars |
| Scientific figure | a journal's figure | pyramid, sparklines |
| Night instrument | a cockpit display after dark | heatmap, area |
| Photocopied zine | a stapled fanzine | lollipop, radial-bars |

### Broadsheet

Newsprint with a fine halftone, black ink and one spot blue, a condensed serif headline under the masthead's double rule.
Marks: flat, square-ended bars (`--rhp-radius: 0px`), the story in the spot blue, a second series in orange, the rest grey.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400..800&family=Noto+Serif+Display:wdth,wght@62.5..100,500..800&display=swap">
```

```css
/* Kit: Broadsheet */
:root {
  --page: #d5d3cc; --paper: #f3f2ed; --ink: #151515; --soft: #64625c; --rule: #d3d1ca;
  --accent: #1d58a8; --s2: #ca4a07; --s3: #262626; --quiet: #868580;
  --display: "Noto Serif Display", Georgia, "Times New Roman", serif;
  --text: "Libre Franklin", "Franklin Gothic Medium", Arial, sans-serif;
}
.poster { border-top: 6px solid var(--ink); box-shadow: inset 0 3px var(--paper), inset 0 4px var(--ink);
  background-image: radial-gradient(rgb(0 0 0 / .05) .6px, transparent .9px); background-size: 3px 3px; }
.poster .kicker { letter-spacing: .1em; }
.poster .headline { font: 700 condensed clamp(42px, 6.5vw, 62px)/.96 var(--display); max-width: 16em; }
.poster .dek { font-size: 18px; color: var(--ink); }
.poster .note { border-top-color: var(--ink); }
.poster .keys { font-size: 13px; font-weight: 600; }
.poster .choice button { border-color: var(--ink); font: 700 12px/1 var(--text); letter-spacing: .08em; text-transform: uppercase; }
```

### Swiss grid

The International Typographic Style: white stock with its twelve columns showing faintly, one strict left edge, a large grotesk, red and black.
Marks: thick square bars, red for the story, black (`series-2`) for a second series, grey for the rest.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400..800&display=swap">
```

```css
/* Kit: Swiss grid */
:root {
  --page: #d9d9d5; --paper: #f7f7f4; --ink: #111111; --soft: #676765; --rule: #d6d6d3;
  --accent: #ca2218; --s2: #1c1c1c; --s3: #2a5bd7; --quiet: #888887;
  --display: "Host Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif; --text: var(--display);
}
.poster { background-image: repeating-linear-gradient(90deg, rgb(0 0 0 / .035) 0 1px, transparent 1px calc(100% / 12)); background-origin: content-box; }
.poster .rhp-chart { background-color: var(--paper); }
.poster .kicker { display: flex; align-items: center; gap: 10px; font-size: 13px; letter-spacing: .02em; text-transform: none; color: var(--ink); }
.poster .kicker::before { content: ""; flex: none; width: 14px; height: 14px; background: var(--accent); }
.poster .headline { font: 800 clamp(44px, 7.3vw, 70px)/.94 var(--display); letter-spacing: -.035em; max-width: 12em; }
.poster .dek { max-width: 46ch; font-size: 18px; line-height: 1.45; color: var(--ink); }
.poster .note { border-top: 2px solid var(--ink); }
.poster .keys i { width: 14px; height: 14px; }
.poster .choice button { margin-left: -2px; border: 2px solid var(--ink); font-weight: 700; }
.poster .choice button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--paper); }
```

### Field guide

A naturalist's plate: ivory stock with faint foxing, a ruled plate frame, a bookish serif with italics for names, earth inks.
Marks: flat earth inks, hairline outlines for containers (a gauge's tube), names of species in italics (`<em>`).

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..800;1,400..800&family=Alegreya+Sans:wght@400;500;700&display=swap">
```

```css
/* Kit: Field guide */
:root {
  --page: #cfcbbf; --paper: #f2f0e8; --ink: #22201b; --soft: #66615a; --rule: #d6d1c4;
  --accent: #a73703; --s2: #3a6b8f; --s3: #56644f; --quiet: #87847c;
  --display: Alegreya, "Iowan Old Style", Georgia, serif; --text: "Alegreya Sans", "Gill Sans", "Trebuchet MS", sans-serif;
}
.poster { box-shadow: inset 0 0 0 14px var(--paper), inset 0 0 0 15px var(--soft), inset 0 0 0 18px var(--paper), inset 0 0 0 19px var(--rule);
  background-image: radial-gradient(circle at 14% 22%, rgb(120 100 70 / .07), transparent 16%), radial-gradient(circle at 86% 78%, rgb(120 100 70 / .06), transparent 20%), radial-gradient(circle at 64% 8%, rgb(120 100 70 / .05), transparent 9%); }
.poster .kicker { font-size: 13px; letter-spacing: .18em; }
.poster .headline { font: 800 clamp(38px, 5.6vw, 54px)/1.02 var(--display); letter-spacing: -.01em; }
.poster .dek { font: 400 19px/1.45 var(--display); }
.poster .note { border-top: 0; font: italic 13px/1.5 var(--display); }
.poster .keys i { border-radius: 50%; }
.poster .choice button { border-color: var(--ink); font: 700 12px/1 var(--text); letter-spacing: .1em; text-transform: uppercase; }
@media (max-width: 640px) {
  .poster { box-shadow: inset 0 0 0 7px var(--paper), inset 0 0 0 8px var(--soft); }
}
```

### Luxury magazine

A fashion or travel monthly: bone stock with a linen weave, a high-contrast serif at large sizes, wide margins, letterspaced capitals, one deep color.
Marks: square-ended bars (`--rhp-radius: 0px`), the story in the deep red, the rest in petrol and grey, large italic numbers for the key value.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair:ital,opsz,wght@0,5..1200,300..800;1,5..1200,300..800&family=Urbanist:wght@400..700&display=swap">
```

```css
/* Kit: Luxury magazine */
:root {
  --page: #24211e; --paper: #f6f4ef; --ink: #15120f; --soft: #68625a; --rule: #ddd8ce;
  --accent: #8a1c2f; --s2: #a57d3d; --s3: #2f4b5f; --quiet: #898682;
  --display: Playfair, "Bodoni 72", Didot, "Times New Roman", serif; --text: Urbanist, "Avenir Next", "Century Gothic", sans-serif;
}
.poster { padding: 72px 80px 40px;
  background-image: repeating-linear-gradient(0deg, rgb(40 30 20 / .035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(40 30 20 / .035) 0 1px, transparent 1px 3px); }
.poster figcaption { gap: 18px; margin-bottom: 44px; }
.poster .kicker { font: 600 11px/1.6 var(--text); letter-spacing: .32em; color: var(--ink); }
.poster .kicker::before { content: ""; display: block; width: 56px; height: 1px; margin-bottom: 16px; background: currentColor; }
.poster .headline { font: 400 clamp(46px, 8.1vw, 78px)/.96 var(--display); letter-spacing: -.02em; max-width: 11em; }
.poster .headline em { color: var(--accent); }
.poster .dek { max-width: 42ch; font: italic 400 21px/1.45 var(--display); }
.poster .note { margin-top: 40px; border-top: 0; font: 500 11px/1.6 var(--text); letter-spacing: .04em; }
.poster .keys { font: 600 11px/1.3 var(--text); letter-spacing: .2em; text-transform: uppercase; }
.poster .keys i { width: 22px; height: 2px; vertical-align: 3px; }
.poster .choice button { min-width: 24px; margin: 0 20px 0 0; padding: 8px 0; border: 0; border-bottom: 1px solid transparent; font: 600 12px/1 var(--text); letter-spacing: .24em; text-transform: uppercase; color: var(--soft); }
.poster .choice button[aria-pressed="true"] { background: none; border-bottom-color: var(--ink); color: var(--ink); }
@media (max-width: 640px) {
  .poster { padding: 36px 20px 22px; }
  .poster figcaption { margin-bottom: 28px; }
  .poster .dek { font-size: 17px; }
}
```

### Sports page

A matchday programme: slanted extra-condensed capitals, speed stripes along the top, a jersey-mesh weave, racing orange and navy.
Marks: bars with a slanted end (`shape=${SLANT}` with `const SLANT = shape(["M", 0, 0], ["L", 1, 0], ["L", "-8px", 1], ["L", 0, 1], ["Z"])`), big tabular numbers, the leader in the accent.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:ital,wght@0,700..900;1,700..900&family=Sofia+Sans:ital,wght@0,400..800;1,800&display=swap">
```

```css
/* Kit: Sports page */
:root {
  --page: #c8cacb; --paper: #f3f3f0; --ink: #121418; --soft: #616468; --rule: #d5d6d4;
  --accent: #b83900; --s2: #1d3b8f; --s3: #257656; --quiet: #858686;
  --display: "Sofia Sans Extra Condensed", "Arial Narrow", Impact, sans-serif; --text: "Sofia Sans", "Segoe UI", Arial, sans-serif;
}
.poster { position: relative; padding-top: 58px;
  background-image: radial-gradient(rgb(0 0 0 / .05) 1px, transparent 1.4px), radial-gradient(rgb(0 0 0 / .05) 1px, transparent 1.4px);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.poster::before { content: ""; position: absolute; inset: 0 0 auto; height: 12px; background: repeating-linear-gradient(-60deg, var(--accent) 0 14px, transparent 14px 24px); }
.poster .kicker { font: italic 800 14px/1.2 var(--text); letter-spacing: .06em; }
.poster .headline { font: italic 900 clamp(54px, 8.75vw, 84px)/.86 var(--display); text-transform: uppercase; max-width: 13em; }
.poster .note { border-top: 3px solid var(--ink); font-weight: 500; }
.poster .keys { font: 800 13px/1.2 var(--text); letter-spacing: .04em; text-transform: uppercase; }
.poster .keys i { width: 18px; height: 10px; transform: skewX(-20deg); }
.poster .choice { gap: 4px; }
.poster .choice button { margin: 0; padding: 9px 14px; border: 0; background: var(--rule); font: italic 800 14px/1 var(--text); text-transform: uppercase; }
@media (max-width: 640px) {
  .poster { padding-top: 34px; }
  .poster::before { height: 8px; }
}
```

### Scientific figure

A journal's figure: white coated stock, a figure label, a plain sans for the figure and a serif for its caption, colors that hold for color-blind readers.
Marks: thin lines, small dots and square bars, the accent on what the finding is about, `n` and the method in the note.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400..700&family=STIX+Two+Text:ital,wght@0,400..700;1,400&display=swap">
```

```css
/* Kit: Scientific figure */
:root {
  --page: #e6e7e9; --paper: #ffffff; --ink: #1a1c1f; --soft: #63676d; --rule: #e1e3e6;
  --accent: #b45000; --s2: #3563d0; --s3: #18805f; --quiet: #8d8e8f;
  --display: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif; --text: var(--display); --caption: "STIX Two Text", "Times New Roman", serif;
}
.poster { max-width: 880px; border: 1px solid #d3d6da; background-image: linear-gradient(170deg, #ffffff 50%, #f6f7f8); }
.poster .kicker { width: fit-content; padding: 3px 8px; background: var(--ink); color: var(--paper); font-size: 12px; letter-spacing: .06em; }
.poster .headline { font: 700 clamp(26px, 3.6vw, 34px)/1.14 var(--display); letter-spacing: -.01em; max-width: 24em; }
.poster .dek { max-width: 66ch; font: 400 17px/1.5 var(--caption); color: var(--ink); }
.poster .note { font: 400 13px/1.5 var(--caption); }
.poster .keys { font-size: 13px; }
.poster .keys i { border-radius: 50%; }
.poster .choice button { border-color: #aab0b8; font-weight: 500; font-size: 13px; }
.poster .choice button:first-child { border-radius: 4px 0 0 4px; }
.poster .choice button:last-child { border-radius: 0 4px 4px 0; }
```

### Night instrument

A cockpit display after dark: graphite glass with a fine screen mesh, corner brackets, a typeface made for instruments, amber for what matters.
Marks: thin lines and small dots, cells from dark to bright (section 4), no glow: a flat bright color on a dark ground is already the brightest thing on the page.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=B612:wght@400;700&family=B612+Mono&display=swap">
```

```css
/* Kit: Night instrument */
:root {
  color-scheme: dark;
  --page: #070708; --paper: #121314; --ink: #e8eaec; --soft: #8f9499; --rule: #2e3134;
  --accent: #ffb020; --s2: #69ddfc; --s3: #d26eca; --quiet: #666769;
  --display: B612, "Segoe UI", system-ui, sans-serif; --text: var(--display); --mono: "B612 Mono", ui-monospace, Menlo, monospace;
}
.poster { position: relative; border-radius: 4px;
  background-image: radial-gradient(rgb(255 255 255 / .035) .6px, transparent .9px), radial-gradient(ellipse at 50% 0%, rgb(255 255 255 / .05), transparent 70%);
  background-size: 4px 4px, 100% 100%; }
.poster::before { content: ""; position: absolute; inset: 12px; border: 1px solid var(--soft); pointer-events: none;
  mask: conic-gradient(at 18px 18px, transparent 75%, #000 0) 0 0 / calc(100% - 18px) calc(100% - 18px); }
.poster .kicker { font: 400 12px/1.3 var(--mono); letter-spacing: .16em; }
.poster .headline { font: 700 clamp(30px, 4.6vw, 44px)/1.08 var(--display); letter-spacing: -.01em; }
.poster .note { border-top-style: dashed; font-size: 12px; }
.poster .keys { font: 400 12px/1.3 var(--mono); letter-spacing: .06em; text-transform: uppercase; }
.poster .keys i { width: 14px; height: 3px; vertical-align: 3px; }
.poster .choice button { border-color: var(--rule); font: 400 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--soft); }
.poster .choice button[aria-pressed="true"] { background: none; border-color: var(--accent); color: var(--accent); }
.poster :focus-visible { outline-color: var(--accent); }
@media (max-width: 640px) {
  .poster::before { inset: 6px; }
}
```

### Photocopied zine

A stapled fanzine: speckled copier paper with a dark copier edge, the headline cut out on a black strip, typewriter text, one hot pink.
Marks: black for most marks, pink for the one value that matters, dotted stems like a photocopied leader line.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Courier+Prime:wght@400;700&display=swap">
```

```css
/* Kit: Photocopied zine */
:root {
  --page: #3a3936; --paper: #f1f0ec; --ink: #121212; --soft: #62615d; --rule: #cfcdc8;
  --accent: #c30f59; --s2: #1f3fd1; --s3: #121212; --quiet: #848482;
  --display: Anton, Impact, "Arial Black", sans-serif; --text: "Courier Prime", "Courier New", monospace;
}
.poster { position: relative; box-shadow: inset 16px 0 22px -16px rgb(0 0 0 / .22);
  background-image: radial-gradient(rgb(0 0 0 / .3) .5px, transparent .9px), radial-gradient(rgb(0 0 0 / .22) .6px, transparent 1px), radial-gradient(rgb(0 0 0 / .26) .4px, transparent .8px), radial-gradient(rgb(0 0 0 / .18) .7px, transparent 1.1px);
  background-size: 23px 31px, 47px 37px, 61px 89px, 113px 71px; background-position: 0 0, 17px 9px, 31px 52px, 7px 40px; }
.poster::before { content: ""; position: absolute; top: 14px; left: 30px; width: 36px; height: 4px; border-radius: 1px; background: #8d8d8d; rotate: -6deg; }
.poster .rhp-chart { background-color: var(--paper); }
.poster .kicker { width: fit-content; padding: 3px 8px; background: var(--accent); color: var(--paper); letter-spacing: .08em; }
.poster .headline { width: fit-content; max-width: 100%; padding: .04em .18em .08em; background: var(--ink); color: var(--paper); font: 400 clamp(40px, 6.5vw, 62px)/1.06 var(--display); text-transform: uppercase; text-wrap: wrap; rotate: -1deg; }
.poster .dek { color: var(--ink); }
.poster .note { border-top: 2px dashed var(--ink); }
.poster .keys { font-size: 13px; font-weight: 700; }
.poster .keys i { border: 1.5px solid var(--ink); }
.poster .choice button { margin-left: -2px; border: 2px solid var(--ink); font-weight: 700; text-transform: uppercase; }
```

## 4. Color

- One accent for the story: the value the headline names, the series it is about.
  Everything else is quiet: the quiet color, ink, a tint of the accent, or an outline.
  A chart of one lit bar among rows of heavy mid-gray slabs is quiet in the wrong place: lighten the context marks to a tint (3:1 on the paper) or draw them as outlines, so the story is not outweighed.
- Color several series only when comparing them is the story, six at most; with more, label the marks directly and group the small ones as "Other" in the quiet color.
- Give meaning a second channel where it matters: filled against hollow, solid against dashed, a label.
- Never red against green as the only difference; use blue against orange for good and bad, up and down.
- The paper and the page stay quiet: near neutral, or the material's own color when it has one (section 2), and never a hue the marks use.

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
| light (`#f7f5f0`, white, the kits' papers) | `#3271c3` `#d65203` `#0d765a` `#743589` `#9a7d4e` `#b6487f` | 3.9 to 8.0:1 | 10.2 |
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
/* Dark: the Swiss grid kit after dark. The same tokens with dark values; THEME follows them. */
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark; --page: #0b0b0b; --paper: #161616; --ink: #f2f2ef; --soft: #a3a3a0; --rule: #333333;
    --accent: #ff5a4a; --s2: #e8e8e4; --s3: #6f9bff; --quiet: #6c6c69; }
  .poster { background-image: repeating-linear-gradient(90deg, rgb(255 255 255 / .04) 0 1px, transparent 1px calc(100% / 12)); }
}
```

## 5. Typography

The type takes its voice from the subject's own lettering: how the object of the idea (section 2) is printed, painted, stamped or displayed.
Choose the display face for that voice from all of Google Fonts, and a plain text face beside it.
The pairings the kits and the recipes use are below as examples of a voice; they are the ones a reader has already seen, so prefer a face of your own.

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
| headline, full width | 44 to 84px, condensed faces at the top of the range | 30 to 54px, two to five lines |
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
- **The rest muted.** Quiet marks, labels in ink at normal weight, secondary numbers in `var(--rhp-muted)`.
- **Direct labels before legends.** Names at the start of bars, at the end of lines (`Label at=${last} cross=${value}`), inside a segment when the number fits (hide it with a class when the segment is narrow, as `stacked-100` does).
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
  ink: "var(--foreground)", muted: "var(--muted-foreground)", grid: "var(--border)", surface: "var(--card)",
  series: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--muted-foreground)"],
});
```

   - shadcn/ui on Tailwind 3 stores bare numbers (`--foreground: 222 47% 11%`): wrap them, `"hsl(var(--foreground))"`.
   - With fixed colors only (a `tailwind.config` palette, a design token file), copy the hex values into the theme.
   - Check the app's colors like any other: shadcn/ui's default `--chart-4` and `--chart-5` are yellow and amber at 1.7:1 and 2.1:1 on white, so `appTheme` takes the first three and the muted foreground for the rest; run the checker in both of the app's themes.
3. **Keep the editorial habits that help any chart**: a title that states the finding, in the app's card-title style; a one-line description with the unit; direct labels; the source in small muted text at the foot; the app's primary color (or `--chart-1`) for the story.
4. **Leave out the poster's dress**: no kicker, no paper, no texture, no ornament, no display font, no page background.
   The app's card holds the chart, with the app's padding and radius, and the chart fills the card's width.
5. **Still design it for its subject.** The app fixes the palette and the type (decisions 4 and 5 of section 2).
   The idea, the marks and the composition inside the card are yours, and they are what keeps the chart from being a stock widget in the app's colors:
   - **The idea**, from the subject's own shape or object: storage as vessels filling toward their quotas, a release plan as the weeks it covers, depths hanging below a surface.
   - **The marks**, in the app's colors: each item's own outline, counted units, a container and its content.
     The story takes the app's primary color, and the context marks a tint of it (`color-mix(in oklab, var(--primary) 40%, var(--card))`, at 3:1 on the card or with an outline), not rows of mid-gray slabs.
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
| a background that shares the chart's hues (a blue page for blue bars) | the marks lose contrast and the page fights the data | neutral paper and page |
| a legend far from the data, or a legend for a single series | the eye travels back and forth | direct labels; a key right above the chart, in the marks' order |
| grid lines everywhere, a box around the plot | clutter that outweighs the data | a few hairlines along the value axis |
| centered paragraphs, sentences in capitals | slow to read | left-aligned text; capitals only for short labels |
| tiny or light grey type | unreadable on a phone | the sizes in section 5, the contrast floors in section 4 |
| a headline that only labels ("Sales by region") | the reader has to find the point | a headline that states the finding |
| false precision (12.3456%), mixed decimals in a column | noise that hides the comparison | two or three significant figures, the same decimals down a column |

# Looks: eight written out in full

Eight looks for an editorial poster, each written out in full: tokens, fonts, paper texture, type and one ornament.
Each goes on top of the base CSS and reads the tokens of design.md section 1, and each was tested on two recipes with the checker at 1280px and 390px.

They are worked examples, not a menu.
A look picked because it matches the topic (newsprint for anything in the news, a dark screen for anything technical) gives the chart the look every chart on that topic gets, and a reader sees the template.
A look is also only the palette and the type (decisions 4 and 5 of design.md section 2): the idea, the marks and the composition are not in it.
So write the look for your subject, and take from these what is hard to get right: paper and ink values that pass the contrast floors, a texture, the CSS of a key or a button group.
design.md section 3 says how a look goes onto a page.

| Look | The object it is taken from | Tested on |
|---|---|---|
| Broadsheet | a newspaper's front page | bar, diverging-bars |
| Swiss grid | a 1960s typographic poster | stacked-100 (light and dark), stacked-bars |
| Field guide | a naturalist's plate | column, waffle |
| Luxury magazine | a fashion monthly's feature page | donut, waterfall |
| Sports page | a matchday programme | race, grouped-bars |
| Scientific figure | a journal's figure | pyramid, sparklines |
| Night instrument | a cockpit display after dark | heatmap, area |
| Photocopied zine | a stapled fanzine | lollipop, radial-bars |

## Broadsheet

Newsprint with a fine halftone, black ink and one spot blue, a condensed serif headline under the masthead's double rule.
Marks: flat, square-ended bars (`--rhp-radius: 0px`), the story in the spot blue, a second series in orange, the rest grey.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400..800&family=Noto+Serif+Display:wdth,wght@62.5..100,500..800&display=swap">
```

```css
/* Look: Broadsheet */
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

## Swiss grid

The International Typographic Style: white stock with its twelve columns showing faintly, one strict left edge, a large grotesk, red and black.
Marks: thick square bars, red for the story, black (`series-2`) for a second series, grey for the rest.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400..800&display=swap">
```

```css
/* Look: Swiss grid */
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

## Field guide

A naturalist's plate: ivory stock with faint foxing, a ruled plate frame, a bookish serif with italics for names, earth inks.
Marks: flat earth inks, hairline outlines for containers (a gauge's tube), names of species in italics (`<em>`).

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..800;1,400..800&family=Alegreya+Sans:wght@400;500;700&display=swap">
```

```css
/* Look: Field guide */
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

## Luxury magazine

A fashion or travel monthly: bone stock with a linen weave, a high-contrast serif at large sizes, wide margins, letterspaced capitals, one deep color.
Marks: square-ended bars (`--rhp-radius: 0px`), the story in the deep red, the rest in petrol and grey, large italic numbers for the key value.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair:ital,opsz,wght@0,5..1200,300..800;1,5..1200,300..800&family=Urbanist:wght@400..700&display=swap">
```

```css
/* Look: Luxury magazine */
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

## Sports page

A matchday programme: slanted extra-condensed capitals, speed stripes along the top, a jersey-mesh weave, racing orange and navy.
Marks: bars with a slanted end (`shape=${SLANT}` with `const SLANT = shape(["M", 0, 0], ["L", 1, 0], ["L", "-8px", 1], ["L", 0, 1], ["Z"])`), big tabular numbers, the leader in the accent.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:ital,wght@0,700..900;1,700..900&family=Sofia+Sans:ital,wght@0,400..800;1,800&display=swap">
```

```css
/* Look: Sports page */
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

## Scientific figure

A journal's figure: white coated stock, a figure label, a plain sans for the figure and a serif for its caption, colors that hold for color-blind readers.
Marks: thin lines, small dots and square bars, the accent on what the finding is about, `n` and the method in the note.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400..700&family=STIX+Two+Text:ital,wght@0,400..700;1,400&display=swap">
```

```css
/* Look: Scientific figure */
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

## Night instrument

A cockpit display after dark: graphite glass with a fine screen mesh, corner brackets, a typeface made for instruments, amber for what matters.
Marks: thin lines and small dots, cells from dark to bright (section 4), no glow: a flat bright color on a dark ground is already the brightest thing on the page.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=B612:wght@400;700&family=B612+Mono&display=swap">
```

```css
/* Look: Night instrument */
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

## Photocopied zine

A stapled fanzine: speckled copier paper with a dark copier edge, the headline cut out on a black strip, typewriter text, one hot pink.
Marks: black for most marks, pink for the one value that matters, dotted stems like a photocopied leader line.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Courier+Prime:wght@400;700&display=swap">
```

```css
/* Look: Photocopied zine */
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

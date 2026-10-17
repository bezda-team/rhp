# Acid-rain pollution and electricity

An environmental poster comparing sulfur dioxide emissions and electricity generation at U.S. power plants in EPA's ARP/CSAPR SO2 comparison from 2000 to 2023.
The headline states the measured result: 94% less sulfur dioxide with approximately 2% less electricity.

- `acid-rain.html` is the original dark poster.
- `acid-rain-glass.html` is the alternate with an embedded realistic rain-on-glass background.
- `acid-rain-glass-normal.html` keeps the original dark poster's layout and spacing with the same rain-on-glass background.
- `acid-rain-glass-animated.html` is the live gallery version, adding sparse refracting droplets, occasional slow runs and fading trails to that same layout.
- The matching PNG files are full-poster exports at twice the displayed resolution, saved with the pages' actual download buttons.
- `data.json` contains the calculated totals, indices, scope and claims.
- `source-snapshot.json` preserves the original EPA numeric arrays and provenance.
- `post.txt` contains a Reddit title and source/tools comment draft.
- `research.txt` documents the primary sources, topic selection and limited interest evidence.
- `artwork-credits.json` and `image-prompt.txt` identify the photographic background and its generation prompt.

Open any of the HTML files directly in a browser.
The fonts, background image and data are embedded; rhp and the PNG exporter load from pinned CDN versions.
Point, tap, or use the chart's arrow-key navigation to inspect a year.
The selected dots show percentage change since 2000, with permanent final-year labels kept at the ends of both lines.
Label positions are calculated once for the current layout, preferring 5px above each stroke and falling below when that would cover another line, dot or label.
They switch smoothly to the left at 2021, the third-to-last point, and their placements are recalculated when the layout changes.
The side switch slides from the label's previous screen position to its new position, with clearance checked only on the side where it is displayed.
When an obstacle blocks part of the horizontal slide, only that part is shortened, so both directions animate without changing the label's height.
The year and sulfur readout reserve fixed widths so the values stay in place as the selected year changes.
The download icon saves the current poster at twice its CSS resolution.
The animated version includes a pause button, starts still when reduced motion is preferred, and pauses when offscreen or hidden.
PNG downloads briefly freeze the rain and include its current frame.
The effect uses a small WebGL overlay, with the original photograph as the fallback when WebGL is unavailable.
Droplets have uneven outlines, stretch while sliding, leave cleared wet trails and settle gradually.
Each drop leaves a trail with a stable randomized width between the original width and twice as wide.
Each drop keeps its own randomized lighting direction from below, with a deep shadow across its upper half.

```sh
node examples/real/acid-rain/fetch-data.mjs --offline
node examples/real/acid-rain/build.mjs
node examples/real/acid-rain/label-clearance.test.mjs
node examples/real/acid-rain/label-motion.test.mjs
node examples/real/acid-rain/rain-on-glass.test.mjs
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain.html --widths 1280,1024,768,390,360,320
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain-glass.html --widths 1280,1024,768,390,360,320
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain-glass-normal.html --widths 1280,1024,768,390,360,320
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain-glass-animated.html --widths 1280,1024,768,390,360,320
```

Omit `--offline` to fetch a new source snapshot.
The fetcher validates the historical window and headline arithmetic instead of accepting changed source shapes silently.
These are program-covered units with changing membership, not all U.S. electricity or a fixed plant panel.
SO2 emissions, wet sulfate deposition and ecosystem recovery are separate measures.

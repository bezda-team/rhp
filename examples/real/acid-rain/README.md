# Acid-rain pollution and electricity

An environmental poster comparing sulfur dioxide emissions and electricity generation at U.S. power plants in EPA's ARP/CSAPR SO2 comparison from 2000 to 2023.
The headline states the measured result: 94% less sulfur dioxide with approximately 2% less electricity.

- `acid-rain.html` is the original dark poster.
- `acid-rain-glass.html` is the alternate with an embedded realistic rain-on-glass background.
- `acid-rain-glass-normal.html` keeps the original dark poster's layout and spacing with the same rain-on-glass background.
- The matching PNG files are full-poster exports at twice the displayed resolution, saved with the pages' actual download buttons.
- `data.json` contains the calculated totals, indices, scope and claims.
- `source-snapshot.json` preserves the original EPA numeric arrays and provenance.
- `post.txt` contains a Reddit title and source/tools comment draft.
- `research.txt` documents the primary sources, topic selection and limited interest evidence.
- `artwork-credits.json` and `image-prompt.txt` identify the photographic background and its generation prompt.

Open any of the HTML files directly in a browser.
The fonts, background image and data are embedded; rhp and the PNG exporter load from pinned CDN versions.
Point, tap, or use the chart's arrow-key navigation to inspect a year.
The download icon saves the current poster at twice its CSS resolution.

```sh
node examples/real/acid-rain/fetch-data.mjs --offline
node examples/real/acid-rain/build.mjs
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain.html --widths 1280,1024,768,390,360,320
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain-glass.html --widths 1280,1024,768,390,360,320
node mcp/bin/rhp-mcp.js check examples/real/acid-rain/acid-rain-glass-normal.html --widths 1280,1024,768,390,360,320
```

Omit `--offline` to fetch a new source snapshot.
The fetcher validates the historical window and headline arithmetic instead of accepting changed source shapes silently.
These are program-covered units with changing membership, not all U.S. electricity or a fixed plant panel.
SO2 emissions, wet sulfate deposition and ecosystem recovery are separate measures.

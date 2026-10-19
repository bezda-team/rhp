ORBITAL TRAFFIC, VINTAGE FONT STUDIES

The selected poster is orbital-retro-animated.html, using Michroma for text and Atomic Age for the large numbers.
orbital-retro.html is the static composition used to build the animated poster and the two motion experiments.
The font comparison page is fonts.html.
It compares three complete posters using Michroma, Oxanium and Orbitron for all text.
The large headline percentages retain Atomic Age in all three.
Each study has an interactive HTML file and a PNG exported by its own download control.
The atlas, field-guide, cinematic and original dot-chart files are earlier design studies, not gallery entries.

The composition uses a clipped Earth, realistic illustrative miniature hardware and curved altitude guides.
The same background extends behind the controls, readout and orbital diagram.
The readout contains the category legend above two equal band columns, with stable positions for counts and percentages.
Radial positions use representative altitudes from the actual catalogue, while angular placement avoids statistics and guide labels.
Each miniature summarizes approximately 750 records, rounded separately by band and category.
Earth size and object sizes are illustrative and do not share the altitude scale.

DATA

Run from the repository root:
python3 examples/real/orbital-traffic/analyze.py
node examples/real/orbital-traffic/build.mjs
node examples/real/orbital-traffic/build-earth-motion.mjs

analyze.py validates the frozen catalogue's SHA-256 and reproduces data.json and summary.csv.
source-snapshot.json records the primary source and retrieval date.
research.txt records the audience question, observed Reddit interest, sources and limitations.
post.txt contains the copyable title, body and first-comment draft.

PREVIEW

Serve the repository root, for example:
python3 -m http.server 4398 --bind 127.0.0.1

Open:
http://127.0.0.1:4398/examples/real/orbital-traffic/orbital-retro-animated.html

The HTML embeds its fonts and raster artwork.
It loads rhp 2.0.5 from jsDelivr and loads modern-screenshot on the first download.
The download saves the current state at twice the full poster dimensions, including while the viewing scale is fitted.
The fit control uses the shared stable-viewport utility.
Pausing over an image for 700 ms shows its representative altitude and category definition.
Tapping or focusing an image opens the same card immediately.
Escape, a tap elsewhere or leaving the image closes the card without clearing the selected category.
The cream card uses the title area's palette and fixed text sizes, including when the poster is fitted.

VERIFY

node mcp/bin/rhp-mcp.js check examples/real/orbital-traffic/orbital-retro.html --widths 1280,1024,768,390,360,320

node examples/real/orbital-traffic/verify.mjs /tmp/orbital-validation orbital-retro "Michroma"
node examples/real/orbital-traffic/verify-tooltip.mjs /tmp/orbital-tooltips
node examples/real/orbital-traffic/verify-tooltip-export.mjs /tmp/orbital-tooltip-exports

The verification checks all 34 representative radial altitudes, consistent text families, mouse selection, keyboard navigation, touch, fitted-scroll stability and selection preservation during actual PNG downloads.
It compares downloads against browser screenshots in Chromium, Firefox and WebKit.
A one-CSS-pixel raster edge-rounding difference is allowed, and the overlapping image area must have a mean RGB-channel difference below 7 on a 0 to 255 scale.
validation.json records the final checks and export dimensions.

ARTWORK AND FONTS

The Earth, space texture and hardware are generated illustrative artwork.
The retro-futuristic spacecraft are generic symbols, not depictions of particular catalogue objects.
cutout-credits.json contains the generation prompts and provenance.
artwork-credits.json records the original dot-chart background study.
Full generated rasters are retained beside smaller web derivatives.
Font license files accompany each bundled family in assets.
The font families come from the Google Fonts source repository.

The selected poster is the sixth entry in the website's Posters section.
Gallery URL: https://rhp.vercel.app/gallery/real-posters/orbital-traffic/
The gallery adds its navigation, fit and download controls, and a visitor count that deduplicates browsers.
No Reddit submission has been sent.

EARTH ROTATION EXPERIMENTS

Build the two standalone experimental pages from the current selected poster:
node examples/real/orbital-traffic/build-earth-motion.mjs

http://127.0.0.1:4398/examples/real/orbital-traffic/orbital-retro-rotating-earth.html
Rotates a new day/night Earth cutout, including its painted lighting and city lights.

http://127.0.0.1:4398/examples/real/orbital-traffic/orbital-retro-fixed-light.html
Maps separate, matching 2:1 painted day and night textures onto a sphere with stationary lighting.
Only the surface orientation changes; the globe and orbital guides keep their positions.
The circular rim matches the printed cutout's transparent margin and visible cap height.

The production poster uses the fixed-light experiment without the experiment navigation.
The production page and both experiments take five minutes per turn at 1x speed.
Their controls below the poster include a rotation scrubber, a speed slider from 0.25x to 3x, and a pause button.
They pause while hidden, outside the viewport, or downloading a PNG.
Downloading freezes the current orientation immediately, disables the motion controls during capture, and then restores the requested play state.
An Earth that was already paused stays paused after downloading.
Reduced motion starts them paused, with an explicit Play Earth control.
The existing PNG utility captures the current Earth orientation and selected category.
Without WebGL, the fixed-light experiment shows the static cutout and explains that animation is unavailable.
earth-motion-credits.json records the built-in image-generation prompts and assets.

node examples/real/orbital-traffic/verify-earth-motion.mjs

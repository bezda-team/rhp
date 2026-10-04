# rhp: reactive html plots

rhp builds charts out of HTML elements placed by CSS, with [SolidJS](https://www.solidjs.com), instead of drawing them into an SVG or a canvas.
You describe one **slat**, the template for one row of data, from a few **blocks** (Bar, Dot, Tick, Label, Cell, Place, Area and Line), and rhp draws a slat for every row and keeps each one in its place.
When a value changes, only what reads it runs again, and a block writes only the CSS variables that changed.

**Guides, reference and a gallery of live charts: https://rhp.vercel.app**

## Install

```sh
npm install @bezda/rhp
```

Solid is its only peer dependency, and there is no stylesheet to import: rhp adds its CSS when the first chart appears.
A Solid app's build (Vite, SolidStart, Astro) compiles rhp's source with the app.
Anywhere else the package picks a ready build: one for browsers, and one for Node, Deno and workers that draws charts on a server.

- **No build step:** import `@bezda/rhp/standalone` from a CDN, one module with Solid included (36 kB gzipped); [Install](https://rhp.vercel.app/start/install/#in-a-plain-html-page) shows a whole page.
- **React:** `@bezda/rhp-react`, in [`react/`](react/), turns an rhp chart into a React component.

## Example

A bar chart, as a Solid app's `App.jsx` ([Install](https://rhp.vercel.app/start/install/#in-a-new-project) starts a new app):

```jsx
import { Chart, Plot, Bar, Label, slat } from "@bezda/rhp";

const Fruit = slat({ thickness: 32, room: { start: 80, end: 40 } }, (d) => (
  <div>
    <Label edge="start">{d.name}</Label>
    <Bar to={d.sold} />
    <Label at={d.sold}>{d.sold}</Label>
  </div>
));

export default function App() {
  return (
    <Chart scale={[0, 30]}>
      <Plot name={["Apples", "Bananas", "Cherries"]} sold={[12, 18, 7]}>{Fruit}</Plot>
    </Chart>
  );
}
```

Each prop of the Plot is a column of data, and each slat reads its row's values as `d.name` and `d.sold`.
[Your first chart](https://rhp.vercel.app/start/first-chart/) builds this up step by step.

## Good to know

- Charts are plain DOM with no shadow root: `querySelector`, Testing Library and your page's event listeners all work.
- A slat's CSS reaches only its own slats, and the page's CSS can't change a chart's layout.
- `slat(settings, fn)` returns a new function, the slat type, and leaves `fn` as it was, so one function can make several slat types with different settings.
  Give the Plot what `slat()` returns: `fn` itself carries no settings.

## Make charts with an AI agent

rhp comes with an Agent Skill and a checker, so an AI coding agent that has never seen rhp can make an rhp chart in one go.

- **The skill** ([`skills/rhp/`](skills/rhp/)) teaches the agent how a chart is built, gives it 30 tested chart pages to start from, and makes it check its work. `npx skills add bezda-team/rhp` installs it into Claude Code, Codex, Cursor, Copilot, Gemini CLI and other agents.
- **The checker** ([`mcp/`](mcp/)) renders a chart in a browser at desktop and phone widths and reports what a reader would hit, with a fix for each: `npx -y @bezda/rhp-mcp check chart.html`. With no arguments it is an MCP server with the same check.
- **Claude Code** installs both with `/plugin marketplace add bezda-team/rhp`, then `/plugin install rhp@rhp`.

[Build with AI](https://rhp.vercel.app/ai/) on the website has the setup for each tool and a prompt for chat apps.

## What's in the package

| File | |
|---|---|
| `dist/index.js` | the browser build, one ES module, with Solid left to the app |
| `dist/server.js` | the same for a server |
| `dist/source/` | the source, for a Solid app's own build (the `solid` export condition) |
| `dist/standalone.js` | rhp and Solid in one module, for pages with no build step |
| `dist/rhp.css` | rhp's stylesheet, for a page that links it once itself (`linkedCss()`) |
| `dist/posters.css` | the gallery's poster looks, for `<Poster>` (optional) |

## Development

You need Node 22 or later.

```sh
npm install
npx playwright install    # the browsers the tests run in
npm run build             # dist/
npm test                  # builds the test pages and checks them in Chromium
```

| | |
|---|---|
| `npm run build` | writes `dist/` |
| `npm test` | checks the types with `tsc`, then the test pages in Chromium with Playwright. `BROWSER=webkit` or `BROWSER=firefox` runs them in that engine; CI runs all three on every pull request and on `master`. |
| `npm run gallery` | `examples/gallery/out/slat-gallery.html`, a page of plots the tests also check |
| `bench/` | rhp against eleven other chart libraries: see [`bench/README.md`](bench/README.md) |

The code:

| | |
|---|---|
| `src/plot.jsx` | Chart, Plot, Scale, Axis and Theme |
| `src/blocks.jsx` | the blocks |
| `src/style.js` | how CSS gets into the page: `slat()`, `restyle()`, scoping a slat's CSS, and the CSS a server writes |
| `src/rhp.css` | the core CSS; `gutters.css` and `cross.css` are added when a chart first needs them |
| `src/frame.js`, `src/animate.js` | when changes are written, and the JS version's clock |
| `src/data.js`, `src/shape.js` | the data helpers and `shape()` |
| `src/poster.jsx`, `src/posters.css` | Poster and its looks |
| `test/run.mjs` | every check, including an app drawn on a server and taken over in the browser, and a Vite app built from rhp's source |

The AI kit has its own checks: `npm install` and `npm test` in `mcp/` run the checker against a set of broken charts, the gallery's examples and every recipe in `skills/rhp/recipes/`.

### Releasing

1. Set the new version in `package.json` and `react/package.json` (and the `@bezda/rhp` version that `react/` depends on).
2. Run `npm test`, `BROWSER=webkit npm test` and `BROWSER=firefox npm test`.
3. `npm publish`, then `npm publish` in `react/` (each builds first).
4. In `mcp/`, publish the checker with the new rhp ("Publishing" in [mcp/README.md](mcp/README.md)), so it checks charts against the rhp that jsDelivr now serves.
5. In [rhp-documentation](https://github.com/bezda-team/rhp-documentation), `npm run sync-rhp` takes the new build for the website, and `npm run sync-skill` the skill.

## History

Version 2 is a rewrite of v1 ("react html plots"), a React library in three packages; v1's code is on the [`v1` branch](https://github.com/bezda-team/rhp/tree/v1).

## License

MIT, see [LICENSE](LICENSE).
Some files came from elsewhere and keep their own licenses: see [CREDITS.md](CREDITS.md).

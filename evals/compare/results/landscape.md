# Charting libraries with AI tooling for coding agents: the landscape around rhp 2.0.2

Snapshot date: 2026-10-05. Scope: JavaScript charting and data-viz libraries first, plus the notable Python ones, and the official AI tooling each ships for coding agents: MCP servers, Agent Skills (SKILL.md style) and, as a weaker signal, llms.txt.

## 1. Bottom line

- **Few libraries ship both an official Skill and an official MCP server.** The ones that do: ApexCharts, amCharts 5, AntV (but its MCP servers need remote services), Semiotic, Microsoft Flint (skills bundled in the MCP), LightningChart (needs a license key), AG Grid/AG Charts (docs come from ag-grid.com), shadcn/ui (general UI, charts are a small part) and, in Python, Vizro.
- **Most official tooling is knowledge only**: docs search, references and examples (amCharts, AG, MUI, Mantine, Adobe Spectrum Charts, LightningChart, DevExpress, Kendo, Syncfusion, AntV skills). ApexCharts adds static validation of a config (39 rules, with fixes) but never renders.
- **Official tools that render a chart and hand the image back to the agent:** Microsoft Flint (local, inline PNG or SVG), Semiotic (local, SVG or PNG plus a "render evidence" JSON), and Highcharts Render (PNG, hosted only). The official ECharts MCP renders locally but returns only a file path. AntV's and VChart's MCP servers render on remote services.
- **None of the official tools surveyed renders the agent's whole HTML page in a real browser at several widths and tries its interactions.** That is what the rhp-mcp checker does. The others render one chart spec at a time on a server.
- **Verified running offline in this sandbox** (installed from npm, started over stdio, one tool called): `apexcharts-mcp`, `@amcharts/amcharts5-mcp`, `flint-chart-mcp` (returned a PNG), `semiotic-mcp` (returned a PNG and render evidence), `apache/echarts-mcp` (fetched from raw.githubusercontent.com; wrote a PNG to disk) and the community `mcp-echarts` (returned a PNG). **Failed:** `@antv/mcp-server-chart`, whose remote render service returned HTTP 403.
- **Recommended head-to-head competitors:** ApexCharts, AntV Infographic, Semiotic, Microsoft Flint and amCharts 5. Official ECharts tooling is an optional "minimal tooling" control. Highcharts cannot run here because all of its MCP servers are hosted.

## 2. How this was checked

- **npm registry** (`npm view`, `npm pack`): names, versions, publish dates of the latest version (not `time.modified`, which AntV bulk-touched on 2026-09-21), maintainers and repository URLs. I also unpacked the tarballs to read tool registrations, look for headless-browser or remote URLs, and measure skill sizes.
- **raw.githubusercontent.com:** READMEs, SKILL.md files, Claude plugin manifests and server sources.
- **GitHub search through the GitHub MCP tool:** official repos per org (apache, antvis, apexcharts, amcharts, highcharts, ag-grid, VisActor, Lightning-Chart, observablehq, vega, plotly, nteract, microsoft, mckinsey) and SKILL.md files.
- **PyPI JSON API** for the Python packages.
- **WebSearch** for vendor pages, which are blocked here (highcharts.com, echarts.apache.org, ag-grid.com, mui.com and others). Claims that rest only on search summaries are marked "(per vendor page)".
- **Live probes** (scripts in `scratchpad/mcptest/`): a small stdio MCP client runs `initialize`, then `tools/list`, then one `tools/call`.
- **Network facts in this sandbox:** the npm registry, PyPI, Google Fonts and raw.githubusercontent.com work. jsDelivr, unpkg, `*.highcharts.ai`, `antv-studio.alipay.com`, echarts.apache.org and the other vendor sites are blocked. The node-canvas prebuilt binary, which comes from GitHub Releases, did download here, but a stricter npm-only environment may block it.

## 3. Baseline: what rhp ships

| | |
|---|---|
| Library | `@bezda/rhp` 2.0.2 (published 2026-10-05), MIT, repo bezda-team/rhp |
| MCP | `@bezda/rhp-mcp` 0.1.0 (2026-10-05), MIT. Four tools: `rhp_guide`, `rhp_reference`, `rhp_recipe`, `rhp_check`. Also a CLI, `npx -y @bezda/rhp-mcp check chart.html` |
| Skill | `npx skills add bezda-team/rhp`, also packaged as a Claude Code plugin. SKILL.md (32 KB), 6 references and 30 recipe pages |
| Feedback | The checker renders the agent's `.html`, Solid/React component or module in a browser (playwright-core) at 1280 px and 390 px. It tries interactions and reports each problem with a fix, plus screenshots returned as images. It needs a local Chromium. |

Source: README of the npm package `@bezda/rhp-mcp` 0.1.0 and the repo's `skills/rhp`.

## 4. Landscape: JavaScript libraries with official agent tooling

Legend for the last column:
- **Yes:** runs fully locally with no account or key, using only npm, PyPI, raw GitHub or Google Fonts.
- **Partly:** some parts need a blocked remote service.
- **No:** needs a remote service, or an account or API key.

"Verified" means I ran it here.

| Library (license) | Tool (type) | Package / repo | Official? (evidence) | Latest (date) | What the tools do | Renders? Feedback to the agent | Offline, no account? |
|---|---|---|---|---|---|---|---|
| **rhp** (MIT), the baseline | Skill + MCP + CLI | `@bezda/rhp-mcp`; skill `bezda-team/rhp` | Official (bezda-team repo) | 0.1.0 (2026-10-05) | guide, reference, recipe, check | **Yes.** Real browser, whole page, 2 widths, interactions, screenshots | Yes (needs Chromium) |
| **ApexCharts**. Dual license: Community is free only for organizations under $2M; premium features show an "APEXCHARTS" watermark without a key | Skill | `apexcharts-skill` (npm), github.com/apexcharts/apexcharts-skill | Official (apexcharts org; npm maintainer junedchhipa, the author) | 3.1.0 (2026-09-29) | SKILL.md 48 KB + 10 references (~240 KB) + `.cursorrules`. Targets v7, 28 chart types, pitfalls, bundle tiers | No | Yes |
| ApexCharts | MCP | `apexcharts-mcp` (npm), github.com/apexcharts/apexcharts-mcp | Official | 0.9.1 (2026-09-29) | 23 tools: `apexcharts_list_products`, `apexcharts_list_types`, `apexcharts_generate_config`, `apexcharts_validate_config` (39 rules), `apexcharts_get_reference`, plus `{apexgantt,apextree,apexsankey,apexgrid,apexstock,apexmaps}_{generate_config,validate_config,get_reference}` | **No rendering.** Static JSON validation with fixes. The vendor site says the MCP can "render charts… return live output", but v0.9.1 contains no renderer | Yes (verified) |
| ApexCharts | llms.txt | apexcharts.com/llms.txt, llms-full.txt | Official | – | docs | – | blocked here |
| **Highcharts**. Commercial use needs a Highsoft license; non-commercial use is free under the Highsoft EULA | 3 hosted MCPs | Dev Assist `https://mcp.highcharts.ai/developers/mcp`; Render `https://mcp.highcharts.ai/export/mcp`; Chartchooser `https://chartchooser-mcp.highcharts.ai/mcp`. No npm package, no public repo | Official (highcharts.com/mcp, Highcharts blog) | hosted (2026) | **Dev Assist:** chart recommendation, docs search, code snippets, chart-type specs, `validate_config` against the official schema. **Render:** `render_chart` (config to PNG; width, height, scale). **Chartchooser:** guided questions that end in a complete Highcharts HTML file (claude.ai and Claude Desktop only) (per vendor page) | Render returns a PNG from a hosted headless Chromium | **No.** Remote only; connection rejected here. Open access, no key |
| **Apache ECharts** (Apache-2.0) | MCP | github.com/apache/echarts-mcp. Not on npm; the npm package `echarts-mcp` is an unrelated one by w2xi | Official (apache org; `package.json` author is "Apache ECharts Team") | repo v1.0.0, last push 2026-09-30 | **One tool, `get-chart`**: title, type (bar, line, pie, scatter, funnel, tree, treemap or sunburst), seriesName, data and axis names. The theme is fixed by the server | Renders a PNG on the server (node-canvas) and saves it to a local folder (the default; Baidu Cloud BOS is optional). Returns a **file path as text**, not the image | Yes (verified) |
| ECharts | llms.txt | echarts.apache.org/en/llms.txt, generated by apache/echarts-doc `build/build-llms.js` | Official | – | Option and API docs as Markdown | – | blocked here |
| ECharts (community) | MCP | `mcp-echarts` (npm), hustcc/mcp-echarts (269★) | **Community.** Personal repo of hustcc (atool on npm), a lead AntV developer, not under the apache org | 0.7.1 (2026-01-30) | 18 tools: `generate_echarts` (any option) + 17 typed tools (area, bar, boxplot, candlestick, funnel, gauge, graph, heatmap, line, parallel, pie, radar, sankey, scatter, sunburst, tree, treemap) | **Yes.** Local `@napi-rs/canvas`; returns a PNG image, SVG or the option; validates options | Yes (verified) |
| **AntV** (G2, G6, X6, GPT-Vis, Infographic, T8; all MIT) | MCP | `@antv/mcp-server-chart`, antvis/mcp-server-chart (4.4k★) | Official (antvis org) | 0.9.10 (2026-02-25) | 27 `generate_*` tools: area, bar, boxplot, column, dual_axes, fishbone, flow, funnel, histogram, line, liquid, mind_map, network_graph, organization_chart, pie, radar, sankey, scatter, treemap, venn, violin, waterfall, word_cloud, spreadsheet and 3 maps | Returns an **image URL** from the remote service `antv-studio.alipay.com/api/gpt-vis` (default). You can self-host `@antv/gpt-vis-ssr` (node-canvas). Maps use AMap, China only | **No** (verified: HTTP 403 here) |
| AntV | MCP (docs) | `@antv/mcp-server-antv` | Official | 0.1.8 (2026-04-27) | `extract_antv_topic`, `query_antv_document` (docs for G2, G6, F2) | No | No (calls context7.com and the DeepWiki MCP) |
| AntV | 8 Skills + CLI | antvis/chart-visualization-skills (505★); npm `@antv/chart-visualization-skills` (CLI `antv retrieve`) | Official | repo push 2026-09-22; npm 0.1.5 (2026-07-31) | Skills: `chart-visualization`, `antv-g2-chart` (12 KB), `antv-g6-graph`, `antv-x6-editor`, `antv-gpt-vis`, `antv-infographic` (12 KB), `antv-t8-ntv`, `icon-retrieval` | `chart-visualization` posts to the same remote render API. The others only generate code | Partly. Skill text works. `chart-visualization`, `icon-retrieval` and G2 doc retrieval call remote APIs. The G2, GPT-Vis and Infographic skills hard-code unpkg script tags. Vector search in the CLI downloads a HuggingFace model |
| **AntV Infographic** | 5 Skills | antvis/Infographic `skills/` (6.9k★ repo); Claude plugin `antv-infographic-skills@antv-infographic` | Official | lib `@antv/infographic` 0.2.20 (2026-08-19); plugin 0.2.14 | `infographic-creator` (writes an HTML page; 15.6 KB, in Chinese), `infographic-syntax-creator` (+ 14.8 KB prompt), `-structure-creator` (+ 29.6 KB), `-item-creator` (+ 23.5 KB), `-template-updater`. About 200 templates in a DSL | No checker; the page renders SVG in the browser | Partly. Skills and library are local, but at runtime the library fetches **icons from weavefox.cn** and **fonts from assets.antv.antgroup.com** (`registerResourceLoader` can override). The skill points at unpkg |
| **VisActor VChart** (MIT) | MCP | `@visactor/vchart-mcp-server` | Official (VisActor org) | 0.1.4 (2025-07-14; stale) | `generate_*` tools: the README groups them as cartesian, polar, hierarchical, progress, wordcloud/venn, range column, dual axis, scatter, sankey and heatmap; the package contains 25 `generate_*` names. Output can be image, spec or html | Image and HTML come from the remote `vmind.visactor.com/export` (configurable); spec is local | Partly (spec only) |
| VisActor | Skill | VisActor/chart-assistant-skill | Official | 2026-09 | DSL for the Feishu (Lark) "Chart Assistant" product, with a validator script | No standalone renderer | Only useful inside Feishu |
| **amCharts 5**. Linkware: free, including commercial use, while the amCharts branding link stays; a paid license removes it | MCP | `@amcharts/amcharts5-mcp`, amcharts/amcharts5-mcp. Also hosted at `https://mcp.amcharts.com/mcp` | Official (amcharts GitHub account; npm maintainers are the amCharts team, e.g. martynasma) | 1.6.0 (2026-09-29) | 11 tools: `list_chart_types`, `get_chart_reference`, `get_core_reference`, `get_quick_start`, `search_docs`, `search_all`, `get_doc`, `get_section`, `get_api_reference`, `list_examples`, `get_example`. Over 1,500 docs, examples and API pages bundled (9.4 MB) | No (docs only) | Yes (verified). Quick-starts use `cdn.amcharts.com` script tags; bundle the npm ESM build instead |
| amCharts 5 | Skill | amcharts/amcharts5-skill (`amcharts5-skill/SKILL.md`) | Official | push 2026-09-29 | SKILL.md 68 KB + per-chart references (~330 KB). There is also amcharts.com/llms.txt | No | Yes |
| **Semiotic** (Apache-2.0; React) | MCP + Skill + CLI + llms.txt | `semiotic` (npm; bins `semiotic-mcp`, `semiotic-ai`), nteract/semiotic (2.7k★) `agent-skill/semiotic-charts` | Official (nteract org; the MCP ships inside the library package) | 3.12.0 (2026-10-01) | 24 tools over stdio: `getSchema`, `suggestChart(s)`, `renderChart`, `diagnoseConfig`, `evaluateChart`, `auditAccessibility`, `auditMobileVisualization`, `repairChartConfig`, `proposeChartVariants`, `applyTheme`, `interrogateChart`, `groundChart`, dashboard and stream suggesters, artifact-contract tools. Skill is 8 KB | **Yes.** `renderChart` returns SVG, or PNG through the optional `sharp`, plus **render-evidence JSON** (mark counts, domains, empty flag, annotations). Also static diagnostics and audits | Yes (verified PNG + evidence) |
| **Microsoft Flint** (MIT). A semantic chart language that compiles to Vega-Lite, ECharts, Chart.js, Plotly and Excel | MCP + Skills | `flint-chart-mcp` + `flint-chart` (npm), microsoft/flint-chart (4.3k★) `agent-skills/`. Hosted alternative at `https://flint.data-formulator.ai/mcp` | Official (microsoft org) | 0.5.1 (2026-08-14) | 6 tools: `render_chart`, `compile_chart`, `validate_chart`, `list_chart_types`, `list_themes`, `create_chart_view` (MCP App). Skills: chart-author (34 KB), theme-author (9 KB). **Theme presets: nyt, economist, swiss, nature, mckinsey, datawrapper, powerbi, powerbi-light, pop, cartoon** | **Yes.** Renders in-process (vega, echarts, chart.js with resvg and @napi-rs/canvas; fonts bundled) and returns an inline PNG or SVG; validation warnings | Yes (verified PNG) |
| **Adobe React Spectrum Charts** (Apache-2.0; React on Vega) | MCP (docs) | `@spectrum-charts/mcp`, adobe/react-spectrum-charts | Official | 1.52.0 (2026-08-13) | `list_rsc_docs`, `read_rsc_doc`, `list_chart_features`, `read_chart_feature`, `list_design_tokens`, `read_design_tokens` | No | Yes (docs bundled) |
| **AG Charts**. Community is MIT; Enterprise is commercial and shows a watermark and console warnings without a key | Skills | ag-grid/skills (`ag-dev`, `ag-update`) | Official | push 2026-10-05 | `ag-dev` (3.7 KB): rules, plus instructions to read version-matched docs on ag-grid.com. `ag-update`: migration plan | No | Partly (the docs it reads are on ag-grid.com) |
| AG Grid / AG Charts | MCP | `ag-mcp`, ag-grid/ag-mcp | Official | 1.0.0 (2025-09-21) | `search_docs`, `detect_version`, `set_versions`, `list_versions`, plus prompts | No | No (search runs on search.ag-grid.com) |
| **MUI X Charts** (MIT; Pro is commercial) | MCP | `@mui/mcp` (mui/mui-x) | Official | 0.1.6 (2026-09-17) | `useMuiDocs`, `fetchDocs`, `generateReactCode` (needs `MUI_RECIPES_API_KEY`) | No | No (docs are fetched remotely; codegen needs a key) |
| **shadcn/ui charts** (Recharts; MIT) | MCP + Skill | `shadcn` CLI (`npx shadcn@latest mcp`); `skills/shadcn/SKILL.md` in shadcn-ui/ui | Official | 4.21.2 (2026-10-05) | 7 registry tools: search, list, view, examples, add command, audit checklist. Skill is 19.5 KB; charts are the `Chart` component wrapping Recharts | No | No (registry at ui.shadcn.com; needs a React + Tailwind app) |
| **Mantine charts** (MIT; Recharts) | MCP | `@mantine/mcp-server` | Official | 9.7.0 (2026-10-05) | `search_docs`, `get_item_doc`, `get_item_props`, `list_items`, `get_api` | No | No (data comes from mantine.dev/mcp) |
| **LightningChart JS**. Proprietary; a license key is mandatory, with no keyless mode | MCP + Skill | `@lightningchart/mcp-server` (+ `trader-mcp-server`), Lightning-Chart/lightningchart-js-agent-skill | Official | 1.0.7 (2026-07-14) | One tool, `get_lightningchart_context`. The skill (4 KB) points to remote llms.txt indexes | No | **No** (key comes from the vendor site; docs are remote) |
| **SciChart.js**. Community edition is free for non-commercial use, with a watermark, telemetry and a 6-month timeout | MCP announced | – | Official ("in testing" per scichart.com) | not released | – | – | No |
| **TradingView Lightweight Charts** (Apache-2.0 + attribution) | Skill | tradingview/lightweight-charts `.github/skills/lightweight-charts` | Official | lib 5.2.1 (2026-08-12) | 28 KB skill: financial series, scales, plugins | No | Yes, but financial charts only |
| **Syncfusion** (commercial; community license needs an account) | MCP | `@syncfusion/javascript-mcp`, `react-mcp`, … (the old `*-assistant` packages are deprecated) | Official | 2.0.1 (2026-09-24) | Agentic UI builder + coding assistant | No | **No** (Syncfusion API key + license) |
| **Kendo UI / Telerik** (commercial) | MCP | `@progress/kendo-{react,angular,jquery}-mcp`, `telerik-blazor-mcp` | Official | 1.10–1.11 (2026-10-02) | AI coding assistant | No | **No** (Telerik account + license key) |
| **DevExtreme** (commercial) | MCP (hosted docs) | `https://api.devexpress.com/mcp/docs` | Official | – | `devexpress_docs_search`, `devexpress_docs_get_content` | No | **No** (hosted) |

### Python and SaaS

| Library | Tool | Package / repo | Official? | Latest | What it does | Renders? | Offline, no account? |
|---|---|---|---|---|---|---|---|
| **Plotly / Dash** (MIT) | Dash Docs MCP `https://dash.plotly.com/_mcp`; Plotly Cloud MCP; "Dash MCP", which since Dash 4.3 turns an app's callbacks into MCP tools | plotly.com, dash.plotly.com | Official | Dash 4.4.1 | Search Dash docs, manage Cloud apps, expose an app as tools. **Nothing official for authoring plotly.js or plotly.py charts.** There is a dash.plotly.com/llms.txt | No | **No** (Plotly Cloud login) |
| **Vizro** (McKinsey; on Plotly/Dash) | MCP + 6 skills | `vizro-mcp` (PyPI); skills in `mckinsey/vizro/vizro-e2e-flow/skills` | Official | 0.1.4 (2026-02-04) | `get_vizro_chart_or_dashboard_plan`, `get_model_json_schema`, `get_sample_data_info`, `load_and_analyze_data`, `validate_dashboard_config`, `validate_chart_code` | Validates locally; previews go through a py.cafe link (remote) | Partly. Output is a Dash app, not a static HTML page |
| **HoloViz** (Panel, hvPlot, HoloViews, Bokeh; BSD) | MCP (+ skills) | `holoviz-mcp` (PyPI), MarcSkovMadsen/holoviz-mcp | Semi-official (personal repo of a HoloViz core developer) | 0.18.0 (2026-06-03) | Docs and component tools for Panel, hvPlot and HoloViews | – | Probably partly |
| **Datawrapper** (SaaS) | MCP | `datawrapper-mcp` (PyPI), palewire/datawrapper-mcp | **Community** (Ben Welsh) | 0.4.0 (2026-09-13) | Create, update and publish Datawrapper charts | Rendered in Datawrapper's cloud | **No** (API token) |
| **Flourish** (SaaS) | Hosted MCP ("Flourish Connector") | flourish.studio | Official | – | Creates visualizations in your Flourish account | cloud | **No** (account) |
| **Vega-Lite / Vega-Altair** (BSD) | None official | community: isaacwasserman/mcp-vegalite-server (100★; `save_data`, `visualize_data` returning PNG or spec) | Community | – | – | community: yes | – |
| matplotlib, seaborn, Bokeh, pyecharts, Highcharts for Python | None official found | – | – | – | – | – | – |

### No official tooling found (community only)

Chart.js (community examples: `@ax-crew/chartjs-mcp-server` 3.2.1, QuickChart-based MCPs), Recharts, D3, Observable Plot (Observable's agent lives inside its own notebook product), Nivo, Victory, visx, Tremor, uPlot, FusionCharts, AnyChart, ZingChart. Highcharts' own repo has SKILL.md files, but they are contributor tooling (`tooling`, `optimize`, `review-pr`), not for users of the library.

## 5. Feedback-loop tiers (official tools only)

| Tier | What the agent gets back | Who |
|---|---|---|
| 3 | Its **whole page** rendered in a real browser at several widths, interactions tried, screenshots plus problems with fixes | **rhp-mcp only** |
| 2 | One chart spec rendered on a server, **image returned** | Flint (local PNG/SVG), Semiotic (local PNG/SVG + evidence), Highcharts Render (hosted PNG). Also: ECharts official (local PNG, returned as a path), AntV and VChart (remote image URLs) |
| 1 | Static validation of a config or spec | ApexCharts `validate_config`, Highcharts `validate_config`, Semiotic `diagnoseConfig` and audits, Flint `validate_chart`, Vizro `validate_*` |
| 0 | Knowledge only (skills, docs search, examples) | amCharts, AntV skills, AG, MUI, Mantine, shadcn, Spectrum Charts, LightningChart, DevExpress, Kendo, Syncfusion |

## 6. Recommendation: head-to-head competitors for the editorial-poster experiment

The experiment: Claude Code builds a single-file HTML editorial or infographic poster, using only the library's official AI tools, locally, with no accounts. The network allows npm, PyPI, Google Fonts and raw.githubusercontent.com; CDNs and vendor sites are blocked, but npm packages can be served locally.

### Picks

1. **ApexCharts: the mainstream "vendor Skill + MCP" baseline.**
   - **Why:** its packaging is the closest analog to rhp's (an official skill on npm and GitHub, plus an official npm MCP). Both are actively maintained: the skill went from 2.1 to 3.1 and the MCP to 0.9.1 between August and September 2026, and the library from 6.0 to 7.8 since July 2026. It is a widely used library that works with a plain script tag. It isolates the most interesting difference: static config validation (apexcharts-mcp) against rhp's rendered-page checker.
   - **Run here:**
     1. `npm i apexcharts apexcharts-skill apexcharts-mcp`
     2. Copy `node_modules/apexcharts-skill` to `.claude/skills/apexcharts`.
     3. `claude mcp add apexcharts -- npx -y apexcharts-mcp` (verified offline).
     4. Serve `apexcharts/dist/apexcharts.min.js` locally, or inline it.
   - **Caveats:**
     - Premium features (unit, waffle and pictogram charts, raincloud, storyboard and others) show an "APEXCHARTS" watermark without a key. Forbid them, or accept and record the watermark. Waffle and pictogram charts are exactly what an infographic agent reaches for.
     - The Community license only covers organizations under $2M revenue.
     - Models already know ApexCharts well from training.
2. **AntV Infographic (+ the AntV G2 skill): the purpose-built "AI infographic" competitor.**
   - **Why:** it is the only official tool aimed squarely at infographics. It has 5 official skills, about 200 templates and a DSL designed for LLM output. It is popular (6.9k★) and MIT-licensed. It is the most on-target rival for an infographic poster.
   - **Run here:**
     1. Fetch the skills from raw.githubusercontent.com: `antvis/Infographic/main/skills/{infographic-creator, infographic-syntax-creator (+references/prompt.md), …}`. Optionally also `antvis/chart-visualization-skills/master/skills/antv-g2-chart` for data-dense charts.
     2. `npm i @antv/infographic @antv/g2`.
     3. Tell the agent the local URL of `dist/infographic.min.js`, because the skill hard-codes unpkg.
   - **Caveats:**
     - There is no MCP that runs offline. `mcp-server-chart` failed with HTTP 403 here, and `mcp-server-antv` needs context7.
     - There is no render or validation feedback.
     - At runtime the library fetches **icons from weavefox.cn** and **fonts from assets.antv.antgroup.com**, both blocked. Decide up front whether the agent may register a local resource loader (for example with icons from an npm iconify package), or accept that icons will be missing.
     - The main `infographic-creator` skill is written in Chinese; the English `antv-infographic` skill is in chart-visualization-skills.
3. **Semiotic: the closest match to rhp's "check what you drew" philosophy.**
   - **Why:** it has an official skill, a CLI doctor, llms.txt and an MCP that ships inside the library. Its `renderChart` returns a PNG plus a structured render-evidence JSON, and it has `diagnoseConfig`, accessibility and mobile audits, and themes. Everything ran offline here. It is the strongest test of whether rhp's whole-page browser check beats a per-chart server render with evidence.
   - **Run here:**
     1. `npm i semiotic react react-dom` (the optional `sharp` and `jsdom` install from npm).
     2. `claude mcp add semiotic -- npx semiotic-mcp`.
     3. Fetch the skill from `raw…/nteract/semiotic/main/agent-skill/semiotic-charts/SKILL.md`.
     4. To produce a single HTML file, bundle with esbuild from npm.
   - **Caveats:**
     - It is React only, so it needs a bundling step.
     - Its renders are static snapshots of one chart, and its mobile and accessibility audits are static.
4. **Microsoft Flint: agent-first, renders locally, with editorial themes built in.**
   - **Why:** its official MCP returns an inline PNG of each chart (verified offline) and has `validate_chart`. Its bundled skills cover chart and theme authoring, and its presets explicitly target editorial styles (nyt, economist, swiss, nature, mckinsey, datawrapper). That makes it the most direct test of "editorial quality from agent tools". It is young (v0.5.1) but already at 4.3k★.
   - **Run here:**
     1. `npm i flint-chart flint-chart-mcp vega vega-lite vega-embed` (or `echarts`).
     2. `claude mcp add flint -- npx -y flint-chart-mcp`.
     3. The skills come as the MCP resources `flint://agent-skill` and `flint://theme-skill`, or from `raw…/microsoft/flint-chart/main/agent-skills/`.
   - **Caveats:**
     - Flint is a compiler over Vega-Lite, ECharts and others, so the page also needs that runtime.
     - Poster layout and typography outside the charts are entirely up to the agent.
     - Theme presets mainly apply to Vega-Lite output; 0.5.1 extended them to Plotly. Use the `vegalite` backend.
5. **amCharts 5: a mainstream library with an official Skill and a local docs MCP.**
   - **Why:** it is an official skill plus MCP pair that runs offline (verified). Its knowledge base is the largest of the knowledge-only kind (over 1,500 docs, examples and API pages). It has a rich visual repertoire, including pictorial charts, maps and flows. It represents the "tier-0 knowledge only" design against rhp's tier 3.
   - **Run here:**
     1. `npm i @amcharts/amcharts5 @amcharts/amcharts5-mcp`.
     2. `claude mcp add amcharts5 -- npx -y @amcharts/amcharts5-mcp`.
     3. Fetch the skill from `raw…/amcharts/amcharts5-skill/main/amcharts5-skill/`.
     4. Bundle the ESM-only npm build with esbuild, because the docs' `cdn.amcharts.com` scripts are blocked.
   - **Caveats:**
     - The free license **requires the amCharts branding logo** on every chart, which is visible on a poster.
     - There is no rendering or validation.

**Optional 6th arm, a control: Apache ECharts with its official tooling only.** `apache/echarts-mcp` runs locally (verified), but it has one tool, eight chart types and a fixed theme, and returns a file path. The official llms.txt is unreachable here. This arm mostly measures what a strong base model already knows about a famous library. That makes it a useful contrast with rhp 2, which postdates model training. The community `mcp-echarts` would be stronger but is not official.

### Excluded or flagged: these need a remote service or an account or API key, so they cannot run here

- **Highcharts.** All three official MCP servers (Dev Assist, Render, Chartchooser) are hosted on `*.highcharts.ai`, which is unreachable here, and there is no local package. It would otherwise be the strongest mainstream competitor (docs, `validate_config` and PNG render). Commercial use also needs a license.
- **AntV `@antv/mcp-server-chart` and the `chart-visualization` skill.** They depend on a remote render service; verified HTTP 403 here. Self-hosting would mean standing up GPT-Vis-SSR. `@antv/mcp-server-antv` needs context7 and DeepWiki. `icon-retrieval` needs weavefox.cn.
- **VisActor VChart MCP** renders images remotely (stale since 2025-07).
- **LightningChart JS** needs a license key from the vendor site, and its skill relies on remote docs.
- **SciChart:** its MCP is not released.
- **Syncfusion** needs an API key and an account.
- **Kendo UI / Telerik** needs a license key and an account.
- **DevExtreme:** its docs MCP is hosted only.
- **MUI:** docs are fetched remotely, and codegen needs an API key.
- **Mantine:** docs data is remote.
- **shadcn:** the registry is remote, and it needs a React + Tailwind app.
- **AG Charts:** the skills and `ag-mcp` read ag-grid.com and search.ag-grid.com. Only `ag-dev`'s local rules would work.
- **Plotly:** the Dash Docs and Plotly Cloud MCPs need a Plotly Cloud login, and there is no chart-authoring tool.
- **Vizro:** its previews go through py.cafe, and it builds Dash apps rather than static HTML.
- **Flourish** needs an account. **Datawrapper** needs an API token, and its MCP is community-made.

### Experiment-design notes

- **Familiarity confound.** ApexCharts, ECharts, amCharts and G2 are well represented in model training data. rhp 2 (2026-09), Flint (2026-06), Semiotic 3.x and AntV Infographic (2025-11) are not. If budget allows, add a "no tools" run per library so you can separate the effect of the tooling from prior knowledge.
- **Feedback parity.** Decide whether agents may use a generic headless browser outside the official tools. If they may not, only rhp, Flint and Semiotic get visual feedback. That is the variable you are measuring, but state it.
- **CDN rewrites.** The skills hard-code CDNs: AntV uses unpkg, amCharts uses `cdn.amcharts.com`, and ApexCharts uses generic paths. Give every arm the same note listing its local npm-served URLs, and allow esbuild for the ESM and React arms.
- **License artifacts.** Pre-declare how to treat the ApexCharts premium watermark, the amCharts branding link, the AG Enterprise watermark and the Highcharts credits.

## 7. Sources

**npm** (versions and dates from the registry):
- https://www.npmjs.com/package/@bezda/rhp
- https://www.npmjs.com/package/@bezda/rhp-mcp
- https://www.npmjs.com/package/apexcharts
- https://www.npmjs.com/package/apexcharts-skill
- https://www.npmjs.com/package/apexcharts-mcp
- https://www.npmjs.com/package/highcharts
- https://www.npmjs.com/package/mcp-highcharts
- https://www.npmjs.com/package/echarts
- https://www.npmjs.com/package/mcp-echarts
- https://www.npmjs.com/package/echarts-mcp
- https://www.npmjs.com/package/@antv/mcp-server-chart
- https://www.npmjs.com/package/@antv/mcp-server-antv
- https://www.npmjs.com/package/@antv/chart-visualization-skills
- https://www.npmjs.com/package/@antv/infographic
- https://www.npmjs.com/package/@antv/gpt-vis-ssr
- https://www.npmjs.com/package/@antv/context
- https://www.npmjs.com/package/@visactor/vchart-mcp-server
- https://www.npmjs.com/package/@visactor/vinfo-graphics
- https://www.npmjs.com/package/@amcharts/amcharts5
- https://www.npmjs.com/package/@amcharts/amcharts5-mcp
- https://www.npmjs.com/package/semiotic
- https://www.npmjs.com/package/flint-chart
- https://www.npmjs.com/package/flint-chart-mcp
- https://www.npmjs.com/package/@spectrum-charts/mcp
- https://www.npmjs.com/package/ag-mcp
- https://www.npmjs.com/package/@mui/mcp
- https://www.npmjs.com/package/shadcn
- https://www.npmjs.com/package/@mantine/mcp-server
- https://www.npmjs.com/package/@lightningchart/mcp-server
- https://www.npmjs.com/package/@lightningchart/lcjs
- https://www.npmjs.com/package/@syncfusion/javascript-mcp
- https://www.npmjs.com/package/@syncfusion/javascript-assistant
- https://www.npmjs.com/package/@progress/kendo-jquery-mcp
- https://www.npmjs.com/package/@progress/kendo-react-mcp
- https://www.npmjs.com/package/@ax-crew/chartjs-mcp-server

**PyPI:**
- https://pypi.org/project/vizro-mcp/
- https://pypi.org/project/holoviz-mcp/
- https://pypi.org/project/datawrapper-mcp/

**GitHub** (read through raw.githubusercontent.com or GitHub search):
- https://github.com/apexcharts/apexcharts-mcp
- https://github.com/apexcharts/apexcharts-skill
- https://github.com/apache/echarts-mcp (`src/index.js`, `src/storage.js`)
- https://github.com/apache/echarts-doc/blob/master/build/build-llms.js
- https://github.com/hustcc/mcp-echarts
- https://github.com/antvis/mcp-server-chart
- https://github.com/antvis/mcp-server-antv
- https://github.com/antvis/chart-visualization-skills
- https://github.com/antvis/Infographic (`skills/`, `.claude-plugin/marketplace.json`)
- https://github.com/antvis/GPT-Vis
- https://github.com/VisActor/vchart-mcp-server
- https://github.com/VisActor/chart-assistant-skill
- https://github.com/VisActor/vinfo-graphics
- https://github.com/amcharts/amcharts5-mcp
- https://github.com/amcharts/amcharts5-skill
- https://github.com/Lightning-Chart/lightningchart-js-mcp-server
- https://github.com/Lightning-Chart/lightningchart-js-agent-skill
- https://github.com/ag-grid/skills
- https://github.com/ag-grid/ag-mcp
- https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/SKILL.md
- https://github.com/adobe/react-spectrum-charts
- https://github.com/nteract/semiotic
- https://github.com/microsoft/flint-chart
- https://github.com/tradingview/lightweight-charts/tree/master/.github/skills
- https://github.com/mckinsey/vizro (vizro-mcp, vizro-e2e-flow/skills)
- https://github.com/MarcSkovMadsen/holoviz-mcp
- https://github.com/palewire/datawrapper-mcp
- https://github.com/isaacwasserman/mcp-vegalite-server
- https://github.com/austenstone/mcp-highcharts
- https://github.com/hasnaintypes/highchart-mcp-server

**Vendor pages** (seen through search; blocked here):
- https://www.highcharts.com/mcp/
- https://www.highcharts.com/blog/tutorials/highcharts-chartchooser-mcp/
- https://www.highcharts.com/blog/post/how-to-make-morningstar-data-llm-friendly/
- https://apexcharts.com/docs/ai/overview/
- https://apexcharts.com/llms.txt
- https://amcharts.com/llms.txt
- https://www.amcharts.com/docs/v5/ai/
- https://lightningchart.com/js-charts/docs/lc-and-ai/
- https://www.lightningchart.com/community-license/
- https://blog.ag-grid.com/introducing-the-ag-grid-model-context-protocol-mcp-server/
- https://ag-grid.com/charts/react/skills.md
- https://www.ag-grid.com/charts/vue/licensing/
- https://docs.devexpress.com/GeneralInformation/405551/help-resources/dev-express-documentation-mcp-server-configure-an-ai-powered-assistant
- https://ui.shadcn.com/docs/mcp
- https://dash.plotly.com/mcp
- https://plotly.com/blog/dash-mcp-turn-your-dash-app-into-a-tool-for-ai-agents/
- https://dash.plotly.com/plotly-cloud/mcp
- https://flourish.studio/product/mcp-connector/
- https://palewi.re/posts/2025/11/03/datawrapper-mcp/
- https://www.scichart.com/scichart-js-v5-0-211-released/
- https://support.scichart.com/support/solutions/articles/101000482819
- https://opensource.adobe.com/react-spectrum-charts/docs/docs/developers/McpServer/
- https://microsoft.github.io/flint-chart/#/mcp
- https://infographic.antv.vision/ai

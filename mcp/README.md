# @bezda/rhp-mcp

Make charts with [rhp](https://rhp.vercel.app) from any AI agent.
rhp 2 came out in September 2026, after the training data of today's models, so an agent knows nothing about it until it reads rhp's guide.
This package carries that guide (the workflow, the references and 30 tested recipes) and a checker that renders the agent's chart in a browser and reports what is wrong, with a fix for each problem and screenshots to look at.

## Start here: the rhp skill

In a coding agent (Claude Code, Cursor, Copilot, Codex, Gemini CLI and others), run this in your project:

```sh
npx skills add bezda-team/rhp
```

Then ask for a chart.
The skill teaches the agent rhp and runs this package's checker by itself with `npx`, so you install nothing else.

## The checker on the command line

```sh
npx -y @bezda/rhp-mcp check chart.html
```

It renders the chart at 1280px and 390px wide, tries its interactions, and prints what is wrong, each problem with what to change, then where it saved the screenshots.
The exit code is 1 when the chart has errors.
It checks an `.html` page, a Solid or React `.jsx` or `.tsx` component, or a `.js` module that uses `@bezda/rhp/standalone`.

| Option | What it does |
|---|---|
| `--widths 1280,390` | The page widths to check; the interactions are tried at the first, and slats are tapped at phone widths (600px or less). |
| `--dark` | Renders with a dark color scheme. |
| `--no-interact` | Skips the interactions. |
| `--format <format>` | `html`, `solid`, `react` or `module`, when the file's extension and code leave it unclear. |
| `--json` | Prints the whole result as JSON. |
| `--out <dir>` | Where the screenshots go (a folder in the system's temp folder by default). |

`npx -y @bezda/rhp-mcp guide` prints the guide, for an agent that can run commands but has no skill installed.

## The MCP server

The server gives an agent the same guide, references, recipes and checker as four tools, and returns the checker's screenshots as images the agent sees.
Use it in a client that has no shell (Claude Desktop), or when you would rather give the agent tools than a skill.
The server alone is enough: its instructions tell the agent to read the guide before it writes any rhp code.

Every client starts it with `npx -y @bezda/rhp-mcp`, which needs Node.js 20 or later.
The first start downloads the package and its dependencies (about 80 MB).
If your client gives up before the server is ready, run `npx -y @bezda/rhp-mcp --version` once in a terminal and restart the client.

### Claude Code

```sh
claude mcp add rhp -- npx -y @bezda/rhp-mcp
```

Add `-s user` to have it in every project, or `-s project` to write it to the project's `.mcp.json` for everyone who works on it.

Or install the Claude Code plugin, which carries the skill and this server together:

```sh
claude plugin marketplace add bezda-team/rhp
claude plugin install rhp@rhp
```

The plugin's skill needs Claude Code 2.1.160 or later (2.1.141 loads only the server).

### Claude Desktop

Open Settings > Developer > Edit Config, and add the server to `claude_desktop_config.json` (in `~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows):

```json
{
  "mcpServers": {
    "rhp": { "command": "npx", "args": ["-y", "@bezda/rhp-mcp"] }
  }
}
```

### Cursor

Open this link in a browser to install it in one click (Cursor's documented install link):

```
cursor://anysphere.cursor-deeplink/mcp/install?name=rhp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBiZXpkYS9yaHAtbWNwIl19
```

Or add the `mcpServers` entry shown for Claude Desktop to `~/.cursor/mcp.json` (every project) or `.cursor/mcp.json` (one project).

### VS Code (GitHub Copilot)

```sh
code --add-mcp "{\"name\":\"rhp\",\"command\":\"npx\",\"args\":[\"-y\",\"@bezda/rhp-mcp\"]}"
```

Or add the `mcpServers` entry shown for Claude Desktop to `.mcp.json` at the workspace's root, or to `~/.copilot/mcp-config.json` for every workspace.
The older `.vscode/mcp.json` takes the same entry under `servers`.

### Windsurf (Devin Desktop)

With the Devin CLI or the Devin Local agent:

```sh
devin mcp add -s user rhp -- npx -y @bezda/rhp-mcp
```

For the Cascade agent, add the `mcpServers` entry shown for Claude Desktop to `~/.config/devin/mcp_config.json` (`%APPDATA%\devin\mcp_config.json` on Windows).

### Copilot CLI

Type `/mcp add` in a session, or add the `mcpServers` entry shown for Claude Desktop to `~/.copilot/mcp-config.json`.

### Zed

Add the server to Zed's settings file (the command **zed: open settings file** opens it):

```json
{
  "context_servers": {
    "rhp": { "command": "npx", "args": ["-y", "@bezda/rhp-mcp"], "env": {} }
  }
}
```

### Codex

```sh
codex mcp add rhp -- npx -y @bezda/rhp-mcp
```

It writes this to `~/.codex/config.toml`:

```toml
[mcp_servers.rhp]
command = "npx"
args = ["-y", "@bezda/rhp-mcp"]
```

### Gemini CLI

```sh
gemini mcp add --scope user rhp npx -- -y @bezda/rhp-mcp
```

Without `--scope user` it goes to the project's `.gemini/settings.json`.

### The tools

| Tool | What it returns |
|---|---|
| `rhp_guide` | The workflow from a request to a checked chart, the rules that prevent most bugs, and the names of the references and recipes. The agent calls it first. |
| `rhp_reference` | One reference by `name`: `api`, `design`, `environments`, `forms`, `interaction` or `pitfalls`. A long one comes back as its list of sections, and `section` (a number or a title) returns one of them. |
| `rhp_recipe` | With no `type`, the list of recipes with what each is for; with a `type` such as `bar`, that recipe's whole HTML file, a tested chart page to start from. |
| `rhp_check` | Renders the chart at `file` (an absolute path) or the `code` given, and returns the report (errors and warnings, each with a fix, and the interactions it tried) and the screenshots as images. Options: `format`, `widths` (`[1280, 390]` by default), `dark`, `interact`. |

`rhp_check` takes absolute paths only: some clients (Codex) start the server in its own folder, where a relative path would point at the wrong file.
The server also has one prompt, `chart`, which clients show as a slash command: it asks for a chart and tells the agent to follow `rhp_guide` and to check with `rhp_check` until the report is clean.

## The browser

The checker renders charts in the first browser it finds:

1. the executable in the `RHP_CHECK_BROWSER` environment variable;
2. Playwright's Chromium (its headless shell first);
3. Google Chrome;
4. Microsoft Edge.

With none of them, the check still reports what it can find without a browser, and says to run:

```sh
npx -y @bezda/rhp-mcp install-browser
```

It downloads Chromium's headless shell into Playwright's usual folder and leaves the other browsers there alone.
Other options go to Playwright's installer: on Linux, `install-browser --with-deps` also installs the system libraries the browser needs.

## Nothing leaves your machine

The checker renders your chart in a browser on your machine, and your chart's code and screenshots stay there.
It answers the page's requests for `@bezda/rhp` from the copy of rhp it ships with.
The only other requests are the ones your chart's page makes itself, such as its Google Fonts, and each gets 5 seconds before the check goes on without it.
There is no telemetry.

## For maintainers

```
bin/rhp-mcp.js     the command: no arguments starts the server
src/server.js      the MCP server: four tools, one prompt, one browser shared by every check
src/skill.js       reads the skill: SKILL.md, the references (whole or by section) and the recipes
src/check/         the checker (its README lists every finding and how each is tested)
src/guard/         the wrapper around rhp that checks how a chart uses it, in the page
scripts/build.js   copies ../skills/rhp into skill/ and rhp's LICENSE into this folder (npm pack runs it first)
test/mcp.js        the build, the package, the Claude Code plugin's manifests, and the server through the SDK's client
test/run.js        the checker
```

**Tests.**
`npm test` runs `test/mcp.js`, then `test/run.js`.

**The skill.**
It lives in `skills/rhp/` at the repository's root.
Inside the repository the server reads it there, so it is never stale; the published package reads its copy in `skill/`.

**No `structuredContent`.**
Claude Code shows the model a tool's `structuredContent` in place of its text, and Codex in place of all of its content, images included.
The report or the screenshots would then never reach the agent, so `rhp_check` returns them as content only.

**Publishing.**
`@bezda/rhp` is `file:..` here, so that the tests check charts against this repository's build; an install from npm cannot resolve it.
Publish this package after every rhp release, with the range set to that release and a new version of its own.
The checker carries its own copy of rhp, and a page loads the latest rhp 2 from jsDelivr, so this keeps the two the same rhp; a new version also makes `npx` fetch the new pair:

```sh
npm pkg set dependencies.@bezda/rhp=^2.0.1   # the rhp version just published
npm version patch --no-git-tag-version
npm publish
git checkout package.json
```

`npm publish` runs the build first, and `publishConfig` makes the package public.

**The MCP SDK.**
The server uses `@modelcontextprotocol/sdk` 1.x (the v1 line), because clients speak v1 today; v1 gets fixes for at least six months after v2's release in July 2026.
Moving to v2 means importing `McpServer` from `@modelcontextprotocol/server`, giving each tool's `inputSchema` as `z.object({ ... })`, and starting the server with `serveStdio` from `@modelcontextprotocol/server/stdio`.

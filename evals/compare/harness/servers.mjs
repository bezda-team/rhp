// The MCP servers of the comparison, as an MCP client starts them: the bridge (mcpd.mjs) and run-headless.sh's
// mcp.json both use this list.
import path from "node:path";
import { fileURLToPath } from "node:url";

const lab = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = (p) => path.join(lab, "node_modules", p);

export const SERVERS = {
  rhp: { command: "node", args: [bin("@bezda/rhp-mcp/bin/rhp-mcp.js")] },
  apexcharts: { command: "node", args: [bin("apexcharts-mcp/dist/index.js")] },
  flint: { command: "node", args: [bin("flint-chart-mcp/dist/cli.js")] },
  amcharts5: { command: bin(".bin/amcharts5-mcp"), args: [] },
  semiotic: { command: bin(".bin/semiotic-mcp"), args: [] },
};

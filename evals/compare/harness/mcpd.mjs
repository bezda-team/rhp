// A bridge that keeps real MCP servers running and lets an agent call their tools from a shell.
// The experiment's agents run as subagents of one Claude Code session, which cannot add MCP servers while it runs, so the
// "MCP" conditions call the same servers through this bridge: the same tools, the same arguments, the same results.
//   node mcpd.mjs <port>          starts every server in SERVERS, writes tools/<server>.json, serves POST /call
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8790);

import { SERVERS } from "./servers.mjs";

const only = process.env.MCPD_ONLY?.split(",");

const clients = {};
fs.mkdirSync(path.join(here, "tools"), { recursive: true });
for (const [name, cfg] of Object.entries(SERVERS)) {
  if (only && !only.includes(name)) continue;
  const transport = new StdioClientTransport({ command: cfg.command, args: cfg.args, env: { ...process.env, ...(cfg.env ?? {}) }, stderr: "ignore" });
  const client = new Client({ name: "mcp-bridge", version: "1.0.0" });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const instructions = client.getInstructions?.() ?? null;
  const info = client.getServerVersion?.() ?? null;
  fs.writeFileSync(path.join(here, "tools", `${name}.json`), JSON.stringify({ server: info, instructions, tools }, null, 2));
  clients[name] = client;
  console.log(`${name}: ${tools.length} tools (${info?.name} ${info?.version})`);
}

let seq = 0;
http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/call") return res.writeHead(404).end();
  let body = "";
  for await (const chunk of req) body += chunk;
  const started = Date.now();
  try {
    const { server, tool, args, outDir } = JSON.parse(body);
    const client = clients[server];
    if (!client) throw new Error(`no MCP server "${server}" (have: ${Object.keys(clients).join(", ")})`);
    const result = await client.callTool({ name: tool, arguments: args ?? {} }, undefined, { timeout: 120000 });
    // Images go to files the agent opens; everything else comes back as it is
    const content = [];
    for (const c of result.content ?? []) {
      if (c.type === "image") {
        fs.mkdirSync(outDir, { recursive: true });
        const ext = c.mimeType === "image/png" ? "png" : "jpg";
        const file = path.join(outDir, `${server}-${tool}-${Date.now()}-${++seq}.${ext}`);
        fs.writeFileSync(file, Buffer.from(c.data, "base64"));
        content.push({ type: "image", file, mimeType: c.mimeType, bytes: Buffer.from(c.data, "base64").length });
      } else content.push(c);
    }
    const log = { at: new Date().toISOString(), server, tool, args, ms: Date.now() - started, isError: !!result.isError, outDir };
    fs.appendFileSync(path.join(here, "calls.log"), JSON.stringify(log) + "\n");
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ isError: !!result.isError, content }));
  } catch (e) {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ isError: true, content: [{ type: "text", text: `Bridge error: ${e.message}` }] }));
  }
}).listen(port, "127.0.0.1", () => console.log(`mcpd on 127.0.0.1:${port}`));

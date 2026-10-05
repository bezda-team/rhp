#!/usr/bin/env node
// Calls one MCP tool through the bridge (mcpd.mjs) and prints its result the way an MCP client shows it to a model:
// each text block as it is, and each image as a file to open, since a shell cannot hand an image back.
//   mcp-call <server> <tool> ['<json arguments>']
// MCP_IMAGES (or --images <dir>) is where the images go; MCPD_PORT the bridge's port (8790).
const [server, tool, json = "{}"] = process.argv.slice(2).filter((a, i, all) => a !== "--images" && all[i - 1] !== "--images");
const at = process.argv.indexOf("--images");
const outDir = at > 0 ? process.argv[at + 1] : process.env.MCP_IMAGES ?? "/tmp/mcp-images";
if (!server || !tool) {
  console.error("usage: mcp-call <server> <tool> '<json arguments>'");
  process.exit(2);
}
let args;
try {
  args = JSON.parse(json);
} catch (e) {
  console.error(`The arguments are not JSON: ${e.message}`);
  process.exit(2);
}
const port = process.env.MCPD_PORT ?? 8790;
const res = await fetch(`http://127.0.0.1:${port}/call`, { method: "POST", body: JSON.stringify({ server, tool, args, outDir }) });
const { isError, content } = await res.json();
if (isError) console.log("[the tool returned an error]");
for (const c of content) {
  if (c.type === "text") console.log(c.text);
  else if (c.type === "image") console.log(`[image ${c.mimeType}, ${Math.round(c.bytes / 1024)} KB: ${c.file} — part of this tool result: open it with the Read tool to see it]`);
  else console.log(JSON.stringify(c));
}
process.exit(isError ? 1 : 0);

// What a checked page may reach on the network. The page runs code the checker did not write, so its requests to the
// web are made here, in Node, under three rules:
//   - only public addresses: never loopback, private, link-local, shared (CGNAT), multicast or reserved ones, checked
//     on the address actually connected to (so neither a redirect nor a DNS answer that changes can reach one)
//   - only requests that read: GET, HEAD and OPTIONS (a chart reads fonts, scripts, styles, images and data while it
//     renders; it has no reason to send anything)
//   - the same 5 seconds and 5 redirects as before
import dns from "dns";
import net from "net";
import http from "http";
import https from "https";
import zlib from "zlib";

const MAX_BODY = 64 * 1024 * 1024;

const BLOCKED = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) BLOCKED.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["100::", 64], ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
]) BLOCKED.addSubnet(address, prefix, "ipv6");

// Whether an IP address is one a page may not reach (an IPv4 address written as IPv6 is judged as IPv4)
export function isPrivate(ip) {

  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return BLOCKED.check(mapped[1], "ipv4");
  // URL canonicalizes IPv6 spellings, including dotted and expanded IPv4-mapped addresses.
  if (net.isIP(ip) === 6) {
    const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const hex = /^::ffff:([\da-f]+):([\da-f]+)$/i.exec(canonical);
    if (hex) {
      const a = parseInt(hex[1], 16), b = parseInt(hex[2], 16);
      return BLOCKED.check(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`, "ipv4");
    }
  }
  const family = net.isIP(ip);
  if (!family) return true;

  return BLOCKED.check(ip, family === 4 ? "ipv4" : "ipv6");
}

const blocked = (why) => Object.assign(new Error(why), { code: "EBLOCKED" });

// dns.lookup that refuses names answering with an address a page may not reach. Node calls it for every connection,
// so the address checked is the one connected to.
function publicLookup(hostname, options, callback) {

  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const bad = addresses.find((a) => isPrivate(a.address));
    if (bad) return callback(blocked(`${hostname} is at ${bad.address}, which is not a public address`));
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

export const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Request headers that belong to one connection, or that would have the server compress (the body is handed to the
// browser as it is, so it is asked for plain)
const DROP_REQUEST = new Set(["host", "connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "accept-encoding", "content-length"]);
const DROP_RESPONSE = new Set(["connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length"]);

function once(url, method, headers, deadline) {

  return new Promise((resolve) => {
    const u = new URL(url);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && isPrivate(host)) return resolve({ error: `${host} is not a public address`, blocked: true });
    const left = deadline - Date.now();
    if (left <= 0) return resolve({ error: "Timeout" });
    const sendHeaders = { "accept-encoding": "identity" };
    for (const [k, v] of Object.entries(headers)) if (!DROP_REQUEST.has(k.toLowerCase())) sendHeaders[k] = v;
    let timer;
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result);
    };
    const req = (u.protocol === "https:" ? https : http).request(u, { method, headers: sendHeaders, lookup: publicLookup }, (res) => {
      const chunks = [];
      let size = 0;
      res.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) req.destroy(new Error("Response exceeds 64 MB"));
        else chunks.push(c);
      });
      res.on("end", () => {
        if (done) return;
        try {
          let body = Buffer.concat(chunks);
          // Some servers compress even when identity was requested.
          const encoding = String(res.headers["content-encoding"] ?? "identity").toLowerCase();
          const decode = { gzip: zlib.gunzipSync, deflate: zlib.inflateSync, br: zlib.brotliDecompressSync }[encoding];
          if (decode) body = decode(body, { maxOutputLength: MAX_BODY });
          else if (encoding !== "identity") throw new Error(`Unsupported content encoding: ${encoding}`);
          finish({ status: res.statusCode, headers: res.headers, body });
        } catch (e) {
          finish({ error: e.message });
        }
      });
      res.on("error", (e) => finish({ error: e.message }));
    });
    // One wall-clock deadline covers DNS, headers, the body, and every redirect.
    timer = setTimeout(() => req.destroy(new Error("Timeout while fetching chart asset")), left);
    req.on("error", (e) => finish({ error: e.message, blocked: e.code === "EBLOCKED" }));
    req.end();
  });
}

// Fetches a URL for the page: { status, headers, body }, or { error, blocked } when it is not allowed or fails
export async function fetchPublic(url, { method = "GET", headers = {}, timeout = 5000, maxRedirects = 5 } = {}) {

  method = method.toUpperCase();
  if (!READ_METHODS.has(method)) return { error: `${method} requests are not sent: the check only reads from the web`, blocked: true };

  const deadline = Date.now() + timeout;
  let current = url;

  for (let hop = 0; ; hop++) {
    if (!/^https?:$/.test(new URL(current).protocol)) return { error: `${new URL(current).protocol} is not fetched`, blocked: true };
    const got = await once(current, method, headers, deadline);
    if (got.error) return got;
    const location = got.headers.location;
    if (got.status >= 300 && got.status < 400 && location && got.status !== 304) {
      if (hop >= maxRedirects) return { error: `More than ${maxRedirects} redirects` };
      const next = new URL(location, current);
      if (next.origin !== new URL(current).origin) {
        headers = Object.fromEntries(Object.entries(headers).filter(([k]) => !["authorization", "cookie", "proxy-authorization"].includes(k.toLowerCase())));
      }
      current = next.href;
      continue;
    }
    const out = {};
    for (const [k, v] of Object.entries(got.headers)) if (!DROP_RESPONSE.has(k)) out[k] = Array.isArray(v) ? v.join(", ") : String(v);
    return { status: got.status, headers: out, body: got.body };
  }
}

// A final network fence for renderer traffic not handled by Playwright's page routes (for example worker sockets).
// Known HTTP asset requests are fulfilled by the Node fetcher before reaching this proxy.
// Nothing accepted here is forwarded, and Chromium must proxy loopback traffic too.
export async function denyBrowserNetwork(onBlocked) {
  const deny = (request, socket) => {
    onBlocked(request.url);
    socket.destroy();
  };
  const server = http.createServer((request, response) => {
    onBlocked(request.url);
    response.writeHead(403).end();
  });
  server.on("connect", deny);
  server.on("upgrade", deny);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    proxy: { server: `http://127.0.0.1:${server.address().port}`, bypass: "<-loopback>" },
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }),
  };
}

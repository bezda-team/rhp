// Exercise asset fetching without depending on third-party servers.
// The public checker and isolation tests separately cover real browser requests and refused local connections.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { fetchPublic, isPrivate } from "../src/check/network.js";

const calls = [];
const fixture = (url, options, callback) => {
  calls.push({ url: url.href, options });
  const request = new EventEmitter();
  const response = new PassThrough();
  let drip;
  request.destroy = (error) => { clearInterval(drip); response.destroy(); request.emit("error", error); };
  request.end = () => queueMicrotask(() => {
    response.statusCode = url.pathname === "/redirect" || url.pathname === "/loop" || url.pathname === "/cross" ? 302 : 200;
    response.headers = {};
    if (url.pathname === "/redirect") response.headers.location = "http://127.0.0.1/private";
    if (url.pathname === "/loop") response.headers.location = "/loop";
    if (url.pathname === "/cross") response.headers.location = "https://other.example/asset";
    const encoding = url.pathname.slice(1);
    const encode = { gzip: zlib.gzipSync, deflate: zlib.deflateSync, br: zlib.brotliCompressSync }[encoding];
    const text = Buffer.from("A chart asset with non-ASCII text: café.");
    if (encode) response.headers["content-encoding"] = encoding;
    callback(response);
    if (url.pathname === "/drip") drip = setInterval(() => response.write("x"), 5);
    else if (url.pathname === "/large") response.end(Buffer.alloc(64 * 1024 * 1024 + 1));
    else response.end(encode ? encode(text) : text);
  });
  return request;
};
mock.method(https, "request", fixture);
mock.method(http, "request", fixture);
try {
  for (const encoding of ["identity", "gzip", "deflate", "br"]) {
    const got = await fetchPublic(`https://assets.example/${encoding}`);
    assert.equal(got.body.toString(), "A chart asset with non-ASCII text: café.");
    assert(!("content-encoding" in got.headers));
  }
  assert.equal((await fetchPublic("https://assets.example/asset", { method: "head" })).status, 200);
  assert.equal(calls.at(-1).options.method, "HEAD");
  const before = calls.length;
  assert.equal((await fetchPublic("https://assets.example/asset", { method: "POST" })).blocked, true);
  assert.equal(calls.length, before, "a refused method never opens a connection");
  assert.equal((await fetchPublic("https://assets.example/redirect")).blocked, true);
  assert.equal(calls.length, before + 1, "a redirect to a private IP never opens the second connection");
  const loop = await fetchPublic("https://assets.example/loop", { maxRedirects: 2 });
  assert.match(loop.error, /More than 2 redirects/);
  await fetchPublic("https://assets.example/cross", { headers: { Authorization: "test-only", Cookie: "test-only", Accept: "text/plain" } });
  assert.deepEqual(calls.at(-1).options.headers, { "accept-encoding": "identity", Accept: "text/plain" });
  const drip = await fetchPublic("https://assets.example/drip", { timeout: 50 });
  assert.match(drip.error, /Timeout/, "a body that keeps arriving cannot extend the deadline");
  assert.match((await fetchPublic("https://assets.example/large")).error, /exceeds 64 MB/);
  for (const ip of ["::ffff:7f00:1", "0:0:0:0:0:ffff:c0a8:101", "::ffff:127.0.0.1"]) assert(isPrivate(ip));
  assert.equal(isPrivate("::ffff:808:808"), false);
  console.log("PASS public asset reads, compression, methods, private redirects, redirect limits, credential stripping, deadlines, size limits, and mapped IPv6 addresses");
} finally {
  mock.restoreAll();
}

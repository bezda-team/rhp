import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { handle } from "./article-stats.js";

const exec = promisify(execFile);
const env = { UPSTASH_REDIS_REST_URL: "https://redis.test", UPSTASH_REDIS_REST_TOKEN: "test-only-token" };
let dir;
let server;
let socket;
const command = async (args) => JSON.parse((await exec(process.env.REDIS_CLI ?? "redis-cli", ["-s", socket, "--json", ...args.map(String)])).stdout);
const fetchRedis = async (_url, options) => Response.json({ result: await command(JSON.parse(options.body)) });
const post = (visitor, action = "visit", liked, extra = {}) => new Request("https://article.test/api/article-stats", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: "https://article.test", "x-vercel-forwarded-for": "192.0.2.1", ...extra },
  body: JSON.stringify({ visitor, action, liked }),
});
const send = async (...args) => {
  const response = await handle(post(...args), env, fetchRedis);
  assert.equal(response.status, 200);
  return response.json();
};

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "article-stats-"));
  socket = path.join(dir, "redis.sock");
  server = spawn(process.env.REDIS_SERVER ?? "redis-server", ["--port", "0", "--unixsocket", socket, "--save", "", "--appendonly", "no", "--dir", dir]);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Redis did not become ready")), 10000);
    const finish = (error) => { clearTimeout(timeout); error ? reject(error) : resolve(); };
    server.once("error", finish);
    server.once("exit", (code) => finish(new Error(`Redis exited before readiness (${code})`)));
    server.stdout.on("data", (chunk) => { if (String(chunk).includes("Ready to accept connections")) finish(); });
  });
});
beforeEach(() => command(["FLUSHDB"]));
after(async () => {
  if (server && server.exitCode == null && server.pid) {
    await new Promise((resolve) => { server.once("exit", resolve); server.kill("SIGTERM"); });
  }
  if (dir) await rm(dir, { recursive: true, force: true });
});

test("visits persist and concurrent retries count a browser only once", async () => {
  const visitor = randomUUID();
  const initial = await handle(new Request("https://article.test/api/article-stats"), env, fetchRedis);
  assert.deepEqual(await initial.json(), { visitors: 0, likes: 0, liked: false });
  const visits = await Promise.all(Array.from({ length: 20 }, () => send(visitor)));
  for (const result of visits) assert.deepEqual(result, { visitors: 1, likes: 0, liked: false });
  assert.deepEqual(await send(randomUUID()), { visitors: 2, likes: 0, liked: false });
  assert.deepEqual(await send(visitor), { visitors: 2, likes: 0, liked: false });
});

test("likes are idempotent, reversible, and restored for a returning browser", async () => {
  const visitor = randomUUID();
  const likes = await Promise.all(Array.from({ length: 20 }, () => send(visitor, "like", true)));
  for (const result of likes) assert.deepEqual(result, { visitors: 1, likes: 1, liked: true });
  assert.deepEqual(await send(visitor), { visitors: 1, likes: 1, liked: true });
  assert.deepEqual(await send(visitor, "like", false), { visitors: 1, likes: 0, liked: false });
  assert.deepEqual(await send(visitor, "like", false), { visitors: 1, likes: 0, liked: false });
  await send(randomUUID(), "like", true);
  assert.deepEqual(await send(visitor, "like", true), { visitors: 2, likes: 2, liked: true });
});

test("invalid input and cross-origin writes cannot alter counts", async () => {
  const visitor = randomUUID();
  for (const [request, status] of [
    [post("invalid"), 400],
    [post(visitor, "invalid"), 400],
    [post(visitor, "like", "true"), 400],
    [post(visitor, "visit", undefined, { Origin: "https://other.test" }), 403],
    [post(visitor, "visit", undefined, { "Content-Type": "text/plain" }), 415],
    [post(visitor, "visit", undefined, { "Content-Length": "2048" }), 413],
    [new Request("https://article.test/api/article-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), 400],
  ]) assert.equal((await handle(request, env, fetchRedis)).status, status);
  assert.equal(await command(["DBSIZE"]), 0);
});

test("the API supports an explicitly allowed new article location", async () => {
  const next = { ...env, ARTICLE_STATS_ORIGINS: "https://new-article.test" };
  const headers = { Origin: "https://new-article.test" };
  const preflight = await handle(new Request("https://article.test/api/article-stats", { method: "OPTIONS", headers }), next, fetchRedis);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), headers.Origin);
  const response = await handle(post(randomUUID(), "visit", undefined, headers), next, fetchRedis);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), headers.Origin);
});

test("rate limiting caps requests and stores no raw IP address", async () => {
  const visitor = randomUUID();
  for (let i = 0; i < 120; i++) await send(visitor);
  const response = await handle(post(visitor), env, fetchRedis);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  const keys = await command(["KEYS", "article:every-word:rate:*"]);
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^article:every-word:rate:[0-9a-f]{64}$/);
  const ttl = await command(["TTL", keys[0]]);
  assert(ttl > 0 && ttl <= 60);
});

test("missing storage, upstream failures, and unsupported methods fail honestly", async () => {
  const request = () => post(randomUUID());
  assert.equal((await handle(request(), {}, fetchRedis)).status, 503);
  for (const fetcher of [
    async () => new Response("Unavailable", { status: 503 }),
    async () => Response.json({ error: "Storage error" }),
    async () => Response.json({ result: [1, -1, 0] }),
    async () => { throw new Error("Disconnected"); },
  ]) assert.equal((await handle(request(), env, fetcher)).status, 503);
  const response = await handle(new Request("https://article.test/api/article-stats", { method: "DELETE" }), env, fetchRedis);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, POST, OPTIONS");
});

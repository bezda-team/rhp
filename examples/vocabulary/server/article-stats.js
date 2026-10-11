import { createHmac } from "node:crypto";

// One atomic operation makes visits and desired like states safe to retry, including simultaneous requests.
export const update = `
local requests = redis.call('INCR', KEYS[3])
if requests == 1 then redis.call('EXPIRE', KEYS[3], 60) end
if requests > 120 then return {-1, 0, 0} end
redis.call('SADD', KEYS[1], ARGV[1])
if ARGV[2] == 'like' then
  if ARGV[3] == '1' then redis.call('SADD', KEYS[2], ARGV[1])
  else redis.call('SREM', KEYS[2], ARGV[1]) end
end
return {redis.call('SCARD', KEYS[1]), redis.call('SCARD', KEYS[2]), redis.call('SISMEMBER', KEYS[2], ARGV[1])}
`;

const read = `return {redis.call('SCARD', KEYS[1]), redis.call('SCARD', KEYS[2]), 0}`;
const prefix = "article:every-word";

export async function handle(request, env = process.env, fetchRedis = fetch) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, ...(env.ARTICLE_STATS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)]);
  const headers = { "Cache-Control": "no-store", "Vary": "Origin" };
  const respond = (body, status = 200) => Response.json(body, { status, headers });
  if (origin && !allowed.has(origin)) return respond({ error: "Origin not allowed" }, 403);
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  if (request.method === "OPTIONS") {
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    return new Response(null, { status: 204, headers });
  }
  if (!["GET", "POST"].includes(request.method)) {
    headers.Allow = "GET, POST, OPTIONS";
    return respond({ error: "Method not allowed" }, 405);
  }

  let visitor;
  let action;
  let liked;
  if (request.method === "POST") {
    if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) return respond({ error: "Expected JSON" }, 415);
    if (Number(request.headers.get("content-length")) > 1024) return respond({ error: "Request too large" }, 413);
    try {
      const text = await request.text();
      if (text.length > 1024) return respond({ error: "Request too large" }, 413);
      ({ visitor, action, liked } = JSON.parse(text));
    } catch {
      return respond({ error: "Invalid request" }, 400);
    }
    if (typeof visitor !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitor)
      || !["visit", "like"].includes(action) || (action === "like" && typeof liked !== "boolean")) {
      return respond({ error: "Invalid request" }, 400);
    }
  }

  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (!url || !token) return respond({ error: "Counts unavailable" }, 503);
  const hash = (value) => createHmac("sha256", token).update(value).digest("hex");
  // IP addresses are stored only as keyed hashes, and the rate-limit keys expire after a minute.
  const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const keys = [`${prefix}:visitors`, `${prefix}:likes`, `${prefix}:rate:${hash(ip)}`];
  const command = visitor
    ? ["EVAL", update, 3, ...keys, visitor.toLowerCase(), action, liked ? "1" : "0"]
    : ["EVAL", read, 2, ...keys.slice(0, 2)];
  try {
    const response = await fetchRedis(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Redis unavailable");
    const { result, error } = await response.json();
    if (error || !Array.isArray(result) || result.length !== 3 || !result.every(Number.isSafeInteger)) throw new Error("Invalid Redis response");
    if (result[0] === -1) {
      headers["Retry-After"] = "60";
      return respond({ error: "Please try again shortly" }, 429);
    }
    if (result[0] < 0 || result[1] < 0 || ![0, 1].includes(result[2])) throw new Error("Invalid counts");
    return respond({ visitors: result[0], likes: result[1], liked: result[2] === 1 });
  } catch {
    return respond({ error: "Counts unavailable" }, 503);
  }
}

export default { fetch: (request) => handle(request) };

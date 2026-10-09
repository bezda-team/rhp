// Polite HTTP with a disk cache.
// Every response is kept gzipped in cache/http/<host>/, so running a step again downloads nothing.
// Each host gets its own queue: MusicBrainz asks for one request a second, the others get a few at a time.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "cache", "http");

const AGENT = "rhp-vocabulary-example/1.0 (https://github.com/bezda-team/rhp)";
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const HOSTS = {
  "musicbrainz.org": { gap: 1100, parallel: 1, agent: AGENT },
  "en.wikipedia.org": { gap: 100, parallel: 2, agent: AGENT },
  "commons.wikimedia.org": { gap: 200, parallel: 2, agent: AGENT },
  "genius.com": { gap: 150, parallel: 4, agent: BROWSER },
  // Genius limits its search far more than its other pages: one search every two seconds
  "genius.com/search": { gap: 2000, parallel: 1, agent: BROWSER },
  "www.gutenberg.org": { gap: 500, parallel: 1, agent: AGENT },
};

const queues = {};

function queue(host) {

  if (!queues[host]) {
    const rule = HOSTS[host] ?? { gap: 250, parallel: 2, agent: AGENT };
    queues[host] = { rule, running: 0, waiting: [], last: 0, pause: 0 };
  }

  return queues[host];
}

async function turn(q) {

  while (q.running >= q.rule.parallel) {
    await new Promise((resolve) => q.waiting.push(resolve));
  }

  q.running++;
  if (q.pause > Date.now()) await new Promise((resolve) => setTimeout(resolve, q.pause - Date.now()));
  const wait = q.last + q.rule.gap - Date.now();
  q.last = Math.max(Date.now(), q.last + q.rule.gap);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function done(q) {

  q.running--;
  q.waiting.shift()?.();
}

function file(url) {

  const { host } = new URL(url);
  const hash = createHash("sha1").update(url).digest("hex");
  return join(CACHE, host, hash.slice(0, 2), hash + ".gz");
}

// The body of `url` as text, from the cache when we have it.
// A 404 is cached as null, so a missing page is not asked for again.
export async function text(url) {

  const path = file(url);

  try {
    const body = gunzipSync(await readFile(path)).toString("utf8");
    return body === "\u0000404" ? null : body;
  } catch {}

  const { host, pathname } = new URL(url);
  const q = queue(host + (host === "genius.com" && pathname.startsWith("/api/search") ? "/search" : ""));

  for (let attempt = 1; ; attempt++) {
    await turn(q);
    let response;

    try {
      response = await fetch(url, { headers: { "user-agent": q.rule.agent, accept: "*/*" } });
    } catch (error) {
      done(q);
      if (attempt >= 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      continue;
    }

    done(q);

    if (response.status === 404) {
      await save(path, "\u0000404");
      return null;
    }

    // Rate limits and server errors: the whole host waits, longer each time, then this request tries again
    if (response.status === 429 || response.status === 503 || response.status >= 500) {
      if (attempt >= 10) throw new Error(`${response.status} for ${url}`);
      const after = (+response.headers.get("retry-after") || 0) * 1000;
      const wait = Math.max(after, Math.min(120000, 5000 * 2 ** (attempt - 1)));
      q.pause = Math.max(q.pause, Date.now() + wait);
      console.warn(`${response.status} from ${new URL(url).host}: waiting ${Math.round(wait / 1000)} s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
      continue;
    }

    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    const body = await response.text();
    await save(path, body);
    return body;
  }
}

export async function json(url) {

  const body = await text(url);
  return body == null ? null : JSON.parse(body);
}

async function save(path, body) {

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, gzipSync(body));
}

// Runs `work` on every item, `parallel` at a time, in order of the list.
export async function each(items, parallel, work) {

  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await work(items[i], i);
    }
  };

  await Promise.all(Array.from({ length: parallel }, worker));
}

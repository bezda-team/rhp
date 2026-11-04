// The race calls of the decision desks whose results files no other site may read from a browser (NBC News and
// CBS News), read here on the server and passed on as calls only:
//   GET -> { NBC: { "S-GA": { party, last, first }, ... }, CBS: { ... }, at }
// A race's key is the article's own (S-GA, G-GA, H-GA-7; see src/feed/desks.js, which reads the other desks itself).
// Every reader gets the same copy: the CDN keeps it 20 seconds, so the desks' files are read about three times a
// minute however many people read the article. A desk whose file fails keeps its last good calls.
// The website's article sync copies this file to its api/ folder; the article's dev server (site.mjs) serves it too.

const UA = { "User-Agent": "rhp-election-night/1.0 (+https://rhp.vercel.app/gallery/articles/election-night/)" };

const FIPS = {
  1: "AL", 2: "AK", 4: "AZ", 5: "AR", 6: "CA", 8: "CO", 9: "CT", 10: "DE", 11: "DC", 12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL",
  18: "IN", 19: "IA", 20: "KS", 21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA", 26: "MI", 27: "MN", 28: "MS", 29: "MO", 30: "MT",
  31: "NE", 32: "NV", 33: "NH", 34: "NJ", 35: "NM", 36: "NY", 37: "NC", 38: "ND", 39: "OH", 40: "OK", 41: "OR", 42: "PA", 44: "RI",
  45: "SC", 46: "SD", 47: "TN", 48: "TX", 49: "UT", 50: "VT", 51: "VA", 53: "WA", 54: "WV", 55: "WI", 56: "WY",
};

const party = (p) => (p === "DEM" || p === "Dem" || p === "D" ? "D" : p === "REP" || p === "GOP" || p === "Rep" || p === "R" ? "R" : "I");
const key = (office, st, district) => (office === "H" ? `H-${st}-${+district || 1}` : `${office}-${st}`);

// Each desk's files, and how one becomes calls
const DESKS = {
  NBC: {
    files: ["senate", "governor", "house"].map((o) => `https://www.nbcnews.com/firecracker/api/v2/national-results/2026-elections/${o}-results`),
    read(file, url) {

      // Called: P projected, A apparent winner, W winner. Keys: GA, FL~P (a special), and for the House 1205 (FIPS + district)
      const out = {};
      const office = url.includes("/senate-") ? "S" : url.includes("/governor-") ? "G" : "H";
      for (const [k, v] of Object.entries(file.mapData || {})) {
        const t = v.tooltip;
        if (!t || !["P", "A", "W"].includes(t.callStatusCode)) continue;
        const w = (t.candidates || []).find((c) => c.isWinner);
        if (!w) continue;
        const house = /^\d{4}$/.test(k);
        const st = house ? FIPS[+k.slice(0, 2)] : k.split("~")[0];
        if (!st) continue;
        out[key(house ? "H" : office, st, house ? +k.slice(2) : null)] = { party: party(w.party), last: w.lastName, first: w.firstName };
      }

      return out;
    },
  },
  CBS: {
    files: ["https://www.cbsnews.com/election-api/2026/general-races.json"],
    read(file) {

      const out = {};
      for (const r of file.races || []) {
        if (!["S", "G", "H"].includes(r.office) || r.callStatus !== "W") continue;
        const w = (r.candidates || []).find((c) => c.isWinner);
        if (!w) continue;
        out[key(r.office, r.stateCode, r.jurisdictionCode)] = { party: party(w.party), last: w.lastName, first: w.firstName };
      }

      return out;
    },
  },
};

// The last good calls of each desk, kept while this function stays warm
const last = {};

export async function handle(request, fetchDesk = fetch) {

  if (request.method !== "GET" && request.method !== "HEAD") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const out = { at: new Date().toISOString() };

  await Promise.all(Object.entries(DESKS).map(async ([desk, { files, read }]) => {
    try {
      const calls = {};
      for (const url of files) {
        const response = await fetchDesk(url, { headers: UA, signal: AbortSignal.timeout(6000) });
        if (!response.ok) throw new Error(`${desk}: HTTP ${response.status}`);
        Object.assign(calls, read(await response.json(), url));
      }
      last[desk] = calls;
      out[desk] = calls;
    } catch {
      if (last[desk]) out[desk] = last[desk];
    }
  }));

  return Response.json(out, { headers: { "Cache-Control": "public, max-age=10, s-maxage=20, stale-while-revalidate=40" } });
}

export default { fetch: (request) => handle(request) };

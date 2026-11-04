// Race calls from several news organizations' decision desks. The vote counts stay the AP's; each desk adds only
// its own calls. A race's key is the same in every source: S-GA, G-GA, H-GA-7.

// Each desk, and where a reader can check its call. The AP's results are linked as The New York Times shows them,
// since that is where this page reads them.
const slug = (r) => r.stateName.toLowerCase().replace(/ /g, "-");
const CNN_KIND = (r) => (r.office === "H" ? (r.special ? "2026-HQ" : "2026-HG") : r.office === "G" ? "2026-GG" : r.special ? "2026-SP" : "2026-SG");
const NBC_PAGE = (r) => (r.office === "H" ? `${slug(r)}-us-house-district-${r.district || 1}` : `${slug(r)}-${r.office === "S" ? "senate" : "governor"}`);
export const DESKS = [
  { id: "AP", name: "The Associated Press", source: "AP results on nytimes.com", link: (r) => r.url },
  { id: "CNN", name: "CNN", source: "CNN results", link: (r) => (r.fips ? `https://www.cnn.com/election/2026?election-data-id=${CNN_KIND(r)}&admin1=${+r.fips}` : "https://www.cnn.com/election/2026") },
  { id: "NBC", name: "NBC News", source: "NBC News results", relayed: true, link: (r) => `https://www.nbcnews.com/politics/2026-elections/${NBC_PAGE(r)}-results` },
  { id: "Fox", name: "Fox News", source: "Fox News results", link: (r) => `https://www.foxnews.com/elections/2026/midterm-results/state/${slug(r)}` },
  { id: "CBS", name: "CBS News", source: "CBS News results", relayed: true, link: (r) => `https://www.cbsnews.com/midterms/2026/${slug(r)}/` },
].filter((d) => !d.relayed || import.meta.env.DEV);
// NBC News and CBS News allow no other site to read their files: only the local dev server relays them (site.mjs).
// A published copy reads the desks whose files any page may read.
export const deskOf = (id) => DESKS.find((d) => d.id === id);

const party = (p) => (p === "DEM" || p === "Dem" || p === "D" ? "D" : p === "REP" || p === "GOP" || p === "Rep" || p === "R" ? "R" : "I");

const FIPS = {
  1: "AL", 2: "AK", 4: "AZ", 5: "AR", 6: "CA", 8: "CO", 9: "CT", 10: "DE", 11: "DC", 12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL",
  18: "IN", 19: "IA", 20: "KS", 21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA", 26: "MI", 27: "MN", 28: "MS", 29: "MO", 30: "MT",
  31: "NE", 32: "NV", 33: "NH", 34: "NJ", 35: "NM", 36: "NY", 37: "NC", 38: "ND", 39: "OH", 40: "OK", 41: "OR", 42: "PA", 44: "RI",
  45: "SC", 46: "SD", 47: "TN", 48: "TX", 49: "UT", 50: "VT", 51: "VA", 53: "WA", 54: "WV", 55: "WI", 56: "WY",
};

// A race's key in every source: S-GA, G-GA, H-GA-7. Florida and Ohio elect only a special senator tonight, so a
// Senate key needs no mark; Texas's 18th District holds a special House election beside its regular one.
const key = (office, st, district, special) => `${office === "H" ? `H-${st}-${+district || 1}` : `${office}-${st}`}${office === "H" && special ? "-special" : ""}`;
export const keyOf = (r) => key(r.office, r.state, r.district, r.special);

// NBC and CBS send no CORS header: the page reads them through its own relay (site.mjs in development)
const relay = (path) => `${self.location.origin}/relay/${path}`;
const winnerOf = (list, isWinner) => list.find(isWinner);

// The files each desk is read from, and how a file becomes calls: key -> { party, last, first, at? }
export const SOURCES = {
  AP: { files: [], read: null },
  CNN: {
    files: ["SG", "GG", "HG"].map((k) => `https://politics.api.cnn.io/results/national-races/2026-${k}.json`),
    read(file) {

      const out = {};
      for (const r of file) {
        // Only released calls: the feed can hold a call under embargo until the polls close
        const winner = r.candidates.find((c) => c.winner);
        if (!winner || r.status !== "W" || r.editorialStatus !== "called" || r.raceEmbargo?.callsReleased !== true) continue;
        // 2026-SG-GA, 2026-SP-FL (a special), 2026-GG-GA, 2026-HG-GA-7, 2026-HQ-TX-18 (a special); skip any other kind
        const [, kind, st, district] = r.ecKey.split("-");
        const office = { S: "S", G: "G", H: "H" }[kind[0]];
        if (!office) continue;
        out[key(office, st, district, kind === "HQ")] = { party: party(winner.majorParty), last: winner.lastName, first: winner.firstName };
      }

      return out;
    },
  },
  NBC: {
    files: import.meta.env.DEV ? ["senate", "governor", "house"].map((o) => relay(`nbc/${o}-results`)) : [],
    read(file) {

      // Called: P projected, A apparent winner, W winner. Keys: GA, FL~P (a special), and for the House 1205 (FIPS + district)
      const out = {};
      const office = { senate: "S", governor: "G", house: "H" }[String(file.office || "").toLowerCase()] || (Object.keys(file.mapData || {}).some((k) => /^\d{4}$/.test(k)) ? "H" : null);
      for (const [k, v] of Object.entries(file.mapData || {})) {
        const t = v.tooltip;
        if (!t || !["P", "A", "W"].includes(t.callStatusCode)) continue;
        const w = winnerOf(t.candidates || [], (c) => c.isWinner);
        if (!w) continue;
        let o = office, st, district = null;
        if (/^\d{4}$/.test(k)) [o, st, district] = ["H", FIPS[+k.slice(0, 2)], +k.slice(2)];
        else st = k.split("~")[0];
        if (!st || !o) continue;
        out[key(o, st, district, false)] = { party: party(w.party), last: w.lastName, first: w.firstName };
      }

      return out;
    },
  },
  Fox: {
    files: ["Senate/national_level_results", "Governor/national_level_results", "House/national_level_summary"].map((f) => `https://feeds-elections.foxnews.com/archive/politics/elections/2026/3/2026_Generals/${f}/file.json`),
    read(file) {

      const out = {};
      const house = file.some?.((r) => r.districtNumber != null);
      const office = house ? "H" : file.some?.((r) => r.classNumber != null) ? "S" : "G";
      for (const r of file) {
        if (r.called !== 1) continue;
        const w = winnerOf(r.results || [], (c) => c.isWinner);
        if (!w) continue;
        out[key(office, r.stateCode, r.districtNumber, false)] = { party: party(w.partyCode), last: w.candidate.lastName, first: w.candidate.firstName, at: r.winnerTime || undefined };
      }

      return out;
    },
  },
  CBS: {
    files: import.meta.env.DEV ? [relay("cbs/general-races.json")] : [],
    read(file) {

      const out = {};
      for (const r of file.races || []) {
        if (!["S", "G", "H"].includes(r.office) || r.callStatus !== "W") continue;
        const w = winnerOf(r.candidates || [], (c) => c.isWinner);
        if (!w) continue;
        out[key(r.office, r.stateCode, r.jurisdictionCode, false)] = { party: party(w.party), last: w.lastName, first: w.firstName };
      }

      return out;
    },
  },
};

const same = (a, b) => a && b && a.toLowerCase().replace(/[^a-z]/g, "") === b.toLowerCase().replace(/[^a-z]/g, "");

// Each desk's call on a race, and the race as the chosen desk sees it: "any" takes the first desk to call it
export function applyCalls(r, calls, desk, now = Date.now()) {

  const list = [];
  const ap = r.cands.find((c) => c.won);
  if (ap) list.push({ org: "AP", party: ap.party, cand: ap.id, at: r.calledAt });

  for (const [org, call] of Object.entries(calls)) {
    if (org === "AP" || !call) continue;
    // A call names its winner: match the candidate by name, and never guess one
    const cand = r.cands.find((c) => same(c.last, call.last) && c.party === call.party) || r.cands.find((c) => same(c.last, call.last));
    if (cand) list.push({ org, party: cand.party, cand: cand.id, at: call.at, before: call.before });
  }

  list.sort((a, b) => (a.at || "9") < (b.at || "9") ? -1 : 1);
  const chosen = desk === "any" ? list[0] : list.find((c) => c.org === desk);

  for (const c of r.cands) {
    c.won = chosen ? c.id === chosen.cand : false;
  }

  const winner = chosen ? r.cands.find((c) => c.id === chosen.cand) : null;
  if (r.status !== "runoff") {
    if (chosen) r.status = "called";
    else if (r.total > 0) r.status = "counting";
    else if (r.closesAt && Date.parse(r.closesAt) <= now) r.status = "closed";
    else r.status = "upcoming";
  }

  r.calls = list;
  r.winner = winner?.party || null;
  r.calledAt = chosen?.at || null;
  r.calledBy = chosen ? list.filter((c) => c.cand === chosen.cand).map((c) => c.org) : [];
  r.split = new Set(list.map((c) => c.cand)).size > 1;
  r.flip = winner && r.holder ? winner.party !== r.holder : null;
  return r;
}

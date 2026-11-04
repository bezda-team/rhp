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
  { id: "NBC", name: "NBC News", source: "NBC News results", link: (r) => `https://www.nbcnews.com/politics/2026-elections/${NBC_PAGE(r)}-results` },
  { id: "Fox", name: "Fox News", source: "Fox News results", link: (r) => `https://www.foxnews.com/elections/2026/midterm-results/state/${slug(r)}` },
  { id: "CBS", name: "CBS News", source: "CBS News results", link: (r) => `https://www.cbsnews.com/midterms/2026/${slug(r)}/` },
];
export const deskOf = (id) => DESKS.find((d) => d.id === id);

const party = (p) => (p === "DEM" || p === "Dem" || p === "D" ? "D" : p === "REP" || p === "GOP" || p === "Rep" || p === "R" ? "R" : "I");

// A race's key in every source: S-GA, G-GA, H-GA-7. Florida and Ohio elect only a special senator tonight, so a
// Senate key needs no mark; Texas's 18th District holds a special House election beside its regular one.
const key = (office, st, district, special) => `${office === "H" ? `H-${st}-${+district || 1}` : `${office}-${st}`}${office === "H" && special ? "-special" : ""}`;
export const keyOf = (r) => key(r.office, r.state, r.district, r.special);

// NBC News and CBS News let no other site read their files from a browser: the article's server reads them and passes
// on their calls (server/election-calls.js, at /api/election-night-calls on the site and on the dev server). A copy
// without that server finds no such file, and the page leaves those desks out.
const RELAY = `${self.location.origin}/api/election-night-calls`;
const winnerOf = (list, isWinner) => list.find(isWinner);

// A relayed desk's calls, or an error when the relay has none for it (its file failed since the relay started)
function relayed(file, desk) {

  if (!file || typeof file !== "object" || !file[desk]) throw new Error(`No ${desk} calls`);
  return file[desk];
}

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
    files: [RELAY],
    read: (file) => relayed(file, "NBC"),
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
    files: [RELAY],
    read: (file) => relayed(file, "CBS"),
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

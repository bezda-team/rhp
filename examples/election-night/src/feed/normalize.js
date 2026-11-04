// Turns the results files (AP results, as the New York Times serves them to its live pages) into the few fields
// the article draws. Pure functions: the worker runs them, and Node runs them in the tests.

export const DAY = "2026-11-03";
export const BASE = `https://static01.nyt.com/elections-assets/pages/data/${DAY}`;

export const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

// Seats not on the ballot tonight. The Senate's come with the feed; governors elected in 2024 and 2025, or due in 2027, do not.
export const GOVERNORS_NOT_UP = {
  DE: "D", KY: "D", NJ: "D", NC: "D", VA: "D", WA: "D",
  IN: "R", LA: "R", MS: "R", MO: "R", MT: "R", ND: "R", UT: "R", WV: "R",
};

export const OFFICE = { S: "Senate", G: "Governor", H: "House" };

const AT_LARGE = new Set(["AK", "DE", "ND", "SD", "VT", "WY"]);
const isCandidate = (meta, id) => meta[id] && !id.includes("writein");

export const party = (id) => (id === "DEM" ? "D" : id === "GOP" ? "R" : "I");

const RATING = {
  "solid-dem": "Solid D", "likely-dem": "Likely D", "lean-dem": "Lean D", tossup: "Toss-up",
  "lean-rep": "Lean R", "likely-rep": "Likely R", "solid-rep": "Solid R",
};
// Toss-ups first, then the leaning races, then the likely ones
const CLOSENESS = { tossup: 0, "lean-dem": 1, "lean-rep": 1, "likely-dem": 2, "likely-rep": 2, "solid-dem": 3, "solid-rep": 3 };

const round = (v, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;

// The 2024 presidential margin in a reporting unit, Democrat minus Republican, in points
function pres24(unit) {

  const history = unit?.historical_comparison_race_data || {};
  for (const [id, h] of Object.entries(history)) {
    if (id.includes("-P-2024")) return h.margin;
  }

  return null;
}

// One race, from its record in an office file or a race file
export function race(r, closings, now = Date.now()) {

  const top = r.top_reporting_unit;
  const meta = r.candidate_metadata || {};
  const state = top.state_postal;
  const office = r.office_id;
  const special = r.nyt_id.split("-")[1].includes("S_");
  const district = office === "H" ? (r.seat_number && +r.seat_number) || null : null;
  const atLarge = office === "H" && AT_LARGE.has(state);
  const won = r.outcome?.won || [];
  const runoff = r.outcome?.advanced_to_runoff || [];

  const cands = top.candidates
    .filter((c) => isCandidate(meta, c.nyt_id))
    .map((c) => {
      const m = meta[c.nyt_id];
      return {
        id: c.nyt_id,
        cid: m.nyt_candidate_id,
        first: m.first_name,
        last: m.last_name,
        party: party(m.party?.nyt_id),
        partyName: m.party?.name || "",
        incumbent: !!m.incumbent,
        votes: c.votes?.total || 0,
        won: won.includes(c.nyt_id),
        runoff: runoff.includes(c.nyt_id),
        order: m.order ?? m.ballot_order ?? 99,
      };
    })
    .sort((a, b) => b.votes - a.votes || a.order - b.order);

  const total = top.total_votes || 0;
  const expected = top.total_expected_vote || 0;
  for (const c of cands) {
    c.pct = total ? round((c.votes / total) * 100) : 0;
  }

  const [first, second] = cands;
  const dem = cands.find((c) => c.party === "D");
  const rep = cands.find((c) => c.party === "R");
  const holder = cands.find((c) => c.incumbent)?.party || null;
  const winner = cands.find((c) => c.won) || null;
  const called = won.length > 0 || r.race_call_status === "called";
  const closesAt = closings?.[state] || null;

  let status = "upcoming";
  if (runoff.length) status = "runoff";
  else if (called) status = "called";
  else if (total > 0) status = "counting";
  else if (closesAt && Date.parse(closesAt) <= now) status = "closed";

  // The leader's margin over the runner-up, and the same margin signed by side: plus for a Democrat (or an
  // independent facing a Republican), minus for a Republican. Bars, maps and boards read the signed one.
  const margin = total && second ? round(((first.votes - second.votes) / total) * 100) : total ? 100 : 0;
  const leader = total ? first.party : null;
  const lean = leader == null ? 0 : leader === "R" ? -margin : margin;
  const dm = total && dem && rep ? round(((dem.votes - rep.votes) / total) * 100) : null;

  const label = office === "H"
    ? `${STATES[state]} ${atLarge ? "at large" : district}`
    : `${STATES[state]}${special ? " (special)" : ""}`;
  const short = office === "H" ? `${state}-${atLarge ? "AL" : district}` : `${state} ${office === "S" ? "Sen" : "Gov"}${special ? " special" : ""}`;

  return {
    id: r.nyt_id,
    office,
    state,
    stateName: STATES[state],
    district,
    special,
    label,
    short,
    slug: (r.url || "").split("/").pop().replace(/\.html$/, ""),
    url: r.url || null,
    fips: top.fips_state || null,
    rating: r.rating || null,
    ratingLabel: RATING[r.rating] || "Not rated",
    closeness: CLOSENESS[r.rating] ?? 4,
    uncontested: !!r.uncontested,
    status,
    closesAt,
    calledAt: r.outcome?.winner_accepted_at?.[0] || null,
    calledBy: (r.outcome?.called_by || []).map((p) => (p === "ap" ? "AP" : p.toUpperCase())),
    eevp: round(top.eevp || 0, 1),
    total,
    expected,
    remaining: Math.max(0, expected - total),
    cands,
    leader,
    margin,
    lean,
    dm,
    pres24: pres24(top),
    holder,
    winner: winner?.party || null,
    flip: called && winner && holder ? winner.party !== holder : null,
    gained: r.outcome?.gained ?? null,
    updatedAt: top.provider_updated_at || r.updated_at || null,
  };
}

// The poll closing time of each state (the last one, where a state closes in two time zones)
export function closingTimes(file) {

  const out = {};
  for (const c of file.pollClosingTimes || []) {
    const st = c.reporting_unit?.state_postal;
    if (st && (!out[st] || c.poll_closing_time > out[st])) out[st] = c.poll_closing_time;
  }

  return out;
}

// Seats by party: not up tonight, won, leading in the count, and still open
export function control(office, races, file) {

  const tally = () => ({ D: 0, R: 0, I: 0 });
  const notUp = tally();
  const won = tally();
  const leading = tally();
  let total = 0;
  let toWin = {};

  if (office === "G") {
    for (const p of Object.values(GOVERNORS_NOT_UP)) {
      notUp[p]++;
    }
    total = 50;
    toWin = { D: 26, R: 26 };
  } else {
    const o = file?.partyControlData?.results?.[0]?.offices?.[office];
    if (o) {
      notUp.D = o.party_balance.DEM?.no_election || 0;
      notUp.R = o.party_balance.GOP?.no_election || 0;
      notUp.I = o.party_balance.OTH?.no_election || 0;
      total = o.total;
      toWin = { D: o.to_win.DEM, R: o.to_win.GOP };
    } else {
      total = office === "S" ? 100 : 435;
      toWin = office === "S" ? { D: 51, R: 50 } : { D: 218, R: 218 };
    }
  }

  let open = 0;
  let flips = { D: 0, R: 0, I: 0 };

  for (const r of races) {
    if (r.office !== office) continue;
    if (r.status === "called" && r.winner) {
      won[r.winner]++;
      if (r.flip) flips[r.winner]++;
    } else if (r.status === "counting" && r.leader) leading[r.leader]++;
    else open++;
  }

  return { office, total, toWin, notUp, won, leading, open, flips };
}

// Every county part of every House race that has counted 95% of its expected vote, with both a Democrat and a
// Republican on the ballot, and its swing from the 2024 presidential margin there
export function countyShifts(file) {

  const out = [];

  for (const r of file.races || []) {
    if (r.uncontested) continue;
    const meta = r.candidate_metadata || {};
    const partyOf = (id) => party(meta[id]?.party?.nyt_id);

    for (const u of r.reporting_units || []) {
      if (u.level !== "county" || (u.eevp || 0) < 95 || !u.total_votes) continue;
      const before = pres24(u);
      if (before == null) continue;
      let d = 0, rep = 0;

      for (const c of u.candidates) {
        const p = meta[c.nyt_id] ? partyOf(c.nyt_id) : null;
        if (p === "D") d = Math.max(d, c.votes.total);
        if (p === "R") rep = Math.max(rep, c.votes.total);
      }

      if (!d || !rep) continue;
      const now = ((d - rep) / u.total_votes) * 100;
      out.push({ race: r.nyt_id, county: u.name, state: u.state_postal, votes: u.total_votes, now: round(now, 1), before: round(before, 1), shift: round(now - before, 1) });
    }
  }

  return out;
}

// The counties of a statewide race (or the county parts of a House district), from its race file
export function counties(r) {

  const meta = r.candidate_metadata || {};
  const out = [];

  for (const u of r.reporting_units || []) {
    if (u.level === "state" || u.level === "national") continue;
    const votes = {};
    for (const c of u.candidates) {
      if (isCandidate(meta, c.nyt_id)) votes[c.nyt_id] = c.votes.total;
    }
    const total = u.total_votes || 0;
    const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const lead = ranked[0] && total ? party(meta[ranked[0][0]].party?.nyt_id) : null;
    const margin = total && ranked[1] ? ((ranked[0][1] - ranked[1][1]) / total) * 100 : total ? 100 : 0;
    const d = Object.entries(votes).filter(([id]) => party(meta[id].party?.nyt_id) === "D").reduce((m, [, v]) => Math.max(m, v), 0);
    const rep = Object.entries(votes).filter(([id]) => party(meta[id].party?.nyt_id) === "R").reduce((m, [, v]) => Math.max(m, v), 0);
    out.push({
      id: u.nyt_id,
      name: u.name,
      level: u.level,
      eevp: round(u.eevp || 0, 1),
      total,
      expected: u.total_expected_vote || 0,
      remaining: Math.max(0, (u.total_expected_vote || 0) - total),
      votes,
      leader: lead,
      margin: round(margin, 1),
      lean: lead == null ? 0 : lead === "R" ? -round(margin, 1) : round(margin, 1),
      dm: total && d && rep ? round(((d - rep) / total) * 100, 1) : null,
      pres24: pres24(u),
    });
  }

  return out;
}

// How the count grew through the night: the total and each candidate's votes at every update
export function timeline(file, id) {

  const steps = file.timeseries?.[id] || [];
  return steps
    .filter((s) => s.total_votes > 0)
    .map((s) => ({
      t: s.greatest_updated_at,
      total: s.total_votes,
      votes: Object.fromEntries(s.candidates.filter((c) => !c.nyt_id.includes("writein")).map((c) => [c.nyt_id, c.votes.total])),
    }));
}

// Each main candidate's votes by how they were cast
export function voteTypes(r) {

  const meta = r.candidate_metadata || {};
  const out = {};
  for (const c of r.top_reporting_unit.candidates) {
    if (!isCandidate(meta, c.nyt_id)) continue;
    const v = c.votes || {};
    out[c.nyt_id] = {
      mail: v.absentee_mail ?? null,
      early: v.advance_in_person ?? null,
      advance: v.advance ?? null,
      day: v.election_day_in_person ?? null,
      provisional: v.provisional ?? null,
    };
  }

  return out;
}

// A race's file name, from its page's address: results-georgia-us-senate
export const raceFile = (slug) => `${BASE}/${slug}.json`;
export const officeFile = (office) => `${BASE}/results-${{ S: "senate", G: "governor", H: "house" }[office]}.json`;

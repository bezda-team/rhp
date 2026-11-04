// Seats in a line from the safest Democratic one to the safest Republican one.
// A called race sits at its winner's side; a race being counted by its margin, leaning on the race's rating
// while little is counted; a race with no votes yet by its rating alone.

const RATING_LEAN = { "solid-dem": 40, "likely-dem": 20, "lean-dem": 8, tossup: 0, "lean-rep": -8, "likely-rep": -20, "solid-rep": -40 };

const prior = (r) => RATING_LEAN[r.rating] ?? (r.holder === "D" ? 10 : r.holder === "R" ? -10 : 0);

// The Senate's line: called races at their ends, the rest by how they lean now
export function lineScore(r) {

  if (r.status === "called" && r.winner) return (r.winner === "R" ? -1000 : 1000) + r.lean;
  if (r.total > 0) {
    const w = Math.min(1, r.eevp / 50);
    return w * r.lean + (1 - w) * prior(r);
  }
  return prior(r);
}

// The House's groups, in order: called D, leading D, called and leading independents, no result, leading R, called R
export function group(r) {

  if (r.status === "called" && r.winner) return r.winner === "D" ? 0 : r.winner === "I" ? 2 : 5;
  if (r.status === "counting" && r.leader) return r.leader === "D" ? 1 : r.leader === "I" ? 2 : 4;
  return 3;
}

// The grid's order: by group, then by how far each race leans
export function groupScore(r) {

  return -group(r) * 1000 + (r.total > 0 ? r.lean : prior(r));
}
export const houseScore = groupScore;

// What each chamber's lines and grids need: the seats not on the ballot, and the seat that makes a majority
export const SEAT = { S: "seat", H: "seat", G: "governorship" };
export const MAJORITY = (office, c) => (office === "G" ? 26 : c.toWin.D);

// Each race's place in the line: 0 for the most Democratic
export function ranks(races, score) {

  const sorted = races.map((r) => [score(r), r.label, r.id]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
  const out = new Map();
  sorted.forEach(([, , id], i) => out.set(id, i));
  return { rank: out, order: sorted.map((s) => s[2]) };
}

export const median = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

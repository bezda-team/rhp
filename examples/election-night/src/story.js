// The sentences the article writes from the numbers. Each one must stay true for any state of the count.

import { PARTIES, votes } from "./format.js";

const has = (c, p) => c.notUp[p] + c.won[p];
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;

// Who controls a chamber now, and who would after tonight if every lead held
export function chamber(c) {

  const d = has(c, "D"), r = has(c, "R");
  const decided = d >= c.toWin.D ? "D" : r >= c.toWin.R ? "R" : null;
  const ifLeads = d + c.leading.D >= c.toWin.D ? "D" : r + c.leading.R >= c.toWin.R ? "R" : null;
  return { d, r, decided, ifLeads };
}

export function nationHeadline(ctl, races) {

  const S = chamber(ctl.S), H = chamber(ctl.H);
  const counting = races.some((x) => x.total > 0);

  if (S.decided && H.decided) {
    if (S.decided === H.decided) return `${PARTIES[S.decided]} win both chambers of Congress`;
    return `${PARTIES[S.decided]} win the Senate, ${PARTIES[H.decided]} the House`;
  }
  if (S.decided) return `${PARTIES[S.decided]} ${S.decided === "R" ? "keep" : "win"} control of the Senate`;
  if (H.decided) return `${PARTIES[H.decided]} ${H.decided === "R" ? "keep" : "win"} control of the House`;
  if (!counting) return "Polls are closing. The count is about to begin.";
  if (S.ifLeads && H.ifLeads && S.ifLeads !== H.ifLeads) return `Early counts favor ${PARTIES[S.ifLeads]} in the Senate and ${PARTIES[H.ifLeads]} in the House`;
  if (S.ifLeads) return `${PARTIES[S.ifLeads]} lead the count for control of the Senate`;
  return "Control of the Senate is too close to call";
}

export function nationDek(ctl) {

  const S = ctl.S, H = ctl.H;
  const sOpen = S.open + S.leading.D + S.leading.R + S.leading.I;
  const hOpen = H.open + H.leading.D + H.leading.R + H.leading.I;
  return `Democrats hold ${has(S, "D")} Senate seats and Republicans ${has(S, "R")}, counting the seats not on the ballot, with ${n(sOpen, "race", "races")} still uncalled.`
    + ` Democrats need ${S.toWin.D} for control and Republicans ${S.toWin.R}, since the vice president breaks ties.`
    + ` In the House, where ${H.toWin.D} seats make a majority, ${hOpen} of ${H.total} races are uncalled.`;
}

// The popular vote for the House, nationwide, so far
export function popular(p) {

  if (!p || !(p.D + p.R)) return null;
  const all = p.D + p.R + p.I;
  const d = (p.D / all) * 100, r = (p.R / all) * 100;
  return { d, r, lead: d > r ? "D" : "R", margin: Math.abs(d - r), total: votes(all) };
}

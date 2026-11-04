// Numbers, times and names as the article prints them

const int = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const clockSec = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" });
const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "America/New_York" });

export const votes = (n) => int.format(Math.round(n || 0));
export const short = (n) => compact.format(Math.round(n || 0));

// "5.3", "0.4", "12": the fewest decimals that tell a close race apart
export const pts = (v) => {
  const a = Math.abs(v);
  return a >= 10 ? Math.round(a).toString() : a.toFixed(1);
};
export const pct = (v) => (v >= 99.95 || v === 0 ? Math.round(v) : v.toFixed(1)) + "%";
// The share of the expected vote counted: "<1%" once votes are in but too few to show as 0.1%
export const counted = (r) => (r.total > 0 && r.eevp < 0.05 ? "<1%" : pct(r.eevp));

// Times in Eastern time, written as a newsroom does: 8:14 p.m.
const ampm = (s) => s.replace(" AM", " a.m.").replace(" PM", " p.m.");
export const et = (iso) => (iso ? ampm(clock.format(new Date(iso))) : "");
export const etSec = (iso) => (iso ? ampm(clockSec.format(new Date(iso))) : "");
// The viewer's own time for a moment, with their zone ("8 p.m. CST"), or null when they keep Eastern time
const localClock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const localZone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" });
export const here = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const local = ampm(localClock.format(d));
  if (local === et(iso)) return null;
  const zone = localZone.formatToParts(d).find((p) => p.type === "timeZoneName")?.value || "";
  return `${d.getMinutes() ? local : local.replace(":00", "")} ${zone}`.trim();
};
export const etHour = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const m = d.getUTCMinutes();
  return m ? et(iso) : ampm(hour.format(d)).replace(" a.m.", " a.m.").replace(/^12 a\.m\.$/, "midnight");
};

export const PARTY = { D: "Democrat", R: "Republican", I: "Independent" };
export const PARTIES = { D: "Democrats", R: "Republicans", I: "Independents" };
export const LETTER = { D: "D", R: "R", I: "I" };

// The theme's series keys: called races in the party's color, leads in its pale tint
export const tone = (p, solid) => (p === "D" ? (solid ? "series-1" : "series-4") : p === "R" ? (solid ? "series-2" : "series-5") : p === "I" ? (solid ? "series-3" : "series-6") : "surface");

export const name = (c) => (c ? `${c.first} ${c.last}` : "");
export const officeName = (o) => ({ S: "Senate", G: "Governor", H: "House" })[o];
export const officeLong = (r) => (r.office === "S" ? `U.S. Senate${r.special ? " special election" : ""}` : r.office === "G" ? "Governor" : `U.S. House, ${r.district ? `District ${r.district}` : "at large"}`);

// The two candidates a match-up shows: the Democrat on the left and the Republican on the right, or the two leaders
export function sides(r) {

  const c = r.cands;
  const d = c.find((x) => x.party === "D");
  const rep = c.find((x) => x.party === "R");
  if (d && rep) return [d, rep];
  const [a, b] = c;
  if (!b) return [a, null];
  // An independent against a Republican stands on the left
  if (b.party === "R" || a.party === "D") return [a, b];
  if (a.party === "R" || b.party === "D") return [b, a];
  return [a, b];
}

// What a race's status line says
export function statusText(r) {

  if (r.status === "called") return `Called${r.calledAt ? ` at ${et(r.calledAt)} ET` : ""}`;
  if (r.status === "runoff") return "Heads to a runoff";
  if (r.status === "counting") return `${counted(r)} counted`;
  if (r.status === "closed") return "Polls closed, no votes yet";
  return r.closesAt ? `Polls close at ${etHour(r.closesAt)} ET` : "Waiting";
}

// A title or a name reduced to lowercase letters and digits, for comparing spellings:
// "Got Ur Self a Gun" and "Got Ur Self A Gun!" are the same, and so are "JAY-Z", "Jay Z" and "JAŸ-Z".
// Text in parentheses or brackets is left out ("Rule (feat. Amerie)" is "rule"), and a $ is an s ("A$AP" is "ASAP").
// A title that is all brackets ("[Outro]") keeps what is inside them.

export function simple(title) {

  const plain = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, "and").replace(/\$/g, "s");
  return plain.replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9]/g, "") || plain.replace(/[^a-z0-9]/g, "");
}

function bigrams(s) {

  const set = new Map();

  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    set.set(g, (set.get(g) ?? 0) + 1);
  }

  return set;
}

// Whether a censored title ("F*** Em All") fits another ("Fuck 'Em All")
function censored(a, b) {

  const letters = (t) => t.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z*]/g, "");
  const [c, u] = a.includes("*") ? [a, b] : [b, a];
  if (!c.includes("*")) return false;
  return new RegExp("^" + letters(c).replace(/\*+/g, "[a-z]+") + "$").test(letters(u));
}

// The share of letter pairs two names have in common, from 0 to 1 (Dice's coefficient on bigrams)
export function dice(a, b) {

  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const x = bigrams(a);
  const y = bigrams(b);
  let shared = 0;

  for (const [g, n] of x) {
    shared += Math.min(n, y.get(g) ?? 0);
  }

  return (2 * shared) / (a.length - 1 + b.length - 1);
}

// How alike two titles are, from 0 to 1
export function alike(a, b) {

  if (censored(a, b)) return 0.95;
  a = simple(a);
  b = simple(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.9;
  const x = bigrams(a);
  const y = bigrams(b);
  let shared = 0;

  for (const [g, n] of x) {
    shared += Math.min(n, y.get(g) ?? 0);
  }

  return (2 * shared) / (a.length - 1 + b.length - 1 || 1);
}

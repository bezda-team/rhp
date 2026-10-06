export function validateScores(scores, key) {
  const labels = Object.keys(key).sort();
  const same = actual => JSON.stringify([...actual].sort()) === JSON.stringify(labels);
  if (!scores || !scores.entries || !Array.isArray(scores.ranking) || !same(Object.keys(scores.entries)) || !same(scores.ranking)) throw new Error("Scores and ranking must include every packet entry exactly once");
  for (const [label, entry] of Object.entries(scores.entries)) {
    for (const criterion of ["fidelity", "data", "design", "legibility", "overall"]) {
      if (!Number.isFinite(entry[criterion]) || entry[criterion] < 1 || entry[criterion] > 10) throw new Error(`${label}: ${criterion} must be between 1 and 10`);
    }
    for (const field of ["issues", "strengths"]) if (!Array.isArray(entry[field]) || entry[field].some(value => typeof value !== "string")) throw new Error(`${label}: ${field} must be a string array`);
  }
  if (typeof scores.notes !== "string") throw new Error("Judging notes must be a string");
  return scores;
}

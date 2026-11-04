// The candidates' free portraits (Wikimedia Commons) and introductions (Wikipedia), when the pipeline found them.
// import.meta.glob keeps the page working without either file.

const portraits = Object.values(import.meta.glob("../data/portraits.json", { eager: true, import: "default" }))[0] || {};
const people = Object.values(import.meta.glob("../data/people.json", { eager: true, import: "default" }))[0] || {};

export const portrait = (cid) => portraits[String(cid)] || null;
export const person = (cid) => people[String(cid)] || null;
export const hasPortraits = Object.keys(portraits).length > 0;

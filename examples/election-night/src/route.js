// Where the reader is: #/ (the nation), #/senate, #/house, #/governors, #/race/<id>, #/race/<id>/<county id>.
// And the race the reader points at anywhere on the page: every chart that shows it lights it.

import { createSignal } from "solid-js";

const parse = () => {
  const [page, id, sub] = location.hash.replace(/^#\/?/, "").split("/").map((s) => decodeURIComponent(s || ""));
  return { page: page || "nation", id: id || null, sub: sub || null };
};

export const [route, setRoute] = createSignal(parse());

window.addEventListener("hashchange", () => {
  const before = route();
  const next = parse();
  setRoute(next);
  if (before.page !== next.page || before.id !== next.id) window.scrollTo({ top: 0 });
});

export const go = (path) => {
  location.hash = path;
};
export const raceLink = (id, sub) => `#/race/${encodeURIComponent(id)}${sub ? `/${encodeURIComponent(sub)}` : ""}`;
export const officePage = { S: "senate", G: "governors", H: "house" };

export const [hot, setHot] = createSignal(null);

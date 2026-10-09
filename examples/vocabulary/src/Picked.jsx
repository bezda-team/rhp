// The rapper picked, wherever the reader is in the article: their face and name, a way back to their albums in the
// ranking, and a way to let them go

import { Show } from "solid-js";
import { byName, number } from "./data.js";
import { picked, setWanted } from "./state.js";
import { Face } from "./faces.jsx";
import { hold } from "./hold.js";

// Letting go closes the rapper's breakdown in the ranking, and the page shrinks: what is in the middle of the screen
// stays where it is. In the breakdown itself, which goes, that is the rapper's slat, which stays.
function letGo() {
  const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  const keep = el?.closest(".sheet")?.closest("[data-name]") ?? el;
  const fix = keep && !keep.closest(".picked") ? hold(keep) : null;
  setWanted({ name: null });
  fix?.();
}

export function Picked() {
  const a = () => byName.get(picked());
  return (
    <Show when={a()}>
      {(r) => (
        <aside class="picked" aria-label={`${r().name} is picked`}>
          <Face name={r().name} class="picked-face" />
          <span class="picked-text"><b>{r().name}</b><small>{number.format(r().unique)} different words, {r().albums.length} albums</small></span>
          <button type="button" class="picked-go" onClick={() => setWanted({ name: r().name, go: true })}>Their albums ↑</button>
          <button type="button" class="picked-close" aria-label="Let go of this rapper" onClick={letGo}>×</button>
        </aside>
      )}
    </Show>
  );
}

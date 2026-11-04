import { createSignal } from "solid-js";

const media = matchMedia("(max-width: 640px)");
export const [narrow, setNarrow] = createSignal(media.matches);
media.addEventListener("change", (e) => setNarrow(e.matches));

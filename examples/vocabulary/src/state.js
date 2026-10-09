// What the charts share, so that a choice in one shows in the others:
// - the rapper picked (opened in the ranking, lifted in the eras, laid over the median career's albums);
// - the rapper the pointer is on in any chart, shown in the ranking's readout;
// - the era the ranking shows, and the era chart's highlight;
// - a rapper another chart asks the ranking to open: { name, go } where go also scrolls to them, and name null closes.

import { createSignal } from "solid-js";

export const [picked, setPicked] = createSignal(null);
export const [pointed, setPointed] = createSignal(null);
export const [era, setEra] = createSignal("all");
export const [wanted, setWanted] = createSignal(null);

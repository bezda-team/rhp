// A rapper's face: their portrait from Wikimedia Commons, or their initials when there is no free one

import { Show } from "solid-js";
import portraits from "virtual:portraits";

export const PORTRAITS = portraits;

export function initials(name) {
  return name.replace(/^(the|a)\s+/i, "").split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// The face, as an <img> or a <span> of initials, for a circle the caller's CSS sizes. The same Face can be given
// another rapper (the readout's does), so the portrait is read through Show, which only draws the <img> with one.
export function Face(props) {
  return (
    <Show when={PORTRAITS[props.name]} fallback={<span class={`face initials ${props.class ?? ""}`} aria-hidden="true">{initials(props.name)}</span>}>
      {(portrait) => <img class={`face ${props.class ?? ""}`} src={portrait().src} alt="" loading="lazy" decoding="async" />}
    </Show>
  );
}

// "Photo: author, license", linked to the file's page on Commons
export function Credit(props) {
  return (
    <Show when={PORTRAITS[props.name]}>
      {(portrait) => (
        <span class="credit">
          Photo: <a href={portrait().page} target="_blank" rel="noopener">{portrait().author}</a>,{" "}
          {portrait().licenseUrl ? <a href={portrait().licenseUrl} target="_blank" rel="noopener">{portrait().license}</a> : portrait().license}
        </span>
      )}
    </Show>
  );
}

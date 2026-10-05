// Maps a place in a bundle back to the user's file, with the bundle's inline source map, so that an error thrown in
// a bundled chart says where it is in the chart's own code.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const DIGIT = Object.fromEntries([...B64].map((c, i) => [c, i]));

function decodeSegment(text) {

  const out = [];
  let value = 0;
  let shift = 0;

  for (const ch of text) {
    const digit = DIGIT[ch];
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      out.push(value & 1 ? -(value >> 1) : value >> 1);
      value = 0;
      shift = 0;
    }
  }

  return out;
}

// The source map in a bundle's text (its last sourceMappingURL comment, as a data URL), parsed into lines of segments
export function readMap(code) {

  const m = code.match(/\/\/# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)\s*$/);
  if (!m) return null;

  const map = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
  const lines = [];
  let source = 0;
  let line = 0;
  let column = 0;

  for (const text of map.mappings.split(";")) {
    const segments = [];
    let generated = 0;
    for (const part of text.split(",")) {
      if (!part) continue;
      const s = decodeSegment(part);
      generated += s[0];
      if (s.length >= 4) {
        source += s[1];
        line += s[2];
        column += s[3];
        segments.push([generated, source, line, column]);
      }
    }
    lines.push(segments);
  }

  return { sources: map.sources, lines };
}

// The user's file, line and column (1-based) for a line and column (1-based) in the bundle, or null
export function lookup(map, line, column) {

  const segments = map?.lines[line - 1];
  if (!segments?.length) return null;

  let best = null;

  for (const s of segments) {
    if (s[0] <= column - 1) best = s;
    else break;
  }

  best ??= segments[0];

  return { source: map.sources[best[1]], line: best[2] + 1, column: best[3] + 1 };
}

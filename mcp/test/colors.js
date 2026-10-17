import assert from "node:assert/strict";
import { colorBlind } from "../src/check/colors.js";

const background = (left, right = left) => {
  const image = { width: 30, height: 10, data: Buffer.alloc(30 * 10 * 4) };
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) image.data.set([...(x < 15 ? left : right), 255], (y * image.width + x) * 4);
  }
  return image;
};
const mark = (left, color, opacity = 1, names = []) => ({
  kind: "mark", color, opacity, names, chart: 0,
  boxes: [{ left, top: 0, right: left + 10, bottom: 10 }],
});

assert.deepEqual(colorBlind([
  mark(0, [114, 166, 183, 1], .28),
  mark(20, [114, 166, 183, 1], .28),
], background([12, 42, 55], [32, 62, 75]), 1), [], "One translucent series over a varying background must not become two series");

const confusing = [mark(0, [182, 72, 127, .55]), mark(10, [13, 118, 90, .55])];
assert(colorBlind(confusing, background([246, 242, 232]), 1).some(f => f.code === "colorblind"), "Different translucent paints still need a color-blindness check");
assert.deepEqual(colorBlind(confusing.map((m, i) => ({ ...m, names: [i ? "North America" : "South America"] })), background([246, 242, 232]), 1), [], "Direct names continue to distinguish similar series");
console.log("PASS series colors: varying backdrops, distinct paints, and direct labels");

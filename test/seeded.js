// The same random numbers on a server and in the browser: imported before anything that draws, so every chart's data
// comes out the same on both sides. seed(n) starts the sequence again, so a chart's numbers don't depend on how many the
// charts before it used.
let x = 1;
export const seed = (n) => { x = n; };
Math.random = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;

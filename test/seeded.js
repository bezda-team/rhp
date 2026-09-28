// The same random numbers on the server and in the browser, so both sides draw the same data.
// seed(n) restarts the sequence, so a chart's numbers don't depend on the charts before it.
let x = 1;
export const seed = (n) => { x = n; };
Math.random = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;

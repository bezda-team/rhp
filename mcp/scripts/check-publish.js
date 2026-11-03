// Stops `npm publish` when the package would not install from npm. Here @bezda/rhp is `file:..`, so that the tests
// check charts against this repository's build; published that way, an install gets an empty link for rhp and every
// check fails (0.1.11 went out so). npm runs this first (prepublishOnly): the range must be the rhp release's own.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

// The reason the package cannot be published, or null when it can
export function publishProblem(pkg, rhpVersion) {

  const range = pkg.dependencies?.["@bezda/rhp"];
  const want = `^${rhpVersion}`;
  if (range === want) return null;
  if (!/^\^\d+\.\d+\.\d+$/.test(range ?? "")) return `its @bezda/rhp dependency is "${range}", which an install from npm cannot resolve`;
  return `its @bezda/rhp dependency is "${range}", not this repository's rhp release, ${want}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const rhpVersion = read(path.join(here, "../../package.json")).version;
  const problem = publishProblem(read(path.join(here, "../package.json")), rhpVersion);
  if (problem) {
    console.error(`check-publish: not publishing: ${problem}.\nSet it first, as the README's "Publishing" says: npm pkg set dependencies.@bezda/rhp=^${rhpVersion}`);
    process.exit(1);
  }
}

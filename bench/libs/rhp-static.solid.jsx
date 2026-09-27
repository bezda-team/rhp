// rhp, static: each row is drawn once and keeps no signals, for data that doesn't change. A change draws every row again.
import { make } from "./rhp-css.solid.jsx";
export default { name: "rhp (static)", mount: make(undefined, true) };

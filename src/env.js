// Whether rhp is drawing on a server. Solid says so; rhp's own builds put the answer in its place (true in
// dist/server.js, false elsewhere), so a browser's build carries no server code and a server's no browser code.
export { isServer } from "solid-js/web";

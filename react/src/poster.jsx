// A magazine-style panel around a chart: kicker, headline, dek, the chart, a note. It is markup only: its look is the
// page's, and @bezda/rhp-react/posters.css has the gallery's looks to start from (<Poster look="day">). The chart inside
// takes its colors and font from the theme it is given. Any other prop goes on the panel: an example that follows the
// pointer listens there, over its key and its chart.
import { jsx, jsxs } from "react/jsx-runtime";

export function Poster({ look, kicker, title, dek, note, className, children, ...rest }) {
  return jsxs("figure", {
    ...rest,
    className: ["poster", look, className].filter(Boolean).join(" "),
    children: [
      jsxs("figcaption", {
        children: [
          jsx("span", { className: "kicker", children: kicker }),
          jsx("span", { className: "headline", children: title }),
          jsx("span", { className: "dek", children: dek }),
        ],
      }),
      children,
      note ? jsx("span", { className: "note", children: note }) : null,
    ],
  });
}

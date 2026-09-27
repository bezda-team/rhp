// Charts.css: a styled <table>, each bar's size a CSS variable. HTML and CSS only, like rhp.
import "charts.css";
export default { name: "Charts.css", mount(el, rows, { band }) {
  const table = document.createElement("table");
  table.className = "charts-css bar show-labels";
  table.style.cssText = `height:${rows.length * band}px;width:600px;--labels-size:100px;font:12px system-ui`;
  const body = document.createElement("tbody");
  const cells = rows.map((r) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th"); th.scope = "row"; th.textContent = r.name;
    const td = document.createElement("td"); td.style.setProperty("--size", r.value / 100);
    const span = document.createElement("span"); span.className = "data"; span.textContent = r.value;
    td.append(span); tr.append(th, td); body.append(tr);
    return { td, span };
  });
  table.append(body); el.append(table);
  return {
    update: (rows) => rows.forEach((r, i) => { cells[i].td.style.setProperty("--size", r.value / 100); cells[i].span.textContent = r.value; }),
    destroy: () => table.remove(),
  };
} };

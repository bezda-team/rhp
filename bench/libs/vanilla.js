// Plain DOM: a div per row, the bar's width set by hand. No axis, no animation: the floor.
export default { name: "Plain DOM (floor)", mount(el, rows, { band }) {
  el.innerHTML = "";
  const parts = rows.map((r) => {
    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:center;height:${band}px;font:12px system-ui`;
    const name = document.createElement("span"); name.textContent = r.name; name.style.cssText = "width:100px;text-align:right;padding-right:8px";
    const bar = document.createElement("div"); bar.style.cssText = `height:64%;background:#2a78d6;border-radius:2px;width:${r.value * 4.4}px`;
    const value = document.createElement("span"); value.textContent = r.value; value.style.paddingLeft = "5px";
    row.append(name, bar, value); el.append(row);
    return { bar, value };
  });
  return {
    update: (rows) => rows.forEach((r, i) => { parts[i].bar.style.width = r.value * 4.4 + "px"; parts[i].value.textContent = r.value; }),
    destroy: () => { el.innerHTML = ""; },
  };
} };

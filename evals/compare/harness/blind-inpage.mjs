// Remove visible library credits only in judging screenshots, preserving their layout space.
// Original poster HTML and the ordinary quality scan remain untouched.
export const BLINDING_VERSION = 2;
export async function blindCredits() {
  const brand = /\b(?:rhp|apexcharts?|amcharts?|semiotic|flint(?:-chart)?|chart\.js|highcharts|vega(?:-lite)?|d3(?:\.js)?)\b/i;
  const removed = [];
  const registries = new Set([globalThis.am5?.registry].filter(Boolean));
  for (const entry of performance.getEntriesByType("resource")) {
    const url = new URL(entry.name);
    if (url.hostname !== "cdn.jsdelivr.net" || !/^\/npm\/@amcharts\/amcharts5(?:@[^/]+)?\/(?:index\.js(?:\/\+esm)?|\+esm)$/.test(decodeURIComponent(url.pathname))) continue;
    // Reuse the already-loaded module instance when the poster uses ESM.
    const module = await import(entry.name);
    if (module.registry) registries.add(module.registry);
  }
  // amCharts 5 paints its logo on canvas, outside the DOM text/anchor scan.
  // This affects only the private judging render, never the delivered HTML.
  for (const root of [...registries].flatMap(registry => registry.rootElements)) {
    const logo = root._logo;
    if (!logo || logo.isDisposed?.() || logo.get("forceHidden")) continue;
    const bounds = logo.globalBounds();
    logo.set("forceHidden", true);
    removed.push({ kind: "canvas-logo", identity: "amCharts 5", bounds });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,noscript,title,template") || !brand.test(node.textContent)) continue;
    if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const range = document.createRange();
    range.selectNode(node);
    const rect = range.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const wrapper = parent instanceof SVGElement ? document.createElementNS("http://www.w3.org/2000/svg", "tspan") : document.createElement("span");
    wrapper.style.visibility = "hidden";
    node.replaceWith(wrapper);
    wrapper.append(node);
    removed.push({ kind: "text", text: node.textContent, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  }
  // Vector logos can retain a vendor link or an explicit logo/credit label.
  // A library name in a chart's accessible description is not visible branding.
  for (const element of document.querySelectorAll("a[href], [aria-label], [title]")) {
    const link = element.getAttribute("href") ?? "";
    const label = [element.getAttribute("aria-label"), element.getAttribute("title")].filter(Boolean).join(" ");
    const identity = [link, label].filter(Boolean).join(" ");
    const vendorLink = element.matches("a[href]") && brand.test(link);
    const namedLogo = brand.test(label) && /\b(?:logo|credit|powered by)\b/i.test(label);
    if (!(vendorLink || namedLogo) || !element.querySelector("svg,img,path") || !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    element.style.visibility = "hidden";
    removed.push({ kind: "logo", identity, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  }
  if (removed.some(item => item.kind === "canvas-logo")) {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }
  return removed;
}

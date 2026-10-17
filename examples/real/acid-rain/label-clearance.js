// Prefer 5px above the label's own stroke; move below only to avoid covering content.
export function labelCandidates({left, right, height, anchor, own, bands, top, bottom, series}) {
  const positions = [...new Set(bands.flatMap(band => [band.top - (band.gap ?? 5), band.bottom + (band.gap ?? 5) + height]))];
  const priority = end => Math.abs(end - (own.top - 5)) < .01 ? 0 : Math.abs(end - (own.bottom + 5 + height)) < .01 ? 1 : 2;
  return positions.map(end => ({left, right, top: end - height, bottom: end,
    cost: (priority(end) ? 1e12 : 0) + priority(end) * 1e9 + Math.abs(end - height / 2 - anchor) ** 2 + ((series === 'power') === (end < anchor) ? 0 : .01),
  })).filter(box => box.top >= top && box.bottom <= bottom && bands.every(band => box.bottom <= band.top - (band.gap ?? 5) + .01 || box.top >= band.bottom + (band.gap ?? 5) - .01));
}
export function chooseLabelPositions(groups) {
  const overlap = (a, b) => a.left < b.right + 5 && a.right + 5 > b.left && a.top < b.bottom + 5 && a.bottom + 5 > b.top;
  let best = null, score = Infinity;
  function visit(index, placed, cost) {
    if (cost >= score) return;
    if (index === groups.length) {best = placed;score = cost;return;}
    for (const candidate of groups[index]) if (placed.every(box => !overlap(box, candidate))) visit(index + 1, [...placed, candidate], cost + candidate.cost);
  }
  visit(0, [], 0);
  return best;
}
export function installDotLabels(poster, rows, format) {
  let frame = 0, slideFrame = 0, placements = new Map(), layoutKey = '', previousYear = null;
  const slides = new Map();
  const chart = poster.querySelector('.rhp-chart');
  const rect = el => el.getBoundingClientRect();
  const fixedBoxes = () => [...poster.querySelectorAll('.name .long,.name .short,.name strong,.axis-value,.rhp-label.year,.chart-heading p,.readout')].flatMap(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    return [...range.getClientRects()].filter(box => box.width && box.height);
  });
  function stroke(path) {
    const matrix = path.getScreenCTM();
    return {radius: parseFloat(getComputedStyle(path).strokeWidth) / 2,
      points: [...path.getAttribute('d').matchAll(/[ML]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g)]
        .map(([, x, y]) => new DOMPoint(+x, +y).matrixTransform(matrix)),
    };
  }
  function lineBand({points, radius}, left, right) {
    let top = Infinity, bottom = -Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const start = Math.max(a.x, left - radius - 5), end = Math.min(b.x, right + radius + 5);
      if (start > end) continue;
      const y = x => a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      top = Math.min(top, y(start) - radius, y(end) - radius);
      bottom = Math.max(bottom, y(start) + radius, y(end) + radius);
    }
    return Number.isFinite(top) ? {top, bottom} : null;
  }
  const labels = [...poster.querySelectorAll('.value')];
  function clearSlide(text, distance) {
    const box = rect(text), paths = [...poster.querySelectorAll('.curve .rhp-stroke')].map(stroke);
    const obstacles = [...fixedBoxes(), ...[...poster.querySelectorAll('.dot')].map(rect)];
    const clear = amount => {
      const left = box.left + Math.min(0, amount), right = box.right + Math.max(0, amount);
      return paths.every(path => {
        const band = lineBand(path, left, right);
        return !band || box.bottom <= band.top - 4.9 || box.top >= band.bottom + 4.9;
      }) && obstacles.every(other => right <= other.left || left >= other.right || box.bottom <= other.top || box.top >= other.bottom);
    };
    if (clear(distance)) return distance;
    // Shorten only the slide when its old position is obstructed at the new height.
    // The selected label keeps its normal placement on its displayed side.
    let low = 0, high = 1;
    for (let i = 0; i < 12; i++) {
      const middle = (low + high) / 2;
      if (clear(distance * middle)) low = middle;
      else high = middle;
    }
    return distance * low;
  }
  function rebuild() {
    const bounds = rect(chart), fixed = fixedBoxes();
    const series = labels.map(label => {
      const key = label.parentElement.classList.contains('power') ? 'power' : 'sulfur';
      const text = label.querySelector('.value-text'), css = getComputedStyle(text);
      const range = document.createRange(); range.selectNodeContents(text);
      const textBox = range.getBoundingClientRect();
      const context = document.createElement('canvas').getContext('2d');
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      return {key, label, context, height: textBox.height, baseline: textBox.bottom - rect(label).bottom,
        path: stroke(poster.querySelector(`.${key} .curve .rhp-stroke`)),
      };
    });
    const key = JSON.stringify([bounds.width, bounds.height,
      ...series.map(item => [item.height, item.context.font, item.context.measureText('−100%').width,
        item.path.points.map(point => [point.x - bounds.left, point.y - bounds.top])]),
      fixed.map(box => [box.left - bounds.left, box.top - bounds.top, box.width, box.height]),
    ]);
    if (key === layoutKey) return;
    layoutKey = key;
    placements = new Map();
    function casesFor(index) {
      const leftSide = index >= rows.length - 3;
      const points = series.map(item => item.path.points[index]);
      const dots = points.map(point => ({left: point.x - 13, right: point.x + 13, top: point.y - 13, bottom: point.y + 13}));
      return series.map((item, n) => {
        const point = points[n], width = item.context.measureText(format(rows[index][item.key === 'power' ? 'generationIndex' : 'so2Index'])).width;
        const left = leftSide ? point.x - width - 20 : point.x + 20;
        const right = !leftSide ? point.x + width + 20 : point.x - 20;
        const own = lineBand(item.path, left, right);
        const bands = [...series.map(other => lineBand(other.path, left, right)).filter(Boolean),
          ...[...fixed, ...dots].filter(other => other.left < right && other.right > left).map(other => ({top:other.top,bottom:other.bottom,gap:1})),
          ...(index>=rows.length-4 ? [{top:point.y-13,bottom:point.y+13,gap:1}] : [])];
        return {left, right, height:item.height, anchor:point.y, own, bands, top:bounds.top, bottom:bounds.bottom, series:item.key};
      });
    }
    for (let index = 0; index < rows.length - 1; index++) {
      const cases = casesFor(index), positions = chooseLabelPositions(cases.map(labelCandidates));
      if (!positions) throw new Error(`No clear percentage-label placement for ${rows[index].year}`);
      placements.set(rows[index].year, positions.map((box, n) => box.bottom - cases[n].anchor - series[n].baseline));
    }
    apply();
  }
  function apply() {
    const year = Number(poster.dataset.selectedYear), offsets = placements.get(year);
    const boundary = rows[rows.length-3].year;
    const switching = previousYear !== null && Math.abs(year-previousYear)<=2 && (year>=boundary)!==(previousYear>=boundary);
    const from = labels.map(label => {
      const text = label.querySelector('.value-text'), previous = slides.get(text);
      const x = previous ? previous.x + (parseFloat(getComputedStyle(text).translate)||0) : null;
      previous?.animation?.cancel();
      return x;
    });
    if (offsets) labels.forEach((label, i) => label.style.setProperty('--label-y', `${offsets[i]}px`));
    previousYear = year;
    cancelAnimationFrame(slideFrame);
    // Start from the previous screen position, rather than moving to the new dot's
    // right side first. The vertical position always uses this year's actual side.
    slideFrame = requestAnimationFrame(() => {
      labels.forEach((label, i) => {
        const text = label.querySelector('.value-text'), x = text.getBoundingClientRect().left;
        const animation = switching && from[i] !== null && !matchMedia('(prefers-reduced-motion:reduce)').matches
          ? text.animate([{translate:`${clearSlide(text, from[i]-x)}px 0px`},{translate:'0px 0px'}],{duration:180,easing:'ease-out'}) : null;
        slides.set(text,{x,animation});
      });
    });
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {frame = 0;rebuild();});
  }
  const changes = new MutationObserver(() => apply());
  changes.observe(poster, {attributes: true, attributeFilter: ['data-selected-year']});
  const resize = new ResizeObserver(schedule); resize.observe(chart);
  document.fonts.ready.then(schedule);
  schedule();
  return () => {cancelAnimationFrame(frame);cancelAnimationFrame(slideFrame);slides.forEach(state=>state.animation?.cancel());changes.disconnect();resize.disconnect();};
}

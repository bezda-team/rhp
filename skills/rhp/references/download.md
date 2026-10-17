# Download a poster as PNG

Every standalone HTML poster page includes an icon button above the poster, aligned with its right edge.
Copy the following block before `</body>`, after the chart's module script.
Keep it outside the poster so the saved PNG includes the whole poster, its headline and source note, without the download control or gallery navigation.
The button joins `.recipe-navigation` when the gallery supplies one, inheriting the gallery link's color.
Otherwise it creates its own row above each poster, sized to the poster on desktop and phones.
The exporter loads only when clicked, waits for fonts, and saves the current poster at twice its displayed resolution.
Activating the download control preserves the poster's selection, including keyboard focus transitions, and does not bubble into outside-click handlers.
Like the chart's CDN import, the first download needs a connection.
For an embedded chart inside an existing app, follow the app's export controls instead of adding page navigation.

```html
<style id="poster-download-styles">
  .poster-download-tools { display: flex; justify-content: flex-end; align-items: center; margin: 0 auto 12px; max-width: 100%; }
  .poster-download { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 44px; height: 44px; padding: 10px; border: 0; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
  .poster-download svg { display: block; width: 20px; height: 20px; }
  .poster-download:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
  .poster-download:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  .poster-download[aria-disabled="true"] { cursor: progress; opacity: .5; }
  .poster-download-error { margin: 8px auto; font: 14px/1.4 system-ui, sans-serif; color: inherit; }
  @media print { .poster-download-tools, .poster-download, .poster-download-error { display: none !important; } }
</style>
<script type="module" id="poster-download-script">
function addPosterDownloads() {
  document.querySelectorAll('.poster').forEach((poster, index) => {
    const navigation = index === 0 && document.querySelector('.recipe-navigation');
    const tools = navigation || document.createElement('div');
    if (tools.querySelector('.poster-download')) return;
    if (!navigation) {
      tools.className = 'poster-download-tools';
      poster.before(tools);
      const align = () => { tools.style.width = `${poster.getBoundingClientRect().width}px`; };
      new ResizeObserver(align).observe(poster);
      align();
      const rgb = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
      if (rgb) {
        const light = rgb.slice(0, 3).map(Number).map(v => {
          v /= 255;
          return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
        });
        tools.style.color = light[0] * .2126 + light[1] * .7152 + light[2] * .0722 < .179 ? '#eef2f5' : '#1d1b17';
      }
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'poster-download';
    button.setAttribute('aria-label', 'Download poster as PNG');
    button.title = 'Download poster as PNG';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
    const error = document.createElement('p');
    error.className = 'poster-download-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    tools.after(error);
    // Download is part of the poster interaction, even though its control sits outside the image.
    button.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });
    button.addEventListener('mousedown', event => {
      event.stopPropagation();
    });
    poster.addEventListener('focusout', event => {
      if (button.contains(event.relatedTarget) || button.matches(':active')) event.stopImmediatePropagation();
    }, true);
    poster.addEventListener('pointerleave', event => {
      if (button.contains(event.relatedTarget) || document.activeElement === button) event.stopImmediatePropagation();
    }, true);
    for (const type of ['keydown', 'keyup']) button.addEventListener(type, event => {
      if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
    });
    let exporter, retries = 0, busy = false;
    button.addEventListener('click', async event => {
      event.stopPropagation();
      if (busy) return;
      busy = true;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-label', 'Preparing poster PNG');
      error.hidden = true;
      let url;
      try {
        exporter ||= import('https://cdn.jsdelivr.net/npm/modern-screenshot@4.7.0/+esm' + (retries ? `?retry=${retries}` : ''));
        const { domToBlob } = await exporter;
        await document.fonts.ready;
        // Grid auto margins resolve to zero in getComputedStyle, so keep their author rules.
        const autoMargins = new Set();
        const marginRules = rules => [...rules].map(rule => {
          if (rule.selectorText && rule.style) {
            const margins = [...rule.style].filter(name => name === 'margin' || name.startsWith('margin-'));
            if (margins.some(name => /\bauto\b/.test(rule.style.getPropertyValue(name)))) autoMargins.add(rule.selectorText);
            return margins.length ? `${rule.selectorText} { ${margins.map(name => `${name}: ${rule.style.getPropertyValue(name)}${rule.style.getPropertyPriority(name) ? ' !important' : ''};`).join(' ')} }` : '';
          }
          if (!rule.cssRules) return '';
          if (rule instanceof CSSMediaRule) return matchMedia(rule.conditionText).matches ? marginRules(rule.cssRules) : '';
          if (rule instanceof CSSSupportsRule) return CSS.supports(rule.conditionText) ? marginRules(rule.cssRules) : '';
          return rule.cssText.slice(0, rule.cssText.indexOf('{') + 1) + marginRules(rule.cssRules) + '}';
        }).join('\n');
        const margins = [...document.styleSheets].map(sheet => {
          try { return marginRules(sheet.cssRules); } catch (cause) { return ''; }
        }).join('\n');
        const restoreMargins = (source, clone) => {
          if (clone.style && source !== poster && [...autoMargins].some(selector => source.matches(selector))) {
            [...clone.style].filter(name => name === 'margin' || name.startsWith('margin-')).forEach(name => clone.style.removeProperty(name));
            [...source.style].filter(name => name === 'margin' || name.startsWith('margin-')).forEach(name => clone.style.setProperty(name, source.style.getPropertyValue(name), source.style.getPropertyPriority(name)));
          }
          const children = [...source.children].filter(node => !['STYLE', 'SCRIPT'].includes(node.tagName));
          [...clone.children].forEach((child, i) => { if (children[i]) restoreMargins(children[i], child); });
        };
        // Cross-origin font stylesheets are readable through fetch, but not through cssRules.
        const fontFiles = new Map();
        const fontRules = await Promise.all([...document.styleSheets].map(async sheet => {
          let css;
          try { css = [...sheet.cssRules].map(rule => rule.cssText).join('\n'); }
          catch (cause) {
            if (!sheet.href) return '';
            const response = await fetch(sheet.href);
            if (!response.ok) throw new Error('Font stylesheet could not be loaded');
            css = await response.text();
          }
          const rules = css.match(/@font-face\s*\{[^}]*\}/g) || [];
          return (await Promise.all(rules.map(async rule => {
            for (const match of [...rule.matchAll(/url\(["']?([^"')]+)["']?\)/g)]) {
              const source = new URL(match[1], sheet.href || document.baseURI).href;
              if (!fontFiles.has(source)) fontFiles.set(source, (async () => {
                const response = await fetch(source);
                if (!response.ok) throw new Error('Font could not be loaded');
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              })());
              rule = rule.replace(match[1], await fontFiles.get(source));
            }
            return rule;
          }))).join('\n');
        }));
        // Rasterize SVG paper textures before nesting them inside the exporter's SVG.
        // This keeps SVG filter fragment references local to their own image.
        const textures = new Map();
        const embedTexture = async (node) => {
          if (!node.style) return;
          let background = node.style.backgroundImage;
          for (const [, source] of background.matchAll(/url\("(data:image\/svg\+xml[^"]+)"\)/g)) {
            if (!textures.has(source)) textures.set(source, (async () => {
              const image = new Image();
              image.src = source;
              await image.decode();
              const canvas = document.createElement('canvas');
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              canvas.getContext('2d').drawImage(image, 0, 0);
              return canvas.toDataURL();
            })());
            background = background.replace(source, await textures.get(source));
          }
          node.style.backgroundImage = background;
        };
        const blob = await domToBlob(poster, {
          scale: 2, style: { margin: '0' },
          font: { cssText: fontRules.join('\n') }, onCloneEachNode: embedTexture,
          onCloneNode: clone => {
            restoreMargins(poster, clone);
            const style = document.createElement('style');
            style.textContent = margins;
            clone.prepend(style);
          },
          // CSS content's alternative text follows a slash and must not be painted.
          onCreateForeignObjectSvg: svg => svg.querySelectorAll('style').forEach(style => {
            style.textContent = style.textContent.replace(/(content:\s*')([^']*)(')/g, (_, start, text, end) => start + text.split(' / ')[0] + end);
          }),
        });
        if (!blob) throw new Error('No PNG was created');
        url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const title = poster.querySelector('.headline')?.textContent || document.title || 'poster';
        link.download = (title.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 100) || 'poster') + '.png';
        link.href = url;
        link.addEventListener('click', event => event.stopPropagation(), { once: true });
        document.body.append(link);
        link.click();
        link.remove();
      } catch (cause) {
        exporter = null;
        retries++;
        error.textContent = 'The PNG could not be saved. Check your connection and try again.';
        error.hidden = false;
      } finally {
        if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
        busy = false;
        button.removeAttribute('aria-disabled');
        button.removeAttribute('aria-busy');
        button.setAttribute('aria-label', 'Download poster as PNG');
      }
    });
    tools.append(button);
  });
}
// A chart module may await fonts or data after DOMContentLoaded has already fired.
if (document.querySelector('.poster')) addPosterDownloads();
else {
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.poster')) return;
    observer.disconnect();
    addPosterDownloads();
  });
  observer.observe(document.getElementById('chart') || document.body, { childList: true, subtree: true });
}
</script>
```

The block above is the maintained source for the recipe controls.
After changing it, run `node scripts/sync-poster-download.mjs` from the rhp repository to update every recipe.
Test an actual PNG download on a desktop and a phone, including a poster taller than the viewport, and verify that the image includes the bottom note and excludes the controls.
The implementation uses [modern-screenshot](https://github.com/qq15725/modern-screenshot) to preserve computed styles, pseudo-elements, images and embedded fonts.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = file => fs.readFileSync(path.join(here, file), 'utf8');
const encode = (file, type) => `data:image/${type};base64,${fs.readFileSync(path.join(here, 'assets', file)).toString('base64')}`;
const base = read('orbital-retro.html');
const earth = encode('earth-print-night-motion.png', 'png');
const day = encode('earth-painted-day.jpg', 'jpeg');
const night = encode('earth-painted-night.jpg', 'jpeg');
const variants = [
  { mode: 'artwork', name: 'Rotating artwork', file: 'orbital-retro-rotating-earth.html', description: 'The Earth and its painted sunlight rotate together. One turn takes 6 minutes 40 seconds at 1×.' },
  { mode: 'fixed', name: 'Fixed lighting', file: 'orbital-retro-fixed-light.html', description: 'The Earth turns beneath fixed sunlight. City lights appear on the night side. One turn takes 6 minutes 40 seconds at 1×.' },
  { mode: 'fixed', name: 'Debris above. Spacecraft below.', file: 'orbital-retro-animated.html', production: true },
];
for (const variant of variants) {
  const navigation = variant.production ? '' : `<nav class="earth-experiment-navigation" aria-label="Earth animation experiments">${variants.filter(item => !item.production).map(item => `<a href="${item.file}"${item.mode === variant.mode ? ' aria-current="page"' : ''}>${item.name}</a>`).join('')}</nav><p class="earth-experiment-caption">${variant.description}</p>`;
  const output = base
    .replace(/<title>[^<]+<\/title>/, `<title>${variant.production ? variant.name : `${variant.name} | Debris above. Spacecraft below.`}</title>`)
    .replace(/(<img class="earth" src=")[^"]+(" alt="")/, `$1${earth}$2`)
    .replace('</style>', `${read('earth-motion.css')}\n</style>`)
    .replace('<main id="chart">', `${navigation}\n<main id="chart">`)
    .replace('See <a href="cutout-credits.json">artwork provenance and prompts</a>.', 'See <a href="cutout-credits.json">hardware artwork and prompts</a> and <a href="earth-motion-credits.json">Earth artwork and prompts</a>.')
    .replace('</body>', `<script type="module">\nconst EARTH_MOTION = ${JSON.stringify({ mode: variant.mode, day: variant.mode === 'fixed' ? day : null, night: variant.mode === 'fixed' ? night : null })};\n${read('earth-motion.js')}\n</script>\n</body>`);
  fs.writeFileSync(path.join(here, variant.file), output);
  console.log(`Built ${variant.file}`);
}

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const fonts = [
  ['DM Serif Display', 400, 'dm-serif-display.ttf'],
  ['Manrope', '200 800', 'manrope.ttf'],
].map(([family, weight, file]) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(here, 'assets', file)).toString('base64')}) format('truetype');}`).join('\n');
const download = fs.readFileSync(path.join(root, 'skills/rhp/references/download.md'), 'utf8').match(/```html\n([\s\S]*?)\n```/)[1];
const html = fs.readFileSync(path.join(here, 'poster.template.html'), 'utf8')
  .replace('__FONTS__', fonts)
  .replace('__DATA__', fs.readFileSync(path.join(here, 'data.json'), 'utf8'))
  .replace('__DOWNLOAD__', download);
fs.writeFileSync(path.join(here, 'winter-daylight.html'), html);
console.log('Built winter daylight poster');

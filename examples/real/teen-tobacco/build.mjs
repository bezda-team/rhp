import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const fonts = [
  ['Barlow Condensed', 700, 'barlow-condensed-700.ttf'],
  ['IBM Plex Sans', 400, 'ibm-plex-sans-400.ttf'],
  ['IBM Plex Sans', 600, 'ibm-plex-sans-600.ttf'],
].map(([family,weight,file]) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(here,'assets',file)).toString('base64')}) format('truetype');}`).join('\n');
const data = fs.readFileSync(path.join(here,'data.json'),'utf8');
const background = `data:image/png;base64,${fs.readFileSync(path.join(here,'assets/school-lockers.png')).toString('base64')}`;
const download = fs.readFileSync(path.join(root,'skills/rhp/references/download.md'),'utf8').match(/```html\n([\s\S]*?)\n```/)[1];
const html = fs.readFileSync(path.join(here,'poster.template.html'),'utf8')
  .replace('__FONTS__',fonts).replace('__DATA__',data)
  .replace('__BACKGROUND__',background).replace('__DOWNLOAD__',download);
fs.writeFileSync(path.join(here,'teen-tobacco.html'),html);
console.log('Built teen tobacco poster');

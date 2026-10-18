import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const fonts = [
  ['Space Grotesk', 700, 'space-grotesk-700.ttf'],
  ['IBM Plex Sans', 400, 'ibm-plex-sans-400.ttf'],
  ['IBM Plex Sans', 600, 'ibm-plex-sans-600.ttf'],
  ['Barlow Condensed', 700, 'barlow-condensed-700.ttf'],
  ['Audiowide', 400, 'audiowide-400.ttf'],
  ['Space Mono', 400, 'space-mono-400.ttf'],
  ['Atomic Age', 400, 'atomic-age-400.ttf'],
  ['Zen Dots', 400, 'zen-dots-400.ttf'],
  ['Michroma', 400, 'michroma-400.ttf'],
  ['Chakra Petch', 400, 'chakra-petch-400.ttf'],
  ['Chakra Petch', 700, 'chakra-petch-700.ttf'],
  ['Goldman', 400, 'goldman-400.ttf'],
  ['Goldman', 700, 'goldman-700.ttf'],
  ['Oxanium', '200 800', 'oxanium-variable.ttf'],
  ['Orbitron', '400 900', 'orbitron-variable.ttf'],
].map(([family, weight, name]) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(here,'assets',name)).toString('base64')}) format('truetype');}`).join('\n');
const artwork = path.join(here, 'assets/orbital-background.png');
const background = fs.existsSync(artwork) ? `data:image/png;base64,${fs.readFileSync(artwork).toString('base64')}` : '';
const download = fs.readFileSync(path.join(root,'skills/rhp/references/download.md'),'utf8').match(/```html\n([\s\S]*?)\n```/)[1];
let html = fs.readFileSync(path.join(here,'poster.template.html'),'utf8')
  .replace('__FONTS__',fonts).replace('__DATA__',fs.readFileSync(path.join(here,'data.json'),'utf8'))
  .replace('__BACKGROUND__',background).replace('__DOWNLOAD__',download);
if(!background)html=html.replace('<img src="" alt="" />','');
fs.writeFileSync(path.join(here,'orbital-traffic.html'),html);
console.log('Built orbital traffic poster' + (background ? ' with artwork' : ', layout before artwork'));

const encode=name=>`data:image/${name.endsWith('.jpg')?'jpeg':'png'};base64,${fs.readFileSync(path.join(here,'assets',name)).toString('base64')}`;
const assets={payload:encode('satellite-mini.png'),debris:encode('debris-mini.png'),other:encode('rocket-mini.png')};
const designs=[
 {id:'atlas',title:'Orbital atlas',line1:'Low down: spacecraft.',line2:'Higher up: debris.',earth:'earth.png'},
 {id:'field',title:'Field guide',line1:'Two layers.',line2:'Two different crowds.',earth:'earth.png'},
 {id:'cinema',title:'Blue limb',line1:'Low down: spacecraft.',line2:'Higher up: debris.',earth:'earth-night.png'},
 {id:'retro',title:'Retro futurism',line1:'Spacecraft below',line2:'Debris above',earth:'earth-print.png'},
];
for(const design of designs){
 const night=fs.existsSync(path.join(here,'assets',design.earth))?design.earth:'earth.png';
 const art=design.id==='retro'?{...assets,payload:encode('satellite-future-mini.png'),debris:encode('debris-future-mini.png')}:assets;
 let output=fs.readFileSync(path.join(here,'radial.template.html'),'utf8')
  .replace('__FONTS__',fonts).replace('__DATA__',fs.readFileSync(path.join(here,'data.json'),'utf8'))
  .replaceAll('__TITLE__',design.title).replaceAll('__VARIANT__',design.id).replace('__FONT_DESCRIPTION__',design.id==='retro'?'Zen Dots and Atomic Age':'Space Grotesk, Barlow Condensed and IBM Plex Sans')
  .replace('__CONFIG__',JSON.stringify(design)).replace('__ART__',JSON.stringify(art))
  .replace('__EARTH__',encode(night)).replace('__SPACE__',design.id==='retro'?encode('space-print.jpg'):'').replace('__DOWNLOAD__',download);
 if(design.id==='retro')output=output.replace(/ <nav aria-label="Design alternatives">.*?<\/nav>/,'').replace('The same data, four visual experiments','The source and method');
 fs.writeFileSync(path.join(here,`orbital-${design.id}.html`),output);
 console.log(`Built ${design.title}`);
}

const fontStudies=[
 {id:'michroma',family:'Michroma',size:62,weight:400,cqw:7.2,mobileCqw:8},
 {id:'oxanium',family:'Oxanium',size:81,weight:700,cqw:9.4,mobileCqw:10.4},
 {id:'orbitron',family:'Orbitron',size:65,weight:600,cqw:7.6,mobileCqw:8.4},
];
const retro=fs.readFileSync(path.join(here,'orbital-retro.html'),'utf8');
for(const study of fontStudies){
 const css=fs.readFileSync(path.join(here,'font-study.css'),'utf8')
  .replaceAll('__FAMILY__',study.family).replaceAll('__TITLE_SIZE__',study.size)
  .replaceAll('__TITLE_WEIGHT__',study.weight).replaceAll('__TITLE_CQW__',study.cqw)
  .replaceAll('__TITLE_MOBILE_CQW__',study.mobileCqw);
 const result=retro.replace('</style>',`${css}\n</style>`).replace('Fonts: Zen Dots and Atomic Age.',`Fonts: ${study.family} and Atomic Age.`)
  .replace('<title>Retro futurism |','<title>'+study.family+' |')
  .replace('<main id="chart">',`<nav class="font-study-navigation" aria-label="Font study"><a href="fonts.html">← Compare fonts</a><span class="study-name">${study.family}</span></nav>\n<main id="chart">`);
 fs.writeFileSync(path.join(here,`orbital-retro-${study.id}.html`),result);
 console.log(`Built font study: ${study.family}`);
}

// Keep the selected typography on the main poster as well as its comparison page.
const selected=fs.readFileSync(path.join(here,'orbital-retro-michroma.html'),'utf8')
 .replace(/<nav class="font-study-navigation"[\s\S]*?<\/nav>\n/,'')
 .replace('<title>Michroma | What fills low Earth orbit?</title>','<title>Debris above. Spacecraft below.</title>');
fs.writeFileSync(path.join(here,'orbital-retro.html'),selected);
console.log('Selected Michroma for the main retro poster');

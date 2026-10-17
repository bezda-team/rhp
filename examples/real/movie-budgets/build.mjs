import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const data=JSON.parse(fs.readFileSync(path.join(here,'data.json')));
const fonts=[['Barlow Condensed',700,'barlow-condensed-700.woff2','woff2'],['IBM Plex Sans',400,'ibm-plex-sans-400.ttf','truetype'],['IBM Plex Sans',600,'ibm-plex-sans-600.ttf','truetype']].map(([name,weight,file,format])=>`@font-face {font-family:'${name}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/${format==='woff2'?'woff2':'ttf'};base64,${fs.readFileSync(path.join(here,'assets',file)).toString('base64')}) format('${format}');}`).join('\n');
for(const row of data.rows){
 row.art='data:image/jpeg;base64,'+fs.readFileSync(path.join(here,'assets',row.id+'.jpg')).toString('base64');
 row.displayTitle=row.title==='Star Wars: The Mandalorian and Grogu'?'The Mandalorian and Grogu':row.title;
}
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const sources=data.rows.map(row=>`<li><a href="${escape(row.source)}">${escape(row.title)}</a></li>`).join('');
const download=fs.readFileSync(path.join(root,'skills/rhp/references/download.md'),'utf8').match(/```html\n([\s\S]*?)\n```/)[1];
const page=fs.readFileSync(path.join(here,'poster.template.html'),'utf8').replace('__FONTS__',fonts).replace('__DATA__',JSON.stringify(data)).replace('__SOURCES__',sources).replace('__DOWNLOAD__',download);
fs.writeFileSync(path.join(here,'movie-budgets.html'),page);
console.log(`Built movie-budgets.html with ${data.rows.length} embedded posters.`);

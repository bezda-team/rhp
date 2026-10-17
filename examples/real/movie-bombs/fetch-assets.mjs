import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const here=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(fs.readFileSync(path.join(here,'data.json')));
const credits=[];
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 for(const row of data.rows){
  const response=await fetch(row.image);if(!response.ok)throw new Error(`${response.status} ${row.image}`);
  const type=response.headers.get('content-type');if(!type?.startsWith('image/'))throw new Error(`Expected artwork, got ${type}`);
  const original=Buffer.from(await response.arrayBuffer());
  // Proportional thumbnails preserve the complete poster while avoiding multi-megabyte embedded originals.
  const thumb=await page.evaluate(async src=>{
   const image=new Image();image.src=src;await image.decode();
   const factor=Math.min(1,480/image.naturalHeight);
   const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*factor);canvas.height=Math.round(image.naturalHeight*factor);
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   return {url:canvas.toDataURL('image/jpeg',.92),original:[image.naturalWidth,image.naturalHeight],embedded:[canvas.width,canvas.height]};
  },`data:${type};base64,${original.toString('base64')}`);
  const image=Buffer.from(thumb.url.split(',')[1],'base64');
  const file=`assets/${row.id}.jpg`;fs.writeFileSync(path.join(here,file),image);
  credits.push({title:row.title,file,sourcePage:row.source,imageUrl:row.image,credit:'Promotional film poster artwork, respective film studios and rightsholders, reproduced as small identifying images in this editorial comparison.',processing:'Resized proportionally to a maximum height of 480 pixels, without cropping or changing the artwork.',originalDimensions:thumb.original,embeddedDimensions:thumb.embedded,bytes:image.length});
 }
} finally {await browser.close();}
fs.writeFileSync(path.join(here,'artwork-credits.json'),JSON.stringify(credits,null,2)+'\n');
console.log(`Saved ${credits.length} complete film-poster thumbnails with source credits.`);

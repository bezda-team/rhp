// Small images of every finished run's poster for the report: the desktop page (560px wide, cut at 1,000px) and the
// phone's first screen (390 x 844 shown at 195px wide), as JPEG.
//   node thumbs.mjs <runs dir> <out dir>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [runsDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (const id of fs.readdirSync(runsDir).sort()) {
  const dir = path.join(runsDir, id, "render");
  const desk = path.join(dir, "shot-1280.png"), phone = path.join(dir, "shot-390.png");
  if (!fs.existsSync(desk)) continue;
  const m = await sharp(desk).metadata();
  await sharp(desk).extract({ left: 0, top: 0, width: m.width, height: Math.min(m.height, Math.round(m.width * 1000 / 560)) })
    .resize(560).jpeg({ quality: 72, mozjpeg: true }).toFile(path.join(outDir, `${id}-desktop.jpg`));
  if (fs.existsSync(phone)) {
    const p = await sharp(phone).metadata();
    await sharp(phone).extract({ left: 0, top: 0, width: p.width, height: Math.min(p.height, 844) })
      .resize(195).jpeg({ quality: 72, mozjpeg: true }).toFile(path.join(outDir, `${id}-phone.jpg`));
  }
  console.log(id);
}

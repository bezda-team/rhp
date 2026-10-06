import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Judge images: the desktop page down to 2,400px, and the phone's first two screens (390 x 1,688)
export async function judgeImages(dir) {
  const out = {};
  for (const [w, maxH, name] of [[1280, 2400, "desktop"], [390, 1688, "phone"]]) {
    const src = path.join(dir, `shot-${w}.png`);
    if (!fs.existsSync(src)) continue;
    const meta = await sharp(src).metadata();
    const file = path.join(dir, `${name}.jpg`);
    await sharp(src).extract({ left: 0, top: 0, width: meta.width, height: Math.min(meta.height, maxH) }).jpeg({ quality: 85 }).toFile(file);
    out[name] = { file, fullHeight: meta.height, cropped: meta.height > maxH };
  }
  return out;
}

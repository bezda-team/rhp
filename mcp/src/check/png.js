// PNG to pixels, for the screenshots the probes read colors from (8-bit gray, RGB, gray + alpha or RGBA, not
// interlaced: what Chromium writes).
import zlib from "zlib";

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

// Returns { width, height, data } with data as RGBA bytes, row by row
export function decode(buffer) {

  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");

  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  const idat = [];

  for (let at = 8; at < buffer.length;) {
    const length = buffer.readUInt32BE(at);
    const name = buffer.toString("ascii", at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (name === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      type = body[9];
      interlace = body[12];
    } else if (name === "IDAT") {
      idat.push(body);
    } else if (name === "IEND") {
      break;
    }
    at += 12 + length;
  }

  const channels = CHANNELS[type];
  if (depth !== 8 || !channels || interlace) throw new Error(`unsupported PNG (depth ${depth}, type ${type}, interlace ${interlace})`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride);
    const prev = y ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      const v = line[x];
      out[x] = filter === 0 ? v : filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c);
    }
  }

  if (channels === 4) return { width, height, data: rows };

  const data = Buffer.alloc(width * height * 4);

  for (let i = 0, j = 0; i < width * height; i++, j += channels) {
    const gray = channels <= 2;
    data[i * 4] = rows[j];
    data[i * 4 + 1] = gray ? rows[j] : rows[j + 1];
    data[i * 4 + 2] = gray ? rows[j] : rows[j + 2];
    data[i * 4 + 3] = channels === 2 ? rows[j + 1] : channels === 4 ? rows[j + 3] : 255;
  }

  return { width, height, data };
}

// The pixels of an image inside a box (in image pixels), as [r, g, b] lists
export function pixelsIn(image, { left, top, right, bottom }) {

  const out = [];
  const x0 = Math.max(0, Math.floor(left));
  const y0 = Math.max(0, Math.floor(top));
  const x1 = Math.min(image.width, Math.ceil(right));
  const y1 = Math.min(image.height, Math.ceil(bottom));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * image.width + x) * 4;
      out.push([image.data[i], image.data[i + 1], image.data[i + 2]]);
    }
  }

  return out;
}

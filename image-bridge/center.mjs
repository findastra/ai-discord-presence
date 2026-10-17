// Centre a galaxy in its square image: finds the bright core and shifts it to the exact middle,
// filling uncovered edges with black. Usage: node center.mjs in.png out.png [size=1024] [colour boost, e.g. 0.35]
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

function decode(file) {
  const png = readFileSync(file); let off = 8, W, H, type, depth; const idat = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off), tag = png.toString('ascii', off + 4, off + 8), data = png.subarray(off + 8, off + 8 + len);
    if (tag === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) throw new Error('interlaced PNG not supported'); }
    if (tag === 'IDAT') idat.push(data); off += 12 + len;
  }
  if (depth !== 8 || ![2, 6].includes(type)) throw new Error(`unsupported PNG (depth ${depth}, colour type ${type})`);
  const bpp = type === 6 ? 4 : 3, stride = W * bpp, raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {           // undo PNG row filters
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[o + x - bpp] : 0, b = y ? px[o - stride + x] : 0, c = x >= bpp && y ? px[o - stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      px[o + x] = (row[x] + pred) & 255;
    }
  }
  const rgb = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = px[i * bpp + c];
  return { W, H, rgb };
}

const [, , input, output, sizeArg = '1024', boostArg = '0'] = process.argv;
const { W, H, rgb } = decode(input);
// Optional colour boost (e.g. 0.35): brighter, more saturated stars; pure black stays black.
const boost = Number(boostArg);
if (boost > 0) for (let i = 0; i < W * H; i++) {
  const o = i * 3, r = rgb[o], g = rgb[o + 1], bl = rgb[o + 2], l = (r + g + bl) / 3;
  if (l < 6) continue;
  const lift = 1 + boost * Math.min(1, l / 40);          // fade the boost in so dark noise isn't amplified
  for (let c = 0; c < 3; c++) {
    const v = rgb[o + c], sat = l + (v - l) * (1 + boost * 1.2);
    rgb[o + c] = Math.max(0, Math.min(255, Math.round(sat * lift)));
  }
}
// Core = brightest spot after heavy smoothing (box blur on a coarse grid), refined to sub-cell precision.
const cell = 8, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell), grid = new Float64Array(gw * gh);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; grid[(y / cell | 0) * gw + (x / cell | 0)] += rgb[i] + rgb[i + 1] + rgb[i + 2]; }
let best = -1, bx = 0, by = 0, R = 3;
for (let y = R; y < gh - R; y++) for (let x = R; x < gw - R; x++) {
  let s = 0; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) s += grid[(y + dy) * gw + x + dx];
  if (s > best) { best = s; bx = x; by = y; }
}
// Brightness-weighted centroid of the bright pixels around that spot.
let sx = 0, sy = 0, sw = 0; const r0 = cell * (R + 2);
for (let y = Math.max(0, by * cell - r0); y < Math.min(H, by * cell + r0); y++) for (let x = Math.max(0, bx * cell - r0); x < Math.min(W, bx * cell + r0); x++) {
  const i = (y * W + x) * 3, l = rgb[i] + rgb[i + 1] + rgb[i + 2]; if (l < 600) continue; const w = (l - 600) ** 2; sx += x * w; sy += y * w; sw += w; }
const coreX = sw ? sx / sw : bx * cell + cell / 2, coreY = sw ? sy / sw : by * cell + cell / 2;
const dx = Math.round(W / 2 - coreX), dy = Math.round(H / 2 - coreY);
console.log(`core at (${coreX.toFixed(1)}, ${coreY.toFixed(1)}) in ${W}x${H}; shifting by (${dx}, ${dy})`);

// Shift onto black, then resize to the output size (box filter).
const N = Number(sizeArg), shifted = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx2 = x - dx, sy2 = y - dy; if (sx2 < 0 || sy2 < 0 || sx2 >= W || sy2 >= H) continue; rgb.copy(shifted, (y * W + x) * 3, (sy2 * W + sx2) * 3, (sy2 * W + sx2) * 3 + 3); }
const raw = Buffer.alloc(N * (N * 3 + 1)), scale = W / N;
for (let y = 0; y < N; y++) { raw[y * (N * 3 + 1)] = 0;
  for (let x = 0; x < N; x++) for (let c = 0; c < 3; c++) { let s = 0, n = 0;
    for (let yy = Math.floor(y * scale); yy < Math.max(Math.floor(y * scale) + 1, Math.floor((y + 1) * scale)); yy++) for (let xx = Math.floor(x * scale); xx < Math.max(Math.floor(x * scale) + 1, Math.floor((x + 1) * scale)); xx++) { s += shifted[(yy * W + xx) * 3 + c]; n++; }
    raw[y * (N * 3 + 1) + 1 + x * 3 + c] = Math.round(s / n); } }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(output, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', output);

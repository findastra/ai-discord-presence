// Face-on "glitter" spiral in the style of the original Claude bloom: millions of fine particles in
// wide curved arms, an overexposed core, and a dense patterned field of sparkling stars.
// node bloom.mjs <edition: amber|blue> <out.png> [time=0] [size=1024]
import { writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const [, , edition = 'amber', out = 'bloom.png', timeArg = '0', sizeArg = '1024'] = process.argv;
const N = Number(sizeArg), W = N, H = N, cx = W / 2, cy = H / 2, S = N / 1024, time = Number(timeArg);

const EDITIONS = {
  // Anthropic: one arm per Claude generation (Claude 5 → 5 arms); thick, dense, warm.
  amber: { arms: 5, curl: 1.9, thick: 0.30, particles: 2_600_000, radius: 380, seed: 11, dir: 1, colour: [1, 0.52, 0.12], gain: 1.6,
    ramp: [[1, 1, 1], [1, 0.88, 0.68], [1, 0.62, 0.38], [1, 0.42, 0.36], [0.9, 0.26, 0.48]],
    core: [1, 0.86, 0.66], sparkle: [[1, 0.25, 0.65], [1, 0.92, 0.8], [1, 1, 1], [1, 0.78, 0.5], [1, 0.4, 0.75]] },
  // OpenAI: one arm per GPT generation (GPT-6 → 6 arms); thinner, longer, sparser, cool.
  blue: { arms: 6, curl: 4.2, thick: 0.10, particles: 2_000_000, radius: 450, seed: 29, dir: -1, colour: [0.22, 0.55, 1], gain: 1.15,
    ramp: [[1, 1, 1], [0.86, 0.94, 1], [0.55, 0.78, 1], [0.42, 0.52, 1], [0.55, 0.36, 0.95]],
    core: [0.82, 0.9, 1], sparkle: [[1, 0.25, 0.7], [0.75, 0.88, 1], [1, 1, 1], [0.6, 0.7, 1], [1, 0.45, 0.85]] },
};
const E = EDITIONS[edition]; if (!E) throw new Error('edition must be amber or blue');
// One arm per model generation. When a new generation ships, re-render with ARMS=<generation>.
if (process.env.ARMS) E.arms = Number(process.env.ARMS);

let seed = (E.seed * 2654435761) >>> 0;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const ramp = (stops, t) => { t = Math.min(1, Math.max(0, t)); const k = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(k)); return mix(stops[i], stops[i + 1], k - i); };
const P = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const hash = (x, y) => P[(P[x & 255] + y) & 255] / 255, fade = t => t * t * (3 - 2 * t);
const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = fade(x - xi), v = fade(y - yi), a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };

const img = new Float32Array(W * H * 3);
function dot(x, y, c, e) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const px = x0 + dx, py = y0 + dy; if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const i = (py * W + px) * 3; img[i] += c[0] * e * w; img[i + 1] += c[1] * e * w; img[i + 2] += c[2] * e * w; } }
function glow(x, y, r, c, e) { const R = Math.ceil(r * 3);
  for (let py = Math.max(0, Math.floor(y) - R); py <= Math.min(H - 1, y + R); py++) for (let px = Math.max(0, Math.floor(x) - R); px <= Math.min(W - 1, x + R); px++) {
    const w = e * Math.exp(-((px - x) ** 2 + (py - y) ** 2) / (2 * r * r)), i = (py * W + px) * 3; img[i] += c[0] * w; img[i + 1] += c[1] * w; img[i + 2] += c[2] * w; } }
// Four-point sparkle: soft centre plus thin tapered rays.
function sparkle(x, y, size, c, e) { glow(x, y, 0.9 * S, c, e * 1.4); glow(x, y, 2.4 * S, c, e * 0.12);
  for (let k = 1; k <= size; k++) { const w = e * 0.5 * Math.pow(1 - k / (size + 1), 2.2);
    dot(x + k, y, c, w); dot(x - k, y, c, w); dot(x, y + k, c, w); dot(x, y - k, c, w); } }

// 1. Background: dense starfield clustered into soft bands (the "pattern"), with faint nebula colour.
if (false) for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
  const n = fbm(px / (300 * S) + 5, py / (300 * S), 5), i = (py * W + px) * 3, a = Math.max(0, n - 0.5) * 0.10;
  const tint = edition === 'amber' ? [0.5, 0.08, 0.18] : [0.12, 0.06, 0.42]; img[i] += tint[0] * a; img[i + 1] += tint[1] * a; img[i + 2] += tint[2] * a; }
for (let s = 0; s < 0; s++) {
  const x = rand() * W, y = rand() * H, band = fbm(x / (170 * S), y / (170 * S) + 40, 4);
  if (rand() > 0.25 + 1.6 * Math.max(0, band - 0.35)) continue;                 // stars bunch into bands
  const b = Math.pow(rand(), 3.5), c = E.sparkle[Math.floor(rand() * E.sparkle.length)];
  if (rand() < 0.022) sparkle(x, y, Math.round((2 + rand() * rand() * 11) * S), c, 0.35 + rand() * 0.9); else dot(x, y, mix(c, [1, 1, 1], 0.35 * rand()), 0.06 + b * 0.8);
}

// 2. Arms: each particle sits along a curved arm; arms widen and fade toward their tips.
const spin = r => time * 1.8 / Math.sqrt(0.12 + r / (E.radius * S));
for (let p = 0; p < E.particles * S * S; p++) {
  const k = Math.floor(rand() * E.arms), t = Math.pow(rand(), 0.85);              // t: 0 core → 1 tip
  const r = (14 + t * E.radius) * S;
  const width = E.thick * (0.25 + 0.9 * t);                                        // radians of arm width
  const theta = (2 * Math.PI * k) / E.arms + E.dir * E.curl * Math.pow(t, 0.75) + gauss() * width * (1 - 0.25 * t) + spin(r);
  const rr = r * (1 + gauss() * 0.05);
  const x = cx + Math.cos(theta) * rr, y = cy + Math.sin(theta) * rr;
  const grain = 0.5 + 0.9 * fbm(x / (9 * S), y / (9 * S), 2);                     // glittery texture inside arms
  const e = 0.12 * (E.gain || 1) * Math.pow(1 - t, 1.1) * grain * (0.35 + rand() * rand() * 2.4) + 0.01;
  let pc = mix([1, 1, 1], E.colour, Math.min(1, rand() * 0.6 + t * 0.7));
  if (rand() < 0.07) { const h = rand() * 6, f = h - Math.floor(h), seg = Math.floor(h); const rb = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][seg]; pc = mix(pc, rb, 0.45); }
  dot(x, y, pc, e);
  if (t > 0.08 && rand() < 0.0005) sparkle(x, y, Math.round((2 + rand() * 3) * S), mix(pc, [1, 1, 1], 0.6), 0.35 + rand() * 0.4);   // bright stars in the arms
}
// 3. Overexposed core with a coloured halo.
glow(cx, cy, 14 * S, [1, 1, 1], 5); glow(cx, cy, 38 * S, mix([1, 1, 1], E.colour, 0.4), 0.8); glow(cx, cy, 110 * S, E.colour, 0.07);

// 4. Soft bloom of highlights, then tone map.
const q = 4, w4 = W / q, h4 = H / q, small = new Float32Array(w4 * h4 * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) small[((y / q | 0) * w4 + (x / q | 0)) * 3 + c] += Math.max(0, img[(y * W + x) * 3 + c] - 0.4) / (q * q);
const rad = 5, kern = []; let ks = 0; for (let i = -rad * 3; i <= rad * 3; i++) { const v = Math.exp(-(i * i) / (2 * rad * rad)); kern.push(v); ks += v; }
const tmp = new Float32Array(small.length);
for (let y = 0; y < h4; y++) for (let x = 0; x < w4; x++) for (let c = 0; c < 3; c++) { let v = 0; for (let i = 0; i < kern.length; i++) v += small[(y * w4 + Math.min(w4 - 1, Math.max(0, x + i - rad * 3))) * 3 + c] * kern[i]; tmp[(y * w4 + x) * 3 + c] = v / ks; }
for (let y = 0; y < h4; y++) for (let x = 0; x < w4; x++) for (let c = 0; c < 3; c++) { let v = 0; for (let i = 0; i < kern.length; i++) v += tmp[(Math.min(h4 - 1, Math.max(0, y + i - rad * 3)) * w4 + x) * 3 + c] * kern[i]; small[(y * w4 + x) * 3 + c] = v / ks; }
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
    const fx = Math.min(w4 - 1.001, Math.max(0, x / q - 0.5)), fy = Math.min(h4 - 1.001, Math.max(0, y / q - 0.5)), x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, at = (xx, yy) => small[(yy * w4 + xx) * 3 + c];
    const bloomV = (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    const v = (img[(y * W + x) * 3 + c] + bloomV * 0.9) * 1.1, t = 1 - Math.exp(-v);
    raw[y * (W * 3 + 1) + 1 + x * 3 + c] = Math.round(Math.pow(Math.min(1, t), 0.9) * 255); } }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out);

// Galaxy art tools, no dependencies.
//   node galaxy-tools.mjs saturate in.png out.png [factor=1.3]    colour saturation only (1.3 = +30%)
//   node galaxy-tools.mjs fit  in.png out.png [size=1024]        crop/scale so the galaxy exactly fills the square
//   node galaxy-tools.mjs stars in.png out.png [count=900] [seed]  natural background stars on empty black
//   node galaxy-tools.mjs gif  in.png out.gif [size=400] [seconds=54] [fps=8]   seamless real-galaxy swirl; rim turns once per loop
// Inputs must already be centred (see center.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

export function decodePng(file) {
  const png = readFileSync(file); let off = 8, W, H, type, depth; const idat = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off), tag = png.toString('ascii', off + 4, off + 8), data = png.subarray(off + 8, off + 8 + len);
    if (tag === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) throw new Error('interlaced PNG not supported'); }
    if (tag === 'IDAT') idat.push(data); off += 12 + len;
  }
  if (depth !== 8 || ![2, 6].includes(type)) throw new Error(`unsupported PNG (depth ${depth}, colour type ${type})`);
  const bpp = type === 6 ? 4 : 3, stride = W * bpp, raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[o + x - bpp] : 0, b = y ? px[o - stride + x] : 0, c = x >= bpp && y ? px[o - stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      px[o + x] = (row[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  const rgb = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = px[i * bpp + c];
  return { W, H, rgb };
}

export function encodePng(file, W, H, rgb) {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(rgb[y * W * 3 + x])));
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

const bilinear = (src, W, H, x, y, out, o) => {
  if (x < 0 || y < 0 || x > W - 1 || y > H - 1) { out[o] = out[o + 1] = out[o + 2] = 0; return; }
  const x0 = Math.min(W - 2, x | 0), y0 = Math.min(H - 2, y | 0), tx = x - x0, ty = y - y0;
  for (let c = 0; c < 3; c++) {
    const a = src[(y0 * W + x0) * 3 + c], b = src[(y0 * W + x0 + 1) * 3 + c], d = src[((y0 + 1) * W + x0) * 3 + c], e = src[((y0 + 1) * W + x0 + 1) * 3 + c];
    out[o + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
  }
};

// Radius containing 98% of the galaxy's light above the background star level.
export function galaxyRadius({ W, H, rgb }) {
  const cx = W / 2, cy = H / 2, rings = Math.ceil(Math.hypot(cx, cy)), sum = new Float64Array(rings), area = new Float64Array(rings);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = Math.floor(Math.hypot(x + 0.5 - cx, y + 0.5 - cy)), i = (y * W + x) * 3;
    sum[r] += rgb[i] + rgb[i + 1] + rgb[i + 2]; area[r]++;
  }
  // Background = mean light per pixel in the corners (beyond the inscribed circle).
  let bs = 0, ba = 0; for (let r = Math.ceil(W / 2); r < rings; r++) { bs += sum[r]; ba += area[r]; }
  const bg = ba ? bs / ba : 0, excess = [...sum].map((s, r) => Math.max(0, s - bg * area[r]));
  const total = excess.slice(0, Math.floor(W / 2)).reduce((a, b) => a + b, 0);
  let acc = 0; for (let r = 0; r < W / 2; r++) { acc += excess[r]; if (acc >= total * 0.98) return r + 1; }
  return W / 2;
}

function fit(input, output, size) {
  const img = decodePng(input), R = galaxyRadius(img), N = size, out = new Float32Array(N * N * 3), s = (2 * R) / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) bilinear(img.rgb, img.W, img.H, img.W / 2 - R + (x + 0.5) * s - 0.5, img.H / 2 - R + (y + 0.5) * s - 0.5, out, (y * N + x) * 3);
  encodePng(output, N, N, out);
  console.log(`galaxy radius ${R}px of ${img.W / 2}px; scaled ×${(img.W / 2 / R).toFixed(3)} to fill ${N}x${N} → ${output}`);
}

// ---------- GIF encoder (global palette, LZW) ----------
function buildPalette(samples) {           // median cut to 255 colours + pure black
  let boxes = [samples];
  while (boxes.length < 255) {
    let bi = -1, bestRange = -1, bc = 0;
    boxes.forEach((b, i) => { if (b.length < 2) return; for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; for (const p of b) { lo = Math.min(lo, p[c]); hi = Math.max(hi, p[c]); } if (hi - lo > bestRange) { bestRange = hi - lo; bi = i; bc = c; } } });
    if (bi < 0 || bestRange <= 0) break;
    const b = boxes[bi].sort((p, q) => p[bc] - q[bc]), mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const pal = [[0, 0, 0], ...boxes.map(b => [0, 1, 2].map(c => Math.round(b.reduce((s, p) => s + p[c], 0) / b.length)))];
  while (pal.length < 256) pal.push([0, 0, 0]);
  return pal;
}
function lzw(indices) {                    // GIF LZW with 8-bit min code size
  const out = [], clear = 256, eoi = 257; let size = 9, next = 258, dict = new Map(), bits = 0, acc = 0;
  const emit = code => { acc |= code << bits; bits += size; while (bits >= 8) { out.push(acc & 255); acc >>>= 8; bits -= 8; } };
  emit(clear); let w = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = w * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { w = hit; continue; }
    emit(w);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); next = 258; size = 9; }
    w = k;
  }
  emit(w); emit(eoi); if (bits) out.push(acc & 255);
  const blocks = []; for (let i = 0; i < out.length; i += 255) { const b = out.slice(i, i + 255); blocks.push(b.length, ...b); }
  return Buffer.from([8, ...blocks, 0]);
}

const bilinear1 = (src, W, H, x, y) => {
  if (x < 0 || y < 0 || x > W - 1 || y > H - 1) return 0;
  const x0 = Math.min(W - 2, x | 0), y0 = Math.min(H - 2, y | 0), tx = x - x0, ty = y - y0;
  return (src[y0 * W + x0] * (1 - tx) + src[y0 * W + x0 + 1] * tx) * (1 - ty) + (src[(y0 + 1) * W + x0] * (1 - tx) + src[(y0 + 1) * W + x0 + 1] * tx) * ty;
};
function boxBlur(a, W, H, r, passes = 3) {           // repeated box blur ≈ gaussian
  let src = a, tmp = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { tmp[y * W + x] = s / (2 * r + 1); s += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)]; } }
    const out = new Float32Array(a.length);
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { out[y * W + x] = s / (2 * r + 1); s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
    src = out;
  }
  return src;
}
function downsample(rgb, W, n) {                      // area-average a W×W image down to n×n
  const out = new Float32Array(n * n * 3), s = W / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const x0 = Math.floor(x * s), x1 = Math.max(x0 + 1, Math.floor((x + 1) * s)), y0 = Math.floor(y * s), y1 = Math.max(y0 + 1, Math.floor((y + 1) * s));
    for (let c = 0; c < 3; c++) { let t = 0; for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) t += rgb[(yy * W + xx) * 3 + c]; out[(y * n + x) * 3 + c] = t / ((x1 - x0) * (y1 - y0)); }
  }
  return out;
}
// How the arms wind: follows the arm pattern outward ring by ring. > 0 means the arms' angle grows
// outward in screen terms (clockwise with y pointing down).
function windingTwist(E, M, c, R) {
  const n = 720, prof = r => { const p = new Float64Array(n); for (let k = 0; k < n; k++) { const a = (2 * Math.PI * k) / n; p[k] = bilinear1(E, M, M, c + Math.cos(a) * r, c + Math.sin(a) * r); } return p; };
  let twist = 0, prev = prof(0.2 * R);
  for (let r = 0.2 * R + 2; r <= 0.85 * R; r += 2) {
    const cur = prof(r); let best = 0, bs = -Infinity;
    for (let s = -10; s <= 10; s++) { let corr = 0; for (let k = 0; k < n; k++) corr += prev[k] * cur[(k + s + n) % n]; if (corr > bs) { bs = corr; best = s; } }
    twist += best; prev = cur;
  }
  return twist;
}

// Seamless swirl that moves like a real spiral galaxy (density-wave model):
//  - Every star orbits at its own speed from a flat rotation curve (orbital speed roughly constant with
//    distance, as measured in real spirals): angular speed ∝ 1/√(r² + rc²), so stars near the core lap
//    the rim ~R/rc times as fast. The rim makes one turn per loop.
//  - The arm pattern (soft glow) and background turn rigidly at the rim's speed, in the direction that
//    makes the arms trail; stars stream through the arms and brighten inside them.
//  - Stars are separate points (no smearing). To loop seamlessly each star has two staggered "lives"
//    that fade in and out (sin² + cos² = 1, so brightness stays constant) and respawn invisibly; lives
//    are randomly phased, so no frame pulses.
function gif(input, output, size, seconds, fps) {
  const frames = Math.round(seconds * fps), RC = 0.15;   // core radius as a fraction of the galaxy radius
  const img = decodePng(input), N0 = img.W, R0 = galaxyRadius(img);
  // Canvas big enough that the rotating square never shows empty corners; the extra margin gets matching stars.
  const M0 = Math.ceil(N0 * Math.SQRT2) + 8, off = (M0 - N0) >> 1, big = new Float32Array(M0 * M0 * 3);
  for (let y = 0; y < N0; y++) big.set(img.rgb.subarray(y * N0 * 3, (y + 1) * N0 * 3), ((y + off) * M0 + off) * 3);
  sprinkle(big, M0, M0, Math.round(900 * (M0 * M0 - N0 * N0) / (N0 * N0)), 99, (x, y) => x < off || y < off || x >= off + N0 || y >= off + N0);
  // Work at output resolution (area-averaged first).
  const n = size, scale = N0 / n, M = Math.round(M0 / scale), S = downsample(big, M0, M), c = (off + N0 / 2) / scale, R = R0 / scale;
  // Glow layer = blurred image (per channel); star layer = what's left.
  const rad = Math.max(2, Math.round(n * 0.012)), E = new Float32Array(M * M * 3);
  const HAZE = 0.5;   // share of the smooth arm light kept as glow; the rest is carried by the stars (sparkle, not haze)
  for (let k = 0; k < 3; k++) { const ch = new Float32Array(M * M); for (let i = 0; i < M * M; i++) ch[i] = S[i * 3 + k]; const b = boxBlur(ch, M, M, rad); for (let i = 0; i < M * M; i++) E[i * 3 + k] = b[i] * HAZE; }
  const El = new Float32Array(M * M), Pl = new Float32Array(M * M);
  for (let i = 0; i < M * M; i++) { El[i] = (E[i * 3] + E[i * 3 + 1] + E[i * 3 + 2]) / 3; Pl[i] = (S[i * 3] + S[i * 3 + 1] + S[i * 3 + 2]) / 3 - El[i]; }
  // Extract stars: local maxima of the star layer, with sub-pixel centre and colour flux from their 3×3 patch.
  const stars = []; let seed = 12345;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 1; y < M - 1; y++) for (let x = 1; x < M - 1; x++) {
    const i = y * M + x, l = Pl[i]; if (l < 4) continue;
    let peak = true; for (let dy = -1; dy <= 1 && peak; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * M + dx; if (j !== i && (Pl[j] > l || (Pl[j] === l && j < i))) { peak = false; break; } }
    if (!peak) continue;
    let sx = 0, sy = 0, sw = 0; const flux = [0, 0, 0];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * M + dx, w = Math.max(0, Pl[j]); sx += (x + dx) * w; sy += (y + dy) * w; sw += w;
      for (let k = 0; k < 3; k++) flux[k] += Math.max(0, S[j * 3 + k] - E[j * 3 + k]); }
    const px = sx / sw + 0.5 - c, py = sy / sw + 0.5 - c, r = Math.hypot(px, py), u = r / R;
    // Extra turns per loop relative to the rim (0 at the rim and beyond).
    const rel = u < 1 ? Math.sqrt(1 + RC * RC) / Math.sqrt(u * u + RC * RC) - 1 : 0;
    // Twinkle: 0.4–1.2 flickers per second for most stars, amplitude up to 0.75.
    const twinkle = rand() < 0.8 ? { tw: 0, ta: 0.25 + 0.5 * rand(), tp: rand(), hz: 0.4 + 0.8 * rand() } : { tw: 0, ta: 0, tp: 0, hz: 0 };
    stars.push({ r, th: Math.atan2(py, px), flux, rel, phase: rand(), spike: false, ...twinkle });
  }
  for (const st of stars) st.tw = Math.max(1, Math.round(st.hz * seconds));   // whole flickers per loop
  // The brightest 1.5% of stars get sparkle crosses (which pulse with their twinkle).
  const bright = stars.map(st => st.flux[0] + st.flux[1] + st.flux[2]).sort((a, b) => b - a), cut = bright[Math.floor(stars.length * 0.015)] ?? Infinity;
  for (const st of stars) st.spike = st.flux[0] + st.flux[1] + st.flux[2] >= cut;
  // Measure how the arms wind, from the glow layer, and spin the way that makes them trail.
  const twist = windingTwist(El, M, c, R), dir = twist > 0 ? -1 : 1;
  console.log(`${stars.length} stars; arms wind ${twist > 0 ? 'clockwise' : 'counter-clockwise'} outward (twist ${twist}); spinning ${dir < 0 ? 'counter-clockwise' : 'clockwise'}`);
  const lives = 3, K = 18;
  console.log(`core stars lap the rim ${(Math.sqrt(1 + RC * RC) / RC).toFixed(1)}x as fast; rim: one turn per ${seconds}s loop`);
  const envAt = (r, th) => bilinear1(El, M, M, c + Math.cos(th) * r - 0.5, c + Math.sin(th) * r - 0.5);
  const all = [], e3 = [0, 0, 0];
  for (let f = 0; f < frames; f++) {
    const t = f / frames, spin = dir * 2 * Math.PI * t, out = new Float32Array(n * n * 3), cs = Math.cos(-spin), sn = Math.sin(-spin);
    // Glow layer and background: rigid rotation at the rim's speed.
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - n / 2, dy = y + 0.5 - n / 2;
      bilinear(E, M, M, c + dx * cs - dy * sn - 0.5, c + dx * sn + dy * cs - 0.5, e3, 0);
      out.set(e3, (y * n + x) * 3);
    }
    // Star layer: each star orbits at its own speed, drifting ahead of the arm pattern, fading through staggered lives.
    const splat = (x, y, col, w) => { const x0 = Math.floor(x - 0.5), y0 = Math.floor(y - 0.5);
      let tot = 0; const ws = [];
      for (let yy = y0 - 1; yy <= y0 + 2; yy++) for (let xx = x0 - 1; xx <= x0 + 2; xx++) { const v = Math.exp(-((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2) / (2 * 0.6 * 0.6)); ws.push([xx, yy, v]); tot += v; }
      for (const [xx, yy, v] of ws) { if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const o = (yy * n + xx) * 3, a = (w * v) / tot; out[o] += col[0] * a; out[o + 1] += col[1] * a; out[o + 2] += col[2] * a; } };
    const line = (x, y, col, w) => { for (let k = 2; k <= 4; k++) { const a = w * 0.12 * (1 - k / 5); for (const [ex, ey] of [[k, 0], [-k, 0], [0, k], [0, -k]]) { const xx = Math.round(x - 0.5 + ex), yy = Math.round(y - 0.5 + ey); if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const o = (yy * n + xx) * 3; out[o] += col[0] * a; out[o + 1] += col[1] * a; out[o + 2] += col[2] * a; } } };
    for (const s of stars) {
      const copies = s.rel > 0.002 ? [0, 0.5] : [null];
      for (const k of copies) {
        let th = s.th, w = 1;
        if (k !== null) {
          const tau = (lives * t + s.phase + k) % 1;                       // age within this life, 0..1
          w = Math.sin(Math.PI * tau) ** 2;
          th = s.th + dir * 2 * Math.PI * s.rel * (tau - 0.5) / lives;     // drift ahead of the arm pattern
          const boost = Math.min(3, Math.max(0.25, (envAt(s.r, th) + K) / (envAt(s.r, s.th) + K)));   // brighter inside arms
          w *= boost;
        }
        if (s.ta) w *= Math.max(0, 1 + s.ta * Math.sin(2 * Math.PI * (s.tw * t + s.tp)));   // twinkle
        const a = th + spin, x = n / 2 + Math.cos(a) * s.r, y = n / 2 + Math.sin(a) * s.r;
        if (x < -3 || y < -3 || x > n + 3 || y > n + 3) continue;
        splat(x, y, s.flux, w); if (s.spike) line(x, y, s.flux, w * w);   // crosses flare at twinkle peaks
      }
    }
    for (let i = 0; i < out.length; i++) { const v = out[i]; if (v > 200) out[i] = 200 + 55 * (1 - Math.exp(-(v - 200) / 55)); }
    all.push(out);
  }
  // DUMP_FRAMES=0,36 saves those frames as PNGs next to the GIF, for checking.
  for (const f of (process.env.DUMP_FRAMES || '').split(',').filter(Boolean)) encodePng(output.replace(/\.gif$/, `-frame${f}.png`), n, n, all[Number(f)]);
  const N = n;
  const samples = []; for (const fr of all) for (let i = 0; i < N * N; i += 7) { const p = [fr[i * 3], fr[i * 3 + 1], fr[i * 3 + 2]].map(v => Math.max(0, Math.min(255, Math.round(v)))); if (p[0] + p[1] + p[2] > 12) samples.push(p); }
  const pal = buildPalette(samples), cache = new Int16Array(32768).fill(-1);
  const nearest = (r, g, b) => { const k = (r >> 3) << 10 | (g >> 3) << 5 | b >> 3; if (cache[k] >= 0) return cache[k];
    let best = 0, bd = Infinity; for (let i = 0; i < 256; i++) { const d = (pal[i][0] - r) ** 2 + (pal[i][1] - g) ** 2 + (pal[i][2] - b) ** 2; if (d < bd) { bd = d; best = i; } } return (cache[k] = best); };
  const head = Buffer.alloc(13); head.write('GIF89a'); head.writeUInt16LE(N, 6); head.writeUInt16LE(N, 8); head[10] = 0xf7; head[11] = 0; head[12] = 0;
  const parts = [head, Buffer.from(pal.flat()), Buffer.from([0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0])];   // loop forever
  const delay = Math.round(100 / fps);
  for (const fr of all) {
    const idx = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) { const v = c => Math.max(0, Math.min(255, Math.round(fr[i * 3 + c]))); idx[i] = nearest(v(0), v(1), v(2)); }
    const gce = Buffer.from([0x21, 0xf9, 4, 0, delay & 255, delay >> 8, 0, 0]), desc = Buffer.alloc(10);
    desc[0] = 0x2c; desc.writeUInt16LE(N, 5); desc.writeUInt16LE(N, 7); desc[9] = 0;
    parts.push(gce, desc, lzw(idx));
  }
  parts.push(Buffer.from([0x3b]));
  const data = Buffer.concat(parts); writeFileSync(output, data);
  console.log(`wrote ${output}: ${N}x${N}, ${frames} frames at ${fps} fps (${(frames / fps).toFixed(1)} s loop), ${(data.length / 1048576).toFixed(1)} MB`);
}

// Natural background stars on empty black only: power-law brightness, faint colour tints, a few tiny spikes.
function stars(input, output, count, seed) {
  const img = decodePng(input), { W, H, rgb } = img;
  const placed = sprinkle(rgb, W, H, count, seed, () => true);
  encodePng(output, W, H, rgb);
  console.log(`added ${placed} background stars → ${output}`);
}
function sprinkle(rgb, W, H, count, seed, allowed) {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tints = [[1, 1, 1], [1, 0.92, 0.82], [0.85, 0.9, 1], [1, 0.85, 0.7], [0.8, 0.88, 1]];
  const lum = (x, y) => { const i = (y * W + x) * 3; return rgb[i] + rgb[i + 1] + rgb[i + 2]; };
  const add = (x, y, c, e) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return; const i = (yi * W + xi) * 3; for (let k = 0; k < 3; k++) rgb[i + k] += c[k] * e; };
  let placed = 0;
  for (let n = 0; n < count * 4 && placed < count; n++) {
    const x = rand() * W, y = rand() * H;
    if (!allowed(x, y)) continue;
    let busy = false; for (let dy = -3; dy <= 3 && !busy; dy += 3) for (let dx = -3; dx <= 3; dx += 3) { const px = Math.round(x) + dx, py = Math.round(y) + dy; if (px >= 0 && py >= 0 && px < W && py < H && lum(px, py) > 45) { busy = true; break; } }
    if (busy) continue;
    placed++;
    const b = Math.pow(rand(), 5) * 230 + 25, c = tints[Math.floor(rand() * tints.length)], r = b > 150 ? 1.1 : 0.7;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) add(x + dx, y + dy, c, b * Math.exp(-(dx * dx + dy * dy) / (2 * r * r)));
    if (b > 200) for (let k = 2; k <= 6; k++) { const e = b * 0.35 * (1 - k / 7); add(x + k, y, c, e); add(x - k, y, c, e); add(x, y + k, c, e); add(x, y - k, c, e); }
  }
  return placed;
}

// Colour saturation only: push each pixel away from its own grey by `factor`, keeping its brightness.
function saturate(input, output, factor) {
  const { W, H, rgb } = decodePng(input);
  for (let i = 0; i < W * H; i++) {
    const o = i * 3, grey = 0.299 * rgb[o] + 0.587 * rgb[o + 1] + 0.114 * rgb[o + 2];
    for (let c = 0; c < 3; c++) rgb[o + c] = grey + (rgb[o + c] - grey) * factor;
  }
  encodePng(output, W, H, rgb);
  console.log(`saturation ×${factor} → ${output}`);
}

const [, , cmd, input, output, a, b, c, d] = process.argv;
if (cmd === 'stars') stars(input, output, Number(a || 900), Number(b || 7));
else if (cmd === 'fit') fit(input, output, Number(a || 1024));
else if (cmd === 'gif') gif(input, output, Number(a || 400), Number(b || 54), Number(c || 8));
else if (cmd === 'saturate') saturate(input, output, Number(a || 1.3));
else if (cmd) { console.error('commands: saturate, fit, stars, gif'); process.exit(2); }

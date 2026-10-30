// Local export helper. Encoder algorithms adapted from image-bridge/galaxy-tools.mjs.
// Uses the existing bundled Playwright and a fresh, offline Brave process.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const date = '20261030';

// One palette for the entire animation: median cut, with an explicit black entry.
export function buildPalette(samples, colors = 256) {
  if (!samples.length) throw new Error('The renderer returned only black pixels.');
  const boxes = [samples];
  while (boxes.length < colors - 1) {
    let bi = -1, bestRange = -1, bc = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of box) { lo = Math.min(lo, p[c]); hi = Math.max(hi, p[c]); }
        if (hi - lo > bestRange) { bestRange = hi - lo; bi = i; bc = c; }
      }
    });
    if (bi < 0 || bestRange <= 0) break;
    const box = boxes[bi].sort((p, q) => p[bc] - q[bc]), mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }
  const palette = [[0, 0, 0], ...boxes.map(box => [0, 1, 2].map(c =>
    Math.round(box.reduce((sum, p) => sum + p[c], 0) / box.length)))];
  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}

// The canonical GIF LZW encoder, including its 12-bit dictionary reset behavior.
export function lzw(indices) {
  const out = [], clear = 256, end = 257;
  let size = 9, next = 258, dict = new Map(), bits = 0, acc = 0;
  const emit = code => {
    acc |= code << bits; bits += size;
    while (bits >= 8) { out.push(acc & 255); acc >>>= 8; bits -= 8; }
  };
  emit(clear);
  let w = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = w * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { w = hit; continue; }
    emit(w);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > (1 << size) && size < 12) size++;
    } else { emit(clear); dict = new Map(); next = 258; size = 9; }
    w = k;
  }
  emit(w); emit(end); if (bits) out.push(acc & 255);
  const blocks = [];
  for (let i = 0; i < out.length; i += 255) {
    const block = out.slice(i, i + 255); blocks.push(block.length, ...block);
  }
  return Buffer.from([8, ...blocks, 0]);
}

function gifHeader(size, palette) {
  const head = Buffer.alloc(13);
  head.write('GIF89a'); head.writeUInt16LE(size, 6); head.writeUInt16LE(size, 8);
  head[10] = 0xf7;
  return [head, Buffer.from(palette.flat()),
    Buffer.from([0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0])];
}

function gifFrame(size, indices, delay, transparent = false) {
  const gce = Buffer.from([0x21, 0xf9, 4, transparent ? 5 : 4, delay & 255, delay >> 8, transparent ? 255 : 0, 0]);
  const desc = Buffer.alloc(10);
  desc[0] = 0x2c; desc.writeUInt16LE(size, 5); desc.writeUInt16LE(size, 7);
  return [gce, desc, lzw(indices)];
}

function difference(a, b) {
  let sum = 0, max = 0, changed = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = Math.abs(a[i] - b[i]);
    sum += delta; max = Math.max(max, delta); if (delta) changed++;
  }
  return { mean: sum / a.length, max, changedChannels: changed };
}

async function captureRgb(page, times) {
  const frames = await page.evaluate(times => times.map(time => {
    const { renderer, canvas, seconds } = window.gifExport;
    renderer.draw(time, { loopSeconds: seconds });
    const rgba = renderer.readPixels(), n = canvas.width;
    if (rgba.length !== n * n * 4) throw new Error('Unexpected readPixels dimensions.');
    const rgb = new Uint8Array(n * n * 3);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const source = ((n - 1 - y) * n + x) * 4, target = (y * n + x) * 3;
      rgb[target] = rgba[source]; rgb[target + 1] = rgba[source + 1]; rgb[target + 2] = rgba[source + 2];
    }
    let binary = '';
    for (let offset = 0; offset < rgb.length; offset += 32768)
      binary += String.fromCharCode(...rgb.subarray(offset, offset + 32768));
    return btoa(binary);
  }), times);
  return frames.map(frame => Buffer.from(frame, 'base64'));
}

async function exportOne(page, brand, size, config) {
  const { seconds, fps, outputRoot } = config, frames = seconds * fps;
  console.log(`${brand} ${size}px: mounting ${frames} frames at ${fps} fps`);
  await page.evaluate(({ brand, size, seconds }) => {
    window.gifExport?.renderer.dispose();
    document.body.replaceChildren();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.style.cssText = `width:${size}px;height:${size}px;display:block`;
    document.body.append(canvas);
    const renderer = window.OfficialGalaxy.mount(canvas, window.officialGalaxyData[brand]);
    window.gifExport = { canvas, renderer, seconds };
  }, { brand, size, seconds });

  const [first, next, previous, endpoint] = await captureRgb(page, [0, 1 / fps, seconds - 1 / fps, seconds]);
  const seam = difference(first, endpoint), incoming = difference(previous, first), outgoing = difference(first, next);
  if (seam.mean > 0.02 || seam.max > 5) throw new Error(`${brand}: loop endpoints differ: ${JSON.stringify(seam)}`);
  if (!outgoing.changedChannels) throw new Error(`${brand}: consecutive frames do not move.`);
  if (incoming.mean > outgoing.mean * 3 + 0.1) throw new Error(`${brand}: unusually large loop-boundary jump.`);

  const sampleCount = 32, samples = [], sampleStride = Math.max(1, Math.ceil(size * size * sampleCount / 80000));
  for (let start = 0; start < sampleCount; start += 8) {
    const times = Array.from({ length: Math.min(8, sampleCount - start) }, (_, i) => (start + i) * seconds / sampleCount);
    for (const rgb of await captureRgb(page, times)) {
      for (let pixel = 0; pixel < size * size; pixel += sampleStride) {
        const i = pixel * 3;
        if (rgb[i] + rgb[i + 1] + rgb[i + 2] > 12) samples.push([rgb[i], rgb[i + 1], rgb[i + 2]]);
      }
    }
  }
  const useDeltaFrames = brand === 'openai' && size === 240;
  const requestedPaletteColors = useDeltaFrames ? 255 : 256;
  const palette = buildPalette(samples, requestedPaletteColors), parts = gifHeader(size, palette);
  // A fixed lookup and palette make quantization stable across every frame. No dithering.
  await page.evaluate(palette => {
    window.gifExport.palette = palette;
    window.gifExport.cache = new Int16Array(32768).fill(-1);
  }, palette);
  const frameHashes = [], rgbFrameHashes = [];
  let previousIndices;
  for (let start = 0; start < frames; start += 10) {
    const encoded = await page.evaluate(({ start, count, fps }) => {
      const { renderer, canvas, seconds, palette, cache } = window.gifExport, n = canvas.width;
      const nearest = (r, g, b) => {
        const key = (r >> 3) << 10 | (g >> 3) << 5 | b >> 3;
        if (key === 0) return 0;
        if (cache[key] >= 0) return cache[key];
        // Fixed representatives prevent the first encountered pixel from biasing a cell.
        r = (r >> 3) * 8 + 3.5; g = (g >> 3) * 8 + 3.5; b = (b >> 3) * 8 + 3.5;
        let best = 0, distance = Infinity;
        for (let i = 0; i < palette.length; i++) {
          const p = palette[i], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
          if (d < distance) { distance = d; best = i; }
        }
        return (cache[key] = best);
      };
      const result = [];
      for (let frame = start; frame < start + count; frame++) {
        renderer.draw(frame / fps, { loopSeconds: seconds });
        const rgba = renderer.readPixels(), indices = new Uint8Array(n * n);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const i = ((n - 1 - y) * n + x) * 4;
          indices[y * n + x] = nearest(rgba[i], rgba[i + 1], rgba[i + 2]);
        }
        let binary = '';
        for (let offset = 0; offset < indices.length; offset += 32768)
          binary += String.fromCharCode(...indices.subarray(offset, offset + 32768));
        result.push(btoa(binary));
      }
      return result;
    }, { start, count: Math.min(10, frames - start), fps });
    for (const data of encoded) {
      const indices = Buffer.from(data, 'base64');
      let frameIndices = indices;
      if (useDeltaFrames && previousIndices) {
        frameIndices = Buffer.from(indices);
        for (let i = 0; i < indices.length; i++) if (indices[i] === previousIndices[i]) frameIndices[i] = 255;
      }
      parts.push(...gifFrame(size, frameIndices, Math.round(100 / fps), useDeltaFrames && Boolean(previousIndices)));
      previousIndices = indices;
      frameHashes.push(createHash('sha256').update(indices).digest('hex'));
      const rgb = Buffer.alloc(indices.length * 3);
      for (let i = 0; i < indices.length; i++) {
        const color = palette[indices[i]];
        rgb[i * 3] = color[0]; rgb[i * 3 + 1] = color[1]; rgb[i * 3 + 2] = color[2];
      }
      rgbFrameHashes.push(createHash('sha256').update(rgb).digest('hex'));
    }
    if ((start + 10) % 60 === 0) console.log(`${brand} ${size}px: ${Math.min(start + 10, frames)}/${frames}`);
  }
  parts.push(Buffer.from([0x3b]));
  const gif = Buffer.concat(parts), withinLimit = gif.length < 10000000;
  const role = size === 160 ? 'card' : 'page';
  const name = withinLimit ? `${brand}-official-${role}-${date}.gif` : `gif-export-${brand}-${size}-oversize-${date}.gif`;
  writeFileSync(join(outputRoot, name), gif);
  const report = { brand, size, frames, fps, seconds, bytes: gif.length, withinLimit, file: name,
    sha256: createHash('sha256').update(gif).digest('hex'), requestedPaletteColors, useDeltaFrames, paletteColors: new Set(palette.map(p => p.join(','))).size,
    uniqueFrames: new Set(frameHashes).size, endpointDifference: seam, boundaryStep: incoming, ordinaryStep: outgoing };
  writeFileSync(join(outputRoot, `gif-export-${brand}-${size}-frame-hashes-${date}.json`), JSON.stringify(rgbFrameHashes) + '\n');
  console.log(JSON.stringify(report));
  return report;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (!match) throw new Error(`Expected --option=value, received ${arg}`);
    return [match[1], match[2]];
  }));
  const worktree = resolve(args.worktree || join(here, '..'));
  const outputRoot = resolve(args.output || here);
  const sourceFiles = [
    `openai-discord-presence/public/official-galaxy-data-${date}.js`,
    `anthropic-discord-presence/public/official-galaxy-data-${date}.js`,
    `openai-discord-presence/public/official-galaxy-renderer-${date}.js`
  ];
  const source = sourceFiles.map(name => ({ name, content: readFileSync(join(worktree, name), 'utf8') }));
  const require = createRequire(import.meta.url);
  const bundledPlaywright = args.playwright || join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright');
  const { chromium } = require(bundledPlaywright);
  const executablePath = args.browser || join(process.env.ProgramFiles || 'C:/Program Files', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');
  if (!existsSync(executablePath)) throw new Error('Brave is unavailable; pass --browser=<existing browser>.');
  const sizes = (args.sizes || '160,240').split(',').map(Number), brands = (args.brands || 'openai,anthropic').split(',');
  if (sizes.some(size => ![160, 240].includes(size)) || brands.some(brand => !['openai', 'anthropic'].includes(brand)))
    throw new Error('Supported sizes: 160,240. Supported brands: openai,anthropic.');
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-background-networking'] });
  const report = { source: source.map(item => ({ file: item.name, sha256: createHash('sha256').update(item.content).digest('hex') })), exports: [] };
  try {
    const context = await browser.newContext({ offline: true, viewport: { width: 300, height: 300 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style>');
    for (const item of source) await page.addScriptTag({ content: item.content });
    for (const brand of brands) for (const size of sizes) {
      report.exports.push(await exportOne(page, brand, size, { seconds: 24, fps: 25, outputRoot }));
      writeFileSync(join(outputRoot, `gif-export-report-${date}.json`), JSON.stringify(report, null, 2) + '\n');
    }
    if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    if (report.exports.some(item => !item.withinLimit)) throw new Error('At least one GIF exceeds the 10 MB limit; see the export report.');
  } finally { await browser.close(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  await main();

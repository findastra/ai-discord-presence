// Image bridge: lets Claude (or you) generate images from the command line with no clicking.
//
//   node imagine.mjs "a prompt" out.png                        generate from text
//   node imagine.mjs "a prompt" out.png --ref style.png        generate guided by reference image(s)
//   options: --size 1024x1024 | 1536x1024 | 1024x1536   --model gpt-image-2   --quality high|medium|low
//
// Needs the OPENAI_API_KEY environment variable (set once by you; see README.md). The key is read
// from the environment only and is never printed, logged or written to disk.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback; const v = args[i + 1]; args.splice(i, 2); return v; };
const refs = []; for (let i = args.indexOf('--ref'); i >= 0; i = args.indexOf('--ref')) { refs.push(args[i + 1]); args.splice(i, 2); }
const model = flag('--model', process.env.IMAGE_MODEL || 'gpt-image-2');
const size = flag('--size', '1024x1024');
const quality = flag('--quality', 'high');
const [prompt, out] = args;
if (!prompt || !out) { console.error('Usage: node imagine.mjs "prompt" out.png [--ref image.png] [--size 1024x1024] [--quality high]'); process.exit(2); }
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('OPENAI_API_KEY is not set. See README.md for the one-time setup.'); process.exit(3); }

const headers = { Authorization: `Bearer ${key}` };
let response;
if (refs.length) {
  // Edits endpoint: the reference images steer style and composition.
  const form = new FormData();
  form.append('model', model); form.append('prompt', prompt); form.append('size', size); form.append('quality', quality);
  for (const ref of refs) form.append('image[]', new Blob([readFileSync(ref)], { type: 'image/png' }), basename(ref));
  response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form });
} else {
  response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
  });
}
const body = await response.json().catch(() => ({}));
if (!response.ok) { console.error(`Image API error ${response.status}: ${body.error?.message || 'unknown error'}`); process.exit(1); }
const b64 = body.data?.[0]?.b64_json;
if (!b64) { console.error('The API answered without an image.'); process.exit(1); }
mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(`saved ${out} (${model}, ${size}, ${quality}${refs.length ? `, ${refs.length} reference image(s)` : ''})`);

import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function sourceIdentity(root = fileURLToPath(new URL('../', import.meta.url))) {
  const canonical = realpathSync(root).replaceAll('\\', '/');
  const files = [
    ...readdirSync(join(root, 'src')).filter(name => name.endsWith('.js')).map(name => 'src/' + name),
    'public/official-galaxy-data-20261030.js', 'public/official-galaxy-renderer-20261030.js', 'public/official-galaxy-still-20261030.png',
    'scripts/startup.js', 'public/index.html', 'public/app.js', 'public/style.css', 'package.json',
  ].sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(readFileSync(join(root, file))).update('\0');
  return Object.freeze({ installationPath: process.platform === 'win32' ? canonical.toLowerCase() : canonical, buildId: hash.digest('hex') });
}
// Captured once: a running server continues to identify the code it loaded even after files change.
export const SOURCE_IDENTITY = sourceIdentity();

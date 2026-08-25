// Stämplar sw.js CACHE_NAME med en hash av de filer service workern cachar.
// Utan hash-stämpel måste versionen bumpas för hand, och glöms den fastnar
// mobiler i gammal cache (cache-first). Kör med --check i CI för att fånga
// en sw.js som inte matchar källfilerna.

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

// sw.js själv ingår inte — dess innehåll ändras av den här stämplingen.
const HASHED_FILES = [
  'index.html',
  'app.js',
  'chords.js',
  'haften.js',
  'style.css',
  'manifest.json',
];

const SW_FILE = 'sw.js';
const CACHE_NAME_RE = /const CACHE_NAME = '([^']*)';/;

export function cacheNameFor(files = HASHED_FILES) {
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(f);
    hash.update(readFileSync(f));
  }
  return `korhaftet-${hash.digest('hex').slice(0, 8)}`;
}

function readSw() {
  const source = readFileSync(SW_FILE, 'utf8');
  const match = source.match(CACHE_NAME_RE);
  if (!match) throw new Error(`Hittade ingen CACHE_NAME-rad i ${SW_FILE}`);
  return { source, current: match[1] };
}

const expected = cacheNameFor();
const { source, current } = readSw();

if (process.argv.includes('--check')) {
  if (current !== expected) {
    console.error(
      `${SW_FILE} har CACHE_NAME '${current}' men källfilerna ger '${expected}'.\n` +
      `Kör "npm run cache" (eller "npm run dist") och committa ändringen.`
    );
    process.exit(1);
  }
  console.log(`CACHE_NAME är aktuell (${current})`);
} else if (current === expected) {
  console.log(`CACHE_NAME är redan aktuell (${current})`);
} else {
  writeFileSync(SW_FILE, source.replace(CACHE_NAME_RE, `const CACHE_NAME = '${expected}';`));
  console.log(`CACHE_NAME ${current} → ${expected}`);
}

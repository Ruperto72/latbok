import { build } from 'esbuild';
import { cpSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

// Clean & create dist
mkdirSync(DIST, { recursive: true });

// Bundle JS
await build({
  entryPoints: ['app.js'],
  bundle: true,
  outfile: join(DIST, 'app.js'),
  format: 'esm',
  minify: true,
  sourcemap: true,
});

// Copy static assets
const staticFiles = [
  'index.html',
  'style.css',
  'sw.js',
  'manifest.json',
  'icon.svg',
  'favicon-96x96.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

staticFiles.forEach(f => cpSync(f, join(DIST, f)));

// Copy songs directory
mkdirSync(join(DIST, 'songs'), { recursive: true });
readdirSync('songs').forEach(f => {
  cpSync(join('songs', f), join(DIST, 'songs', f));
});

console.log('Build complete → dist/');

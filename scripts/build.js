import { build } from 'esbuild';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'fs';
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

// Copy songs directory (rensa först så borttagna låtar inte ligger kvar)
rmSync(join(DIST, 'songs'), { recursive: true, force: true });
mkdirSync(join(DIST, 'songs'), { recursive: true });
readdirSync('songs').forEach(f => {
  if (f.endsWith('.json')) {
    cpSync(join('songs', f), join(DIST, 'songs', f));
  }
});

// Copy häften
mkdirSync(join(DIST, 'songs', 'haften'), { recursive: true });
readdirSync(join('songs', 'haften')).forEach(f => {
  if (f.endsWith('.json')) {
    cpSync(join('songs', 'haften', f), join(DIST, 'songs', 'haften', f));
  }
});

console.log('Build complete → dist/');

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve('dist/client');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const files = (await walk(root)).filter(file => !file.endsWith('/sw.js') && !file.endsWith('.map') && !path.relative(root, file).split(path.sep).some(part => part.startsWith('.')));
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const cacheName = `starry-${hash.digest('hex').slice(0, 12)}`;
const urls = ['/', ...files.map(file => '/' + path.relative(root, file).split(path.sep).join('/'))];
const worker = `const CACHE = ${JSON.stringify(cacheName)};
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('starry-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      try { const response = await fetch(event.request); if (response.ok) return response; } catch {}
      return (await cache.match('/')) || Response.error();
    }
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});
`;
await writeFile(path.join(root, 'sw.js'), worker);
console.log(`Offline package: ${files.length} files precached (${cacheName})`);

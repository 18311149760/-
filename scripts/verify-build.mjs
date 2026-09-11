import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';

const root = path.resolve('dist/client'), origin = 'https://game.example';
const handlers = {}, stores = new Map([['unrelated-cache', new Map()], ['starry-old-build', new Map()]]);
const key = input => new URL(typeof input === 'string' ? input : input.url, origin).pathname;
let installedAssets = [], online = false, claimed = false;
const caches = {
  keys: async () => [...stores.keys()],
  delete: async name => stores.delete(name),
  open: async name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      addAll: async urls => {
        installedAssets = [...urls];
        for (const url of urls) data.set(key(url), await readFile(path.join(root, url === '/' ? 'index.html' : url.slice(1))));
      },
      match: async request => data.has(key(request)) ? new Response(data.get(key(request))) : undefined,
    };
  },
};
const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
vm.runInNewContext(worker, {
  self: { location: { origin }, addEventListener: (name, callback) => { handlers[name] = callback; }, skipWaiting: async () => {}, clients: { claim: async () => { claimed = true; } } },
  caches, URL, Response, fetch: async () => { if (online) return new Response('online-page'); throw new Error('Network offline'); },
});
let pending;
handlers.install({ waitUntil: promise => { pending = promise; } }); await pending;
handlers.activate({ waitUntil: promise => { pending = promise; } }); await pending;
assert.ok(claimed);
assert.ok(!stores.has('starry-old-build'));
assert.ok(stores.has('unrelated-cache'), 'other applications caches stay untouched');
assert.ok(installedAssets.includes('/'));
assert.ok(installedAssets.includes('/icon-192.png'));
assert.ok(installedAssets.some(url => url.endsWith('.css')));
assert.ok(installedAssets.some(url => url.endsWith('.js')));
assert.ok(installedAssets.every(url => !url.includes('.map') && !url.includes('/server/')));
assert.ok(installedAssets.every(url => !url.split('/').some(part => part.startsWith('.'))), 'offline install must not request hidden build files that static hosts omit');
const request = (url, mode = 'cors', method = 'GET') => {
  let response;
  handlers.fetch({ request: { url, mode, method }, respondWith: promise => { response = promise; } });
  return response;
};
const offlinePage = await (await request(origin + '/?from=homescreen', 'navigate')).text();
assert.ok(offlinePage.includes('星星连连'), 'cached game shell loads offline');
const asset = installedAssets.find(url => url.endsWith('.js'));
assert.ok((await (await request(origin + asset)).arrayBuffer()).byteLength > 100);
assert.equal(request('https://other.example/data'), undefined);
assert.equal(request(origin + '/data', 'cors', 'POST'), undefined);
assert.equal(request(origin + '/api/progress', 'navigate'), undefined, 'private APIs must never get an offline HTML fallback');
assert.equal(request(origin + '/.netlify/identity/user'), undefined, 'authentication responses must never enter the game cache');
online = true;
assert.equal(await (await request(origin + '/', 'navigate')).text(), 'online-page');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) assert.ok((await readFile(path.join(root, icon.src))).byteLength > 500);
const standalone = await readFile('outputs/星星连连-离线版.html', 'utf8');
const script = standalone.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, 'standalone has its bundled application');
new vm.Script(script);
assert.ok(!/<script[^>]*\ssrc=/.test(standalone));
assert.ok(!/<link[^>]*rel="stylesheet"/.test(standalone));
assert.ok(!standalone.includes('process.env.NODE_ENV'));
await mkdir('work', { recursive: true });
const report = { checkedAt: new Date().toISOString(), precachedFiles: installedAssets.length, offlineNavigation: 'passed in simulated Service Worker environment', offlineAssets: 'passed', onlineRefresh: 'passed', unrelatedCachePreservation: 'passed', standaloneScriptSyntax: 'passed', standaloneExternalScripts: 0, actualBrowserOrPhoneTest: 'not performed' };
await writeFile('work/build-verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

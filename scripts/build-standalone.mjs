import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const result = await build({
  configFile: false,
  plugins: [react()],
  resolve: { alias: { '@': process.cwd() } },
  css: { postcss: { plugins: [tailwindcss()] } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    write: false, target: 'es2020', cssCodeSplit: false,
    lib: { entry: path.resolve('offline-entry.tsx'), name: 'StarryGame', formats: ['iife'] },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const output = (Array.isArray(result) ? result[0] : result).output;
const js = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n').replace(/<\/script/gi, '<\\/script');
const css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => item.source).join('\n');
const icon = Buffer.from(await readFile('public/favicon.svg')).toString('base64');
const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1b2544"><meta name="description" content="36 关不限时益智小游戏，点亮你的小宇宙。"><title>星星连连 · 离线版</title><link rel="icon" href="data:image/svg+xml;base64,${icon}"><style>${css}</style></head><body><div id="root"></div><noscript>请用启用 JavaScript 的浏览器打开这个小游戏。</noscript><script>${js}</script></body></html>`;
await mkdir('outputs', { recursive: true });
await writeFile('outputs/星星连连-离线版.html', html);
console.log(`Standalone game: outputs/星星连连-离线版.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);

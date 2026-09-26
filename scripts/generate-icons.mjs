// Raster derivatives of the original vector mark. No network or image service.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const root = new URL('../public/', import.meta.url);
const source = await readFile(new URL('brand/symbol.svg', root), 'utf8');
const mark = source.match(/<path[^>]+\/>/)[0];
const browser = await chromium.launch({ channel: process.env.SMOKE_BROWSER ?? 'msedge', headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const sizes = [[16, 'favicon-16.png'], [32, 'favicon-32.png'], [48, 'favicon-48.png'],
    [180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png'], [512, 'icon-maskable-512.png']];
  for (const [size, name] of sizes) {
    // Maskable artwork fits entirely in the central 80% safe circle.
    const transform = name.includes('maskable') ? 'translate(32 32) scale(.7) translate(-35 -32)' : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" fill="#101116"/><g transform="${transform}">${mark}</g></svg>`;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: fileURLToPath(new URL(name, root)) });
  }
  const entries = await Promise.all([16, 32, 48].map(async size => ({ size, png: await readFile(new URL(`favicon-${size}.png`, root)) })));
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({size, png}, i) => {
    const pos = 6 + i * 16;
    header[pos] = header[pos + 1] = size;
    header.writeUInt16LE(1, pos + 4); header.writeUInt16LE(32, pos + 6);
    header.writeUInt32LE(png.length, pos + 8); header.writeUInt32LE(offset, pos + 12);
    offset += png.length;
  });
  await writeFile(new URL('favicon.ico', root), Buffer.concat([header, ...entries.map(e => e.png)]));
  await page.setViewportSize({width:1200,height:630});
  await page.setContent(`<style>body{margin:0}svg{display:block}</style>${await readFile(new URL('brand/social.svg',root),'utf8')}`);
  await page.screenshot({path:fileURLToPath(new URL('brand/social.png',root))});
  console.log('Ekklesia: favicon, Apple, PWA, maskable and social assets generated.');
} finally { await browser.close(); }

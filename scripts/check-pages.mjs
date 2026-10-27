import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import vm from 'node:vm';

const base = process.env.PAGES_BASE_PATH || '/Eyebre/';
const home = await readFile('_site/index.html', 'utf8');
assert(home.includes(`<base href="${base}"`));
assert(!/\b(?:href|src)=["']\/(?!\/)/g.test(home.replaceAll(base, 'BASE/')));
const runtime = await readFile('_site/_astro/hoisted.CUO_IjfL.js', 'utf8');
assert(runtime.includes('PROJECT_PATH="/assets/projects/"'), 'Keep the original scene CDN paths');
const start = runtime.indexOf('let loc=window.location,');
const end = runtime.indexOf('const routeManager=', start);
const location = { origin: 'https://example.github.io', href: `https://example.github.io${base}?lang=zh` };
const context = vm.createContext({ window: { location }, history: { pushState: (...args) => context.lastUrl = args[2] }, MinSignal$2: class {} });
vm.runInContext(runtime.slice(start, end) + ';globalThis.router=new RouteManager();', context);
assert.equal(context.router.parseUrl(), '');
assert.equal(context.router.parseUrl(`https://example.github.io${base}projects/oryzo_ai/?lang=en`), 'projects/oryzo_ai');
context.router._onStatePop = () => {};
context.router.queryStr = 'lang=zh';
context.router.setPath('');
assert.equal(context.lastUrl, `${base}?lang=zh`);
context.router.setPath('/projects/oryzo_ai');
assert.equal(context.lastUrl, `${base}projects/oryzo_ai?lang=zh`);
const preview = await readFile('_site/catalogue-preview.js', 'utf8');
for (const prefix of ['assets/catalogues/', 'assets/catalogue-pages/', 'assets/vendor/pdfjs-viewer/']) assert(preview.includes(base + prefix));
assert(preview.includes(`back.href='${base}?lang=`));
const brand = await readFile('_site/brand.js', 'utf8');
assert(brand.includes('card.href=`' + base + 'catalogues/'));
for (const entry of await readdir('_site/catalogues', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const html = await readFile(`_site/catalogues/${entry.name}/index.html`, 'utf8');
  assert(html.includes(`src="${base}catalogue-preview.js`));
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    if (!match[1].startsWith(base)) continue;
    const path = match[1].slice(base.length).split(/[?#]/)[0];
    if (path) await access('_site/' + path);
  }
}
console.log('PASS: Pages base path, homepage routing, catalogue URLs, all preview entry assets');

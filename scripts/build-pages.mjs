import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';

// Keep dist usable at localhost's root; only the published copy uses a base path.
const base = process.env.PAGES_BASE_PATH || '/Eyebre/';
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('Invalid Pages base path');
const source = resolve('dist'), output = resolve('_site');
if (output !== join(resolve('.'), '_site') || output === source) throw new Error('Unsafe output path');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2) throw new Error(`Route adapter no longer matches: ${before}`);
  return text.replace(before, after);
}

async function adapt(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { await adapt(file); continue; }
    const extension = extname(file);
    if (!['.html', '.css', '.js'].includes(extension)) continue;
    let text = await readFile(file, 'utf8');
    if (extension === '.html') {
      text = text.replace(/\b(href|src|poster)=(['"])\/(?!\/)/g, (_, attribute, quote) => `${attribute}=${quote}${base}`);
    } else if (extension === '.css') {
      text = text.replace(/url\((['"]?)\/(?!\/)/g, (_, quote) => `url(${quote}${base}`);
    } else if (entry.name === 'hoisted.CUO_IjfL.js') {
      // Reference scene assets stay on their original CDN. Adapt only its router.
      text = replaceOnce(text, 'ORIGIN=window.location.origin,', `ORIGIN=window.location.origin+${JSON.stringify(base.slice(0, -1))},`);
      text = replaceOnce(text, 'properties.loader.load("/"+e,{type:"text"', `properties.loader.load(${JSON.stringify(base)}+e,{type:"text"`);
      text = replaceOnce(text, '(e||"/")+(this.queryStr?', `${JSON.stringify(base)}+e+(this.queryStr?`);
      text = replaceOnce(text, 'window.location.href=window.location.origin)', `window.location.href=window.location.origin+${JSON.stringify(base)})`);
    } else if (['brand.js', 'desktop-intro.js', 'catalogue-preview.js'].includes(entry.name)) {
      // Match URL literals, never path splitters, regular expressions or CDN URLs.
      text = text.replace(/(['"`])\/(?=assets\/|catalogues\/|catalogue-reader\.css|\?lang=)/g, (_, quote) => quote + base);
    }
    await writeFile(file, text);
  }
}
await adapt(output);
await writeFile(join(output, '.nojekyll'), '');
console.log(`GitHub Pages artifact ready: _site (base ${base})`);

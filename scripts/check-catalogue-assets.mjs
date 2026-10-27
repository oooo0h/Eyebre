import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';

const active = ['binoculars','astronomical-telescopes','monoculars','riflescopes','spotting-scopes','night-vision','thermal-en','thermal-zh','mounts-clamps','magnifiers'];
const records = JSON.parse(await readFile('dist/assets/catalogues/manifest.json', 'utf8'));
assert.deepEqual(records.map(item => item.filename.replace('.pdf','')).sort(), [...active].sort());
let total = 0;
for (const record of records) {
  const slug = record.filename.replace('.pdf','');
  const pdf = await stat('dist/assets/catalogues/' + record.filename);
  assert.equal(pdf.size, record.bytes, `${slug}: PDF metadata is stale`);
  assert.match(record.sourceSha256, /^[a-f0-9]{64}$/);
  const folder = 'dist/assets/catalogue-pages/' + slug;
  const book = JSON.parse(await readFile(folder + '/index.json', 'utf8'));
  assert.equal(book.revision, record.sourceSha256.slice(0,16));
  assert.equal(book.pageCount, record.pageCount);
  assert.equal(book.pages.length, record.pageCount);
  for (let i=0; i<book.pages.length; i++) {
    const name = String(i+1).padStart(4,'0') + '.webp';
    const [sd, hd] = await Promise.all([stat(folder+'/'+name), stat(folder+'/hd/'+name)]);
    assert.equal(sd.size, book.pages[i].bytes, `${slug}/${name}: stale SD page`);
    assert.equal(hd.size, book.pages[i].hd.bytes, `${slug}/${name}: stale HD page`);
  }
  const pages = (await readdir(folder)).filter(name=>name.endsWith('.webp'));
  assert.equal(pages.length, record.pageCount, `${slug}: obsolete pages remain`);
  total += record.pageCount;
}
const brand = await readFile('dist/brand.js','utf8');
assert(!brand.includes("en:'Rangefinders'"));
assert(!brand.includes("en:'Microscopes'"));
assert(brand.includes("en:'Magnifiers'"));
console.log(`PASS: ${records.length} catalogues, ${total} complete SD/HD pages, content revisions and active categories`);

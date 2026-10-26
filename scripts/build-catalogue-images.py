"""Render complete, lazy-loadable catalogue pages for browsers that cannot run PDF.js."""
from pathlib import Path
import sys,json,concurrent.futures
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools'))
import pymupdf
from PIL import Image

def render_book(item):
 slug=Path(item['filename']).stem
 out=ROOT/'dist/assets/catalogue-pages'/slug;out.mkdir(parents=True,exist_ok=True)
 pages=[]
 with pymupdf.open(ROOT/'dist/assets/catalogues'/item['filename']) as doc:
  for i,page in enumerate(doc):
   dest=out/f'{i+1:04d}.webp'
   scale=min(1400/page.rect.width,2400/page.rect.height)
   if not dest.exists():
    pix=page.get_pixmap(matrix=pymupdf.Matrix(scale,scale),alpha=False)
    image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    image.save(dest,'WEBP',quality=80,method=4)
    width,height=image.size
   else:
    with Image.open(dest) as image:width,height=image.size
   pages.append({'width':width,'height':height,'bytes':dest.stat().st_size})
   if i%10==0:pymupdf.TOOLS.store_shrink(100)
 result={'slug':slug,'pageCount':len(pages),'pages':pages,'bytes':sum(p['bytes'] for p in pages)}
 (out/'index.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
 return {'slug':slug,'pageCount':len(pages),'bytes':result['bytes'],'firstPageBytes':pages[0]['bytes']}

if __name__=='__main__':
 manifest=json.loads((ROOT/'dist/assets/catalogues/manifest.json').read_text(encoding='utf-8'))
 results=[]
 with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(render_book,item) for item in manifest]
  for future in concurrent.futures.as_completed(futures):
   result=future.result();results.append(result);print(json.dumps(result),flush=True)
 out=ROOT/'dist/assets/catalogue-pages';(out/'manifest.json').write_text(json.dumps(sorted(results,key=lambda x:x['slug']),indent=2),encoding='utf-8')
 print('DONE',sum(r['pageCount'] for r in results),'pages',sum(r['bytes'] for r in results),'bytes',flush=True)

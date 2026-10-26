"""Create sharper page images from original PDFs, fetched only when readers zoom in."""
from pathlib import Path
import json,sys,concurrent.futures
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools'))
import pymupdf
from PIL import Image
pymupdf.TOOLS.mupdf_display_errors(False)
pymupdf.TOOLS.mupdf_display_warnings(False)

def render_hd(book):
 slug=Path(book['filename']).stem
 folder=ROOT/'dist/assets/catalogue-pages'/slug
 out=folder/'hd';out.mkdir(parents=True,exist_ok=True)
 original=ROOT.parent/'产品画册'/book['original']
 source=original if original.exists() else ROOT/'dist/assets/catalogues'/book['filename']
 meta=json.loads((folder/'index.json').read_text(encoding='utf-8'))
 with pymupdf.open(source) as doc:
  assert len(doc)==meta['pageCount']
  for i,page in enumerate(doc):
   dest=out/f'{i+1:04d}.webp'
   if not dest.exists():
    scale=min(2600/page.rect.width,3800/page.rect.height)
    pix=page.get_pixmap(matrix=pymupdf.Matrix(scale,scale),alpha=False)
    image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    image.save(dest,'WEBP',quality=92,method=4)
   with Image.open(dest) as image:width,height=image.size
   meta['pages'][i]['hd']={'width':width,'height':height,'bytes':dest.stat().st_size}
   if i%5==0:pymupdf.TOOLS.store_shrink(100)
 meta['hdBytes']=sum(page['hd']['bytes'] for page in meta['pages'])
 (folder/'index.json').write_text(json.dumps(meta,separators=(',',':')),encoding='utf-8')
 return {'slug':slug,'pages':len(meta['pages']),'hdBytes':meta['hdBytes']}

if __name__=='__main__':
 books=json.loads((ROOT/'dist/assets/catalogues/manifest.json').read_text(encoding='utf-8'))
 with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(render_hd,book) for book in books]
  for future in concurrent.futures.as_completed(futures):print(json.dumps(future.result()),flush=True)
 print('HD pages complete',flush=True)

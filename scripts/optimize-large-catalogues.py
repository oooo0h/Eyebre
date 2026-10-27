"""Bound raster resolution per opaque source image; leave text and vectors intact."""
from pathlib import Path
from io import BytesIO
import gc, hashlib, json, sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools'))
from catalogue_sources import source_path
import pymupdf
pymupdf.TOOLS.mupdf_display_errors(False);pymupdf.TOOLS.mupdf_display_warnings(False)
SOURCE=ROOT.parent/'产品画册';OUT=ROOT/'dist/assets/catalogues';QA=ROOT/'qa/catalogue-assets'
MAP={'binoculars':'EYEBRE图册-双筒望远镜..pdf','night-vision':'Eyebre-夜视仪热成像图册.pdf','thermal-en':'2026热成像 英文.pdf'}
def digest(doc):
 h=hashlib.sha256()
 for p in doc:h.update(p.get_text().encode('utf-8'))
 return h.hexdigest()
for slug in (sys.argv[1:] or MAP):
 original=source_path(slug)
 edge=1600 if slug=='binoculars' else 1800
 quality=70 if slug=='binoculars' else 76
 doc=pymupdf.open(original);text_hash=digest(doc);pages=len(doc);images={}
 for number,page in enumerate(doc):
  for info in page.get_images(full=True):
   if info[0] not in images:images[info[0]]=(number,info)
 changed=0
 for xref,(number,info) in images.items():
  if info[1] or max(info[2:4])<1400:continue
  raw=doc.extract_image(xref)
  im=Image.open(BytesIO(raw['image'])).convert('RGB');im.thumbnail((edge,edge),Image.Resampling.LANCZOS)
  buffer=BytesIO();im.save(buffer,format='JPEG',quality=quality,optimize=True,subsampling=2)
  if len(buffer.getvalue())<len(raw['image']):doc[number].replace_image(xref,stream=buffer.getvalue());changed+=1
  im.close();buffer.close();del raw;pymupdf.TOOLS.store_shrink(100);gc.collect()
  if changed and changed%20==0:print(slug,'images',changed,flush=True)
 pending=OUT/(slug+'.pending.pdf');destination=OUT/(slug+'.pdf')
 doc.save(pending,garbage=4,deflate=True,deflate_fonts=True);doc.close()
 out=pymupdf.open(pending);assert len(out)==pages;assert digest(out)==text_hash
 for p in out:p.get_pixmap(matrix=pymupdf.Matrix(.1,.1),alpha=False)
 original_doc=pymupdf.open(original)
 for i in [0,min(3,pages-1),pages-1]:
  original_doc[i].get_pixmap(dpi=110,alpha=False).save(str(QA/f'{slug}-before-{i+1:03}.png'))
  out[i].get_pixmap(dpi=110,alpha=False).save(str(QA/f'{slug}-after-{i+1:03}.png'))
 original_doc.close();out.close();pending.replace(destination)
 record={'filename':destination.name,'original':original.name,'pageCount':pages,'bytes':destination.stat().st_size,'originalBytes':original.stat().st_size,'textPreserved':True,'allPagesRenderable':True,'settings':{'maxRasterEdge':edge,'jpegQuality':quality,'opaqueImagesReplaced':changed}}
 if record['bytes']>=24*1024*1024:record['sizeWarning']='Over 24 MiB'
 (QA/(slug+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(record,ensure_ascii=False),flush=True)

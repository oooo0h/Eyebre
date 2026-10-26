"""Compare selected final web PDF pages with originals; preserve visual QA files."""
from pathlib import Path
import json,sys,hashlib
from PIL import Image,ImageDraw,ImageChops,ImageStat
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools'))
import pymupdf
pymupdf.TOOLS.mupdf_display_errors(False)
pymupdf.TOOLS.mupdf_display_warnings(False)
OUT=ROOT/'dist/assets/catalogues';QA=ROOT/'qa/catalogue-assets'
records=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
def digest(doc):
 h=hashlib.sha256()
 for p in doc:h.update(p.get_text().encode('utf-8'))
 return h.hexdigest()
results=[]
for record in records:
 slug=Path(record['filename']).stem
 source=pymupdf.open(ROOT.parent/'产品画册'/record['original'])
 final=pymupdf.open(OUT/record['filename'])
 assert len(source)==len(final)==record['pageCount']
 assert digest(source)==digest(final)
 assert record['bytes']==(OUT/record['filename']).stat().st_size<24*1024**2
 report={'filename':record['filename'],'pageCount':len(final),'bytes':record['bytes'],'textPreserved':True}
 if slug in ['binoculars','thermal-en','thermal-zh']:
  comparisons=[]
  for n in [0,3,len(final)-1]:
   imgs=[]
   for label,doc in [('before',source),('after',final)]:
    pix=doc[n].get_pixmap(dpi=110,alpha=False)
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    im.save(QA/f'{slug}-{label}-{n+1:03d}.png');imgs.append(im)
   assert imgs[0].size==imgs[1].size
   delta=ImageStat.Stat(ImageChops.difference(*imgs)).mean
   comparisons.append({'page':n+1,'meanRgbAbsoluteError':sum(delta)/3})
   thumbs=[im.copy() for im in imgs]
   for im in thumbs:im.thumbnail((620,870))
   sheet=Image.new('RGB',(1280,930),'#e7e8ee');draw=ImageDraw.Draw(sheet)
   draw.text((15,12),f'{slug}: original page {n+1}',fill='black')
   draw.text((655,12),f'{slug}: web PDF page {n+1}',fill='black')
   sheet.paste(thumbs[0],(15,45));sheet.paste(thumbs[1],(655,45))
   sheet.save(QA/f'{slug}-comparison-{n+1:03d}.jpg',quality=95)
  report['visualComparisons']=comparisons
 results.append(report);source.close();final.close()
(QA/'verification-report.txt').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'catalogues':len(results),'totalPages':sum(r['pageCount'] for r in results),'totalBytes':sum(r['bytes'] for r in results),'allUnder24MiB':True,'fullTextPreserved':True},ensure_ascii=False))

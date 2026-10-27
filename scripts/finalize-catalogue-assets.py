"""Remove non-rendering editor recovery data from web copies, then verify them."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools'))
import pymupdf
pymupdf.TOOLS.mupdf_display_errors(False);pymupdf.TOOLS.mupdf_display_warnings(False)
OUT=ROOT/'dist/assets/catalogues';QA=ROOT/'qa/catalogue-assets'
def digest(doc):
 h=hashlib.sha256()
 for page in doc:h.update(page.get_text().encode('utf-8'))
 return h.hexdigest()
active=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
metas=[QA/(Path(record['filename']).stem+'.json') for record in active]
for meta in metas:
 record=json.loads(meta.read_text(encoding='utf-8'));path=OUT/record['filename'];doc=pymupdf.open(path)
 before=digest(doc);pages=len(doc);removed=0
 for xref in range(1,doc.xref_length()):
  if doc.xref_get_key(xref,'PieceInfo')[0]!='null':doc.xref_set_key(xref,'PieceInfo','null');removed+=1
 doc.subset_fonts()
 pending=path.with_suffix('.finalizing.pdf');doc.save(pending,garbage=4,deflate=True,deflate_images=True,deflate_fonts=True,use_objstms=1);doc.close()
 clean=pymupdf.open(pending);assert len(clean)==pages;assert digest(clean)==before
 for page in clean:page.get_pixmap(matrix=pymupdf.Matrix(.1,.1),alpha=False)
 clean.close();pending.replace(path)
 record['bytes']=path.stat().st_size;record['removedPrivateEditingData']=bool(removed);record['fontSubsets']=True
 if record['bytes']<24*1024*1024:record.pop('sizeWarning',None)
 meta.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'file':path.name,'MiB':round(record['bytes']/1024**2,2),'privateDataKeysRemoved':removed},ensure_ascii=False),flush=True)
records=[json.loads(p.read_text(encoding='utf-8')) for p in metas]
(OUT/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')

"""Prepare read-only-source PDF web copies, retaining every page, text and vector."""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))
from catalogue_sources import source_path
import pymupdf
pymupdf.TOOLS.mupdf_display_errors(False)
pymupdf.TOOLS.mupdf_display_warnings(False)
SOURCE = ROOT.parent / '产品画册'
OUTPUT = ROOT / 'dist/assets/catalogues'
QA = ROOT / 'qa/catalogue-assets'
CATALOGUES = {
 'binoculars':'EYEBRE图册-双筒望远镜..pdf',
 'astronomical-telescopes':'天文望远镜系列画册.pdf',
 'monoculars':'单筒望远镜画册.pdf', 'riflescopes':'瞄准镜画册-最终版本.pdf',
 'spotting-scopes':'EYEBRE图册-观鸟镜.pdf',
 'night-vision':'Eyebre-夜视仪热成像图册.pdf',
 'thermal-en':'2026热成像 英文.pdf', 'thermal-zh':'2026热成像 中文.pdf',
 'mounts-clamps':'支架+夹具 画册 最新.pdf',
 'magnifiers':'放大镜画册.pdf',
}
def digest(doc):
 h=hashlib.sha256()
 for page in doc: h.update(page.get_text().encode('utf-8'))
 return h.hexdigest()
def create(slug):
 OUTPUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
 source=source_path(slug); destination=OUTPUT/(slug+'.pdf')
 original=pymupdf.open(source); pages=len(original); text_hash=digest(original);original.close()
 settings=None
 for threshold,target,quality in [(180,150,80),(155,130,76),(135,115,74)]:
  doc=pymupdf.open(source)
  doc.rewrite_images(dpi_threshold=threshold,dpi_target=target,quality=quality)
  doc.save(destination,garbage=4,deflate=True,deflate_images=True,deflate_fonts=True)
  doc.close();settings={'dpiThreshold':threshold,'dpiTarget':target,'jpegQuality':quality}
  if destination.stat().st_size<24*1024*1024:break
 output=pymupdf.open(destination)
 assert len(output)==pages, f'Page count changed: {slug}'
 assert digest(output)==text_hash, f'Text changed: {slug}'
 for page in output:page.get_pixmap(matrix=pymupdf.Matrix(.1,.1),alpha=False)
 output[0].get_pixmap(dpi=90,alpha=False).pil_save(str(OUTPUT/(slug+'-cover.webp')))
 if slug in {'binoculars','thermal-en','thermal-zh'}:
  original=pymupdf.open(source)
  for i in [0,min(3,pages-1),pages-1]:
   original[i].get_pixmap(dpi=110,alpha=False).save(str(QA/f'{slug}-before-{i+1:03}.png'))
   output[i].get_pixmap(dpi=110,alpha=False).save(str(QA/f'{slug}-after-{i+1:03}.png'))
  original.close()
 output.close()
 record={'filename':destination.name,'original':source.name,'pageCount':pages,'bytes':destination.stat().st_size,'originalBytes':source.stat().st_size,'textPreserved':True,'allPagesRenderable':True,'settings':settings}
 if record['bytes']>=24*1024*1024:record['sizeWarning']='Over 24 MiB'
 (QA/(slug+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(record,ensure_ascii=False),flush=True)
def worker(slug):
 p=subprocess.run([sys.executable,str(Path(__file__).resolve()),'--only',slug],cwd=ROOT.parent,capture_output=True,text=True,encoding='utf-8',errors='replace')
 print(p.stdout,end='',flush=True)
 if p.returncode:print(json.dumps({'error':slug,'detail':p.stderr[-1800:]},ensure_ascii=False),flush=True)
 return slug,p.returncode
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf-8')
 parser=argparse.ArgumentParser();parser.add_argument('--only',choices=CATALOGUES);args=parser.parse_args()
 if args.only:create(args.only)
 else:
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:outcomes=list(executor.map(worker,CATALOGUES))
  records=[json.loads((QA/(slug+'.json')).read_text(encoding='utf-8')) for slug,code in outcomes if code==0]
  OUTPUT.mkdir(parents=True,exist_ok=True)
  (OUTPUT/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({'completed':len(records),'failed':[slug for slug,code in outcomes if code]},ensure_ascii=False))

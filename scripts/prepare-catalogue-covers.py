"""Render complete catalogue first pages onto consistent web card surfaces."""
from pathlib import Path
import json,sys
from PIL import Image,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools'))
import pymupdf
pymupdf.TOOLS.mupdf_display_errors(False);pymupdf.TOOLS.mupdf_display_warnings(False)
OUT=ROOT/'dist/assets/catalogues';QA=ROOT/'qa/catalogue-assets'
slugs=['binoculars','astronomical-telescopes','monoculars','riflescopes','spotting-scopes','rangefinders','night-vision','thermal-en','thermal-zh','microscopes','mounts-clamps','magnifiers']
for slug in slugs:
 p=OUT/(slug+'.pdf')
 if not p.exists():continue
 d=pymupdf.open(p);pix=d[0].get_pixmap(dpi=130,alpha=False);d.close()
 im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);im.thumbnail((1080,650),Image.Resampling.LANCZOS)
 x=(1200-im.width)//2;y=(750-im.height)//2
 canvas=Image.new('RGBA',(1200,750),'#f0f1fa');shadow=Image.new('RGBA',canvas.size)
 ImageDraw.Draw(shadow).rectangle((x,y+9,x+im.width,y+im.height+9),fill=(0,0,0,40));shadow=shadow.filter(ImageFilter.GaussianBlur(18));canvas.alpha_composite(shadow)
 canvas.paste(im,(x,y));ImageDraw.Draw(canvas).rectangle((x,y,x+im.width,y+im.height),outline=(0,0,0,16),width=1)
 filename='cover-'+slug+'.webp';canvas.convert('RGB').save(OUT/filename,quality=91,method=6)
 meta=QA/(slug+'.json')
 if meta.exists():
  record=json.loads(meta.read_text(encoding='utf-8'));record['cover']=filename;meta.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
 print(filename,flush=True)
Image.new('RGB',(32,32),(128,128,128)).save(OUT/'neutral-depth.webp',lossless=True)
records=[json.loads((QA/(slug+'.json')).read_text(encoding='utf-8')) for slug in slugs if (QA/(slug+'.json')).exists()]
(OUT/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')

"""Generate direct, static catalogue preview URLs from the shared PDF.js viewer."""
from pathlib import Path
import html
ROOT=Path(__file__).resolve().parents[1]
VENDOR='/assets/vendor/pdfjs-viewer'
books=[
 ('binoculars','Binoculars','双筒望远镜'),
 ('astronomical-telescopes','Astronomical Telescopes','天文望远镜'),
 ('monoculars','Monoculars','单筒望远镜'),
 ('riflescopes','Riflescopes','瞄准镜'),
 ('spotting-scopes','Spotting Scopes','观鸟镜'),
 ('rangefinders','Rangefinders','测距仪'),
 ('night-vision','Night Vision','夜视仪'),
 ('thermal','Thermal Imaging','热成像'),
 ('thermal-en','Thermal Imaging — English','热成像 — 英文版'),
 ('thermal-zh','Thermal Imaging — Chinese','热成像 — 中文版'),
 ('microscopes','Microscopes','显微镜'),
 ('mounts-clamps','Mounts & Clamps','支架&夹具'),
 ('magnifiers','Magnifiers','放大镜'),
]
template=(ROOT/'dist/assets/vendor/pdfjs-viewer/web/viewer.html').read_text(encoding='utf-8')
template=template.replace('href="locale/locale.json"',f'href="{VENDOR}/web/locale/locale.json"')
template=template.replace('<script src="../build/pdf.mjs" type="module"></script>', '')
template=template.replace('<link rel="stylesheet" href="viewer.css" />', '')
template=template.replace('<script src="viewer.mjs" type="module"></script>', '<link rel="stylesheet" href="/catalogue-preview.css?v=2" />\n<script src="/catalogue-preview.js?v=2"></script>')
template=template.replace('width=device-width, initial-scale=1, maximum-scale=1','width=device-width, initial-scale=1, viewport-fit=cover')
template=template.replace('<body tabindex="0">','<body tabindex="0" data-catalogue="{SLUG}" data-title-en="{EN}" data-title-zh="{ZH}">\n<a id="catalogue-preview-back" href="/#home-featured">← Back</a>\n<div id="eyebre-preview-status" role="status" aria-live="polite">Opening catalogue…</div>\n<noscript>Enable JavaScript to preview this catalogue online.</noscript>')
for slug,en,zh in books:
 page=template.replace('{SLUG}',slug).replace('{EN}',html.escape(en,quote=True)).replace('{ZH}',html.escape(zh,quote=True)).replace('<title>PDF.js viewer</title>',f'<title>{html.escape(en)} | Eyebre</title>')
 dest=ROOT/'dist/catalogues'/slug/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(page,encoding='utf-8')
print(f'Generated {len(books)} direct catalogue preview pages')

"""Hash source PDFs, build validated web assets, publish, and await Pages.

The source registry and logs are local-only. No WeDrive file is ever modified.
Normal scheduled runs require a clean checkout and never stash/reset user work.
"""
from pathlib import Path
from io import BytesIO
import argparse, contextlib, gc, hashlib, json, os, shutil, socket, subprocess, sys, time
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))
import pymupdf
from PIL import Image
from catalogue_sources import ACTIVE, LOCAL, load_config

pymupdf.TOOLS.mupdf_display_errors(False)
pymupdf.TOOLS.mupdf_display_warnings(False)
PDFS = ROOT / 'dist/assets/catalogues'
PAGES = ROOT / 'dist/assets/catalogue-pages'
MANIFEST = PDFS / 'manifest.json'
STATE = LOCAL / 'state.json'

def log(message):
    print(f'[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}', flush=True)

def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_suffix('.pending.json')
    pending.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    pending.replace(path)

def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def remove_local(path, allowed_root):
    path, allowed_root = path.resolve(), allowed_root.resolve()
    if path == allowed_root or not path.is_relative_to(allowed_root):
        raise RuntimeError(f'Unsafe cleanup target: {path}')
    if path.is_dir(): shutil.rmtree(path)
    elif path.exists(): path.unlink()

@contextlib.contextmanager
def exclusive_lock():
    import msvcrt
    LOCAL.mkdir(exist_ok=True)
    with (LOCAL/'sync.lock').open('a+b') as stream:
        stream.seek(0); stream.write(b'0'); stream.flush(); stream.seek(0)
        try: msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError: raise RuntimeError('Another catalogue sync is already running')
        try: yield
        finally:
            stream.seek(0); msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)

def fingerprints(config):
    result = {}
    for slug in ACTIVE:
        path = Path(config['sources'][slug])
        if not path.is_file(): raise RuntimeError(f'Source unavailable (WeDrive not synced?): {path}')
        before = path.stat()
        digest = sha256(path)
        after = path.stat()
        if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):
            raise RuntimeError(f'Source is being edited; retry later: {path.name}')
        with pymupdf.open(path) as doc:
            if doc.is_encrypted or not len(doc): raise RuntimeError(f'Unreadable PDF: {path.name}')
            count = len(doc)
        result[slug] = {'sha256':digest,'pageCount':count,'bytes':after.st_size}
        log(f'Checked {slug}: {count} pages, SHA256 {digest[:12]}')
    return result

def text_digest(doc):
    digest = hashlib.sha256()
    for page in doc: digest.update(page.get_text().encode('utf-8'))
    return digest.hexdigest()

def build_book(slug, source, expected, staging):
    book = staging/slug; book.mkdir()
    snapshot = book/'source.pdf'; shutil.copyfile(source,snapshot)
    if sha256(snapshot)!=expected['sha256'] or sha256(source)!=expected['sha256']:
        raise RuntimeError(f'Source changed during snapshot: {source.name}')
    destination = book/(slug+'.pdf')
    edge, quality = (1600,70) if slug=='binoculars' else (1800,76)
    log(f'Building {slug}: optimized PDF and fresh SD/HD pages')
    with pymupdf.open(snapshot) as doc:
        original_text, count = text_digest(doc), len(doc)
        images = {}
        for number,page in enumerate(doc):
            for info in page.get_images(full=True):
                images.setdefault(info[0],(number,info))
        changed = 0
        for xref,(number,info) in images.items():
            if info[1] or max(info[2:4])<1400: continue
            raw = doc.extract_image(xref)
            with Image.open(BytesIO(raw['image'])) as image:
                image=image.convert('RGB'); image.thumbnail((edge,edge),Image.Resampling.LANCZOS)
                buffer=BytesIO(); image.save(buffer,format='JPEG',quality=quality,optimize=True,subsampling=2)
                if len(buffer.getvalue())<len(raw['image']):
                    doc[number].replace_image(xref,stream=buffer.getvalue()); changed+=1
            del raw
            pymupdf.TOOLS.store_shrink(100); gc.collect()
            if changed and changed%30==0: log(f'{slug}: optimized {changed} embedded images')
        for xref in range(1,doc.xref_length()):
            # Some Illustrator exports retain free/missing xref slots. They do
            # not represent page content; skip them during private-data cleanup.
            try:
                if doc.xref_get_key(xref,'PieceInfo')[0]!='null': doc.xref_set_key(xref,'PieceInfo','null')
            except Exception as error:
                if 'cannot find object in xref' not in str(error):raise
        doc.subset_fonts()
        doc.save(destination,garbage=4,deflate=True,deflate_images=True,deflate_fonts=True,use_objstms=1)
    if destination.stat().st_size>=90*1024**2:
        raise RuntimeError(f'{slug}: web PDF exceeds safe GitHub file size; not publishing')
    folder=book/'pages'; (folder/'hd').mkdir(parents=True)
    page_meta=[]
    with pymupdf.open(destination) as web, pymupdf.open(snapshot) as original:
        assert len(web)==count==expected['pageCount'], 'Page count changed'
        assert text_digest(web)==original_text, 'Extracted PDF text changed'
        for number in range(count):
            record={}
            for doc,width,height,q,target in [
                (web,1400,2400,80,folder/f'{number+1:04d}.webp'),
                (original,2600,3800,92,folder/'hd'/f'{number+1:04d}.webp')]:
                page=doc[number]; scale=min(width/page.rect.width,height/page.rect.height)
                pix=page.get_pixmap(matrix=pymupdf.Matrix(scale,scale),alpha=False)
                with Image.frombytes('RGB',(pix.width,pix.height),pix.samples) as image:
                    image.save(target,'WEBP',quality=q,method=4)
                with Image.open(target) as image:
                    image.load(); dimensions={'width':image.width,'height':image.height,'bytes':target.stat().st_size}
                if q==80: record.update(dimensions)
                else: record['hd']=dimensions
            page_meta.append(record)
            pymupdf.TOOLS.store_shrink(100)
            if number%10==0 or number+1==count: log(f'{slug}: rendered and decoded {number+1}/{count} pages')
        web[0].get_pixmap(dpi=90,alpha=False).pil_save(str(book/(slug+'-cover.webp')))
    meta={'slug':slug,'revision':expected['sha256'][:16],'pageCount':count,'pages':page_meta,
          'bytes':sum(p['bytes'] for p in page_meta),'hdBytes':sum(p['hd']['bytes'] for p in page_meta)}
    save_json(folder/'index.json',meta)
    record={'filename':slug+'.pdf','original':source.name,'pageCount':count,'bytes':destination.stat().st_size,
            'originalBytes':expected['bytes'],'sourceSha256':expected['sha256'],'revision':meta['revision'],
            'textPreserved':True,'allPagesRenderable':True,'settings':{'maxRasterEdge':edge,'jpegQuality':quality}}
    # Selected pages remain local for visual review, not in the published site.
    for number in sorted({0,min(3,count-1),count-1}):
        shutil.copy2(folder/'hd'/f'{number+1:04d}.webp',book/f'qa-{number+1:04d}.webp')
    return record

def existing_is_valid(slug, record, expected):
    if not record or record['pageCount']!=expected['pageCount']:return False
    pdf=PDFS/(slug+'.pdf'); meta=read_json(PAGES/slug/'index.json',{})
    if not pdf.is_file() or meta.get('pageCount')!=expected['pageCount']:return False
    with pymupdf.open(pdf) as doc:
        if len(doc)!=expected['pageCount']:return False
    return all((PAGES/slug/f'{i+1:04d}.webp').is_file() and (PAGES/slug/'hd'/f'{i+1:04d}.webp').is_file()
               for i in range(expected['pageCount']))

def prepare(config, stamps, adopt=False):
    records={Path(r['filename']).stem:r for r in read_json(MANIFEST,[])}
    changed=[]; adopted=[]
    for slug in ACTIVE:
        expected=stamps[slug]; record=records.get(slug)
        if record and record.get('sourceSha256')==expected['sha256'] and existing_is_valid(slug,record,expected): continue
        old=ROOT.parent/'产品画册'/Path(config['sources'][slug]).name
        if adopt and old.is_file() and sha256(old)==expected['sha256'] and existing_is_valid(slug,record,expected):
            record['sourceSha256']=expected['sha256'];record['revision']=expected['sha256'][:16];adopted.append(slug)
        else:changed.append(slug)
    if not changed and not adopted and set(records)==set(ACTIVE):return False
    staging=LOCAL/'staging'/datetime.now().strftime('%Y%m%d-%H%M%S-%f'); staging.mkdir(parents=True)
    built={}
    # Build every changed book before replacing any currently served resource.
    for slug in changed:built[slug]=build_book(slug,Path(config['sources'][slug]),stamps[slug],staging)
    for slug in ACTIVE:
        if sha256(Path(config['sources'][slug]))!=stamps[slug]['sha256']:
            raise RuntimeError('A source changed while rendering; leaving the published assets unchanged')
    backup=staging/'previous';backup.mkdir()
    metadata_backups=[]
    for index,path in enumerate([MANIFEST,PAGES/'manifest.json',*[PAGES/slug/'index.json' for slug in adopted]]):
        if path.exists():
            saved=backup/f'metadata-{index}.json';shutil.copy2(path,saved);metadata_backups.append((path,saved))
    applied=[]
    try:
        for slug,record in built.items():
            for old,new in [(PDFS/(slug+'.pdf'),staging/slug/(slug+'.pdf')),
                            (PDFS/(slug+'-cover.webp'),staging/slug/(slug+'-cover.webp')),
                            (PAGES/slug,staging/slug/'pages')]:
                saved=backup/(slug+'-'+old.name)
                if old.exists():old.replace(saved)
                applied.append((old,saved))
                new.replace(old)
            records[slug]=record
        for slug in adopted:
            meta=read_json(PAGES/slug/'index.json');meta['revision']=stamps[slug]['sha256'][:16]
            save_json(PAGES/slug/'index.json',meta)
        save_json(MANIFEST,[records[slug] for slug in ACTIVE])
        summary=[]
        for slug in ACTIVE:
            meta=read_json(PAGES/slug/'index.json')
            summary.append({'slug':slug,'pageCount':meta['pageCount'],'bytes':meta['bytes'],'hdBytes':meta.get('hdBytes',0)})
        save_json(PAGES/'manifest.json',summary)
        subprocess.run([sys.executable,str(ROOT/'scripts/build-catalogue-pages.py')],check=True,cwd=ROOT)
    except Exception:
        for old,saved in reversed(applied):
            remove_local(old,ROOT/'dist')
            if saved.exists():saved.replace(old)
        for old,saved in metadata_backups:
            shutil.copy2(saved,old)
        raise
    log(f'Prepared {len(changed)} updated books; adopted {len(adopted)} unchanged books')
    log(f'Local review/rollback files: {staging}')
    # Discard source snapshots and replaced derived assets; retain only QA images.
    for slug in changed:remove_local(staging/slug/'source.pdf',LOCAL)
    remove_local(backup,LOCAL)
    return True

def command(args, capture=False, timeout=180):
    result=subprocess.run(args,cwd=ROOT,text=True,encoding='utf-8',errors='replace',
                          stdout=subprocess.PIPE if capture else None,stderr=subprocess.PIPE if capture else None,timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'Command failed ({result.returncode}): {args[0]} {args[1:3]}\n{result.stderr or ""}')
    return result.stdout.rstrip('\r\n') if capture else ''

def git(*args,capture=False):
    return command(['git','-c',f'safe.directory={ROOT.as_posix()}','-c','http.sslBackend=openssl',
                    '-c','credential.helper=','-c','credential.helper=!gh auth git-credential',*args],capture=capture)

def network(config):
    os.environ['GIT_TERMINAL_PROMPT']='0'
    os.environ['GH_PROMPT_DISABLED']='1'
    proxy=config.get('proxy')
    if proxy:
        from urllib.parse import urlparse
        address=urlparse(proxy)
        try:
            with socket.create_connection((address.hostname,address.port),timeout=1):pass
            os.environ['HTTPS_PROXY']=proxy;os.environ['HTTP_PROXY']=proxy
        except OSError:log('Local proxy unavailable; trying direct HTTPS')

def wait_pages(config, sha, retry=False):
    repo=config['repository']; deadline=time.monotonic()+1500; dispatched=False; previous_run=None
    while time.monotonic()<deadline:
        rows=json.loads(command(['gh','run','list','--repo',repo,'--workflow','pages.yml','--commit',sha,
                                 '--limit','5','--json','databaseId,status,conclusion,url'],capture=True))
        if rows:
            run=rows[0]
            if dispatched and run['databaseId']==previous_run:
                log('Waiting for the retried Pages workflow');time.sleep(15);continue
            if run['status']=='completed':
                if run['conclusion']=='success':log('GitHub Pages deployed successfully: '+run['url']);return
                if retry and not dispatched:
                    command(['gh','workflow','run','pages.yml','--repo',repo,'--ref','main']);dispatched=True
                    previous_run=run['databaseId']
                    log('Retrying the failed Pages deployment');time.sleep(20);continue
                raise RuntimeError('Pages deployment failed: '+run['url'])
            log('Waiting for GitHub Pages: '+run['status'])
        else:log('Waiting for the Pages workflow to start')
        time.sleep(15)
    raise RuntimeError('Timed out waiting for Pages. A later run will retry the pending deployment.')

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser()
    parser.add_argument('--prepare-only',action='store_true')
    parser.add_argument('--adopt-unchanged',action='store_true')
    parser.add_argument('--check-only',action='store_true')
    parser.add_argument('--publish-current',action='store_true')
    args=parser.parse_args();config=load_config();network(config)
    with exclusive_lock():
        state=read_json(STATE,{})
        if not (args.prepare_only or args.check_only):
            if git('status','--porcelain',capture=True):raise RuntimeError('Working tree has uncommitted changes; automatic sync will not change them')
            if git('branch','--show-current',capture=True)!='main':raise RuntimeError('Automatic sync requires main')
            if git('remote','get-url','origin',capture=True).removesuffix('.git')!='https://github.com/'+config['repository']:
                raise RuntimeError('Unexpected Git remote')
            git('fetch','origin','main');git('merge','--ff-only','origin/main')
            head=git('rev-parse','HEAD',capture=True)
            ahead=git('rev-list','origin/main..HEAD',capture=True)
            if ahead and not args.publish_current and state.get('pendingCommit')!=head:
                raise RuntimeError('Unpublished user commits exist; automatic sync will not publish them')
        stamps=fingerprints(config)
        if args.check_only:
            records={Path(r['filename']).stem:r for r in read_json(MANIFEST,[])}
            changes=[slug for slug in ACTIVE if records.get(slug,{}).get('sourceSha256')!=stamps[slug]['sha256']]
            log('Changed sources: '+(', '.join(changes) if changes else 'none'));return
        changed=prepare(config,stamps,args.adopt_unchanged)
        if args.prepare_only:log('Local preparation complete; no Git upload requested');return
        if changed:
            command(['node','--check','dist/catalogue-preview.js'])
            command(['node','scripts/check-catalogue-gestures.cjs'])
            command(['node','scripts/check-catalogue-assets.mjs'])
            allowed=('dist/assets/catalogues/','dist/assets/catalogue-pages/','dist/catalogues/')
            status=git('status','--porcelain','--untracked-files=all',capture=True)
            unexpected=[line[3:].strip('"') for line in status.splitlines() if not line[3:].strip('"').startswith(allowed)]
            if unexpected:raise RuntimeError('Other files changed during rendering; not committing: '+', '.join(unexpected))
            git('add','--','dist/assets/catalogues','dist/assets/catalogue-pages','dist/catalogues')
            git('-c','user.name=Eyebre Catalogue Sync','-c','user.email=codex@users.noreply.github.com',
                'commit','-m','Update catalogue PDFs and page previews (automatic sync)')
            state['pendingCommit']=git('rev-parse','HEAD',capture=True);save_json(STATE,state)
        elif args.publish_current:
            state['pendingCommit']=git('rev-parse','HEAD',capture=True);save_json(STATE,state)
        sha=state.get('pendingCommit')
        if not sha:log('No PDF content changed. Nothing to upload.');return
        if sha!=git('rev-parse','HEAD',capture=True):raise RuntimeError('Checkout moved since the pending publication; manual review needed')
        git('push','origin','main')
        wait_pages(config,sha,retry=True)
        state={'lastPublishedCommit':sha,'lastPublishedAt':datetime.now().astimezone().isoformat(),
               'sources':{slug:item['sha256'] for slug,item in stamps.items()}}
        save_json(STATE,state)
        log('SUCCESS. All changed catalogues are live; this window will close.')

if __name__=='__main__':
    try:main()
    except Exception as error:
        import traceback
        log('FAILED: '+str(error));traceback.print_exc(file=sys.stdout);sys.exit(1)

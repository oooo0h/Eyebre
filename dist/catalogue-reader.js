const files={oryzo_ai:'binoculars',atlas_motion:'astronomical-telescopes',devin_ai:'monoculars',of_the_oak:'riflescopes',everswap:'spotting-scopes',porsche_dream_machine:'rangefinders',synthetic_human:'night-vision',spatial_fusion:'thermal',spaace:'microscopes',ddd_2024:'mounts-clamps',magnifiers:'magnifiers'};

export function createCatalogueReader(catalogues,getLanguage,setLanguage){
  const books=[...catalogues,{id:'magnifiers',en:'Magnifiers',zh:'放大镜'}];
  const dialog=document.createElement('dialog');dialog.id='catalogue-reader';
  dialog.innerHTML=`<div class="catalogue-reader-shell"><header class="catalogue-reader-header"><button id="catalogue-close" class="reader-pill"></button><div class="catalogue-reader-heading"><strong id="catalogue-book-title"></strong><span id="catalogue-page-total"></span></div><button id="catalogue-language" class="reader-pill">中文 / EN</button><a id="catalogue-download" class="reader-pill" download></a><a id="catalogue-open-pdf" class="reader-pill" target="_blank" rel="noopener"></a></header><nav class="catalogue-reader-tools"><select id="catalogue-book-select"></select><div class="reader-pagination"><button id="catalogue-prev" class="reader-pill">←</button><input id="catalogue-page-input" type="number" min="1" value="1"><span id="catalogue-page-count"></span><button id="catalogue-next" class="reader-pill">→</button></div><div class="reader-zoom"><button id="catalogue-zoom-out" class="reader-pill">−</button><button id="catalogue-fit" class="reader-pill">100%</button><button id="catalogue-zoom-in" class="reader-pill">＋</button></div></nav><div id="catalogue-paper-stage"><div id="catalogue-loading" role="status" aria-live="polite"></div><canvas id="catalogue-page-canvas"></canvas></div><div class="catalogue-reader-footer"><span id="catalogue-edition"></span><span>Eyebre</span></div></div>`;
  document.body.append(dialog);
  const q=selector=>dialog.querySelector(selector);
  let selected,documentTask,pdf,renderTask,loadVersion=0,renderVersion=0,pageNumber=1,zoom=1,currentUrl='',pdfjsPromise;
  const zh=()=>getLanguage()==='zh';
  const t=(en,cn)=>zh()?cn:en;
  function fileUrl(book){const slug=files[book.id];return `/assets/catalogues/${slug==='thermal'?`thermal-${getLanguage()}`:slug}.pdf`;}
  function labels(){
    dialog.setAttribute('aria-label',t('Product catalogue','产品画册'));
    q('#catalogue-close').textContent=t('← Back to catalogues','← 返回产品画册');
    q('#catalogue-download').textContent=t('Download PDF','下载 PDF');
    q('#catalogue-open-pdf').textContent=t('Open PDF ↗','打开 PDF ↗');
    q('#catalogue-language').textContent=zh()?'English':'中文';
    q('#catalogue-prev').setAttribute('aria-label',t('Previous page','上一页'));
    q('#catalogue-next').setAttribute('aria-label',t('Next page','下一页'));
    q('#catalogue-page-input').setAttribute('aria-label',t('Page number','页码'));
    q('#catalogue-book-select').setAttribute('aria-label',t('Select catalogue','选择画册'));
    q('#catalogue-zoom-out').setAttribute('aria-label',t('Zoom out','缩小'));
    q('#catalogue-zoom-in').setAttribute('aria-label',t('Zoom in','放大'));
    q('#catalogue-fit').setAttribute('aria-label',t('Fit page','整页适配'));
    q('#catalogue-edition').textContent=t('Web reading edition · Complete catalogue','网页阅读版 · 完整画册');
    q('#catalogue-book-select').replaceChildren(...books.map(book=>{const option=document.createElement('option');option.value=book.id;option.textContent=t(book.en,book.zh);return option;}));
    if(selected){
      q('#catalogue-book-select').value=selected.id;
      q('#catalogue-book-title').textContent=t(selected.en,selected.zh);
      q('#catalogue-download').href=q('#catalogue-open-pdf').href=fileUrl(selected);
    }
    if(pdf)q('#catalogue-page-total').textContent=t(`${pdf.numPages} pages`,`${pdf.numPages} 页`);
  }
  function controls(){
    q('#catalogue-page-input').value=pageNumber;
    q('#catalogue-page-input').max=pdf?.numPages||1;
    q('#catalogue-page-count').textContent=`/ ${pdf?.numPages||'—'}`;
    q('#catalogue-prev').disabled=!pdf||pageNumber<=1;
    q('#catalogue-next').disabled=!pdf||pageNumber>=pdf.numPages;
    q('#catalogue-fit').textContent=`${Math.round(zoom*100)}%`;
    q('#catalogue-zoom-out').disabled=zoom<=.75;
    q('#catalogue-zoom-in').disabled=zoom>=3;
  }
  async function renderPage(){
    if(!pdf||!dialog.open)return;
    const version=++renderVersion;
    if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch{}}
    const page=await pdf.getPage(pageNumber);
    if(version!==renderVersion||!dialog.open)return;
    const stage=q('#catalogue-paper-stage'),canvas=q('canvas'),base=page.getViewport({scale:1});
    const fit=Math.min((stage.clientWidth-48)/base.width,(stage.clientHeight-48)/base.height);
    const viewport=page.getViewport({scale:Math.max(.1,fit)*zoom});
    const dpr=Math.min(devicePixelRatio,1.7);
    canvas.width=Math.ceil(viewport.width*dpr);canvas.height=Math.ceil(viewport.height*dpr);
    canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
    q('#catalogue-loading').hidden=true;canvas.hidden=false;
    renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[dpr,0,0,dpr,0,0]});
    try{await renderTask.promise;if(version===renderVersion){dialog.dataset.page=String(pageNumber);dialog.dataset.rendered='true';}}catch(error){if(error.name!=='RenderingCancelledException')showError(error);}
    controls();
  }
  function showError(error){q('#catalogue-loading').hidden=false;q('#catalogue-loading').textContent=t('Unable to display this page. Use Open PDF to read the file.','此页暂时无法显示，可点击“打开 PDF”阅读文件。');console.warn('PDF page:',error.message);}
  async function loadBook(book,keepPage=false){
    selected=book;labels();const url=fileUrl(book);
    if(url===currentUrl&&pdf){controls();return;}
    const version=++loadVersion;renderVersion++;renderTask?.cancel();
    await documentTask?.destroy();documentTask=null;pdf=null;
    if(version!==loadVersion)return;
    currentUrl=url;if(!keepPage){pageNumber=1;zoom=1;}
    q('canvas').hidden=true;q('#catalogue-loading').hidden=false;q('#catalogue-loading').textContent=t('Opening catalogue…','正在打开画册…');q('#catalogue-page-total').textContent='';controls();
    try{
      if(!pdfjsPromise)pdfjsPromise=import('./assets/vendor/pdfjs/pdf.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker.mjs';return lib;});
      const lib=await pdfjsPromise;if(version!==loadVersion)return;
      documentTask=lib.getDocument({url,disableAutoFetch:true,disableStream:true,rangeChunkSize:262144,cMapUrl:'/assets/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/assets/vendor/pdfjs/standard_fonts/'});
      documentTask.onProgress=({loaded,total})=>{if(total&&version===loadVersion)q('#catalogue-loading').textContent=t(`Opening catalogue · ${Math.min(99,Math.round(loaded/total*100))}%`,`正在打开画册 · ${Math.min(99,Math.round(loaded/total*100))}%`);};
      const loaded=await documentTask.promise;if(version!==loadVersion)return;
      pdf=loaded;pageNumber=Math.min(pageNumber,pdf.numPages);labels();controls();await renderPage();
    }catch(error){if(version===loadVersion)showError(error);}
  }
  async function open(book){
    if(dialog.open&&selected?.id===book.id)return;
    if(!dialog.open){dialog.showModal();window.EyebreRuntime?.setCatalogueOpen(true);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)q('.catalogue-reader-shell').animate([{opacity:0,transform:'translateY(14px) scale(.985)'},{opacity:1,transform:'none'}],{duration:300,easing:'cubic-bezier(.2,.7,.2,1)'});}
    await loadBook(book);
  }
  async function close(navigate=true){
    if(!dialog.open)return;
    loadVersion++;renderVersion++;renderTask?.cancel();await documentTask?.destroy();documentTask=null;pdf=null;currentUrl='';
    dialog.close();q('canvas').width=q('canvas').height=0;
    window.EyebreRuntime?.setCatalogueOpen(false);
    if(navigate)window.EyebreRuntime?.backToCatalogues();
  }
  function navigatePage(number){if(!pdf)return;pageNumber=Math.max(1,Math.min(pdf.numPages,number||1));renderPage().catch(showError);}
  q('#catalogue-close').onclick=()=>close();
  q('#catalogue-prev').onclick=()=>navigatePage(pageNumber-1);q('#catalogue-next').onclick=()=>navigatePage(pageNumber+1);
  q('#catalogue-page-input').onchange=event=>navigatePage(Number(event.target.value));
  q('#catalogue-book-select').onchange=event=>loadBook(books.find(book=>book.id===event.target.value));
  q('#catalogue-language').onclick=()=>setLanguage(zh()?'en':'zh');
  q('#catalogue-zoom-out').onclick=()=>{zoom=Math.max(.75,zoom-.25);renderPage().catch(showError);};
  q('#catalogue-zoom-in').onclick=()=>{zoom=Math.min(3,zoom+.25);renderPage().catch(showError);};
  q('#catalogue-fit').onclick=()=>{zoom=1;renderPage().catch(showError);};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  dialog.addEventListener('pointerdown',event=>event.stopPropagation());
  dialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.target.matches('input,select'))return;if(event.key==='ArrowRight'){event.preventDefault();navigatePage(pageNumber+1);}if(event.key==='ArrowLeft'){event.preventDefault();navigatePage(pageNumber-1);}});
  window.addEventListener('eyebre-language-change',()=>{labels();if(dialog.open&&selected)loadBook(selected,true);});
  window.addEventListener('eyebre-route-shown',event=>{const id=event.detail.path?.split('/').at(-1);const book=books.find(book=>book.id===id);if(book)open(book);else close(false);});
  window.addEventListener('popstate',()=>{if(dialog.open&&!location.pathname.startsWith('/projects/'))close(false);});
  new ResizeObserver(()=>{if(dialog.open&&pdf)renderPage().catch(showError);}).observe(q('#catalogue-paper-stage'));
  labels();const route=window.EyebreRuntime?.routeState?.();if(route?.idle){const book=books.find(book=>book.id===route.path?.split('/').at(-1));if(book)open(book);}
}

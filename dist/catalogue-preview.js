/* Eyebre catalogue configuration for Mozilla's full, touch-capable PDF.js viewer. */
(() => {
  const query=new URL(location.href);
  let saved;try{saved=localStorage.getItem('eyebre-language');}catch{}
  const language=(query.searchParams.get('lang')||saved||navigator.language||'en').startsWith('zh')?'zh':'en';
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  if(query.searchParams.has('file')){query.searchParams.delete('file');history.replaceState(history.state,'',query);}
  const asset='/assets/vendor/pdfjs-viewer/';
  let configured=false;
  function setupUi(){
    const back=document.getElementById('catalogue-preview-back');
    if(!back||back.dataset.ready)return;
    back.dataset.ready='true';back.textContent=language==='zh'?'← 返回':'← Back';
    back.href=`/?lang=${language}#home-featured`;
    back.setAttribute('aria-label',language==='zh'?'返回产品画册':'Back to catalogues');
    back.addEventListener('click',event=>{
      if(window.parent!==window){event.preventDefault();parent.postMessage({type:'eyebre-close-catalogue'},location.origin);}
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&window.parent!==window){event.preventDefault();parent.postMessage({type:'eyebre-close-catalogue'},location.origin);}});
    document.getElementById('eyebre-preview-status').textContent=language==='zh'?'正在打开画册…':'Opening catalogue…';
  }
  function configure(event){
    if(event.detail?.source!==window||configured)return;
    configured=true;setupUi();
    const slug=document.body.dataset.catalogue;
    const file=slug==='thermal'?`thermal-${language}`:slug;
    const title=document.body.dataset[language==='zh'?'titleZh':'titleEn'];
    const options=window.PDFViewerApplicationOptions;
    options.setAll({defaultUrl:`/assets/catalogues/${file}.pdf`,defaultZoomValue:'page-width',viewOnLoad:1,disablePreferences:true,disableHistory:false,viewerCssTheme:2,localeProperties:{lang:language==='zh'?'zh-CN':'en-US'},workerSrc:asset+'build/pdf.worker.mjs',cMapUrl:asset+'web/cmaps/',standardFontDataUrl:asset+'web/standard_fonts/',wasmUrl:asset+'web/wasm/',iccUrl:asset+'web/iccs/',enableScripting:false,enableAutoLinking:false,enableWebGPU:false,annotationEditorMode:-1,maxCanvasPixels:8388608,disableAutoFetch:true,disableStream:true});
    const app=window.PDFViewerApplication;
    app.initializedPromise.then(()=>{
      document.getElementById('pageNumber').addEventListener('keydown',event=>{
        if(event.key==='Enter'){
          event.preventDefault();
          app.pdfLinkService.goToPage(event.currentTarget.value);
          document.getElementById('viewerContainer').focus({preventScroll:true});
        }
      });
      app.eventBus.on('pagerendered',()=>{
        document.getElementById('eyebre-preview-status').hidden=true;
        document.documentElement.dataset.pdfRendered='true';
        document.title=`${title} | Eyebre`;
      });
      app.eventBus.on('documenterror',()=>{
        const status=document.getElementById('eyebre-preview-status');status.hidden=false;
        status.replaceChildren(document.createTextNode(language==='zh'?'画册暂时无法加载。':'Unable to load the catalogue. '));
        const retry=document.createElement('button');retry.textContent=language==='zh'?'重试':'Retry';retry.onclick=()=>location.reload();status.append(retry);
        const download=document.createElement('a');download.href=`/assets/catalogues/${file}.pdf`;download.textContent=language==='zh'?'下载 PDF':'Download PDF';status.append(download);
      });
    });
    document.removeEventListener('webviewerloaded',configure);
    if(parent!==window)try{parent.document.removeEventListener('webviewerloaded',configure);}catch{}
  }
  document.addEventListener('DOMContentLoaded',setupUi,{once:true});
  document.addEventListener('webviewerloaded',configure);
  if(parent!==window)try{parent.document.addEventListener('webviewerloaded',configure);}catch{}
})();

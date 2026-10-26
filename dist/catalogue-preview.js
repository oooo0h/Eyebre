/* Eyebre: lightweight page images on phones, full PDF.js tools on desktops. */
(function () {
  var url=new URL(location.href),saved='';
  try{saved=localStorage.getItem('eyebre-language')||'';}catch(ignore){}
  var language=(url.searchParams.get('lang')||saved||navigator.language||'en').indexOf('zh')===0?'zh':'en';
  var zh=language==='zh',asset='/assets/vendor/pdfjs-viewer/';
  var configured=false,lightStarted=false,rendered=false,timer,slug,file,title;
  document.documentElement.lang=zh?'zh-CN':'en';
  if(url.searchParams.has('file')){url.searchParams.delete('file');history.replaceState(history.state,'',url.href);}
  function text(en,cn){return zh?cn:en;}
  function status(){return document.getElementById('eyebre-preview-status');}
  function backMessage(){parent.postMessage({type:'eyebre-close-catalogue'},location.origin);}
  function prepare(){
    slug=document.body.getAttribute('data-catalogue');file=slug==='thermal'?'thermal-'+language:slug;
    title=document.body.getAttribute(zh?'data-title-zh':'data-title-en');document.title=title+' | Eyebre';
    var back=document.getElementById('catalogue-preview-back');
    back.textContent=text('← Back','← 返回');back.href='/?lang='+language+'#home-featured';back.setAttribute('aria-label',text('Back to catalogues','返回产品画册'));
    back.addEventListener('click',function(event){if(parent!==window){event.preventDefault();backMessage();}});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&parent!==window){event.preventDefault();backMessage();}});
    status().textContent=text('Opening catalogue…','正在打开画册…');
  }
  function failure(message,retry){
    var box=status();box.hidden=false;box.textContent=message;
    var button=document.createElement('button');button.textContent=text('Retry','重试');button.onclick=retry||function(){location.reload();};box.appendChild(button);
    var link=document.createElement('a');link.href='/assets/catalogues/'+file+'.pdf';link.textContent=text('Download PDF','下载 PDF');box.appendChild(link);
  }
  function lightPreview(){
    if(lightStarted)return;lightStarted=true;clearTimeout(timer);
    try{if(window.PDFViewerApplication&&(window.PDFViewerApplication.pdfLoadingTask||window.PDFViewerApplication.pdfDocument))window.PDFViewerApplication.close().catch(function(){});}catch(ignore){}
    document.documentElement.className+=' eyebre-light-view';document.documentElement.setAttribute('data-preview-mode','light');
    status().textContent=text('Preparing pages…','正在准备画册页面…');status().hidden=false;
    var xhr=new XMLHttpRequest();xhr.open('GET','/assets/catalogue-pages/'+file+'/index.json?v=3',true);xhr.timeout=25000;
    xhr.onload=function(){
      if(xhr.status<200||xhr.status>=300){failure(text('Unable to load the page list.','画册页面暂时无法加载。'));return;}
      try{buildLightReader(JSON.parse(xhr.responseText));}catch(error){failure(text('Unable to prepare the catalogue.','暂时无法打开画册。'));}
    };
    xhr.onerror=xhr.ontimeout=function(){failure(text('Connection timed out. Please try again.','连接超时，请重试。'));};xhr.send();
  }
  function buildLightReader(book){
    if(!book.pages||!book.pages.length)throw new Error('No pages');
    var shell=document.createElement('section');shell.id='catalogue-light-reader';
    shell.innerHTML='<nav id="catalogue-light-toolbar"><button id="light-prev" type="button">‹</button><input id="light-page-number" type="number" inputmode="numeric" min="1" max="'+book.pageCount+'" value="1"><span id="light-page-total">/ '+book.pageCount+'</span><button id="light-next" type="button">›</button><span class="light-tool-space"></span><button id="light-zoom-out" type="button">−</button><button id="light-fit" type="button">100%</button><button id="light-zoom-in" type="button">＋</button><a id="light-full-pdf">PDF</a></nav><div id="catalogue-light-scroll" tabindex="0"><div id="catalogue-light-pages"></div></div>';
    document.body.appendChild(shell);
    var scroll=document.getElementById('catalogue-light-scroll'),list=document.getElementById('catalogue-light-pages');
    var input=document.getElementById('light-page-number'),current=1,zoom=1,scheduled=false,active={},figures=[],hdActive=null,hdTimer;
    var first=(/#page=(\d+)/.exec(location.hash)||[])[1];current=Math.max(1,Math.min(book.pageCount,Number(first)||1));
    var names={'light-prev':text('Previous page','上一页'),'light-next':text('Next page','下一页'),'light-page-number':text('Page number','页码'),'light-zoom-out':text('Zoom out','缩小'),'light-fit':text('Fit width','适合页宽'),'light-zoom-in':text('Zoom in','放大'),'light-full-pdf':text('Full PDF tools','完整 PDF 工具')};
    Object.keys(names).forEach(function(id){document.getElementById(id).setAttribute('aria-label',names[id]);});
    var full=new URL(location.href);full.searchParams.set('view','pdf');document.getElementById('light-full-pdf').href=full.href;
    book.pages.forEach(function(page,index){
      var figure=document.createElement('figure');figure.className='light-page';figure.id='light-page-'+(index+1);
      var paper=document.createElement('div');paper.className='light-page-paper';paper.style.paddingBottom=(page.height/page.width*100)+'%';
      var image=document.createElement('img');image.width=page.width;image.height=page.height;image.alt=text('Page ','第 ')+(index+1)+(zh?' 页':'');image.decoding='async';image.draggable=false;image.hidden=true;
      var placeholder=document.createElement('span');placeholder.className='light-page-placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.textContent=text('Loading page ','正在加载第 ')+(index+1)+(zh?' 页…':'…');
      paper.appendChild(image);paper.appendChild(placeholder);figure.appendChild(paper);list.appendChild(figure);
      figures.push({figure:figure,image:image,placeholder:placeholder,loaded:false,pending:false,page:page,paper:paper});
    });
    function pageUrl(n){return '/assets/catalogue-pages/'+file+'/'+('0000'+n).slice(-4)+'.webp';}
    function load(n){
      var item=figures[n-1];if(!item||item.loaded||item.pending)return;
      active[n]=true;item.pending=true;item.placeholder.hidden=false;item.placeholder.onclick=null;item.placeholder.textContent=text('Loading page ','正在加载第 ')+n+(zh?' 页…':'…');item.image.hidden=false;
      item.image.onload=function(){
        clearTimeout(item.timer);item.pending=false;item.loaded=true;item.placeholder.hidden=true;
        if(n===current||!rendered){rendered=true;status().hidden=true;document.documentElement.setAttribute('data-light-rendered','true');}
      };
      item.image.onerror=function(){
        clearTimeout(item.timer);item.pending=false;item.image.hidden=true;item.placeholder.textContent=text('Page failed to load. Tap to retry.','页面加载失败，点击重试。');
        item.placeholder.onclick=function(){item.image.removeAttribute('src');load(n);};
        if(n===current)status().hidden=true;
      };
      item.timer=setTimeout(function(){if(item.pending&&item.image.onerror)item.image.onerror();},25000);
      item.image.src=pageUrl(n);
    }
    function controls(){input.value=current;document.getElementById('light-prev').disabled=current===1;document.getElementById('light-next').disabled=current===book.pageCount;document.documentElement.setAttribute('data-light-page',String(current));}
    function neighbors(){
      load(current);load(current+1);load(current-1);
      Object.keys(active).forEach(function(key){var n=Number(key);if(Math.abs(n-current)>2){var item=figures[n-1];clearTimeout(item.timer);item.image.onload=item.image.onerror=null;item.image.removeAttribute('src');item.image.hidden=true;item.loaded=item.pending=false;item.placeholder.hidden=false;delete active[key];}});
      controls();queueHD();
    }
    function jump(number){current=Math.max(1,Math.min(book.pageCount,Math.floor(Number(number)||1)));scroll.scrollTop=figures[current-1].figure.offsetTop;neighbors();}
    function onScroll(){
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(function(){
        scheduled=false;var point=scroll.scrollTop+scroll.clientHeight*.5,lo=0,hi=figures.length-1;
        while(lo<hi){var mid=Math.ceil((lo+hi)/2);if(figures[mid].figure.offsetTop<=point)lo=mid;else hi=mid-1;}
        if(current!==lo+1){current=lo+1;neighbors();}
      });
    }
    function releaseHD(){
      if(hdActive===null)return;
      var item=figures[hdActive-1];if(item.hdImage){item.hdImage.onload=item.hdImage.onerror=null;item.hdImage.removeAttribute('src');item.hdImage.hidden=true;}
      item.hdLoaded=item.hdPending=false;hdActive=null;document.documentElement.removeAttribute('data-hd-page');
    }
    function syncHD(){
      clearTimeout(hdTimer);
      if(zoom<1.35||!figures[current-1].page.hd){releaseHD();return;}
      if(hdActive!==current)releaseHD();
      var n=current,item=figures[n-1];if(item.hdLoaded||item.hdPending)return;
      hdActive=n;item.hdPending=true;
      if(!item.hdImage){item.hdImage=document.createElement('img');item.hdImage.className='light-page-hd';item.hdImage.alt='';item.hdImage.setAttribute('aria-hidden','true');item.hdImage.decoding='async';item.hdImage.draggable=false;item.paper.appendChild(item.hdImage);}
      item.hdImage.hidden=true;
      item.hdImage.onload=function(){if(hdActive!==n)return;item.hdPending=false;item.hdLoaded=true;item.hdImage.hidden=false;document.documentElement.setAttribute('data-hd-page',String(n));};
      item.hdImage.onerror=function(){item.hdPending=false;item.hdImage.hidden=true;};
      item.hdImage.src='/assets/catalogue-pages/'+file+'/hd/'+('0000'+n).slice(-4)+'.webp?v='+item.page.hd.bytes;
    }
    function queueHD(){clearTimeout(hdTimer);hdTimer=setTimeout(syncHD,180);}
    function captureAnchor(point){
      var y=scroll.scrollTop+point.y-list.offsetTop,lo=0,hi=figures.length-1;
      while(lo<hi){var mid=Math.ceil((lo+hi)/2);if(figures[mid].figure.offsetTop<=y)lo=mid;else hi=mid-1;}
      var figure=figures[lo].figure;
      return{index:lo,x:(scroll.scrollLeft+point.x-list.offsetLeft-figure.offsetLeft)/figure.offsetWidth,y:(y-figure.offsetTop)/figure.offsetHeight};
    }
    function restoreAnchor(anchor,point){
      var figure=figures[anchor.index].figure;
      scroll.scrollLeft=list.offsetLeft+figure.offsetLeft+anchor.x*figure.offsetWidth-point.x;
      scroll.scrollTop=list.offsetTop+figure.offsetTop+anchor.y*figure.offsetHeight-point.y;
    }
    function setZoom(value){
      zoom=Math.max(.75,Math.min(6,value));list.style.width=(zoom*100)+'%';document.getElementById('light-fit').textContent=Math.round(zoom*100)+'%';
      document.documentElement.setAttribute('data-light-zoom',String(zoom));queueHD();return zoom;
    }
    var gestures=window.EyebreReadingGestures(scroll,{getZoom:function(){return zoom;},setZoom:setZoom,captureAnchor:captureAnchor,restoreAnchor:restoreAnchor,onSettled:syncHD});
    document.getElementById('light-prev').onclick=function(){jump(current-1);};document.getElementById('light-next').onclick=function(){jump(current+1);};
    input.onchange=function(){jump(input.value);};input.onkeydown=function(event){if(event.key==='Enter'){event.preventDefault();jump(input.value);input.blur();}};
    document.getElementById('light-zoom-out').onclick=function(){gestures.zoomTo(zoom-.25);};document.getElementById('light-zoom-in').onclick=function(){gestures.zoomTo(zoom+.25);};document.getElementById('light-fit').onclick=function(){gestures.zoomTo(1);scroll.scrollLeft=0;};
    var lastWidth=scroll.clientWidth;scroll.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',function(){if(scroll.clientWidth!==lastWidth){lastWidth=scroll.clientWidth;gestures.zoomTo(zoom);}});
    jump(current);
  }
  function configure(event){
    if(!event.detail||event.detail.source!==window||configured||lightStarted)return;
    configured=true;
    var options=window.PDFViewerApplicationOptions,app=window.PDFViewerApplication;
    var originalProgress=app.progress;app.progress=function(percent){originalProgress.call(app,percent);var label=document.getElementById('pdf-load-progress');if(label&&!lightStarted&&!rendered&&typeof percent==='number'&&isFinite(percent))label.textContent=text('Opening catalogue · ','正在打开画册 · ')+Math.min(99,Math.max(0,Math.floor(percent)))+'%';};
    options.setAll({defaultUrl:'/assets/catalogues/'+file+'.pdf',defaultZoomValue:'page-width',viewOnLoad:1,disablePreferences:true,disableHistory:false,viewerCssTheme:2,localeProperties:{lang:zh?'zh-CN':'en-US'},workerSrc:asset+'build/pdf.worker.mjs',cMapUrl:asset+'web/cmaps/',standardFontDataUrl:asset+'web/standard_fonts/',wasmUrl:asset+'web/wasm/',iccUrl:asset+'web/iccs/',enableScripting:false,enableAutoLinking:false,enableWebGPU:false,annotationEditorMode:-1,maxCanvasPixels:8388608,disableAutoFetch:true,disableStream:true});
    app.initializedPromise.then(function(){
      document.getElementById('pageNumber').addEventListener('keydown',function(event){if(event.key==='Enter'){event.preventDefault();app.pdfLinkService.goToPage(event.currentTarget.value);document.getElementById('viewerContainer').focus({preventScroll:true});}});
      app.eventBus.on('pagerendered',function(){if(lightStarted)return;rendered=true;clearTimeout(timer);status().hidden=true;document.documentElement.setAttribute('data-pdf-rendered','true');document.title=title+' | Eyebre';});
      app.eventBus.on('documenterror',lightPreview);
    }).catch(lightPreview);
  }
  function fullViewer(){
    document.documentElement.setAttribute('data-preview-mode','pdf');
    status().textContent='';var progress=document.createElement('span');progress.id='pdf-load-progress';progress.textContent=text('Preparing PDF reader…','正在准备阅读器…');status().appendChild(progress);var fallback=document.createElement('button');fallback.type='button';fallback.textContent=text('Light preview','轻量预览');fallback.onclick=lightPreview;status().appendChild(fallback);
    var css=document.createElement('link');css.rel='stylesheet';css.href=asset+'web/viewer.css';document.head.insertBefore(css,document.head.firstChild);
    var core=document.createElement('script');core.type='module';core.src=asset+'build/pdf.mjs';
    core.onerror=lightPreview;core.onload=function(){if(lightStarted)return;var viewer=document.createElement('script');viewer.type='module';viewer.src=asset+'web/viewer.mjs';viewer.onerror=lightPreview;document.head.appendChild(viewer);};
    document.head.appendChild(core);
    timer=setTimeout(function(){if(!rendered)lightPreview();},25000);
  }
  document.addEventListener('webviewerloaded',configure);
  if(parent!==window)try{parent.document.addEventListener('webviewerloaded',configure);}catch(ignore){}
  window.addEventListener('error',function(event){if(!rendered&&event.filename&&event.filename.indexOf('/pdfjs-viewer/')>=0)lightPreview();});
  document.addEventListener('DOMContentLoaded',function(){
    prepare();var mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&(navigator.platform==='MacIntel'||Math.min(screen.width,screen.height)<900));
    if(url.searchParams.get('view')==='light'||(mobile&&url.searchParams.get('view')!=='pdf'))lightPreview();else fullViewer();
  },{once:true});
})();

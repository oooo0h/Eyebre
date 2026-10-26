/** Let the browser render the PDF, directly above the unchanged homepage. */
export function createCatalogueReader(catalogues,getLanguage){
  const dialog=document.createElement('dialog');
  dialog.id='catalogue-reader';
  dialog.innerHTML=`<button id="catalogue-close" type="button"></button><iframe id="catalogue-native-pdf" title="Product catalogue"></iframe>`;
  document.body.append(dialog);
  const back=dialog.querySelector('#catalogue-close');
  const frame=dialog.querySelector('iframe');
  let selected,opener;
  function labels(){
    const zh=getLanguage()==='zh';
    back.textContent=zh?'← 返回':'← Back';
    back.setAttribute('aria-label',zh?'返回产品画册':'Back to catalogues');
    dialog.setAttribute('aria-label',zh?'产品画册':'Product catalogue');
    if(selected)frame.title=zh?selected.zh:selected.en;
  }
  function close(){
    if(!dialog.open)return;
    dialog.close();
    frame.removeAttribute('src');
    document.documentElement.classList.remove('eyebre-pdf-open');
    opener?.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const card=event.target.closest('a[data-eyebre-catalogue]');
    if(!card||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const book=catalogues.find(item=>item.id===card.dataset.eyebreCatalogue);
    if(!book)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selected=book;opener=card;labels();
    // Load the PDF resource directly in the browser's native viewer.
    frame.src=card.href;
    dialog.showModal();
    document.documentElement.classList.add('eyebre-pdf-open');
    back.focus({preventScroll:true});
  },true);
  back.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  dialog.addEventListener('pointerdown',event=>event.stopPropagation());
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  window.addEventListener('eyebre-language-change',labels);
  labels();
}

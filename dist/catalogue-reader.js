/** Open the same shareable web preview directly over the unchanged homepage. */
export function createCatalogueReader(){
  const dialog=document.createElement('dialog');dialog.id='catalogue-reader';
  dialog.innerHTML='<iframe id="catalogue-preview-frame" title="Product catalogue" allowfullscreen></iframe>';
  document.body.append(dialog);
  const frame=dialog.querySelector('iframe');let opener;
  function close(){if(!dialog.open)return;dialog.close();frame.removeAttribute('src');document.documentElement.classList.remove('eyebre-pdf-open');opener?.focus({preventScroll:true});}
  document.addEventListener('click',event=>{
    const card=event.target.closest('a[data-eyebre-catalogue]');
    if(!card||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();event.stopImmediatePropagation();opener=card;
    frame.title=dialog.ariaLabel=card.getAttribute('aria-label')||'Product catalogue';
    frame.src=card.href;dialog.showModal();document.documentElement.classList.add('eyebre-pdf-open');
  },true);
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='eyebre-close-catalogue')close();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  dialog.addEventListener('pointerdown',event=>event.stopPropagation());
  dialog.addEventListener('keydown',event=>event.stopPropagation());
}

/* Text-only company adaptation. Runs before the reference animation runtime
   splits text into its animated lines, words and letters. */
(() => {
  const stored = (store, key) => { try { return store.getItem(key); } catch { return null; } };
  const save = (store, key, value) => { try { store.setItem(key, value); } catch {} };
  const requested = new URL(location.href).searchParams.get('lang');
  let lang = (requested || stored(localStorage, 'eyebre-language')) === 'zh' ? 'zh' : 'en';
  let isZh = lang === 'zh';
  document.documentElement.lang = isZh ? 'zh-CN' : 'en';
  const t = (en, zh) => isZh ? zh : en;
  // Closing punctuation belongs to its preceding glyph, so it cannot become
  // a separate animated word at the beginning of a line.
  const segmentCjk = value => value.replace(/([\u3400-\u9fff][，。！？；：、）】》”’]*)/gu, '$1 ').trim();
  const catalogues = [
    {id:'oryzo_ai', en:'Binoculars', zh:'双筒望远镜', subEn:'Bring distant landscapes closer.', subZh:'让远方风景，近在眼前。', bg:'#1a1411', color:'#ffedd7', shadow:'.9'},
    {id:'atlas_motion', en:'Astronomical Telescopes', zh:'天文望远镜', subEn:'From lunar detail to distant skies.', subZh:'从月面细节，到浩瀚星空。', bg:'#181818', color:'#FFFDE0', shadow:'.95'},
    {id:'devin_ai', en:'Monoculars', zh:'单筒望远镜', subEn:'A new perspective on every journey.', subZh:'一个视角，更多发现。', bg:'#121414', color:'#ffffff', shadow:'.9'},
    {id:'of_the_oak', en:'Riflescopes', zh:'瞄准镜', subEn:'A clear view of the details that matter.', subZh:'聚焦目标，看清每一处细节。', bg:'#111a13', color:'#d9f3de', shadow:'.9'},
    {id:'everswap', en:'Spotting Scopes', zh:'观鸟镜', subEn:'A closer view of life in the wild.', subZh:'静观自然，捕捉灵动瞬间。', bg:'#E3E3F8', color:'#000', shadow:'.95'},
    {id:'porsche_dream_machine', en:'Rangefinders', zh:'测距仪', subEn:'Put distance into perspective.', subZh:'丈量远近，让视野更有尺度。', bg:'#EFD5D3', color:'#000000', shadow:'.95'},
    {id:'synthetic_human', en:'Night Vision', zh:'夜视仪', subEn:'Keep exploring after dusk.', subZh:'当夜幕降临，探索仍在继续。', bg:'#9d8aff', color:'#ffffff', shadow:'.95'},
    {id:'spatial_fusion', en:'Thermal Imaging', zh:'热成像', subEn:'Discover a world revealed by heat.', subZh:'感知温度，发现另一种视界。', bg:'#D6C8ED', color:'#000000', shadow:'.95'},
    {id:'spaace', en:'Microscopes', zh:'显微镜', subEn:'A wider world in the smallest details.', subZh:'微小之中，自有广阔天地。', bg:'#010a16', color:'#ffece2', shadow:'.85'},
    {id:'ddd_2024', en:'Mounts & Clamps', zh:'支架&夹具', subEn:'A steady foundation for every view.', subZh:'稳住视角，让观察从容展开。', bg:'#261c46', color:'#ffffff', shadow:'.95'},
  ];
  const catalogueFiles = ['binoculars','astronomical-telescopes','monoculars','riflescopes','spotting-scopes','rangefinders','night-vision','thermal','microscopes','mounts-clamps'];
  catalogues.forEach((catalogue,index)=>catalogue.pdf=catalogueFiles[index]);
  function updateCatalogueLink(card,catalogue){
    const filename=catalogue.pdf==='thermal'?`thermal-${lang}`:catalogue.pdf;
    card.href=`/assets/catalogues/${filename}.pdf`;
    card.dataset.linkType='external';
    card.dataset.eyebreCatalogue=catalogue.id;
    card.target='_blank';
    card.rel='noopener';
  }
  const text = (selector, value, segment = false) => {
    const home=window.EyebreRuntime?.getHomeRoot?.();
    const elements=new Set([...document.querySelectorAll(selector),...(home&&!home.isConnected?[...home.querySelectorAll(selector)]:[])]);
    elements.forEach(el => {
      if(segment)el.setAttribute('aria-label',value);
      if (isZh && segment) {
        // Original SplitType animates whitespace-separated words. Segment CJK
        // characters before its initial measurement so translated lines wrap.
        value = segmentCjk(value);
        el.classList.add('eyebre-segmented');
      }
      el.textContent = value;
    });
  };
  const values = {
    '#home-hero-title': ['Decades in optics. A world brought closer.', '数十年光学积淀，带你看见更远的世界。'],
    '#home-hero-scroll': ['scroll to explore', '向下探索'],
    '#home-reel-title-line-1': ['Closer Views,', '让细节更近，'],
    '#home-reel-title-line-2': ['Bigger Worlds', '让世界更大'],
    '#home-reel-desc': ['At Eyebre, decades of experience in the optical industry meet an enduring curiosity about the world. From binoculars and monoculars to astronomical telescopes, riflescopes, night vision, thermal imaging and microscopes, our range opens up new ways to observe and explore.', 'Eyebre 源自浙江胤远光学仪器有限公司。数十年光学行业经验，连接对世界的持久热爱。我们提供双筒望远镜、单筒望远镜、天文望远镜、瞄准镜、夜视仪与热成像、显微镜等产品，为观察与探索打开更多可能。'],
    '#home-reel-cta-text': ['About Eyebre', '关于 Eyebre'],
    '#home-reel-video-title': ['Brand Film', '品牌 影片'],
    '#home-featured-title': ['Our Catalogues', '产品图册'],
    '#home-featured-disclaimer': ['Explore the Eyebre optical range. Select a catalogue to browse the complete PDF.', '探索 Eyebre 光学产品系列，点击对应图册，在线阅读完整 PDF。'],
    '#home-featured-cta-text': ['Explore Our Range', '探索产品系列'],
    '#home-goal-title': ['Where Curiosity Opens Up A Bigger World', '以好奇，打开更大的世界'],
    '#end-section-subtitle-text': ['Ready To See A Little Further?', '准备好，看得更远一点了吗？'],
    '#header-right-talk-btn-text': ['Let’s talk', '联系我们'],
    '#header-right-menu-btn-text': ['Menu', '菜单'],
    '#header-right-menu-btn-text-close': ['Close', '关闭'],
    '#header-menu-text': ['Let’s talk', '联系我们'],
    '#header-menu-labs-text, #header-menu-labs-text-clone': ['Our Range', '产品系列'],
    '#footer-enquires-header': ['Product enquiries', '产品咨询'],
    '#footer-business-header': ['Business enquiries', '商务合作'],
    '#footer-enquires-link, #footer-business-link': ['+86 139 0689 3397', '139 0689 3397'],
    '#footer-bottom-copyright': ['©2026 EYEBRE', '©2026 EYEBRE'],
    '#footer-bottom-tagline': ['A closer look at a bigger world.', '看见，更远的世界。'],
    '#footer-bottom-labs': ['Zhejiang Yinyuan Optical Instruments', '浙江胤远光学仪器有限公司'],
    '#end-bottom-text': ['CONTINUE TO SCROLL', '继续向下探索'],
    '#scroll-nav-text': ['Explore Again', '再次探索'],
    '#scroll-nav-next-text': ['Back to the beginning', '回到起点'],
    '#video-overlay__play-btn': ['PLAY', '播放'],
    '#video-overlay__mute-btn': ['MUTE', '静音'],
  };
  const segmented = new Set(['#home-hero-title','#home-hero-scroll','#home-reel-desc','#home-goal-title','#end-section-subtitle-text']);
  for (const [selector, variants] of Object.entries(values)) text(selector, variants[isZh ? 1 : 0], segmented.has(selector));
  const heroTitle = document.getElementById('home-hero-title');
  const heroPhrases=isZh?['数十年光学积淀，','带你看见更远的世界。']:['Decades in optics.','A world brought closer.'];
  if(heroTitle){
    heroTitle.setAttribute('aria-label',heroPhrases.join(isZh?'':' '));
    heroTitle.replaceChildren(...heroPhrases.map(phrase=>{const span=document.createElement('span');span.className='eyebre-hero-phrase';span.textContent=isZh?segmentCjk(phrase):phrase;return span;}));
  }
  const paragraphs = document.querySelectorAll('.home-goal-texts-paragraph');
  if (paragraphs[0]) {
    text('.home-goal-texts-paragraph:nth-child(1)', t('A bird on a distant branch. A city filled with human stories. Light travelling across the night sky. We believe that each new discovery begins with the desire to see a little more — and a new perspective brings the world a little closer.', '远处枝头的一只鸟，城市街角的一个故事，穿越夜空而来的星光。每一次新的发现，都始于想看得更清楚一点的好奇心。我们相信，每一个新的视角，都能让世界更近一点。'), true);
    text('.home-goal-texts-paragraph:nth-child(2)', t('Our range connects the many ways people observe: from exploring nature and looking beyond the horizon to discovering microscopic details. With decades in the optical industry, Eyebre invites you to keep looking, keep exploring and see a bigger world.', '从自然观察到远眺天际，从日常探索到微观细节，我们以丰富的产品系列，连接不同尺度的观察世界。凭借数十年光学行业积累，Eyebre 邀你保持好奇，继续探索，看见更远的世界。'), true);
  }
  const tunnelLines = document.querySelectorAll('.home-goal-tunnel-title-line');
  const tunnelCopy = isZh ? ['从 自然 到 人文', '让 目光', '走向 浩瀚 星空'] : ['From nature to culture', 'let your curiosity', 'travel into the stars'];
  tunnelLines.forEach((el, i) => { el.textContent = tunnelCopy[i] || ''; });
  const endTitle = document.getElementById('end-section-title-link');
  if (endTitle) endTitle.innerHTML = isZh ? '一起看向<br>更远的世界' : 'Let’s look<br>further!';
  const scrollSubtitle = document.getElementById('scroll-nav-subtitle');
  if (scrollSubtitle) scrollSubtitle.innerHTML = isZh ? '继续探索<br>更多可能' : 'Keep Looking<br>Keep Exploring';
  const title = t('Eyebre — A Closer Look At A Bigger World', 'Eyebre 胤远光学 — 看见，更远的世界');
  document.title = title;
  ['og:title','og:site_name','og:image:alt'].forEach(property => {
    const el = document.querySelector(`meta[property="${property}"]`); if (el) el.content = title;
  });
  const description = t('Eyebre by Zhejiang Yinyuan Optical Instruments. Decades of optical industry experience, with binoculars, monoculars, astronomical telescopes, riflescopes, night vision, thermal imaging and microscopes.', '浙江胤远光学仪器有限公司旗下品牌 Eyebre，数十年光学行业经验，产品覆盖双筒望远镜、单筒望远镜、天文望远镜、瞄准镜、夜视仪与热成像、显微镜。');
  document.querySelectorAll('meta[name="description"],meta[property="og:description"]').forEach(el => el.content = description);
  document.querySelectorAll('meta[property="og:url"],meta[property="og:image"]').forEach(el => el.remove());
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"]').forEach(el => { el.href='/assets/favicon.svg'; });
  document.querySelectorAll('link[rel="manifest"],link[rel="sitemap"]').forEach(el => el.remove());
  const logo = document.getElementById('header-logo');
  if (logo) { logo.innerHTML = '<span class="eyebre-wordmark">Eyebre<sup>®</sup></span>'; logo.setAttribute('aria-label', t('Eyebre home', 'Eyebre 首页')); }
  if(logo){
    // Keep the measured H1 inside the original scene. The desktop header gets
    // a visual copy so its fixed brand lockup can animate independently.
    const lockup=document.createElement('div');lockup.id='eyebre-desktop-lockup';
    logo.before(lockup);lockup.append(logo);
    const logoWindow=document.createElement('span');logoWindow.className='eyebre-logo-window';
    logoWindow.append(logo.querySelector('.eyebre-wordmark'));logo.replaceChildren(logoWindow);
    const divider=document.createElement('span');divider.id='eyebre-brand-divider';divider.setAttribute('aria-hidden','true');
    divider.innerHTML='<span class="eyebre-divider-fill"></span><span class="eyebre-divider-flow"></span>';
    const copyWindow=document.createElement('div');copyWindow.id='eyebre-desktop-copy';copyWindow.setAttribute('aria-hidden','true');
    const copyInner=document.createElement('div');copyInner.className='eyebre-desktop-copy-inner';
    heroPhrases.forEach(phrase=>{const line=document.createElement('span');line.textContent=phrase;copyInner.append(line);});
    copyWindow.append(copyInner);lockup.append(divider,copyWindow);
    document.documentElement.classList.add('eyebre-brand-lockup-ready');
    if(heroTitle&&matchMedia('(min-width: 1024px)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches)lockup.classList.add('eyebre-intro-pending');
    import('./desktop-intro.js').then(({setupDesktopIntro})=>setupDesktopIntro(lockup)).catch(error=>{lockup.classList.remove('eyebre-intro-pending');console.warn('Using static desktop branding:',error.message);});
  }
  document.getElementById('header-right-menu-btn')?.setAttribute('aria-label', t('Menu', '菜单'));
  document.getElementById('home-reel-video-watch-btn')?.setAttribute('aria-label', t('Play reference film', '播放参考影片'));
  document.querySelectorAll('#footer-newsletter-input-arrow,#header-menu-newsletter-input-arrow').forEach(el => el.setAttribute('aria-label', t('Call Eyebre', '电话联系 Eyebre')));
  const footerBrandLink=document.getElementById('footer-bottom-labs');
  if(footerBrandLink){footerBrandLink.href='tel:+8613906893397';footerBrandLink.removeAttribute('target');}

  const menuNames = isZh ? ['首页','关于我们','产品图册','联系我们'] : ['Home','About us','Catalogues','Contact'];
  const menuTargets = ['home-hero','home-reel','home-featured','footer-section'];
  document.querySelectorAll('.header-menu-link').forEach((link,i) => {
    link.querySelectorAll('.header-menu-link-text,.header-menu-link-text-clone').forEach(el => el.textContent = menuNames[i] || menuNames[3]);
    link.dataset.eyebreScroll = menuTargets[i] || 'footer-section';
    link.href = '#'+link.dataset.eyebreScroll;
    link.dataset.linkType = 'external';
  });
  const scrollLinks = {'home-reel-cta':'home-goal','home-featured-cta':'home-featured','header-menu-labs':'home-featured'};
  for (const [id,target] of Object.entries(scrollLinks)) {
    const link = document.getElementById(id); if (!link) continue;
    link.href = '#'+target; link.removeAttribute('target'); link.dataset.linkType='external'; link.dataset.eyebreScroll=target;
  }
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => { link.href='tel:+8613906893397'; if (!link.children.length && link.textContent.includes('@')) link.textContent=t('+86 139 0689 3397','139 0689 3397'); });
  const address = document.getElementById('footer-contact-address');
  if (address) {
    address.href='tel:+8613906893397'; address.removeAttribute('target');
    const lines = isZh ? ['浙江胤远光学','仪器有限公司','中国 · 浙江','品牌 Eyebre'] : ['Zhejiang Yinyuan','Optical Instruments','Zhejiang, China','Eyebre'];
    address.querySelectorAll('.footer-address-line').forEach((el,i) => el.textContent=lines[i] || '');
  }
  const socials=document.querySelectorAll('.footer-socials-line');
  socials.forEach((el,i) => { el.href='#home-featured';el.dataset.linkType='external';el.dataset.eyebreScroll='home-featured';el.removeAttribute('target');const label=el.querySelector('.footer-socials-text');if(label) label.textContent=(isZh?['双筒望远镜','天文望远镜','显微镜']:['Binoculars','Astronomy','Microscopy'])[i] || 'Eyebre'; });
  document.querySelectorAll('#header-menu-newsletter-title > div').forEach((el,i) => el.textContent=(isZh?['了解更多','光学产品']:['Talk to our','optical team'])[i]);
  document.querySelectorAll('.footer-newsletter-line').forEach((el,i) => el.textContent=(isZh?['了解更多','光学产品']:['Talk to our','optical team'])[i]);
  ['header-menu-newsletter-input-field','footer-newsletter-input-field'].forEach(id=>{const el=document.getElementById(id);if(el){el.type='tel';el.value='139 0689 3397';el.readOnly=true;el.setAttribute('aria-label',t('Call Eyebre','电话联系 Eyebre'));el.removeAttribute('name');}});
  document.addEventListener('submit',event=>{if(event.target.matches('#header-menu-newsletter-form,#footer-newsletter-form')){event.preventDefault();event.stopImmediatePropagation();location.href='tel:+8613906893397';}},true);

  // Preserve the card DOM and hover shaders with local catalogue covers.
  document.querySelectorAll('.project-item').forEach((card,i) => {
    const catalogue=catalogues[i];
    if(!catalogue){card.remove();return;}
    const title=card.querySelector('.project-item-line-2-inner');
    if(title)title.textContent=t(catalogue.en,catalogue.zh);
    const meta=card.querySelector('.project-item-line-1');if(meta)meta.textContent=t(catalogue.subEn,catalogue.subZh);
    card.setAttribute('aria-label',t(catalogue.en,catalogue.zh));
    updateCatalogueLink(card,catalogue);
  });
  // Keep legacy detail URLs readable; homepage catalogue cards open the PDF directly.
  window.EyebreAdaptFetchedPage=(doc,path)=>{
    const pageTitle=doc.getElementById('project-details-title');
    if(!pageTitle)return;
    const catalogue=catalogues.find(item=>item.id===path.split('/').filter(Boolean).at(-1));
    const next=catalogue?catalogues[(catalogues.indexOf(catalogue)+1)%catalogues.length]:catalogues[0];
    pageTitle.textContent=catalogue?t(catalogue.en,catalogue.zh):t('Product Catalogue','产品图册');
    const description=doc.getElementById('project-details-desc');
    if(description){
      description.textContent='';
      for(const content of [catalogue?t(catalogue.subEn,catalogue.subZh):'',t('Browse the complete Eyebre catalogue in the PDF reader. Contact our team for product information.','在 PDF 阅读器中浏览完整 Eyebre 画册，欢迎联系我们了解产品信息。')].filter(Boolean)){const paragraph=doc.createElement('p');paragraph.textContent=content;description.append(paragraph);}
    }
    doc.querySelectorAll('#project-details-launch-cta,#project-details-launch-cta-mobile,#project-details-side-list-links a').forEach(el=>{el.href='tel:+8613906893397';el.removeAttribute('target');});
    doc.querySelectorAll('#project-details-launch-cta-text,#project-details-launch-cta-mobile-text').forEach(el=>el.textContent=t('Contact Eyebre','联系 Eyebre'));
    doc.querySelectorAll('#project-details-side-list-links a').forEach(el=>el.textContent=t('Call +86 139 0689 3397','致电 13906893397'));
    doc.querySelectorAll('#project-details-side-list-services .project-details-side-list-title').forEach(el=>el.textContent=t('Our range','产品系列'));
    doc.querySelectorAll('#project-details-side-list-links .project-details-side-list-title').forEach(el=>el.textContent=t('Enquiries','咨询'));
    const categories=catalogues.map(item=>t(item.en,item.zh));
    doc.querySelectorAll('#project-details-side-list-services .project-details-side-list-item').forEach((el,i)=>el.textContent=categories[i%categories.length]);
    doc.querySelectorAll('#project-details-preview .project-item-line-2-inner').forEach(el=>el.textContent=t('Next Catalogue','下一本图册'));
    const preview=doc.getElementById('project-details-preview');
    if(preview)Object.assign(preview.dataset,{nextId:next.id,nextColorBg:next.bg,nextColorText:next.color,nextShadow:next.shadow});
    doc.querySelectorAll('#project-details-preview-title').forEach(el=>el.textContent=t(next.en,next.zh));
    doc.querySelectorAll('#project-details-preview-footer-text').forEach(el=>el.textContent=t('NEXT CATALOGUE','下一本图册'));
    return t('Eyebre — Product Catalogue','Eyebre — 产品图册');
  };
  const detailPageTitle=window.EyebreAdaptFetchedPage(document,location.pathname);
  if(detailPageTitle)document.title=detailPageTitle;
  const refCaption=document.createElement('span');refCaption.className='eyebre-reference-caption';refCaption.textContent=t('REFERENCE REEL · COMPANY FILM TO FOLLOW','参考影片 · 公司介绍视频待替换');
  document.getElementById('home-reel-video-container')?.append(refCaption);

  const control=document.createElement('div');control.id='eyebre-language-control';
  control.innerHTML=`<button id="eyebre-language-button" aria-expanded="false" aria-controls="eyebre-language-menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg><span class="eyebre-language-label">Language</span><small>${isZh?'中':'EN'}</small></button><div id="eyebre-language-menu" hidden><button data-eyebre-lang="en" aria-pressed="${!isZh}">English <span>EN</span></button><button data-eyebre-lang="zh" aria-pressed="${isZh}">简体中文 <span>中</span></button></div>`;
  document.getElementById('header-right')?.append(control);
  const languageButton=document.getElementById('eyebre-language-button');
  const languageMenu=document.getElementById('eyebre-language-menu');
  languageButton.addEventListener('click',()=>{languageMenu.hidden=!languageMenu.hidden;languageButton.setAttribute('aria-expanded',String(!languageMenu.hidden));});
  control.addEventListener('click',event=>{
    const button=event.target.closest('[data-eyebre-lang]');if(!button)return;
    const next=button.dataset.eyebreLang;
    if(next===lang){languageMenu.hidden=true;languageButton.setAttribute('aria-expanded','false');return;}
    applyLanguage(next);
  });
  document.addEventListener('click',event=>{if(!control.contains(event.target)){languageMenu.hidden=true;languageButton.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){languageMenu.hidden=true;languageButton.setAttribute('aria-expanded','false');}});
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-eyebre-scroll]');
    if(link){event.preventDefault();event.stopImmediatePropagation();window.EyebreRuntime?.scrollTo(link.dataset.eyebreScroll);}
  },true);
  window.addEventListener('eyebre-ready',()=>{
    const previous=Number(stored(sessionStorage,'eyebre-scroll'));
    if(Number.isFinite(previous)&&previous>0)window.EyebreRuntime?.restoreScroll(previous);
    try{sessionStorage.removeItem('eyebre-scroll');}catch{}
  },{once:true});

  function applyLanguage(next){
    const runtime=window.EyebreRuntime;
    runtime?.prepareCopy?.();
    lang=next==='zh'?'zh':'en';isZh=lang==='zh';
    document.documentElement.lang=isZh?'zh-CN':'en';
    for(const [selector,variants] of Object.entries(values))text(selector,variants[isZh?1:0],segmented.has(selector));
    const phrases=isZh?['数十年光学积淀，','带你看见更远的世界。']:['Decades in optics.','A world brought closer.'];
    const home=runtime?.getHomeRoot?.()||document;
    const heading=home.querySelector('#home-hero-title');
    if(heading){heading.setAttribute('aria-label',phrases.join(isZh?'':' '));heading.replaceChildren(...phrases.map(phrase=>{const span=document.createElement('span');span.className='eyebre-hero-phrase';span.textContent=isZh?segmentCjk(phrase):phrase;return span;}));}
    document.querySelectorAll('.eyebre-desktop-copy-inner>span').forEach((el,i)=>el.textContent=phrases[i]);
    text('.home-goal-texts-paragraph:nth-child(1)',t('A bird on a distant branch. A city filled with human stories. Light travelling across the night sky. We believe that each new discovery begins with the desire to see a little more — and a new perspective brings the world a little closer.','远处枝头的一只鸟，城市街角的一个故事，穿越夜空而来的星光。每一次新的发现，都始于想看得更清楚一点的好奇心。我们相信，每一个新的视角，都能让世界更近一点。'),true);
    text('.home-goal-texts-paragraph:nth-child(2)',t('Our range connects the many ways people observe: from exploring nature and looking beyond the horizon to discovering microscopic details. With decades in the optical industry, Eyebre invites you to keep looking, keep exploring and see a bigger world.','从自然观察到远眺天际，从日常探索到微观细节，我们以丰富的产品系列，连接不同尺度的观察世界。凭借数十年光学行业积累，Eyebre 邀你保持好奇，继续探索，看见更远的世界。'),true);
    home.querySelectorAll('.home-goal-tunnel-title-line').forEach((el,i)=>el.textContent=(isZh?['从 自然 到 人文','让 目光','走向 浩瀚 星空']:['From nature to culture','let your curiosity','travel into the stars'])[i]);
    const end=document.getElementById('end-section-title-link');if(end)end.innerHTML=isZh?'一起看向<br>更远的世界':'Let’s look<br>further!';
    const subtitle=document.getElementById('scroll-nav-subtitle');if(subtitle)subtitle.innerHTML=isZh?'继续探索<br>更多可能':'Keep Looking<br>Keep Exploring';
    document.querySelectorAll('.header-menu-link').forEach((link,i)=>link.querySelectorAll('.header-menu-link-text,.header-menu-link-text-clone').forEach(el=>el.textContent=(isZh?['首页','关于我们','产品图册','联系我们']:['Home','About us','Catalogues','Contact'])[i]));
    document.querySelectorAll('.footer-address-line').forEach((el,i)=>el.textContent=(isZh?['浙江胤远光学','仪器有限公司','中国 · 浙江','品牌 Eyebre']:['Zhejiang Yinyuan','Optical Instruments','Zhejiang, China','Eyebre'])[i]);
    document.querySelectorAll('.footer-socials-text').forEach((el,i)=>el.textContent=(isZh?['双筒望远镜','天文望远镜','显微镜']:['Binoculars','Astronomy','Microscopy'])[i]);
    document.querySelectorAll('#header-menu-newsletter-title>div,.footer-newsletter-line').forEach((el,i)=>el.textContent=(isZh?['了解更多','光学产品']:['Talk to our','optical team'])[i%2]);
    home.querySelectorAll('.project-item').forEach((card,i)=>{const c=catalogues[i];if(!c)return;card.querySelector('.project-item-line-2-inner').textContent=t(c.en,c.zh);card.querySelector('.project-item-line-1').textContent=t(c.subEn,c.subZh);card.setAttribute('aria-label',t(c.en,c.zh));updateCatalogueLink(card,c);});
    logo?.setAttribute('aria-label',t('Eyebre home','Eyebre 首页'));
    languageButton.querySelector('small').textContent=isZh?'中':'EN';
    control.querySelectorAll('[data-eyebre-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.eyebreLang===lang)));
    languageMenu.hidden=true;languageButton.setAttribute('aria-expanded','false');
    refCaption.textContent=t('REFERENCE REEL · COMPANY FILM TO FOLLOW','参考影片 · 公司介绍视频待替换');
    document.title=t('Eyebre — A Closer Look At A Bigger World','Eyebre 胤远光学 — 看见，更远的世界');
    document.querySelector('meta[property="og:title"]').content=document.title;
    save(localStorage,'eyebre-language',lang);
    const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(history.state,'',url.href);
    runtime?.refreshCopy?.();
    window.dispatchEvent(new CustomEvent('eyebre-language-change',{detail:{language:lang}}));
  }
  const readerStyles=document.createElement('link');readerStyles.rel='stylesheet';readerStyles.href='/catalogue-reader.css';document.head.append(readerStyles);
  import('./catalogue-reader.js').then(({createCatalogueReader})=>createCatalogueReader(catalogues,()=>lang)).catch(error=>console.warn('Catalogue reader:',error.message));
})();

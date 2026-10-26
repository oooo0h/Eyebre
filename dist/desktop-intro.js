/** Desktop-only brand entrance; the reference scene and mobile intro are untouched. */
export function setupDesktopIntro(lockup) {
  const desktop = matchMedia('(min-width: 1024px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mark = lockup.querySelector('.eyebre-wordmark');
  const logoWindow = lockup.querySelector('.eyebre-logo-window');
  const copy = lockup.querySelector('.eyebre-desktop-copy-inner');
  const copyWindow = lockup.querySelector('#eyebre-desktop-copy');
  const divider = lockup.querySelector('#eyebre-brand-divider');
  const fill = lockup.querySelector('.eyebre-divider-fill');
  const flow = lockup.querySelector('.eyebre-divider-flow');
  let engineReady = Boolean(window.EyebreRuntime?.ready());
  let timeline;
  let hasPlayed = false;
  let loading;
  let generation = 0;
  const content = document.getElementById('page-container');

  function syncScroll() {
    // The reference site scrolls by translating its content instead of using
    // window.scrollY. Apply that same translation to the desktop brand only;
    // its header layout slot and the right-hand controls stay in place.
    const onHome = document.getElementById('home-hero') && !document.documentElement.classList.contains('is-project-details-active');
    const transform = desktop.matches && onHome ? content?.style.transform || '' : '';
    if (lockup.style.transform !== transform) lockup.style.transform = transform;
  }
  const scrollObserver = new MutationObserver(syncScroll);
  if (content) scrollObserver.observe(content, { attributes: true, attributeFilter: ['style'] });
  scrollObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function record(stage) {
    lockup.dataset.introStage = stage;
    lockup.dataset.introSequence = [lockup.dataset.introSequence, stage].filter(Boolean).join('>');
  }

  function showStatic() {
    generation++;
    timeline?.kill();
    lockup.classList.remove('eyebre-intro-pending');
    [mark, copy, fill, flow].forEach(el => {
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
    });
    lockup.dataset.introStage = 'static';
  }

  function loadGsap() {
    if (window.gsap) return Promise.resolve(window.gsap);
    if (!loading) loading = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/gsap.min.js';
      script.onload = () => resolve(window.gsap);
      script.onerror = () => resolve(null);
      document.head.append(script);
    });
    return loading;
  }

  async function start() {
    if (!engineReady || hasPlayed) return;
    if (!desktop.matches || reducedMotion.matches || !document.getElementById('home-hero')) {
      showStatic();
      return;
    }
    lockup.classList.add('eyebre-intro-pending');
    const currentGeneration = ++generation;
    const gsap = await loadGsap();
    if (currentGeneration !== generation) return;
    if (!gsap || !desktop.matches || reducedMotion.matches) { showStatic(); return; }
    hasPlayed = true;
    lockup.dataset.introSequence = '';
    lockup.dataset.shakeCount = '0';
    // Each mask ends exactly at the divider. The content starts behind that
    // boundary, then opens in opposite directions after the line is complete.
    gsap.set(mark, { x: logoWindow.clientWidth });
    gsap.set(copy, { x: -copyWindow.clientWidth });
    gsap.set(fill, { scaleY: 0, transformOrigin: '50% 0%' });
    gsap.set(flow, { y: 0, autoAlpha: 0 });
    timeline = gsap.timeline({
      delay: .6,
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        lockup.classList.remove('eyebre-intro-pending');
        gsap.set([mark, copy, fill, flow], { clearProps: 'transform,opacity,visibility' });
        lockup.dataset.shakeCount = '1';
        record('complete');
      },
    });
    timeline
      .call(() => record('line'), null, 0)
      .to(fill, { scaleY: 1, duration: .82, ease: 'power2.inOut' }, 0)
      .fromTo(flow, { y: 0, autoAlpha: 1 }, { y: () => Math.max(0, divider.clientHeight - 16), duration: .82, ease: 'power2.inOut' }, 0)
      .to(flow, { autoAlpha: 0, duration: .1 }, .82)
      .addLabel('open', .94)
      .call(() => record('reveal'), null, 'open')
      .to(mark, { x: 0, duration: .74, ease: 'power3.out' }, 'open')
      .to(copy, { x: 0, duration: .74, ease: 'power3.out' }, 'open')
      .addLabel('settle', 'open+=.74')
      .call(() => record('settle'), null, 'settle')
      .to(mark, { x: -5, duration: .08 }, 'settle')
      .to(copy, { x: 5, duration: .08 }, 'settle')
      .to(mark, { x: 3, duration: .12, ease: 'power1.inOut' }, 'settle+=.08')
      .to(copy, { x: -3, duration: .12, ease: 'power1.inOut' }, 'settle+=.08')
      .to(mark, { x: 0, duration: .12 }, 'settle+=.2')
      .to(copy, { x: 0, duration: .12 }, 'settle+=.2');
  }

  function onModeChange() {
    syncScroll();
    if (!desktop.matches || reducedMotion.matches) showStatic();
    else start();
  }
  function onReady() { engineReady = true; syncScroll(); start(); }
  desktop.addEventListener('change', onModeChange);
  reducedMotion.addEventListener('change', onModeChange);
  window.addEventListener('eyebre-ready', onReady, { once: true });
  window.addEventListener('pagehide', () => {
    generation++;
    timeline?.kill();
    scrollObserver.disconnect();
    desktop.removeEventListener('change', onModeChange);
    reducedMotion.removeEventListener('change', onModeChange);
    window.removeEventListener('eyebre-ready', onReady);
  }, { once: true });
  if (!desktop.matches || reducedMotion.matches) showStatic();
  syncScroll();
  start();
}

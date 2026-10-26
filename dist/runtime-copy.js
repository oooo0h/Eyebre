/** Refresh animated text without rebuilding the renderer or changing routes. */
export function installRuntimeCopy(api, ctx) {
  const { SplitType, homePage, homeFeaturedSection, homeGoalSectionTunnelTitle, footerSection, routeManager, properties, resize, projectDetailsSection, pagesManager } = ctx;
  api.getHomeRoot = () => homePage.domContainer;
  api.prepareCopy = () => {
    const roots = [document, homePage.domContainer].filter(Boolean);
    const nodes = new Set(roots.flatMap(root => [...root.querySelectorAll('*')]));
    SplitType.revert([...nodes]);
  };
  api.refreshCopy = () => {
    const y = api.getScroll();
    const list = homeFeaturedSection.projectItemList;
    for (const item of list?.projectItemList || []) {
      item.domFooterLine1Text = item.domFooterLine1.textContent;
      item.domFooterLine2Text = item.domFooterLine2.textContent;
      item.domFooterLine1Time = item.domFooterLine2Time = 0;
      item.domFooterLine2List = [];
      item.domFooterLine2.replaceChildren();
      for (const char of item.domFooterLine2Text) {
        const column = document.createElement('div');
        column.className = 'project-item-line-2-inner-list';
        Object.assign(column.style, { display: 'flex', flexDirection: 'column', transform: 'translateY(-400%)' });
        if (char === ' ') column.style.width = '.3em';
        else for (let i=0;i<4;i++) { const span=document.createElement('span');span.textContent=char;column.append(span); }
        item.domFooterLine2.append(column);item.domFooterLine2List.push(column);
      }
    }
    if (homePage.domContainer) homeGoalSectionTunnelTitle.init(homePage.domContainer);
    for (const parent of footerSection.middleContainers || []) {
      for (const wrapper of [...parent.children]) if (wrapper.className.endsWith('-wrapper')) wrapper.replaceWith(...wrapper.childNodes);
      parent._words = [];
    }
    footerSection._splitText();
    routeManager.queryStr = location.search.slice(1);
    routeManager.currRoute.title = document.title;
    resize();
    api.restoreScroll(y);
    document.documentElement.dataset.languageUpdate = String(Number(document.documentElement.dataset.languageUpdate || 0) + 1);
  };
  api.routeState = () => ({path:routeManager.currPath, idle:pagesManager.isIdle});
  api.setCatalogueOpen = open => {
    if (projectDetailsSection.scrollPane) projectDetailsSection.scrollPane.isActive = !open;
  };
  api.backToCatalogues = () => document.getElementById('header-center-project-back-btn').click();
}

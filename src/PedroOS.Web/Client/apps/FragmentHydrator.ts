import type { WindowRecord, IWindowManager } from '../types/index.js';

export function hydrateWindowFragment(windowEl: HTMLElement, record: WindowRecord, wm: IWindowManager): void {
  // 1. Projects App Hydration
  const projectsApp = windowEl.querySelector('[data-projects-app]');
  if (projectsApp) {
    const iconsBtn = projectsApp.querySelector<HTMLButtonElement>('[data-projects-view="icons"]');
    const detailsBtn = projectsApp.querySelector<HTMLButtonElement>('[data-projects-view="details"]');
    const grid = projectsApp.querySelector<HTMLElement>('.projects-section');
    const moreGrid = projectsApp.querySelector<HTMLElement>('.projects-section:nth-of-type(2)');
    const table = projectsApp.querySelector<HTMLElement>('[data-projects-table]');

    iconsBtn?.addEventListener('click', () => {
      iconsBtn.classList.add('active');
      iconsBtn.setAttribute('aria-pressed', 'true');
      detailsBtn?.classList.remove('active');
      detailsBtn?.setAttribute('aria-pressed', 'false');
      if (grid) grid.hidden = false;
      if (moreGrid) moreGrid.hidden = false;
      if (table) table.hidden = true;
    });

    detailsBtn?.addEventListener('click', () => {
      detailsBtn.classList.add('active');
      detailsBtn.setAttribute('aria-pressed', 'true');
      iconsBtn?.classList.remove('active');
      iconsBtn?.setAttribute('aria-pressed', 'false');
      if (grid) grid.hidden = true;
      if (moreGrid) moreGrid.hidden = true;
      if (table) table.hidden = false;
    });
  }

  // 2. System Properties App Hydration
  const syspropsApp = windowEl.querySelector('[data-sysprops-app]');
  if (syspropsApp) {
    const tabs = syspropsApp.querySelectorAll<HTMLElement>('[data-sysprops-tab]');
    const panels = syspropsApp.querySelectorAll<HTMLElement>('[data-sysprops-panel]');

    const selectTab = (tabId: string): void => {
      tabs.forEach((t) => {
        const isMatch = t.dataset.syspropsTab === tabId;
        t.setAttribute('aria-selected', String(isMatch));
        t.tabIndex = isMatch ? 0 : -1;
      });
      panels.forEach((p) => {
        p.hidden = p.dataset.syspropsPanel !== tabId;
      });
    };

    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        if (t.dataset.syspropsTab) selectTab(t.dataset.syspropsTab);
      });
    });

    // Check if initial tab passed in args
    if (record.args.tab) {
      selectTab(record.args.tab);
    }

    // Device Manager tree inspector
    const skillBtns = syspropsApp.querySelectorAll<HTMLButtonElement>('[data-skill-select]');
    const titleEl = syspropsApp.querySelector<HTMLElement>('[data-inspector-title]');
    const driverEl = syspropsApp.querySelector<HTMLElement>('[data-inspector-driver]');
    const usageEl = syspropsApp.querySelector<HTMLElement>('[data-inspector-usage]');
    const casesEl = syspropsApp.querySelector<HTMLElement>('[data-inspector-cases]');

    skillBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        skillBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (titleEl) titleEl.textContent = btn.dataset.skillName || '';
        if (driverEl) driverEl.textContent = btn.dataset.skillDriver || '';
        if (usageEl) usageEl.textContent = btn.dataset.skillUsage || '';
        if (casesEl) {
          const rawCases = btn.dataset.skillCases ? btn.dataset.skillCases.split('||') : [];
          casesEl.innerHTML = rawCases.map((c) => `<li>${c}</li>`).join('');
        }
      });
    });
  }

  // 3. Resume App Hydration
  const resumeApp = windowEl.querySelector('[data-resume-app]');
  if (resumeApp) {
    const printBtn = resumeApp.querySelector<HTMLButtonElement>('[data-resume-print]');
    printBtn?.addEventListener('click', () => {
      window.print();
    });

    if (record.args.section) {
      const targetSec = resumeApp.querySelector(`#resume-${record.args.section}`);
      targetSec?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 4. Delegate click on buttons that open other apps inside the fragment
  windowEl.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-open-app]');
    if (btn?.dataset.openApp) {
      ev.preventDefault();
      const appId = btn.dataset.openApp;
      const slug = btn.dataset.argSlug;
      const path = btn.dataset.argPath;
      const section = btn.dataset.argSection;
      const args: Record<string, string> = {};
      if (slug) args.slug = slug;
      if (path) args.path = path;
      if (section) args.section = section;
      wm.open(appId, { args });
    }

    const bsodBtn = (ev.target as HTMLElement).closest('[data-trigger-bsod]');
    if (bsodBtn) {
      document.getElementById('bsod-overlay')?.removeAttribute('hidden');
    }
  });
}

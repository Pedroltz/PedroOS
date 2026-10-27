import { hydrateWelcome } from '../components/Welcome.js';
import { requestSystemFailure } from '../components/SystemFailure.js';
import { hydrateSystemInfo } from '../components/SystemInfo.js';
import { hydrateProjectGallery } from '../components/ProjectGallery.js';
import type { WindowRecord, IWindowManager } from '../types/index.js';

const delegatedWindows = new WeakSet<HTMLElement>();

export function hydrateWindowFragment(windowEl: HTMLElement, record: WindowRecord, wm: IWindowManager): void {
  const welcome = windowEl.querySelector<HTMLElement>('[data-welcome-app]');
  if (welcome) hydrateWelcome(welcome);

  const project = windowEl.querySelector<HTMLElement>('[data-project-details]');
  if (project) hydrateProjectGallery(project);

  const info = windowEl.querySelector<HTMLElement>('[data-info-tabs]');
  if (info) hydrateSystemInfo(info, record.args.tab);

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
  if (delegatedWindows.has(windowEl)) return;
  delegatedWindows.add(windowEl);
  windowEl.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('[data-close-fragment]')) {
      wm.close(record.id);
      return;
    }
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-open-app]');
    if (btn?.dataset.openApp) {
      ev.preventDefault();
      const appId = btn.dataset.openApp;
      const slug = btn.dataset.argSlug;
      const path = btn.dataset.argPath;
      const section = btn.dataset.argSection;
      const command = btn.dataset.argCommand;
      const args: Record<string, string> = {};
      if (slug) args.slug = slug;
      if (path) args.path = path;
      if (section) args.section = section;
      if (btn.dataset.argTab) args.tab = btn.dataset.argTab;
      if (btn.dataset.argUrl) args.url = btn.dataset.argUrl;
      if (command === '2091') args.command = command;
      if (btn.hasAttribute('data-close-before-open')) wm.close(record.id);
      wm.open(appId, { args });
    }

    const bsodBtn = (ev.target as HTMLElement).closest('[data-trigger-bsod]');
    if (bsodBtn) {
      requestSystemFailure();
    }
  });
}

/** Shared, idempotent controller for the classic system dialogs. */
const controllers = new WeakMap<HTMLElement, (id: string, focus?: boolean) => void>();
let nextId = 0;

export function hydrateSystemInfo(root: HTMLElement, initialTab?: string): void {
  let select = controllers.get(root);
  if (!select) {
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-info-tab]')];
    const panels = [...root.querySelectorAll<HTMLElement>('[data-info-panel]')];
    const prefix = `system-info-${++nextId}`;
    tabs.forEach((tab, index) => {
      const panel = panels.find(item => item.dataset.infoPanel === tab.dataset.infoTab);
      tab.id = `${prefix}-tab-${index}`;
      if (panel) {
        panel.id = `${prefix}-panel-${index}`;
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;
      }
    });
    select = (id, focus = false): void => {
      const selected = tabs.find(tab => tab.dataset.infoTab === (id === 'dev' ? 'development' : id)) ?? tabs[0];
      if (!selected) return;
      tabs.forEach(tab => {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.infoPanel !== selected.dataset.infoTab; });
      const status = root.querySelector('[data-info-status]');
      if (status) status.textContent = selected.getAttribute('aria-label') ?? selected.textContent;
      if (focus) { selected.focus(); selected.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    };
    const activate = select;
    controllers.set(root, activate);
    root.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const tab = target.closest<HTMLElement>('[data-info-tab], [data-info-go]');
      if (tab) activate(tab.dataset.infoTab ?? tab.dataset.infoGo ?? 'general', !!tab.dataset.infoGo);
      const skill = target.closest<HTMLButtonElement>('[data-skill-select]');
      if (skill) {
        const template = [...root.querySelectorAll<HTMLTemplateElement>('[data-skill-template]')]
          .find(item => item.dataset.skillTemplate === skill.dataset.skillSelect);
        const inspector = root.querySelector<HTMLElement>('[data-skill-inspector]');
        if (template && inspector) {
          root.querySelectorAll('[data-skill-select]').forEach(button => button.setAttribute('aria-pressed', String(button === skill)));
          inspector.replaceChildren(template.content.cloneNode(true));
          inspector.scrollTop = 0;
        }
      }
    });
    root.addEventListener('keydown', event => {
      const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-info-tab]');
      if (tab) {
        const index = tabs.indexOf(tab);
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next !== -1) { event.preventDefault(); activate(tabs[next].dataset.infoTab ?? 'general', true); }
      }
      const tree = (event.target as HTMLElement).closest<HTMLElement>('.system-device-tree');
      if (tree && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        const items = [...tree.querySelectorAll<HTMLElement>('summary, [data-skill-select]')].filter(item => item.getClientRects().length > 0);
        const index = items.indexOf(event.target as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        event.preventDefault(); items[next]?.focus();
      }
    });
    activate(initialTab ?? 'general');
  } else if (initialTab) select(initialTab);
}

/** Shared mouse, keyboard and focus behavior for the classic application menus. */
export function mountClassicMenu(container: HTMLElement): { close(): void; dispose(): void } {
  const bar = container.querySelector<HTMLElement>('.win95-menubar');
  const abort = new AbortController();
  const { signal } = abort;
  const triggers = bar ? [...bar.querySelectorAll<HTMLButtonElement>('.win95-menu-btn')].filter(button => button.nextElementSibling?.matches('.win95-menu-dropdown, .ie-menu-popup')) : [];
  let active: HTMLButtonElement | undefined;
  let previousFocus: HTMLElement | null = null;
  const popup = (button: HTMLButtonElement): HTMLElement => button.nextElementSibling as HTMLElement;
  const items = (button: HTMLButtonElement): HTMLButtonElement[] => [...popup(button).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const close = (): void => {
    for (const button of triggers) {
      button.classList.remove('active'); button.parentElement?.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
      const menu = popup(button); menu.hidden = true; menu.classList.remove('open');
    }
    active = undefined;
  };
  for (const button of triggers) {
    button.setAttribute('role', 'menuitem'); button.setAttribute('aria-haspopup', 'menu');
    button.tabIndex = button === triggers[0] ? 0 : -1;
    const menu = popup(button);
    menu.classList.add('classic-menu-popup'); menu.setAttribute('aria-label', button.textContent?.trim() || 'Menu');
    menu.querySelectorAll('li').forEach(li => li.setAttribute('role', li.classList.contains('win95-dropdown-separator') ? 'separator' : 'none'));
    menu.querySelectorAll('button').forEach(item => { if (!item.hasAttribute('role')) item.setAttribute('role', 'menuitem'); item.tabIndex = -1; });
  }
  close();
  const open = (button: HTMLButtonElement, focus: 'first' | 'last' | false = false): void => {
    if (!active) previousFocus = document.activeElement as HTMLElement;
    close(); active = button;
    triggers.forEach(trigger => { trigger.tabIndex = trigger === button ? 0 : -1; });
    button.classList.add('active'); button.parentElement?.classList.add('active'); button.setAttribute('aria-expanded', 'true');
    const menu = popup(button);
    menu.hidden = false; menu.classList.add('open'); menu.style.left = '0px'; menu.style.right = 'auto';
    const bounds = container.getBoundingClientRect();
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(0, bounds.right - rect.right - 2)}px`;
    menu.style.maxHeight = `${Math.max(40, Math.min(bounds.bottom, innerHeight - 30) - rect.top - 3)}px`;
    if (focus) { const entries = items(button); entries[focus === 'first' ? 0 : entries.length - 1]?.focus(); }
  };
  bar?.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.win95-menu-btn');
    if (button && triggers.includes(button)) {
      event.stopPropagation();
      if (active === button) close(); else open(button);
    } else if (target.closest('button:not(:disabled)')) close();
  }, { signal });
  bar?.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch' || !active) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.win95-menu-btn');
    if (button && triggers.includes(button) && button !== active) { open(button); button.focus(); }
    const item = (event.target as HTMLElement).closest<HTMLButtonElement>('.classic-menu-popup button');
    if (item && active) (item.disabled ? active : item).focus({ preventScroll: true });
  }, { signal });
  document.addEventListener('pointerdown', event => { if (!bar?.contains(event.target as Node)) close(); }, { signal });
  container.addEventListener('focusout', event => { if (event.relatedTarget && !bar?.contains(event.relatedTarget as Node)) close(); }, { signal });
  window.addEventListener('resize', close, { signal });
  document.addEventListener('keydown', event => {
    if (!triggers.length || container.querySelector('dialog[open]')) return;
    const target = event.target as HTMLElement;
    const inBar = bar?.contains(target);
    const focusedWindow = container.closest('.os-window')?.classList.contains('active');
    if (!inBar && !focusedWindow) return;
    const button = target.closest<HTMLButtonElement>('.win95-menu-btn');
    const owner = button && triggers.includes(button) ? button : active;
    let handled = true;
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1) {
      const match = triggers.find(trigger => (trigger.querySelector('u')?.textContent || (trigger.dataset.ieMenu === 'Favoritos' ? 'a' : trigger.textContent?.trim().charAt(0)))?.toLowerCase() === event.key.toLowerCase());
      if (match) open(match, 'first'); else handled = false;
    } else if (event.key === 'F10' && !event.shiftKey) {
      if (active) { close(); previousFocus?.focus(); } else { previousFocus = document.activeElement as HTMLElement; triggers[0].focus(); }
    } else if (!inBar) handled = false;
    else if (event.key === 'Escape') { close(); (owner || previousFocus)?.focus(); }
    else if (event.key === 'Tab') { close(); handled = false; }
    else if (owner && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const next = triggers[(triggers.indexOf(owner) + (event.key === 'ArrowRight' ? 1 : triggers.length - 1)) % triggers.length];
      if (active) open(next, 'first'); else { triggers.forEach(trigger => { trigger.tabIndex = trigger === next ? 0 : -1; }); next.focus(); }
    } else if (owner && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      if (target === owner) open(owner, event.key === 'ArrowUp' || event.key === 'End' ? 'last' : 'first');
      else {
        const entries = items(owner); const at = entries.indexOf(target as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : (at + (event.key === 'ArrowUp' ? entries.length - 1 : 1)) % entries.length;
        entries[next]?.focus();
      }
    } else if (active && event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      const matches = items(active).filter(item => item.querySelector('u')?.textContent?.toLowerCase() === event.key.toLowerCase());
      if (matches.length === 1) matches[0].click(); else handled = false;
    } else handled = false;
    if (handled) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true, signal });
  return { close, dispose: () => { close(); abort.abort(); } };
}

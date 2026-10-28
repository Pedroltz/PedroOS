import { secrets } from '../core/SecretSession.js';
import type { DesktopStore } from '../core/DesktopStore.js';
import { ScreenSaver } from './ScreenSaver.js';

export function mountDesktopSecrets(store: DesktopStore): void {
  const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let position = 0, lastKey = 0, applied = false;
  const update = (): void => {
    const disk = document.getElementById('icon-secret-disk');
    if (disk) disk.hidden = !secrets.disk;
    if (secrets.arcade && !applied) {
      applied = true;
      store.setWallpaper('arcade');
    }
  };
  secrets.subscribe(update);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) {
      position = 0;
      return;
    }
    if (!document.getElementById('bsod-overlay')?.hidden || document.querySelector('[data-screen-saver]:not([hidden])')) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (Date.now() - lastKey > 5000) position = 0;
    lastKey = Date.now();
    position = key === sequence[position] ? position + 1 : key === sequence[0] ? 1 : 0;
    if (position === sequence.length) { position = 0; secrets.unlockArcade(); }
  });
  new ScreenSaver(store, secrets).mount();
  update();
}

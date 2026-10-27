import { DesktopStore } from '../core/DesktopStore.js';
import { WindowPressure } from '../core/WindowPressure.js';

const eventName = 'pedroos:system-failure';
const failures = [
  {
    code: 'MEMORY_ALLOCATION_FAILURE',
    message: 'Memória insuficiente para executar esta operação.',
    detail: 'O gerenciador de memória não conseguiu reservar espaço para outro aplicativo. O sistema interrompeu a operação em VMM(01) + 00001995.',
  },
  {
    code: 'SYSTEM_RESOURCES_EXHAUSTED',
    message: 'Os recursos do sistema estão esgotados.',
    detail: 'Não há recursos disponíveis para criar novas janelas ou controles. Uma exceção 0E ocorreu em 0028:C0011E36 no módulo USER(01).',
  },
  {
    code: 'VIRTUAL_MEMORY_ERROR',
    message: 'Falha no gerenciamento da memória virtual.',
    detail: 'O sistema não conseguiu concluir uma solicitação de paginação. Uma exceção 0E ocorreu em 0028:C0034A20 no módulo VMM(06).',
  },
];

export function requestSystemFailure(): void {
  window.dispatchEvent(new Event(eventName));
}

export function mountSystemFailure(store: DesktopStore): void {
  const overlay = document.getElementById('bsod-overlay');
  if (!overlay) return;
  const pressure = new WindowPressure();
  let previousFocus: HTMLElement | null = null;
  const inertStates = new Map<HTMLElement, boolean>();

  const show = (): void => {
    if (!overlay.hidden) return;
    const failure = failures[Math.floor(Math.random() * failures.length)];
    overlay.querySelector<HTMLElement>('[data-bsod-code]')!.textContent = failure.code;
    overlay.querySelector<HTMLElement>('[data-bsod-message]')!.textContent = failure.message;
    overlay.querySelector<HTMLElement>('[data-bsod-detail]')!.textContent = failure.detail;
    overlay.querySelector<HTMLElement>('[data-bsod-windows]')!.textContent = `Aplicativos abertos: ${store.getAllWindows().length}.`;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const desktop = document.getElementById('desktop');
    for (const child of desktop?.children ?? []) {
      if (child instanceof HTMLElement && child !== overlay) {
        inertStates.set(child, child.inert);
        child.inert = true;
      }
    }
    overlay.hidden = false;
    overlay.focus({ preventScroll: true });
  };
  const recover = (): void => {
    overlay.hidden = true;
    for (const [element, wasInert] of inertStates) element.inert = wasInert;
    inertStates.clear();
    pressure.recover();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };

  store.subscribe(event => {
    if (event.type !== 'window-opened' || !overlay.hidden) return;
    if (pressure.shouldFail(store.getAllWindows().length)) show();
  });
  window.addEventListener(eventName, show);
  window.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;
    recover();
  }, true);
  overlay.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    recover();
  });
}

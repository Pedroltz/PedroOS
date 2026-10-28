/* PedroOS classic game document lifecycle. Original PedroOS code, MIT. */
'use strict';
(() => {
  const session = new URLSearchParams(location.search).get('session');
  const report = (type, text) => parent.postMessage({ source: 'pedroos-retro', session, type, text }, location.origin);
  const nativeTimeout = window.setTimeout.bind(window), nativeClear = window.clearTimeout.bind(window);
  const nativeRaf = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  const timers = new Map(), frames = new Map(), contexts = new Set(), held = new Set();
  let next = 0, frozen = false, desiredPaused = true, engine = null, ready = false;

  // DOSBox's async main loop uses timers as well as rAF. Stop both while its
  // document is inactive; keep remaining delays so restoring does not replay work.
  const arm = item => {
    if (frozen) return;
    item.due = performance.now() + item.remaining;
    item.handle = nativeTimeout(() => {
      if (!timers.has(item.id)) return;
      if (!item.interval) timers.delete(item.id);
      item.callback(...item.args);
      if (item.interval && timers.has(item.id)) { item.remaining = item.delay; arm(item); }
    }, item.remaining);
  };
  const schedule = (callback, delay = 0, interval = false, args = []) => {
    if (typeof callback !== 'function') throw new TypeError('A timer callback must be a function');
    const item = { id: ++next, callback, args, delay: Math.max(0, Number(delay) || 0), interval, handle: null };
    item.remaining = item.delay;
    timers.set(item.id, item); arm(item);
    return item.id;
  };
  window.setTimeout = (fn, delay, ...args) => schedule(fn, delay, false, args);
  window.setInterval = (fn, delay, ...args) => schedule(fn, delay, true, args);
  window.clearTimeout = window.clearInterval = id => { const item = timers.get(id); if (item) nativeClear(item.handle); timers.delete(id); };
  // Emscripten DOSBox selects setImmediate for its emulation loop. Supply a
  // suspendable implementation before its loader installs a MessageChannel shim.
  window.setImmediate = (callback, ...args) => schedule(callback, 0, false, args);
  window.clearImmediate = window.clearTimeout;
  const armFrame = item => {
    if (frozen) return;
    item.handle = nativeRaf(time => { frames.delete(item.id); item.callback(time); });
  };
  window.requestAnimationFrame = callback => {
    const item = { id: ++next, callback, handle: null };
    frames.set(item.id, item); armFrame(item); return item.id;
  };
  window.cancelAnimationFrame = id => { const item = frames.get(id); if (item) nativeCancel(item.handle); frames.delete(id); };

  for (const name of ['AudioContext', 'webkitAudioContext']) {
    if (!window[name]) continue;
    window[name] = new Proxy(window[name], { construct(target, args) {
      const context = Reflect.construct(target, args);
      contexts.add(context);
      if (frozen) context.suspend().catch(() => {});
      return context;
    } });
  }
  const audio = () => {
    for (const context of contexts) {
      if (context.state === 'closed') continue;
      (frozen ? context.suspend() : context.resume()).catch(() => {});
    }
  };
  const key = (code, pressed) => {
    if (!engine || frozen && pressed) return;
    if (pressed) held.add(code); else held.delete(code);
    engine.key?.(code, pressed);
  };
  const release = () => { for (const code of [...held]) key(code, false); document.querySelectorAll('.pressed').forEach(button => button.classList.remove('pressed')); };
  const pause = value => {
    desiredPaused = value;
    if (!ready || value === frozen) return;
    release(); frozen = value;
    if (frozen) engine.pause?.(); else engine.resume?.();
    if (frozen) {
      for (const item of timers.values()) { nativeClear(item.handle); item.remaining = Math.max(0, item.due - performance.now()); }
      for (const item of frames.values()) nativeCancel(item.handle);
    } else {
      for (const item of timers.values()) arm(item);
      for (const item of frames.values()) armFrame(item);
    }
    audio();
    document.documentElement.dataset.gameState = frozen ? 'paused' : 'running';
  };
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = () => reject(new Error('Não foi possível carregar o jogo.'));
    document.head.appendChild(script);
  });
  const fail = error => {
    const loading = document.getElementById('loading');
    loading.hidden = false; loading.textContent = 'Não foi possível carregar o jogo. Feche a janela e tente novamente.';
    document.documentElement.dataset.gameState = 'error';
    report('error'); console.error(error);
  };
  const codes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, Space: 32, ShiftRight: 16, ControlLeft: 17, AltLeft: 18 };
  const domKey = (code, pressed) => {
    const canvas = document.querySelector('canvas');
    canvas.focus({ preventScroll: true });
    const event = new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
      code, key: code === 'Space' ? ' ' : code === 'ShiftRight' ? 'Shift' : code,
      keyCode: codes[code], which: codes[code], location: code === 'ShiftRight' ? 2 : 0,
      bubbles: true, cancelable: true,
    });
    canvas.dispatchEvent(event);
  };
  const memory = new Map();
  const storage = {
    getItem(name) { try { return localStorage.getItem(name); } catch { return memory.get(name) ?? null; } },
    setItem(name, value) { try { localStorage.setItem(name, value); } catch { memory.set(name, String(value)); } },
  };
  window.RetroBridge = {
    storage, loadScript, fail, domKey, report,
    get paused() { return frozen; },
    attach(adapter = {}) {
      if (ready) return;
      engine = adapter; ready = true;
      document.getElementById('loading').hidden = true;
      document.documentElement.dataset.gameState = 'running';
      pause(desiredPaused); report('ready');
      document.querySelector('canvas').focus({ preventScroll: true });
      audio();
    },
  };
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.source !== 'pedroos-retro-host') return;
    if (event.data.type === 'pause') pause(!!event.data.value);
  });
  document.addEventListener('pointerdown', () => { report('focus'); audio(); }, true);
  document.addEventListener('keydown', event => {
    if (event.altKey && event.key === 'F4') { event.preventDefault(); event.stopImmediatePropagation(); report('close'); }
  }, true);
  window.addEventListener('blur', release);
  document.querySelector('canvas').addEventListener('contextmenu', event => event.preventDefault());
  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('pressed');
      key(button.dataset.key, true); audio();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => { button.classList.remove('pressed'); key(button.dataset.key, false); });
  }
  window.addEventListener('error', event => fail(event.error ?? event.message));
  window.addEventListener('unhandledrejection', event => fail(event.reason));
  report('loaded');
})();

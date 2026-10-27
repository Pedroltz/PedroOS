/* PedroOS Doom player. SPDX-License-Identifier: GPL-2.0-or-later.
 * The unmodified GPL engine is isolated in this document and loaded on demand.
 */
'use strict';
(() => {
  const canvas = document.getElementById('canvas');
  const message = document.getElementById('message');
  const held = new Set();
  let started = false;
  let paused = false;
  let muted = false;
  let launched = false;
  let runMain;
  const session = new URLSearchParams(location.search).get('session');
  const report = (type, extra = {}) => parent.postMessage({ source: 'pedroos-doom', session, type, ...extra }, location.origin);
  const keyCodes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, ControlLeft: 17, Space: 32, ShiftLeft: 16, Escape: 27, Enter: 13, Comma: 188, Period: 190, Digit1: 49, Digit2: 50, Digit3: 51, Tab: 9 };
  function sendKey(type, code) {
    const keyCode = keyCodes[code];
    if (!keyCode) return;
    const event = new KeyboardEvent(type, { key: code === 'Space' ? ' ' : code, code, keyCode, which: keyCode, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { get: () => keyCode });
    Object.defineProperty(event, 'which', { get: () => keyCode });
    document.dispatchEvent(event);
  }
  function releaseKeys() {
    held.forEach(code => sendKey('keyup', code)); held.clear();
    document.querySelectorAll('.pressed').forEach(button => button.classList.remove('pressed'));
  }
  function audio() {
    const context = window.Module?.SDL2?.audioContext;
    if (context) (muted || paused ? context.suspend() : context.resume()).catch(() => {});
  }
  function setPaused(value) {
    paused = value;
    releaseKeys();
    if (launched) {
      if (paused) window.Module.pauseMainLoop(); else window.Module.resumeMainLoop();
      message.hidden = !paused;
      message.textContent = 'Jogo pausado';
    }
    audio();
  }
  const fitCanvas = () => {
    const area = document.getElementById('screen');
    const width = Math.min(area.clientWidth, area.clientHeight * 4 / 3);
    canvas.style.setProperty('width', `${width}px`, 'important');
    canvas.style.setProperty('height', `${width * 3 / 4}px`, 'important');
  };
  const observer = new ResizeObserver(fitCanvas);
  observer.observe(document.getElementById('screen'));
  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (!launched || paused) return;
      button.setPointerCapture(event.pointerId);
      const code = button.dataset.key;
      held.add(code); button.classList.add('pressed'); sendKey('keydown', code); audio();
    });
    const release = () => {
      const code = button.dataset.key;
      if (held.delete(code)) sendKey('keyup', code);
      button.classList.remove('pressed');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); sendKey('keydown', button.dataset.key); }
    });
    button.addEventListener('keyup', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sendKey('keyup', button.dataset.key); }
    });
  });
  window.addEventListener('blur', releaseKeys);
  document.addEventListener('pointerdown', () => report('focus'));
  canvas.addEventListener('pointerdown', () => { canvas.focus(); audio(); });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('keydown', event => {
    if (event.altKey && event.key === 'F4') { event.preventDefault(); event.stopImmediatePropagation(); report('close'); }
    else if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'b') { event.preventDefault(); event.stopImmediatePropagation(); report('bsod'); }
  }, true);

  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.source !== 'pedroos-doom-host') return;
    const data = event.data;
    if (data.type === 'pause') { setPaused(!!data.value); return; }
    if (data.type === 'mute') { muted = !!data.value; audio(); return; }
    if (data.type !== 'start' || started) return;
    started = true;
    const custom = data.wad instanceof ArrayBuffer ? new Uint8Array(data.wad) : null;
    const filename = custom ? String(data.name).replace(/[^a-zA-Z0-9._-]/g, '_') : 'freedoom1.wad';
    const fail = () => { message.hidden = false; message.textContent = 'Não foi possível iniciar o jogo. Feche e tente novamente.'; report('error'); };
    window.addEventListener('error', fail);
    window.addEventListener('unhandledrejection', fail);
    window.Module = {
      canvas, noInitialRun: true, noExitRuntime: true,
      locateFile: file => new URL(file, location.href).href,
      print: text => { if (String(text).includes('Error:')) fail(); },
      printErr: text => console.info('[DOOM]', text),
      setStatus: text => { if (!launched && text) message.textContent = 'Carregando o jogo...'; },
      onAbort: fail,
      preRun: () => {
        const fs = window.Module.FS;
        fs.mkdir('/savefiles');
        if (custom) fs.writeFile(filename, custom);
        else fs.createPreloadedFile('', filename, new URL(filename, location.href).href, true, true);
        fs.writeFile('default.cfg', 'fullscreen 0\ngrabmouse 0\nuse_mouse 0\nwindow_width 640\nwindow_height 480\nkey_up 200\nkey_down 208\nkey_left 203\nkey_right 205\nkey_strafeleft 51\nkey_straferight 52\nkey_fire 29\nkey_use 57\nkey_speed 42\nsnd_sfxdevice 3\nsfx_volume 8\n');
      },
      onRuntimeInitialized: () => {
        report('ready');
        message.textContent = 'Clique ou toque para iniciar e ativar o som';
        runMain = () => {
          if (launched) return;
          try {
            window.callMain(['-iwad', filename, '-window', '-nogui', '-nomusic', '-config', 'default.cfg', '-savedir', '/savefiles']);
          } catch (error) {
            if (!String(error).includes('unwind') && !String(error).includes('SimulateInfiniteLoop')) { fail(); return; }
          }
          launched = true; message.hidden = true; fitCanvas(); requestAnimationFrame(fitCanvas);
          canvas.focus(); audio(); report('running');
          if (paused) setPaused(true);
        };
        // A second gesture inside this document unlocks WebAudio consistently.
        document.addEventListener('pointerdown', runMain, { once: true });
        document.addEventListener('keydown', runMain, { once: true });
      },
    };
    const script = document.createElement('script');
    script.src = 'websockets-doom.js'; script.onerror = fail;
    document.body.append(script);
  });
  report('loaded');
})();

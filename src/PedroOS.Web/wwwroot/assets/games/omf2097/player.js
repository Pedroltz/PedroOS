'use strict';
document.getElementById('start').addEventListener('click', async () => {
  const bridge = window.RetroBridge, canvas = document.getElementById('canvas');
  document.getElementById('loading').textContent = 'Carregando One Must Fall 2097…';
  try {
    await bridge.loadScript('js-dos.js');
    const response = await fetch('wdosbox.wasm');
    if (!response.ok) throw new Error('DOSBox indisponível');
    const wasm = await WebAssembly.compile(await response.arrayBuffer());
    await bridge.loadScript('wdosbox.js');
    // Preload the published module through ordinary scripts; the legacy js-dos
    // loader's eval branch is never needed, so CSP can stay restricted to WASM.
    window.exports.instantiateWasm = (imports, receiveInstance) => {
      imports.env.globalscall = () => {};
      return WebAssembly.instantiate(wasm, imports).then(instance => receiveInstance(instance, wasm));
    };
    const runtime = await window.Dos(canvas, { wdosboxUrl: 'wdosbox.js', onprogress: () => {}, onerror: bridge.fail });
    await runtime.fs.extract('game.zip');
    runtime.fs.createFile('dosbox.conf', '[sdl]\nautolock=false\n[render]\nframeskip=0\n[cpu]\ncore=auto\ncycles=fixed 20000\n[mixer]\nrate=22050\n[sblaster]\nsbtype=sb16\nsbbase=220\nirq=7\ndma=1\nhdma=5\n');
    const ci = await runtime.main(['-conf', 'dosbox.conf', '-c', 'OMF.EXE']);
    // This DOSBox build yields via a private postMessage loop, independently of
    // browser timers. Hold its wakeup message while the host window is inactive.
    const receive = ci.dos.receive;
    let pendingSync = null;
    window.removeEventListener('message', receive, true);
    window.addEventListener('message', event => {
      if (event.source === window && event.data?.type === 'sync_sleep_message' && event.data.id === ci.dos.sync_id && bridge.paused) {
        pendingSync = event.data; event.stopImmediatePropagation(); return;
      }
      receive(event);
    }, true);
    const resize = () => {
      const screen = document.getElementById('screen');
      const width = Math.min(screen.clientWidth, screen.clientHeight * 4 / 3);
      if (canvas.style.width !== width + 'px') canvas.style.width = width + 'px';
      if (canvas.style.height !== width * 3 / 4 + 'px') canvas.style.height = width * 3 / 4 + 'px';
    };
    new ResizeObserver(resize).observe(document.getElementById('screen'));
    new MutationObserver(resize).observe(canvas, { attributes: true, attributeFilter: ['style', 'width', 'height'] });
    resize(); bridge.attach({ key: bridge.domKey, resume() {
      if (pendingSync) { window.postMessage(pendingSync, '*'); pendingSync = null; }
    } });
  } catch (error) { bridge.fail(error); }
}, { once: true });

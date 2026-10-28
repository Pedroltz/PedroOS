'use strict';
document.getElementById('start').addEventListener('click', async () => {
  const bridge = window.RetroBridge;
  const canvas = document.getElementById('canvas');
  document.getElementById('loading').textContent = 'Carregando OpenTyrian…';
  const resize = () => {
    const screen = document.getElementById('screen');
    const width = Math.min(screen.clientWidth, screen.clientHeight * 4 / 3);
    canvas.style.width = width + 'px'; canvas.style.height = width * 3 / 4 + 'px';
  };
  new ResizeObserver(resize).observe(document.getElementById('screen'));
  window.Module = {
    canvas, locateFile: file => new URL(file, location.href).href,
    print: () => {}, printErr: text => console.info('[OpenTyrian]', text),
    postRun: [() => { resize(); bridge.attach({ key: bridge.domKey }); }],
    onAbort: bridge.fail,
  };
  try { await bridge.loadScript('index.js'); } catch (error) { bridge.fail(error); }
}, { once: true });

'use strict';
document.getElementById('start').addEventListener('click', async () => {
  const bridge = window.RetroBridge;
  document.getElementById('loading').textContent = 'Preparando a pista…';
  try {
    await Promise.all(['sprite-characters.png', 'skifree-objects.png'].map(src => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = src;
    })));
    await bridge.loadScript('engine.js');
    const canvas = document.getElementById('skifree-canvas');
    // The upstream touch tap sets a target but may suppress the compatibility
    // click that starts movement. Make a first tap behave like its mouse click.
    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') canvas.dispatchEvent(new MouseEvent('click', {
        clientX: event.clientX, clientY: event.clientY, bubbles: true,
      }));
    });
    requestAnimationFrame(() => requestAnimationFrame(() => bridge.attach({ key: bridge.domKey })));
  } catch (error) { bridge.fail(error); }
}, { once: true });

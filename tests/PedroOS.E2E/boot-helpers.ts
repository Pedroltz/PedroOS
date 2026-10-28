import type { Page } from '@playwright/test';

export type BootWindow = Window & { bootAudio: HTMLAudioElement | null; bootAttempts: number; bootError: string; bootEnded: boolean };

export async function observeAudio(page: Page, denyStartup = false) {
  await page.addInitScript(denyStartup => {
    const state = window as unknown as BootWindow;
    Object.assign(state, { bootAudio: null, bootAttempts: 0, bootError: '', bootEnded: false });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('windows-95-startup.wav')) {
        state.bootAudio = this;
        state.bootAttempts++;
        this.addEventListener('ended', () => { state.bootEnded = true; });
      }
      const result = denyStartup && this.src.includes('windows-95-startup.wav')
        ? Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError')) : play.call(this);
      void result.catch(error => { state.bootError = error.name; });
      return result;
    };
  }, denyStartup);
}

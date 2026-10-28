import { withBase } from './BasePath.js';

/**
 * Optional retro sound synthesizer using Web Audio API.
 * Never throws if AudioContext is unavailable or blocked.
 */
export class SoundEffects {
  private enabled = true;
  private ctx: AudioContext | null = null;
  private startupAudio: HTMLAudioElement | null = null;
  private startupTimeout = 0;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopStartup();
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.playClick();
    }
    return this.enabled;
  }

  public playClick(): void {
    this.tone(880, 0.025, 'square', 0.03);
  }

  /** Best-effort autoplay, once at the desktop transition; never delays boot. */
  public playStartup(): void {
    if (!this.enabled || typeof document === 'undefined' || document.hidden) return;
    this.stopStartup();
    try {
      const audio = new Audio(withBase('/assets/boot/windows-95-startup.wav'));
      this.startupAudio = audio;
      audio.volume = 0.65;
      const stop = (): void => { if (this.startupAudio === audio) this.stopStartup(); };
      audio.addEventListener('ended', stop, { once: true });
      audio.addEventListener('error', stop, { once: true });
      this.startupTimeout = window.setTimeout(stop, 7500);
      void audio.play().catch(stop);
    } catch { this.stopStartup(); }
  }

  private stopStartup(): void {
    globalThis.clearTimeout(this.startupTimeout);
    const audio = this.startupAudio;
    this.startupAudio = null;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }

  public playOpen(): void {
    this.tone(523.25, 0.045, 'triangle', 0.04);
  }

  public playError(): void {
    this.tone(220, 0.12, 'sawtooth', 0.05);
  }

  public playWin(): void {
    this.tone(523.25, 0.07, 'triangle', 0.05);
    setTimeout(() => this.tone(659.25, 0.07, 'triangle', 0.05), 80);
    setTimeout(() => this.tone(783.99, 0.12, 'triangle', 0.05), 160);
  }

  private tone(freq: number, durationSec: number, type: OscillatorType, gainVal: number): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        return;
      }
      if (!this.ctx) {
        this.ctx = new AudioCtor();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = gainVal;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + durationSec);
    } catch {
      // Ignore audio restrictions in headless/automated browsers
    }
  }
}

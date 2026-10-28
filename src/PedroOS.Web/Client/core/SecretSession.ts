/** Discoveries intentionally last only until the page is reloaded. */
export class SecretSession {
  public arcade = false;
  public disk = false;
  public saver = { enabled: true, minutes: 2 };
  private readonly listeners = new Set<(event: 'changed' | 'preview') => void>();

  public subscribe(listener: (event: 'changed' | 'preview') => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: 'changed' | 'preview'): void {
    for (const listener of this.listeners) listener(event);
  }

  public unlockArcade(): void {
    if (this.arcade) return;
    this.arcade = true;
    this.disk = true;
    this.emit('changed');
  }

  public visit(path: string): void {
    if (!/^c:\\segredos\\disquete(?:\\|$)/i.test(path) || this.disk) return;
    this.disk = true;
    this.emit('changed');
  }

  public configureSaver(enabled: boolean, minutes: number): void {
    this.saver = { enabled, minutes: [1, 2, 5].includes(minutes) ? minutes : 2 };
    this.emit('changed');
  }

  public preview(): void { this.emit('preview'); }
}

export const secrets = new SecretSession();

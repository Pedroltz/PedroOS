export const WELCOME_PREFERENCE_KEY = 'pedroos.welcome.v1';

/** Keep the current visit usable even when browser storage is unavailable. */
export class WelcomePreference {
  private value: boolean | undefined;

  public constructor(private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {}

  public read(): boolean {
    if (this.value !== undefined) return this.value;
    this.value = true;
    try {
      const saved: unknown = JSON.parse(this.storage().getItem(WELCOME_PREFERENCE_KEY) ?? 'null');
      if (saved && typeof saved === 'object' && 'showOnStartup' in saved && typeof saved.showOnStartup === 'boolean') {
        this.value = saved.showOnStartup;
      }
    } catch { /* Default to showing the welcome window. */ }
    return this.value;
  }

  public set(showOnStartup: boolean): void {
    this.value = showOnStartup;
    try { this.storage().setItem(WELCOME_PREFERENCE_KEY, JSON.stringify({ showOnStartup })); }
    catch { /* Preserve the preference in memory for this visit. */ }
  }
}

export const welcomePreference = new WelcomePreference();

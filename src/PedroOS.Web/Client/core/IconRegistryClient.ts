import type { IconManifestEntry } from '../types/index.js';

export class IconRegistryClient {
  private readonly entries = new Map<string, IconManifestEntry>();
  private readonly basePath = '/assets/icons';

  public constructor(manifest: Record<string, IconManifestEntry> = {}) {
    for (const [key, value] of Object.entries(manifest)) {
      this.entries.set(key.toLowerCase(), value);
    }
  }

  public getPath(key: string, size: 16 | 32 | 48 = 32): string {
    const normalizedSize = size <= 16 ? 16 : size <= 32 ? 32 : 48;
    const safeKey = (key || '').toLowerCase();
    if (/^[a-z0-9-]+$/.test(safeKey)) {
      const entry = this.entries.get(safeKey);
      if (entry) {
        return `${this.basePath}/${entry.category}/${safeKey}-${normalizedSize}.png`;
      }
    }
    return `${this.basePath}/system/exe-${normalizedSize}.png`;
  }

  public getGlyphPath(name: string): string {
    const safe = (name || '').toLowerCase();
    if (/^[a-z0-9-]+$/.test(safe)) {
      return `${this.basePath}/ui/px-${safe}.svg`;
    }
    return `${this.basePath}/ui/px-file.svg`;
  }
}

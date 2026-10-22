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
        const available = [...entry.sizes].sort((a, b) => Math.abs(a - normalizedSize) - Math.abs(b - normalizedSize));
        const variant = (available[0] ?? normalizedSize) as 16 | 32 | 48;
        return entry.variants?.[variant] ?? `${this.basePath}/${entry.category}/${safeKey}-${variant}.png`;
      }
    }
    return this.entries.get('exe')?.variants?.[normalizedSize]
      ?? `${this.basePath}/system/exe-${normalizedSize}.png`;
  }

  /** Shared markup renderer: dimensions and fallback always come from the registry. */
  public render(key: string, size: 16 | 32 | 48 = 32, className = 'pixel-icon', alt = ''): string {
    const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    return `<img class="${escape(className)}" src="${escape(this.getPath(key, size))}" width="${size}" height="${size}" alt="${escape(alt)}" draggable="false" />`;
  }

  public create(key: string, size: 16 | 32 | 48 = 32, className = 'pixel-icon'): HTMLImageElement {
    const img = document.createElement('img');
    img.className = className;
    img.width = img.height = size;
    img.alt = '';
    img.draggable = false;
    img.src = this.getPath(key, size);
    return img;
  }

  public getGlyphPath(name: string): string {
    const raw = (name || '').toLowerCase();
    const aliasMap: Record<string, string> = {
      paste: 'clipboard',
      delete: 'trash',
      properties: 'sliders',
      views: 'layout',
      details: 'card-text',
      list: 'bulletlist',
      icons: 'grid-3x3',
    };
    const safe = aliasMap[raw] || raw;
    return this.getPath(this.entries.has(`glyph-${safe}`) ? `glyph-${safe}` : 'glyph-file', 16);
  }
}

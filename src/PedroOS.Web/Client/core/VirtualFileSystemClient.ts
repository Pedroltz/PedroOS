import { localizeVirtualPath } from './VirtualPathAliases.js';
import type { VirtualNode } from '../types/index.js';

/**
 * Client-side Virtual File System resolver for Explorer.exe, Bloco de Notas.exe and Find.
 */
export class VirtualFileSystemClient {
  private readonly byPath = new Map<string, VirtualNode>();
  private readonly byId = new Map<string, VirtualNode>();
  private readonly hiddenPaths = new Set<string>();

  public constructor(private readonly root: VirtualNode) {
    this.index(root);
  }

  private index(node: VirtualNode, hiddenParent = false): void {
    const hidden = hiddenParent || !!node.hidden;
    if (hidden) this.hiddenPaths.add(node.path.toLowerCase());
    this.byPath.set(node.path.toLowerCase(), node);
    this.byId.set(node.id.toLowerCase(), node);
    if (node.children) {
      for (const child of node.children) {
        this.index(child, hidden);
      }
    }
  }

  public getRoot(): VirtualNode {
    return this.root;
  }

  public normalizePath(rawPath?: string): string {
    if (!rawPath || !rawPath.trim()) {
      return 'C:\\';
    }
    const cleaned = rawPath.trim().replace(/\//g, '\\');
    if (cleaned.includes('..') || cleaned.startsWith('\\\\')) {
      return '';
    }
    if (/^c:\\?$/i.test(cleaned)) {
      return 'C:\\';
    }
    if (!/^c:\\/i.test(cleaned)) {
      return '';
    }
    const parts = cleaned
      .slice(3)
      .split('\\')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.some((p) => p === '.' || p === '..')) {
      return '';
    }
    return parts.length === 0 ? 'C:\\' : `C:\\${parts.join('\\')}`;
  }

  public resolvePath(virtualPath?: string): VirtualNode | undefined {
    const normalized = this.normalizePath(virtualPath);
    if (!normalized) {
      return undefined;
    }
    return this.byPath.get(normalized.toLowerCase()) || this.byPath.get(localizeVirtualPath(normalized).toLowerCase());
  }

  public getParentPath(virtualPath: string): string {
    const normalized = this.normalizePath(virtualPath);
    if (!normalized || normalized === 'C:\\') {
      return 'C:\\';
    }
    const idx = normalized.lastIndexOf('\\');
    return idx <= 2 ? 'C:\\' : normalized.slice(0, idx);
  }

  public listDirectory(virtualPath: string, includeHidden = false): VirtualNode[] {
    const node = this.resolvePath(virtualPath);
    if (!node?.children) {
      return [];
    }
    return includeHidden ? [...node.children] : node.children.filter((c) => !c.hidden);
  }

  public listFoldersTree(includeHidden = false): VirtualNode[] {
    const out: VirtualNode[] = [];
    const visit = (n: VirtualNode): void => {
      if (!includeHidden && n.hidden) {
        return;
      }
      if (n.type === 'drive' || n.type === 'folder') {
        out.push(n);
        for (const child of n.children ?? []) {
          visit(child);
        }
      }
    };
    visit(this.root);
    return out;
  }

  public search(query: string, includeHidden = false): VirtualNode[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return [];
    }
    const results: VirtualNode[] = [];
    for (const node of this.byPath.values()) {
      if (node.type === 'drive') {
        continue;
      }
      if (!includeHidden && this.hiddenPaths.has(node.path.toLowerCase())) {
        continue;
      }
      if (
        node.name.toLowerCase().includes(q) ||
        node.path.toLowerCase().includes(q) ||
        (node.description && node.description.toLowerCase().includes(q))
      ) {
        results.push(node);
      }
    }
    return results;
  }
}

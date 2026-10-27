export interface FavoriteLink { label: string; url: string }
export interface BrowserPreferences { home: string; toolbar: boolean; address: boolean; status: boolean; textSize: number }
export interface BrowserVisit { url: string; title: string; date: string }
interface BrowserState { version: 1; favorites: FavoriteLink[]; preferences: BrowserPreferences; visits: BrowserVisit[] }
const KEY = 'pedroos.iexplore.v1';
const EVENT = 'pedroos:iexplore-state';
export const INTERNAL_PAGES = [
  ['home', 'Início do PedroOS'], ['projects', 'Projetos'], ['resume', 'Currículo'],
  ['skills', 'Competências'], ['links', 'Contatos'], ['credits', 'Créditos'],
];
export function normalizeAddress(raw: string): string {
  const value = raw.trim();
  const alias = value.toLowerCase().replace(/^\//, '');
  if (!value) return 'pedroos://home';
  if (INTERNAL_PAGES.some(([id]) => id === alias)) return `pedroos://${alias}`;
  if (alias === 'github' || alias === 'github.com/pedroltz') return 'https://github.com/Pedroltz';
  if (alias === 'linkedin' || alias === 'linkedin.com/in/pedrotunin') return 'https://www.linkedin.com/in/pedrotunin/';
  if (/^(pedroos:\/\/|about:)/i.test(value)) return value.toLowerCase();
  try { const url = new URL(value); if (/^https?:$/.test(url.protocol)) return url.href; } catch { /* Render an address error. */ }
  return value;
}
export function allowedAddress(value: string): boolean {
  if (/^pedroos:\/\/[^\s<>"']+$/i.test(value) || /^about:(blank|mozilla)$/i.test(value)) return true;
  try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
}
function defaults(): BrowserState {
  return { version: 1, favorites: INTERNAL_PAGES.map(([id, label]) => ({ label, url: `pedroos://${id}` })),
    preferences: { home: 'pedroos://home', toolbar: true, address: true, status: true, textSize: 100 }, visits: [] };
}
export function readBrowserState(): BrowserState {
  const result = defaults();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored?.version !== 1) return result;
    if (Array.isArray(stored.favorites)) result.favorites = stored.favorites.filter((f: FavoriteLink) => typeof f?.label === 'string' && typeof f.url === 'string' && allowedAddress(f.url)).slice(0, 100).map((f: FavoriteLink) => f.label === 'PedroOS Home' && f.url === 'pedroos://home' ? { ...f, label: 'Início do PedroOS' } : f);
    const p = stored.preferences;
    if (p && typeof p.home === 'string' && allowedAddress(p.home)) result.preferences.home = p.home;
    for (const key of ['toolbar', 'address', 'status'] as const) if (typeof p?.[key] === 'boolean') result.preferences[key] = p[key];
    if ([85, 100, 120, 140].includes(p?.textSize)) result.preferences.textSize = p.textSize;
    if (Array.isArray(stored.visits)) result.visits = stored.visits.filter((v: BrowserVisit) => typeof v?.url === 'string' && allowedAddress(v.url) && typeof v.title === 'string' && typeof v.date === 'string').slice(-100);
  } catch { /* Storage may be unavailable or contain an older/corrupt value. */ }
  return result;
}
let fallback = defaults();
export function browserState(): BrowserState {
  try { if (localStorage.getItem(KEY) !== null) return readBrowserState(); } catch { /* In-memory fallback. */ }
  return structuredClone(fallback);
}
export function updateBrowserState(change: (state: BrowserState) => void): void {
  const state = browserState();
  change(state);
  state.visits = state.visits.slice(-100);
  fallback = structuredClone(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Keep this session usable without persistence. */ }
  window.dispatchEvent(new Event(EVENT));
}
export function subscribeBrowserState(listener: () => void): () => void {
  const storage = (event: StorageEvent): void => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', storage); };
}

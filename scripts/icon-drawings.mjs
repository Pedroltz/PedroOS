// Original PedroOS artwork. Integer pixel coordinates; no external artwork.
function drawing(size, paint) {
  const pixels = Array.from({ length: size }, () => Array(size).fill('.'));
  const rect = (x, y, w, h, color = 'k') => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (xx >= 0 && yy >= 0 && xx < size && yy < size) pixels[yy][xx] = color;
    }
  };
  const line = (x, y, xx, yy, color = 'k') => {
    const steps = Math.max(Math.abs(xx - x), Math.abs(yy - y));
    for (let i = 0; i <= steps; i++) rect(Math.round(x + (xx - x) * i / steps), Math.round(y + (yy - y) * i / steps), 1, 1, color);
  };
  const box = (x, y, w, h, fill = 'g') => { rect(x, y, w, h); rect(x + 1, y + 1, w - 2, h - 2, fill); };
  paint({ rect, line, box });
  return pixels.map(row => row.join(''));
}

export function project16(key) {
  return drawing(16, ({ rect, line, box }) => {
    if (key === 'github' || key === 'linkedin') {
      box(1, 1, 14, 10); box(3, 3, 10, 6, 'n');
      rect(7, 11, 2, 2, 'd'); rect(3, 14, 10, 1);
      if (key === 'github') { line(6, 4, 4, 6, 'w'); line(4, 6, 6, 8, 'w'); line(10, 4, 12, 6, 'w'); line(12, 6, 10, 8, 'w'); }
      else { rect(4, 4, 3, 3, 'y'); rect(8, 5, 4, 1, 'w'); rect(8, 7, 4, 1, 'w'); }
    } else if (key === 'zellapedia') {
      box(2, 1, 11, 14, 'n'); rect(3, 2, 1, 11, 'b'); rect(5, 2, 7, 9, 'w');
      rect(6, 4, 5, 1, 'n'); rect(6, 7, 5, 1, 'd'); box(9, 9, 5, 5, 'c'); line(13, 13, 15, 15);
    } else if (key === 'anycomic') {
      box(1, 1, 13, 14, 'm'); box(3, 2, 10, 11, 'w');
      box(4, 3, 4, 5, 'c'); box(9, 3, 3, 5, 'y'); box(4, 9, 8, 3, 'r');
    } else if (key === '2091-retrogame') {
      box(1, 5, 14, 8); rect(3, 4, 10, 2, 'g'); rect(4, 7, 2, 5); rect(3, 8, 4, 2);
      rect(10, 7, 2, 2, 'r'); rect(12, 10, 2, 2, 'b'); rect(7, 11, 2, 1, 'd');
      line(8, 4, 8, 1); line(8, 1, 12, 1);
    } else if (key === 'autoapply') {
      box(2, 0, 11, 15, 'w'); rect(4, 3, 6, 1, 'n'); rect(4, 6, 5, 1, 'd'); rect(4, 9, 3, 1, 'd');
      box(8, 9, 7, 6, 'g'); rect(9, 11, 5, 2, 'e'); rect(12, 10, 1, 4, 'e');
    } else if (key === 'ofizzy') {
      box(1, 5, 14, 9, 'm'); box(5, 2, 6, 4); rect(6, 3, 4, 2, '.');
      rect(2, 6, 12, 2, 'r'); rect(2, 9, 12, 1, 'd'); rect(7, 8, 2, 3, 'y');
    }
  });
}

// Separate 32px compositions: one-pixel outlines, bevels and useful extra detail.
export function native32(key) {
  // Preserve the established artwork for existing applications. Only the three
  // projects that previously shared a generic icon need new large compositions.
  if (!['anycomic', '2091-retrogame', 'autoapply'].includes(key)) return undefined;
  const computer = ['my-computer', 'system', 'display', 'control-panel', 'rdp-session-manager', 'run', 'shutdown'];
  const folder = ['folder', 'folder-open', 'projects', 'explorer'];
  const documents = ['document', 'text', 'doc', 'resume', 'notepad', 'autoapply', 'exe', 'sys', 'project'];
  const books = ['anycomic', 'zellapedia'];
  if (![...computer, ...folder, ...documents, ...books, 'ofizzy', '2091-retrogame', 'github', 'linkedin'].includes(key)) return undefined;
  return drawing(32, ({ rect, line, box }) => {
    const monitor = (x, y, w, h) => {
      box(x, y, w, h, 'g'); rect(x + 1, y + 1, w - 2, 1, 'w'); rect(x + 1, y + 1, 1, h - 2, 'w');
      box(x + 3, y + 3, w - 6, h - 7, 't'); rect(x + 4, y + 4, w - 8, 1, 'c');
      rect(x + w - 5, y + h - 3, 2, 1, 'e');
      box(x + Math.floor(w / 2) - 3, y + h, 6, 3); box(x + 3, y + h + 3, w - 6, 3);
    };
    const page = () => {
      box(6, 1, 21, 29, 'w'); rect(7, 28, 18, 1, 'd'); rect(25, 3, 1, 25, 'g');
      rect(20, 1, 7, 6, '.'); line(20, 1, 26, 7); line(20, 1, 20, 7); line(20, 7, 26, 7);
      for (const y of [10, 13, 16, 19, 22]) rect(10, y, y === 22 ? 9 : 12, 1, 'd');
    };
    if (computer.includes(key)) {
      monitor(3, 2, 26, 20);
      if (key === 'rdp-session-manager') { monitor(15, 15, 16, 11); line(6, 25, 13, 25, 'n'); line(10, 22, 13, 25, 'n'); line(10, 28, 13, 25, 'n'); }
      if (key === 'display') for (let i = 0; i < 4; i++) rect(8, 6 + i * 2, 16, 2, ['r', 'y', 'e', 'b'][i]);
    } else if (folder.includes(key)) {
      box(2, 7, 13, 6, 'y'); box(1, 11, 29, 17, 'y'); rect(2, 12, 27, 1, 'w'); rect(2, 13, 1, 13, 'w'); rect(3, 26, 25, 1, 'o');
      if (key === 'folder-open' || key === 'explorer') {
        for (let y = 15; y < 28; y++) { const x = Math.max(1, 7 - Math.floor((y - 15) / 2)); rect(x, y, 31 - x, 1); rect(x + 1, y, 29 - x, 1, y === 16 ? 'w' : 'y'); }
      }
      if (key === 'projects') { box(18, 17, 12, 12); rect(19, 18, 10, 2, 'n'); rect(21, 23, 5, 3, 't'); }
    } else if (documents.includes(key)) {
      page();
      if (['exe', 'project', 'sys'].includes(key)) { box(10, 10, 14, 13); rect(11, 11, 12, 3, 'n'); rect(14, 17, 6, 3, 't'); }
      if (key === 'autoapply') { box(18, 20, 13, 10); line(20, 25, 28, 25, 'e'); line(25, 22, 28, 25, 'e'); line(25, 28, 28, 25, 'e'); }
      if (key === 'resume' || key === 'doc') { rect(10, 9, 12, 3, 'n'); rect(10, 15, 4, 7, 'b'); }
      if (key === 'notepad') { for (let y = 3; y < 26; y += 4) box(3, y, 5, 2, 'd'); }
    } else if (books.includes(key)) {
      box(3, 3, 24, 27, key === 'anycomic' ? 'm' : 'n'); rect(4, 4, 2, 24, key === 'anycomic' ? 'r' : 'b');
      rect(7, 4, 18, 21, 'w'); rect(7, 27, 18, 1, 'g');
      if (key === 'anycomic') { box(8, 5, 9, 10, 'c'); box(18, 5, 6, 10, 'y'); box(8, 16, 16, 8, 'r'); line(10, 22, 16, 17, 'y'); }
      else { rect(10, 7, 11, 3, 'n'); for (let y = 13; y <= 22; y += 3) rect(10, y, 12, 1, 'd'); box(19, 19, 9, 9, 'c'); line(26, 27, 30, 31); }
    } else if (key === 'ofizzy') {
      box(10, 5, 12, 7); rect(12, 7, 8, 4, '.'); box(2, 11, 28, 18, 'm');
      rect(3, 12, 26, 6, 'r'); rect(3, 12, 26, 1, 'w'); rect(3, 20, 26, 1, 'd'); box(14, 17, 4, 7, 'y'); rect(4, 26, 24, 1, 'r');
    } else if (key === '2091-retrogame') {
      line(16, 9, 16, 3); line(16, 3, 26, 3); box(3, 10, 26, 18); rect(5, 9, 22, 2, 'g');
      rect(4, 11, 24, 1, 'w'); rect(8, 14, 3, 9); rect(5, 17, 9, 3); box(20, 14, 4, 4, 'r'); box(24, 20, 4, 4, 'b'); rect(15, 23, 4, 1, 'd');
    } else {
      // Network/contact applications retain their identity through classic tools.
      monitor(2, 3, 27, 20); rect(7, 7, 17, 9, key === 'github' ? 'k' : 'n');
      if (key === 'github') { line(11, 9, 8, 12, 'w'); line(8, 12, 11, 15, 'w'); line(19, 9, 22, 12, 'w'); line(22, 12, 19, 15, 'w'); }
      else { box(9, 8, 5, 5, 'y'); rect(8, 14, 7, 2, 'w'); rect(17, 9, 5, 1, 'w'); rect(17, 12, 5, 1, 'w'); }
    }
  });
}

export const glyphNames = ['arrow-left', 'arrow-right', 'arrow-up', 'reload', 'home', 'close', 'search', 'bookmark', 'external-link', 'printer', 'download', 'mail', 'folder', 'file', 'cut', 'copy', 'clipboard', 'undo', 'trash', 'sliders', 'layout', 'grid-3x3', 'bulletlist', 'card-text', 'check'];
export function glyph16(name) {
  return drawing(16, ({ rect, line, box }) => {
    if (name.startsWith('arrow-')) {
      if (name === 'arrow-up') { rect(7, 4, 2, 10, 'n'); for (let i = 0; i < 5; i++) rect(7 - i, 3 + i, 2 + i * 2, 1, 'n'); }
      else { const right = name === 'arrow-right'; rect(3, 7, 10, 2, 'n'); for (let i = 0; i < 5; i++) rect(right ? 12 - i : 3 + i, 7 - i, 1, 2 + i * 2, 'n'); }
    } else if (name === 'check') { line(2, 8, 6, 12, 'e'); line(6, 12, 14, 3, 'e'); line(2, 7, 6, 11, 'e'); }
    else if (name === 'close') { line(3, 3, 12, 12); line(3, 12, 12, 3); }
    else if (name === 'grid-3x3' || name === 'layout') { for (const x of [2, 7, 12]) for (const y of [2, 7, 12]) box(x, y, 3, 3, 'y'); }
    else if (name === 'bulletlist' || name === 'card-text') { for (const y of [3, 7, 11]) { box(1, y, 3, 3, 'y'); rect(6, y + 1, name === 'card-text' ? 8 : 6, 1); } }
    else if (name === 'search') { box(2, 1, 9, 9, 'c'); line(10, 10, 14, 14); line(9, 10, 13, 14); }
    else if (name === 'folder') { box(1, 4, 6, 3, 'y'); box(1, 6, 14, 8, 'y'); }
    else if (['copy', 'clipboard', 'file', 'bookmark'].includes(name)) { if (name === 'copy') box(1, 1, 9, 11, 'w'); box(5, 4, 9, 11, 'w'); for (const y of [7, 9, 11]) rect(7, y, 5, 1, 'n'); if (name === 'clipboard') box(7, 2, 5, 3); }
    else if (name === 'cut') { box(1, 10, 5, 5, 'c'); box(10, 10, 5, 5, 'c'); line(3, 12, 12, 1); line(12, 12, 3, 1); }
    else if (name === 'trash') { box(4, 4, 9, 11); rect(3, 3, 11, 2); for (const x of [6, 9]) rect(x, 6, 1, 7, 'd'); }
    else if (name === 'mail') { box(1, 3, 14, 10, 'w'); line(2, 4, 8, 9, 'n'); line(8, 9, 14, 4, 'n'); }
    else if (name === 'sliders') { for (const x of [3, 8, 13]) { rect(x, 2, 1, 12); box(x - 2, x === 8 ? 8 : 4, 5, 3, 'g'); } }
    else if (name === 'printer') { box(4, 1, 8, 5, 'w'); box(1, 6, 14, 7); box(4, 10, 8, 5, 'w'); rect(11, 7, 2, 1, 'e'); }
    else if (name === 'home') { for (let y = 1; y < 8; y++) rect(8 - y, y, 2 * y, 1, 'm'); box(3, 8, 10, 7, 'w'); box(7, 10, 3, 5, 'n'); }
    else if (name === 'download' || name === 'external-link') { rect(7, 1, 2, 10, 'n'); line(3, 7, 8, 12, 'n'); line(8, 12, 13, 7, 'n'); rect(2, 14, 12, 1); }
    else { // reload / undo
      line(3, 6, 6, 3, 'n'); rect(6, 3, 6, 1, 'n'); rect(12, 4, 1, 7, 'n'); rect(6, 12, 6, 1, 'n'); rect(2, 3, 2, 6, 'n'); rect(3, 7, 5, 2, 'n');
    }
  });
}

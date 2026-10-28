// PedroOS 95 — original pixel-art icon generator.
// Original 16px sprites and separately composed native 32px artwork.
// Output: PNGs (16/32/48, integer pixels, no smoothing), favicon.ico,
// Open Graph image, wallpaper tiles, and Data/icons.json (central icon registry manifest).
// Run with: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { native32, project16, glyph16, glyphNames } from './icon-drawings.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'src', 'PedroOS.Web');
const iconsOut = join(web, 'wwwroot', 'assets', 'icons');

const PALETTE = {
  k: [0, 0, 0], w: [255, 255, 255], g: [192, 192, 192], d: [128, 128, 128],
  n: [0, 0, 128], b: [0, 0, 255], t: [0, 128, 128], c: [0, 255, 255],
  y: [255, 255, 0], o: [128, 128, 0], r: [255, 0, 0], m: [128, 0, 0],
  G: [0, 255, 0], e: [0, 128, 0], p: [128, 0, 128], P: [255, 0, 255],
  O: [255, 128, 0], L: [10, 102, 194], s: [223, 223, 223],
};

// ---------------------------------------------------------------- sprites
const S = {};
S.floppy = [
  '................', '.kkkkkkkkkkkkk..', '.knnwwwwwwwnnnk.', '.knnwddddgwnnnk.',
  '.knnwddddgwnnnk.', '.knnwwwwwwwnnnk.', '.knnnnnnnnnnnnk.', '.knnnnnnnnnnnnk.',
  '.knnkkkkkkknnnk.', '.knkwwwwwwwknnk.', '.knkwdddddwknnk.', '.knkwwwwwwwknnk.',
  '.knkwdddddwknnk.', '.knkwwwwwwwknnk.', '.kkkkkkkkkkkkkk.', '................',
];
S.skifree = [
  '................','......kkkk......','......krrk......','......kggk......',
  '......kkkk......','....kbbbbk......','...kbbbbbbk.....','...k.kbbk.k.....',
  '..k..kbbk..k....','.....kkkk.......','....kggggk......','...kggkkggk.....',
  '..kkgk..kgkk....','.krrk....krrk...','krrk......krrk..','kkkk......kkkk..',
];
S.opentyrian = [
  '................','.......kk.......','......kcck......','......kcck......',
  '.....kkwwkk.....','..k..kwwwwk..k..','.kwk.kwwwwk.kwk.','.kwwkkwccwkkwwk.',
  '.kwwwwwccwwwwwk.','kwwwwwwccwwwwwwk','kwwkkwwwwwwkkwwk','kkkk.kkggkk.kkkk',
  '.....krrrrk.....','......kyyk......','.......kk.......','................',
];
S.omf2097 = [
  '................','.....kkkkkk.....','....kddddddk....','....kgrrrrgk....',
  '....kggggggk....','..kk.kkkkkk.kk..','.kddkddddddkddk.','.kggkggggggkggk.',
  '.kggkggbbggkggk.','.kkk.kggggk.kkk.','.....kkkkkk.....','....kddkkddk....',
  '....kggkkggk....','...kgggkkgggk...','...kkkkkkkkkk...','................',
];

S.computer = [
  '................',
  '..kkkkkkkkkkkk..',
  '..kwwwwwwwwwwdk.',
  '..kwddddddddgdk.',
  '..kwdttttttwgdk.',
  '..kwdtcttttwgdk.',
  '..kwdttttttwgdk.',
  '..kwdttttttwgdk.',
  '..kwdwwwwwwwgdk.',
  '..kwggggggggedk.',
  '..kddddddddddkk.',
  '...kkkkkkkkkkk..',
  '....kwgggggdk...',
  '..kkwwwwwwwwdkk.',
  '..kwggggggggddk.',
  '..kkkkkkkkkkkkk.',
];

S.display = S.computer.map((row, i) => {
  const stripes = { 4: 'r', 5: 'y', 6: 'G', 7: 'b' };
  if (!stripes[i]) return row;
  return row.slice(0, 5) + stripes[i].repeat(6) + row.slice(11);
});

S.shutdownScreen = S.computer.map((row, i) => (i >= 4 && i <= 7 ? row.slice(0, 5) + 'kkkkkk' + row.slice(11) : row));

S.folder = [
  '................',
  '................',
  '..kkkkk.........',
  '.kwyyyyk........',
  'kwyyyyyykkkkkkk.',
  'kwwwwwwwwwwwwwyk',
  'kwyyyyyyyyyyyyok',
  'kwyyyyyyyyyyyyok',
  'kwyyyyyyyyyyyyok',
  'kwyyyyyyyyyyyyok',
  'kwyyyyyyyyyyyyok',
  'kwyyyyyyyyyyyyok',
  'kwyyyyyyyyyyyyok',
  'kyoooooooooooook',
  'kkkkkkkkkkkkkkkk',
  '................',
];

S.folderOpen = [
  '................',
  '................',
  '..kkkkk.........',
  '.kwyyyyk........',
  'kwyyyyyykkkkkk..',
  'kwyyyyyyyyyyyyk.',
  'kwyyykkkkkkkkkkk',
  'kwyykwwwwwwwwwyk',
  'kwykwyyyyyyyyok.',
  'kwykwyyyyyyyyok.',
  'kykwyyyyyyyyok..',
  'kykwyyyyyyyyok..',
  'kkwyyyyyyyyok...',
  'kkoooooooooook..',
  'kkkkkkkkkkkkkk..',
  '................',
];

S.document = [
  '..kkkkkkkkk.....',
  '..kwwwwwwwkk....',
  '..kwwwwwwwkwk...',
  '..kwwwwwwwkkkk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kwwwwwwwwwdk..',
  '..kddddddddddk..',
  '..kkkkkkkkkkkk..',
];

const lines = (base, color, rows, from = 4, to = 11) =>
  base.map((row, i) => (rows.includes(i) ? row.slice(0, from) + color.repeat(to - from - (i % 4 === 1 ? 2 : 0)) + row.slice(to - (i % 4 === 1 ? 2 : 0)) : row));

S.text = lines(S.document, 'd', [5, 7, 9, 11, 13]);
S.wordpad = (() => {
  const doc = lines(S.document, 'n', [7, 9, 11, 13]);
  doc[4] = '..kwbbbbwwwwdk..';
  doc[5] = '..kwbbbbwwwwdk..';
  return doc;
})();

S.msdos = [
  '................',
  '................',
  'kkkkkkkkkkkkkkkk',
  'knnnnnnnnnnnwgdk',
  'kwwwwwwwwwwwwwdk',
  'kwkkkkkkkkkkkgdk',
  'kwkgggkkkkkkkgdk',
  'kwkkkgkkkkkkkgdk',
  'kwkgggkkkkkkkgdk',
  'kwkkkkkgggkkkgdk',
  'kwkkkkkkkkkkkgdk',
  'kwkkkkkkkkkkkgdk',
  'kwddddddddddddkk',
  'kkkkkkkkkkkkkkkk',
  '................',
  '................',
];
S.exe = [
  '................',
  '................',
  'kkkkkkkkkkkkkkkk',
  'knnnnnnnnnnngggk',
  'kwwwwwwwwwwwwwdk',
  'kwggggggggggggdk',
  'kwwwwwwwwwwwwwdk',
  'kwwwwwwwwwwwwwdk',
  'kwwwwwwwwwwwwwdk',
  'kwwwwwwwwwwwwwdk',
  'kwwwwwwwwwwwwwdk',
  'kwwwwwwwwwwwwwdk',
  'kwwwwwwwwwwwwwdk',
  'kddddddddddddddk',
  'kkkkkkkkkkkkkkkk',
  '................',
];

S.drive = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.kkkkkkkkkkkkkk.',
  'kwwwwwwwwwwwwwdk',
  'kwggggggggggggdk',
  'kwggggggggggggdk',
  'kwgddddddddgeGdk',
  'kwggggggggggggdk',
  'kdddddddddddddkk',
  '.kkkkkkkkkkkkkk.',
  '................',
  '................',
  '................',
];

S.recycle = [
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..kwwwwwwwwwwk..',
  '..kgggggggggdk..',
  '..kkkkkkkkkkkk..',
  '..kwdwdwdwdwdk..',
  '..kdwdwdwdwdgk..',
  '...kwdwdwdwdk...',
  '...kdwdwdwdgk...',
  '...kwdwdwdwdk...',
  '...kdwdwdwdgk...',
  '....kwdwdwdk....',
  '....kdwdwdgk....',
  '....kkkkkkkk....',
  '................',
];

S.chip = [
  '................',
  '....g.g.g.g.....',
  '....g.g.g.g.....',
  '..kkkkkkkkkkkk..',
  '..kddddddddddk..',
  'ggkdwddddddddkgg',
  '..kddddddddddk..',
  'ggkddddddddddkgg',
  '..kddddddddddk..',
  'ggkddddddddddkgg',
  '..kddddddddddk..',
  'ggkddddddddddkgg',
  '..kkkkkkkkkkkk..',
  '....g.g.g.g.....',
  '....g.g.g.g.....',
  '................',
];

S.globe = [
  '................',
  '.....kkkkkk.....',
  '...kkbbGGbbkk...',
  '..kbbGGGGbbbbk..',
  '..kbGGGGGbbbbk..',
  '.kbbGGGGbbbGbbk.',
  '.kbbbGGbbbGGGbk.',
  '.kbbbbGbbbGGGbk.',
  '.kbbbbbbbbGGbbk.',
  '.kbbbbbGGbbbbbk.',
  '..kbbbbGGGbbbk..',
  '..kbbbbGGbbbbk..',
  '...kkbbbbbbkk...',
  '.....kkkkkk.....',
  '................',
  '................',
];

S.github = [
  '.....kkkkkk.....',
  '...kkkkkkkkkk...',
  '..kkwkkkkkkwkk..',
  '.kkkwwkkkkwwkkk.',
  '.kkkwwwwwwwwkkk.',
  'kkkwwwwwwwwwwkkk',
  'kkkwwwwwwwwwwkkk',
  'kkkwwwwwwwwwwkkk',
  'kkkwwwwwwwwwwkkk',
  'kkkkwwwwwwwwkkkk',
  '.kwkkkwwwwkkkkk.',
  '.kkwwkwwwwkkkkk.',
  '..kkkwwwwwwkkk..',
  '...kkkwwwwkkk...',
  '.....kwwwwk.....',
  '................',
];

S.linkedin = [
  '................',
  '.LLLLLLLLLLLLLL.',
  '.LLLLLLLLLLLLLL.',
  '.LLwwLLLLLLLLLL.',
  '.LLwwLLLLLLLLLL.',
  '.LLLLLLLLLLLLLL.',
  '.LLwwLLwwLwwwLL.',
  '.LLwwLLwwwwwwwL.',
  '.LLwwLLwwwLLwwL.',
  '.LLwwLLwwLLLwwL.',
  '.LLwwLLwwLLLwwL.',
  '.LLwwLLwwLLLwwL.',
  '.LLwwLLwwLLLwwL.',
  '.LLLLLLLLLLLLLL.',
  '.LLLLLLLLLLLLLL.',
  '................',
];

S.mine = [
  '................',
  '.......k........',
  '.......k........',
  '...k.kkkkk.k....',
  '....kkkkkkk.....',
  '...kkwwkkkkk....',
  '...kkwwkkkkk....',
  '.kkkkkkkkkkkkk..',
  '...kkkkkkkkk....',
  '...kkkkkkkkk....',
  '....kkkkkkk.....',
  '...k.kkkkk.k....',
  '.......k........',
  '.......k........',
  '................',
  '................',
];

S.flag = [
  '................',
  '................',
  '................',
  '......rrk.......',
  '....rrrrk.......',
  '...rrrrrk.......',
  '....rrrrk.......',
  '......rrk.......',
  '........k.......',
  '........k.......',
  '......kkkk......',
  '....kkkkkkkk....',
  '....kkkkkkkk....',
  '................',
  '................',
  '................',
];

const face = (eyes, mouth) => {
  const base = [
    '................',
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyyyyyyyyyyk..',
    '..kyyyyyyyyyyk..',
    '.kyyyyyyyyyyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kyyyyyyyyyyyyk.',
    '..kyyyyyyyyyyk..',
    '..kyyyyyyyyyyk..',
    '...kkyyyyyykk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ];
  for (const [r, row] of Object.entries({ ...eyes, ...mouth })) base[r] = row;
  return base;
};
const normalEyes = { 5: '.kyyykyyyykyyyk.', 6: '.kyyykyyyykyyyk.' };
const smileMouth = { 9: '.kyykyyyyyykyyk.', 10: '..kyykyyyykyyk..', 11: '..kyyykkkkyyyk..' };
S.faceSmile = face(normalEyes, smileMouth);
S.faceWow = face(normalEyes, { 10: '..kyyyykkyyyyk..', 11: '..kyyyykkyyyyk..' });
S.faceDead = face(
  { 4: '..kykykyykykyk..', 5: '.kyyykyyyykyyyk.', 6: '.kyykykyykykyyk.' },
  { 10: '..kyyykkkkyyyk..', 11: '..kyykyyyykyyk..' },
);
S.faceCool = face({ 5: '.kykkkkkkkkkkyk.', 6: '.kyykkkyykkkyyk.' }, smileMouth);

S.error = [
  '................',
  '.....kkkkkk.....',
  '...kkrrrrrrkk...',
  '..krrrrrrrrrrk..',
  '..krwwrrrrwwrk..',
  '.krrrwwrrwwrrrk.',
  '.krrrrwwwwrrrrk.',
  '.krrrrrwwrrrrrk.',
  '.krrrrwwwwrrrrk.',
  '.krrrwwrrwwrrrk.',
  '..krwwrrrrwwrk..',
  '..krrrrrrrrrrk..',
  '...kkrrrrrrkk...',
  '.....kkkkkk.....',
  '................',
  '................',
];

S.warning = [
  '.......kk.......',
  '......kyyk......',
  '......kyyk......',
  '.....kyyyyk.....',
  '.....kykkyk.....',
  '....kyykkyyk....',
  '....kyykkyyk....',
  '...kyyykkyyyk...',
  '...kyyykkyyyk...',
  '..kyyyykkyyyyk..',
  '..kyyyyyyyyyyk..',
  '.kyyyyykkyyyyyk.',
  '.kyyyyykkyyyyyk.',
  'kyyyyyyyyyyyyyyk',
  'kkkkkkkkkkkkkkkk',
  '................',
];

const bubble = (glyph) => {
  const b = [
    '................',
    '....kkkkkkkk....',
    '..kkwwwwwwwwkk..',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    'kwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '..kkwwwwwwwwkk..',
    '....kkkwwkkk....',
    '......kwk.......',
    '.......k........',
  ];
  for (const [r, row] of Object.entries(glyph)) b[r] = row;
  return b;
};
S.info = bubble({
  3: '.kwwwwwbbwwwwwk.', 4: '.kwwwwwbbwwwwwk.', 6: 'kwwwwwbbbwwwwwwk', 7: 'kwwwwwwbbwwwwwwk',
  8: 'kwwwwwwbbwwwwwwk', 9: 'kwwwwwwbbwwwwwwk', 10: '.kwwwwbbbbwwwwk.',
});
S.question = bubble({
  3: '.kwwwwbbbbwwwwk.', 4: '.kwwwbbwwbbwwwk.', 5: 'kwwwwwwwwbbwwwwk', 6: 'kwwwwwwwbbwwwwwk',
  7: 'kwwwwwwbbwwwwwwk', 8: 'kwwwwwwbbwwwwwwk', 10: '.kwwwwwbbwwwwwk.',
});

S.power = [
  '................',
  '.......rr.......',
  '...rr..rr..rr...',
  '..rr...rr...rr..',
  '.rr....rr....rr.',
  '.rr....rr....rr.',
  'rr.....rr.....rr',
  'rr.....rr.....rr',
  'rr............rr',
  'rr............rr',
  '.rr..........rr.',
  '.rr..........rr.',
  '..rr........rr..',
  '...rrr....rrr...',
  '.....rrrrrr.....',
  '................',
];

S.logo = [
  '................',
  '.kkkkkkkkkkkkk..',
  '.knnnnnnnnnnnkd.',
  '.knwwwwwwnnnnkd.',
  '.knwwnnnwwnnnkd.',
  '.knwwnnnwwnnnkd.',
  '.knwwnnnwwnnnkd.',
  '.knwwwwwwnnnnkd.',
  '.knwwnnnnnnnnkd.',
  '.knwwnnnnnnnnkd.',
  '.knwwnnnnnrrnkd.',
  '.knwwnnnnnyynkd.',
  '.knnnnnnnnnnnkd.',
  '.kkkkkkkkkkkkkd.',
  '..ddddddddddddd.',
  '................',
];

S.ofizzy = [
  'kkkkkkkkkkkkkkkk',
  'kOOOOOOOOOOOOOOk',
  'kOOOOOOOOOwwOOOk',
  'kOOOOOOOOwwOOOOk',
  'kOOOOOOOOwwOOwOk',
  'kOOOOOOOOwwwwwOk',
  'kOOOOOOOwwwwwOOk',
  'kOOOOOOwwwOOOOOk',
  'kOOOOOwwwOOOOOOk',
  'kOOOOwwwOOOOOOOk',
  'kOOOwwwOOOOOOOOk',
  'kOOwwwOOOOOOOOOk',
  'kOOwwOOOOOOOOOmk',
  'kOOOOOOOOOOOOOmk',
  'kOmmmmmmmmmmmmmk',
  'kkkkkkkkkkkkkkkk',
];

S.remoteMonitor = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwdk.',
  '.kwttttttttttdk.',
  '.kwtknnnnnnktdk.',
  '.kwtkggggggktdk.',
  '.kwtkggggggktdk.',
  '.kwtkkkkkkkktdk.',
  '.kwttttttttttdk.',
  '.kddddddddddddk.',
  '.kkkkkkkkkkkkkk.',
  '......kddk......',
  '.....kkkkkk.....',
  '................',
  '................',
  '................',
];

S.book = [
  '................',
  '...kkkkkkkkkk...',
  '..kmmmmmmmmmmk..',
  '..kmyyyyyyymwk..',
  '..kmmmmmmyymwk..',
  '..kmmmmmyymmwk..',
  '..kmmmmyymmmwk..',
  '..kmmmyymmmmwk..',
  '..kmmyymmmmmwk..',
  '..kmyyyyyyymwk..',
  '..kmmmmmmmmmwk..',
  '..kmmmmmmmmmwk..',
  '..kkkkkkkkkkwk..',
  '...kwwwwwwwwwk..',
  '....kkkkkkkkkk..',
  '................',
];

S.speaker = [
  '................',
  '................',
  '................',
  '......kk........',
  '.....kwk..k.....',
  '..kkkwwk...k....',
  '..kwwwwk.k..k...',
  '..kwwwwk..k.k...',
  '..kwwwwk..k.k...',
  '..kwwwwk.k..k...',
  '..kkkwwk...k....',
  '.....kwk..k.....',
  '......kk........',
  '................',
  '................',
  '................',
];
S.speakerMuted = S.speaker.map((row, i) => {
  const x = { 5: '..rr.', 6: '...rr', 7: '..rr.', 8: '.rr..', 9: 'rr...' }; // placeholder replaced below
  void x;
  if (i < 4 || i > 11) return row;
  return row.slice(0, 9) + '.......';
});
[[5, 9], [6, 10], [7, 11], [8, 12], [5, 12], [6, 11], [7, 10], [8, 9]].forEach(([r, c]) => {
  const row = S.speakerMuted[r + 1];
  S.speakerMuted[r + 1] = row.slice(0, c) + 'r' + row.slice(c + 1);
});

// 8x8 overlays
const O8 = {
  magnifier: ['.kkkk...', 'kwwcck..', 'kwccck..', 'kcccck..', 'kcccck..', '.kkkkm..', '.....mm.', '......mm'],
  window: ['kkkkkkkk', 'knnnnnnk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kkkkkkkk', '........'],
  arrow: ['kkkkkkkk', 'kwwwwwwk', 'kwwkkkwk', 'kwwwkkwk', 'kwwkwkwk', 'kwkwwwwk', 'kwwwwwwk', 'kkkkkkkk'],
  gear: ['...kk...', '.k.dd.k.', '..dggd..', 'kdgwwgdk', 'kdgwwgdk', '..dggd..', '.k.dd.k.', '...kk...'],
  star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', 'yy....yy', '........'],
};

function overlay(base, top, dx, dy) {
  const out = base.map((r) => r.split(''));
  top.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.' && out[y + dy] && x + dx < 16) out[y + dy][x + dx] = ch;
  }));
  return out.map((r) => r.join(''));
}

// ---------------------------------------------------------------- registry
// key -> [category, sprite, description]
const ICONS = {
  // system
  'my-computer': ['system', S.computer, 'My Computer'],
  'drive': ['system', S.drive, 'Local disk'],
  'folder': ['system', S.folder, 'Folder'],
  'folder-open': ['system', S.folderOpen, 'Open folder'],
  'recycle-bin': ['system', S.recycle, 'Recycle Bin'],
  'floppy': ['system', S.floppy, 'Secret floppy disk'],
  'skifree': ['applications', S.skifree, 'SkiFree skier'],
  'opentyrian': ['applications', S.opentyrian, 'OpenTyrian spaceship'],
  'omf2097': ['applications', S.omf2097, 'One Must Fall robot'],
  'document': ['system', S.document, 'Document'],
  'text': ['system', S.text, 'Text document'],
  'doc': ['system', S.wordpad, 'WordPad document'],
  'exe': ['system', S.exe, 'Application'],
  'sys': ['system', S.chip, 'System file'],
  'url': ['system', overlay(S.globe, O8.arrow, 0, 8), 'Internet shortcut'],
  'control-panel': ['system', overlay(S.folder, O8.gear, 8, 7), 'Control Panel'],
  'display': ['system', S.display, 'Display'],
  'system': ['system', overlay(S.computer, O8.gear, 8, 8), 'System'],
  'help': ['system', S.question, 'Help'],
  'info': ['system', S.info, 'Information'],
  'warning': ['system', S.warning, 'Warning'],
  'error': ['system', S.error, 'Error'],
  'run': ['system', overlay(S.exe, O8.arrow, 0, 8), 'Run'],
  'find': ['system', overlay(S.document, O8.magnifier, 8, 8), 'Find'],
  'shutdown': ['system', overlay(S.shutdownScreen, O8.arrow, 8, 8), 'Shut Down'],
  'power': ['system', S.power, 'Power'],
  'logo': ['system', S.logo, 'PedroOS logo'],
  'speaker': ['system', S.speaker, 'Volume'],
  'speaker-muted': ['system', S.speakerMuted, 'Volume muted'],
  // applications
  'explorer': ['applications', overlay(S.folderOpen, O8.magnifier, 8, 8), 'Explorer'],
  'iexplore': ['applications', S.globe, 'Internet Explorer'],
  'minesweeper': ['applications', S.mine, 'Minesweeper'],
  'projects': ['applications', overlay(S.folder, O8.window, 7, 7), 'Projects'],
  'resume': ['applications', overlay(S.wordpad, O8.star, 8, 0), 'Resume'],
  'notepad': ['applications', S.text, 'Notepad'],
  'msdos': ['applications', S.msdos, 'MS-DOS Prompt'],
  'github': ['applications', S.github, 'GitHub'],
  'linkedin': ['applications', S.linkedin, 'LinkedIn'],
  // projects
  'ofizzy': ['projects', S.ofizzy, 'Ofizzy'],
  'anycomic': ['projects', project16('anycomic'), 'AnyComic illustrated comic book'],
  'gamepad': ['applications', project16('gamepad'), 'Retro game controller'],
  'autoapply': ['projects', project16('autoapply'), 'AutoApply automated form'],
  'rdp-session-manager': ['projects', overlay(S.remoteMonitor, O8.arrow, 0, 8), 'RDP Session Manager'],
  'project': ['projects', overlay(S.exe, O8.gear, 8, 8), 'Project'],
  // ui
  'mine': ['ui', S.mine, 'Mine'],
  'flag': ['ui', S.flag, 'Flag'],
  'face-smile': ['ui', S.faceSmile, 'Smile'],
  'face-wow': ['ui', S.faceWow, 'Surprised'],
  'face-dead': ['ui', S.faceDead, 'Game over'],
  'face-cool': ['ui', S.faceCool, 'Winner'],
};

// ---------------------------------------------------------------- png
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function validate(key, sprite, size = 16) {
  if (sprite.length !== size) throw new Error(`${key}: expected ${size} rows, got ${sprite.length}`);
  sprite.forEach((row, i) => {
    if (row.length !== size) throw new Error(`${key}: row ${i} has ${row.length} columns: "${row}"`);
    for (const ch of row) if (ch !== '.' && !PALETTE[ch]) throw new Error(`${key}: unknown colour "${ch}"`);
  });
}

function rasterize(sprite, scale) {
  const size = sprite.length * scale;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ch = sprite[Math.floor(y / scale)][Math.floor(x / scale)];
      if (ch === '.') continue;
      const [r, g, b] = PALETTE[ch];
      const i = (y * size + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return encodePng(size, size, buf);
}

// ---------------------------------------------------------------- canvas helpers (OG image / wallpapers)
function canvas(w, h, [r, g, b]) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255; }
  return {
    w, h, buf,
    rect(x, y, rw, rh, c) {
      for (let yy = Math.max(0, y); yy < Math.min(h, y + rh); yy++)
        for (let xx = Math.max(0, x); xx < Math.min(w, x + rw); xx++) {
          const i = (yy * w + xx) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
        }
    },
    sprite(sp, x, y, scale) {
      sp.forEach((row, sy) => [...row].forEach((ch, sx) => { if (ch !== '.') this.rect(x + sx * scale, y + sy * scale, scale, scale, PALETTE[ch]); }));
    },
    png() { return encodePng(w, h, buf); },
  };
}

// 5x7 pixel font (only glyphs needed for the OG image)
const FONT = {
  P: ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'],
  E: ['11111', '1....', '1....', '1111.', '1....', '1....', '11111'],
  D: ['1111.', '1...1', '1...1', '1...1', '1...1', '1...1', '1111.'],
  R: ['1111.', '1...1', '1...1', '1111.', '1.1..', '1..1.', '1...1'],
  O: ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  S: ['.1111', '1....', '1....', '.111.', '....1', '....1', '1111.'],
  T: ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '..1..'],
  F: ['11111', '1....', '1....', '1111.', '1....', '1....', '1....'],
  L: ['1....', '1....', '1....', '1....', '1....', '1....', '11111'],
  I: ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '11111'],
  U: ['1...1', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  N: ['1...1', '11..1', '1.1.1', '1..11', '1...1', '1...1', '1...1'],
  9: ['.111.', '1...1', '1...1', '.1111', '....1', '...1.', '.11..'],
  5: ['11111', '1....', '1111.', '....1', '....1', '1...1', '.111.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
function text(cv, str, x, y, scale, color) {
  [...str].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT[' '];
    g.forEach((row, gy) => [...row].forEach((v, gx) => { if (v === '1') cv.rect(x + (i * 6 + gx) * scale, y + gy * scale, scale, scale, color); }));
  });
}

// ---------------------------------------------------------------- write
const manifest = {};
for (const [key, [category, sprite, description]] of Object.entries(ICONS)) {
  validate(key, sprite);
  const dir = join(iconsOut, category);
  mkdirSync(dir, { recursive: true });
  const large = native32(key);
  if (large) validate(key, large, 32);
  for (const scale of [1, 2, 3]) writeFileSync(join(dir, `${key}-${16 * scale}.png`), rasterize(scale === 2 && large ? large : sprite, scale === 2 && large ? 1 : scale));
  manifest[key] = {
    category, description, sizes: [16, 32, 48],
    variants: Object.fromEntries([16, 32, 48].map(size => [size, `/assets/icons/${category}/${key}-${size}.png`])),
    fallback: 'exe', attribution: 'Original PedroOS pixel artwork',
    nativeSizes: large ? [16, 32] : [16],
  };
}

// Original native 16px toolbar glyphs, registered like every other icon.
mkdirSync(join(iconsOut, 'ui'), { recursive: true });
const glyphs = [];
for (const name of glyphNames) {
  const sprite = glyph16(name);
  validate(name, sprite);
  const key = `glyph-${name}`;
  const path = `/assets/icons/ui/${key}-16.png`;
  writeFileSync(join(iconsOut, 'ui', `${key}-16.png`), rasterize(sprite, 1));
  manifest[key] = { category: 'ui', description: name, sizes: [16], variants: { 16: path }, fallback: 'glyph-file', attribution: 'Original PedroOS pixel artwork', nativeSizes: [16] };
  glyphs.push(name);
}

mkdirSync(join(web, 'Data'), { recursive: true });
writeFileSync(join(web, 'Data', 'icons.json'), JSON.stringify({ basePath: '/assets/icons', icons: manifest, glyphs }, null, 2));

// favicon.ico (PNG-compressed entries 16/32/48)
const icoImages = [1, 2, 3].map((s) => rasterize(S.logo, s));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoImages.length, 4);
let offset = 6 + 16 * icoImages.length;
const entries = icoImages.map((img, i) => {
  const e = Buffer.alloc(16); const size = 16 * (i + 1);
  e[0] = size; e[1] = size; e[2] = 0; e[3] = 0; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(img.length, 8); e.writeUInt32LE(offset, 12); offset += img.length; return e;
});
writeFileSync(join(web, 'wwwroot', 'favicon.ico'), Buffer.concat([header, ...entries, ...icoImages]));
writeFileSync(join(web, 'wwwroot', 'assets', 'icons', 'apple-touch-icon.png'), (() => {
  const cv = canvas(180, 180, PALETTE.t); cv.sprite(S.logo, 10, 10, 10); return cv.png();
})());

// Open Graph image 1200x630
{
  const cv = canvas(1200, 630, PALETTE.t);
  const wx = 160, wy = 110, ww = 880, wh = 410;
  cv.rect(wx, wy, ww, wh, PALETTE.k);
  cv.rect(wx, wy, ww - 4, wh - 4, PALETTE.w);
  cv.rect(wx + 4, wy + 4, ww - 8, wh - 8, PALETTE.g);
  cv.rect(wx + 10, wy + 10, ww - 20, 44, PALETTE.n);
  cv.sprite(S.logo, wx + 16, wy + 14, 2);
  text(cv, 'PEDROOS 95', wx + 60, wy + 18, 4, PALETTE.w);
  cv.sprite(S.computer, wx + 50, wy + 120, 12);
  text(cv, 'PEDRO TUNIN', wx + 330, wy + 140, 8, PALETTE.k);
  text(cv, 'PORTFOLIO', wx + 330, wy + 240, 8, PALETTE.n);
  writeFileSync(join(web, 'wwwroot', 'assets', 'og-image.png'), cv.png());
}

// Wallpaper pattern tiles (8x8 classic patterns, scaled 1x — tiled by CSS)
const wallDir = join(web, 'wwwroot', 'assets', 'wallpapers');
mkdirSync(wallDir, { recursive: true });
const patterns = {
  bricks: ['11111111', '1.......', '1.......', '1.......', '11111111', '....1...', '....1...', '....1...'],
  weave: ['1...1...', '.1.1.1..', '..1...1.', '.1.1.1..', '1...1...', '...1...1', '..1.1.1.', '...1...1'],
  scottie: ['........', '.1......', '.11...1.', '.111111.', '..11111.', '..1...1.', '........', '........'],
  dots: ['1.......', '........', '........', '........', '....1...', '........', '........', '........'],
};
for (const [name, rows] of Object.entries(patterns)) {
  const cv = canvas(8, 8, PALETTE.t);
  rows.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') cv.rect(x, y, 1, 1, PALETTE.k); }));
  writeFileSync(join(wallDir, `${name}.png`), cv.png());
}

// Contact sheet for visual review (not shipped)
const arcade = canvas(64, 64, [12, 6, 38]);
for (let x = 0; x < 64; x += 16) arcade.rect(x, 0, 1, 64, [55, 16, 92]);
for (let y = 0; y < 64; y += 16) arcade.rect(0, y, 64, 1, [55, 16, 92]);
arcade.rect(30, 27, 2, 8, PALETTE.c); arcade.rect(27, 30, 8, 2, PALETTE.c);
arcade.rect(8, 10, 2, 2, PALETTE.P); arcade.rect(49, 51, 2, 2, PALETTE.P);
writeFileSync(join(wallDir, 'arcade.png'), arcade.png());

if (process.argv.includes('--sheet')) {
  const keys = Object.keys(ICONS);
  const cols = 10, cell = 40;
  const cv = canvas(cols * cell, Math.ceil(keys.length / cols) * cell, PALETTE.t);
  keys.forEach((k, i) => { const large = native32(k); cv.sprite(large ?? ICONS[k][1], (i % cols) * cell + 4, Math.floor(i / cols) * cell + 4, large ? 1 : 2); });
  const out = process.argv[process.argv.indexOf('--sheet') + 1];
  writeFileSync(out, cv.png());
  console.log('sheet:', keys.join(', '));
}

console.log(`Generated ${Object.keys(ICONS).length} icons x3 sizes, ${glyphs.length} UI glyphs, favicon, OG image, ${Object.keys(patterns).length} wallpapers.`);

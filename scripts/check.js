// Minimal smoke check — no deps. Run: npm run check
// 1) node --check every js file 2) registry has 12 ids 3) audio tunes cover all modes
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsFiles = [
  'js/audio.js', 'js/gore.js', 'js/characters.js', 'js/shared.js',
  'js/xl-mode.js', 'js/game.js', 'js/modes/registry.js',
  'js/modes/zombie-arena.js', 'js/modes/leaderboard.js',
  'js/modes/topdown-modes.js', 'js/modes/waves.js',
  'js/modes/stick-invaders.js', 'js/modes/platform-raid.js',
  'js/modes/animated-xl.js', 'js/modes/drone-drive.js',
  'js/modes/jet-side.js', 'js/modes/stick-tetris.js'
];

let fail = 0;
function ok(msg) { console.log('ok - ' + msg); }
function bad(msg) { fail += 1; console.error('FAIL - ' + msg); }

// 1) syntax
for (const f of jsFiles) {
  try {
    execSync('node --check ' + JSON.stringify(path.join(root, f)), { stdio: 'pipe' });
    ok('syntax ' + f);
  } catch (e) {
    bad('syntax ' + f + ': ' + (e.stdout || e.message));
  }
}

// 2) ids registered
const src = jsFiles
  .filter((f) => f.includes('/modes/') && f !== 'js/modes/registry.js')
  .map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const ids = [...src.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1])
  .filter((id) => !/^[A-Z]$/.test(id) && !['arena', 'animatedxl', 'dronechase', 'sidescroll'].includes(id));
const expected = ['zombie', 'stickmanisland', 'dronedrive', 'jetside', 'stickinvaders',
  'platform', 'sticktetris', 'shooters', 'medkits', 'variants', 'waves', 'leaderboard'];
for (const id of expected) {
  if (ids.includes(id)) ok('mode id ' + id);
  else bad('missing mode id ' + id);
}

// 3) audio tunes
const audio = fs.readFileSync(path.join(root, 'js/audio.js'), 'utf8');
for (const id of expected) {
  if (audio.includes(id + ':') || audio.includes("'" + id + "'")) ok('tune ' + id);
  else bad('missing tune ' + id);
}
if (/animatedxl:\s*\[/.test(audio)) bad('dead tune animatedxl still present');
if (/setTimeout\(function \(\) \{ g\.ui\.waveBanner/.test(src)) bad('raw setTimeout banner still used in modes');

// 4) script order in index.html
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
const need = ['js/audio.js', 'js/shared.js', 'js/xl-mode.js', 'js/modes/registry.js', 'js/game.js'];
let lastIdx = -1;
for (const n of need) {
  const i = order.indexOf(n);
  if (i > lastIdx) { ok('order ' + n); lastIdx = i; }
  else bad('order wrong for ' + n + ' got ' + JSON.stringify(order));
}
if (/\?v=/.test(html)) bad('cache-buster ?v= still in index.html');

if (fail) { console.error(fail + ' check(s) failed'); process.exit(1); }
console.log('all checks passed');

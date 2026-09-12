// Minimal smoke check — no deps. Run: npm run check
// 1) node --check every js file 2) registry has 12 ids 3) audio tunes cover all modes
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsFiles = [
  'js/audio.js', 'js/keyboard.js', 'js/gore.js', 'js/characters.js', 'js/shared.js',
  'js/xl-mode.js', 'js/game.js', 'js/modes/registry.js',
  'js/modes/horde-survival.js',
  'js/modes/waves.js',
  'js/modes/stick-invaders.js', 'js/modes/platform-raid.js',
  'js/modes/animated-xl.js', 'js/modes/drone-drive.js',
  'js/modes/jet-side.js', 'js/modes/stick-tetris.js',
  'js/modes/sniper-range.js'
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
const expected = ['horde', 'zombie', 'shooters', 'medkits', 'variants', 'leaderboard', 'stickmanisland', 'dronedrive', 'jetside', 'stickinvaders', 'platform', 'sticktetris', 'waves', 'sniperrange'];
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
const need = ['js/audio.js', 'js/keyboard.js', 'js/shared.js', 'js/xl-mode.js', 'js/modes/registry.js', 'js/game.js'];
let lastIdx = -1;
for (const n of need) {
  const i = order.indexOf(n);
  if (i > lastIdx) { ok('order ' + n); lastIdx = i; }
  else bad('order wrong for ' + n + ' got ' + JSON.stringify(order));
}
if (/\?v=/.test(html)) bad('cache-buster ?v= still in index.html');

// 5) pause + continue-from-death features
if (!html.includes('id="pause-btn"')) bad('pause button missing in index.html');
else ok('pause button in index.html');
if (!html.includes('id="resume-btn"')) bad('resume button missing in index.html');
else ok('resume button in index.html');
const gs = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
for (const fn of ['function togglePause', 'function resumeGame', 'function buildSnapshot',
  'function persistSave', 'function loadSave', 'function clearSave', 'function updateBestProgress']) {
  if (gs.includes(fn)) ok('game ' + fn.replace('function ', ''));
  else bad('missing game fn ' + fn);
}
for (const key of ['SAVE_KEY_PREFIX = \'stickmanCommandoSave_\'', "WAVES_BEST_KEY = 'stickmanCommandoWavesBest'", "INVADERS_BEST_KEY = 'stickmanCommandoInvadersBest'"]) {
  if (gs.includes(key)) ok('game ' + key.split(' =')[0]);
  else bad('missing game key ' + key);
}
if (gs.includes('function syncResumeButton')) ok('game syncResumeButton');
else bad('missing game fn syncResumeButton');
if (gs.includes('LEGACY_SAVE_KEY')) ok('game LEGACY_SAVE_KEY');
else bad('missing game LEGACY_SAVE_KEY');
if (gs.includes('clearSave();') && /function resetGame\(\) \{\s*clearSave\(\)/.test(gs)) {
  bad('resetGame should not clearSave (continues survive Deploy)');
} else {
  ok('resetGame does not clearSave');
}

// 6) synth keyboard
if (!html.includes('id="keyboard-panel"')) bad('keyboard panel missing in index.html');
else ok('keyboard panel in index.html');
if (!html.includes('id="keyboard-toggle-btn"')) bad('keyboard toggle missing in index.html');
else ok('keyboard toggle in index.html');
if (!html.includes('js/keyboard.js')) bad('keyboard.js not in index.html');
else ok('keyboard.js in index.html');
if (!audio.includes('playKeyNote')) bad('playKeyNote missing in audio.js');
else ok('audio playKeyNote');
if (!gs.includes('function playModeDemo')) bad('playModeDemo missing in game.js');
else ok('game playModeDemo');
if (!gs.includes('function syncKeyboardUi')) bad('syncKeyboardUi missing in game.js');
else ok('game syncKeyboardUi');

if (fail) { console.error(fail + ' check(s) failed'); process.exit(1); }
console.log('all checks passed');

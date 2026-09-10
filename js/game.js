(function () {
  'use strict';

  var S = window.GameShared;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var overlayTitle = document.getElementById('overlay-title');
  var overlaySubtitle = document.getElementById('overlay-subtitle');
  var overlayHint = document.getElementById('overlay-hint');
  var modePicker = document.getElementById('mode-picker');
  var startBtn = document.getElementById('start-btn');
  var autoshootBtn = document.getElementById('autoshoot-btn');
  var resumeBtn = document.getElementById('resume-btn');
  var hudAutoshoot = document.getElementById('hud-autoshoot');
  var exitBtn = document.getElementById('exit-btn');
  var speedBtn = document.getElementById('speed-btn');
  var pauseBtn = document.getElementById('pause-btn');
  var playControls = document.getElementById('play-controls');
  var modelBtn = document.getElementById('model-btn');
  var modelModal = document.getElementById('model-modal');
  var modelModalGrid = document.getElementById('model-modal-grid');
  var modelModalPreview = document.getElementById('model-modal-preview');
  var modelModalClose = document.getElementById('model-modal-close');
  var modeBadge = document.getElementById('mode-badge');
  var waveBanner = document.getElementById('wave-banner');
  var healthFill = document.getElementById('health-fill');
  var healthText = document.getElementById('health-text');
  var scoreEl = document.getElementById('score');
  var highScoreEl = document.getElementById('high-score');
  var gameWrapper = document.getElementById('game-wrapper');

  var ZOMBIE_GRID = 48;
  var AUTO_SHOOT_KEY = 'stickmanCommandoAutoshoot';
  var CHARACTER_KEY = 'stickmanCommandoCharacter';
  var HIGH_SCORE_PREFIX = 'stickmanCommandoHighScore_';
  var SAVE_KEY = 'stickmanCommandoSave';
  var WAVES_BEST_KEY = 'stickmanCommandoWavesBest';
  var INVADERS_BEST_KEY = 'stickmanCommandoInvadersBest';
  var STATE = { INTRO: 'intro', MODES: 'modes', PLAYING: 'playing', GAMEOVER: 'gameover' };

  var MOCK_LEADERBOARD = [
    { name: 'GhostOps', score: 1240 },
    { name: 'StickSniper', score: 980 },
    { name: 'NightRaid', score: 870 },
    { name: 'ZeroHour', score: 650 },
    { name: 'You?', score: 0 }
  ];

  var state = STATE.INTRO;
  var currentModeId = 'horde';
  var mode = null;
  var keys = {};
  var lastTime = 0;
  var spawnTimer = 0;
  var difficultyTimer = 0;
  var shakeTimer = 0;

  var player = null;
  var bullets = [];
  var enemyBullets = [];
  var enemies = [];
  var particles = [];
  var pickups = [];
  var truck = null;
  var camera = { x: 0, y: 0 };
  var animTime = 0;
  var obstacles = [];
  var bannerTimer = 0;

  var score = 0;
  var highScore = 0;
  var spawnInterval = 2.2;
  var maxEnemies = 12;
  var wave = { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };
  var zombieKillCount = 0;

  var autoShoot = localStorage.getItem(AUTO_SHOOT_KEY) === '1';
  var characterModel = localStorage.getItem(CHARACTER_KEY) || 'classic';
  var mouse = { x: 0, y: 0, down: false, active: false };
  var SPEED_STEPS = [1, 2, 0.5];
  var SPEED_LABELS = ['1×', '2×', '½×'];
  var speedIndex = 0;
  var gameSpeed = 1;
  var expandedModeId = null;
  var paused = false;
  var lastSave = null;

  var g = {
    canvas: canvas,
    ctx: ctx,
    gameWrapper: gameWrapper,
    ui: {
      overlay: overlay,
      waveBanner: waveBanner,
      modeBadge: modeBadge,
      healthFill: healthFill,
      healthText: healthText,
      scoreEl: scoreEl,
      highScoreEl: highScoreEl
    },
    STATE: STATE,
    ZOMBIE_GRID: ZOMBIE_GRID,
    keys: keys,
    mouse: mouse,
    camera: camera,
    truck: truck,
    player: player,
    bullets: bullets,
    enemyBullets: enemyBullets,
    enemies: enemies,
    particles: particles,
    pickups: pickups,
    obstacles: obstacles,
    score: score,
    highScore: highScore,
    spawnTimer: spawnTimer,
    difficultyTimer: difficultyTimer,
    shakeTimer: shakeTimer,
    animTime: animTime,
    spawnInterval: spawnInterval,
    maxEnemies: maxEnemies,
    wave: wave,
    zombieKillCount: zombieKillCount,
    characterModel: characterModel,
    autoShoot: autoShoot,
    state: state,
    mode: mode,
    modeId: currentModeId,
    getWorldMouse: getWorldMouse,
    hurtPlayer: hurtPlayer,
    updateHud: updateHud,
    showBanner: showBanner,
    endGame: function () { endGame(); }
  };

  function showBanner(text, duration) {
    waveBanner.textContent = text;
    waveBanner.classList.add('visible');
    bannerTimer = duration != null ? duration : 1.4;
  }

  function tickBanner(dt) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) {
        bannerTimer = 0;
        waveBanner.classList.remove('visible');
      }
    }
  }

  // ── Pause ────────────────────────────────────────────────────────────
  function resetPauseUi() {
    paused = false;
    if (pauseBtn) {
      pauseBtn.textContent = '⏸';
      pauseBtn.title = 'Pause (P)';
    }
    if (gameWrapper) gameWrapper.classList.remove('paused');
    waveBanner.classList.remove('visible');
    bannerTimer = 0;
  }

  function togglePause() {
    if (state !== STATE.PLAYING || !player) return;
    paused = !paused;
    if (pauseBtn) {
      pauseBtn.textContent = paused ? '▶' : '⏸';
      pauseBtn.title = paused ? 'Resume (P)' : 'Pause (P)';
    }
    if (gameWrapper) gameWrapper.classList.toggle('paused', paused);
    if (paused) {
      waveBanner.textContent = 'PAUSED';
      waveBanner.classList.add('visible');
      bannerTimer = 0; // stays up until unpaused
    } else {
      waveBanner.classList.remove('visible');
    }
  }

  // ── Continue-from-death snapshot ─────────────────────────────────────
  // Fields on g that we manage with dedicated locals/fields in the snapshot.
  var SNAPSHOT_SKIP = {
    canvas: 1, ctx: 1, gameWrapper: 1, ui: 1, keys: 1, mouse: 1,
    player: 1, truck: 1, bullets: 1, enemyBullets: 1, enemies: 1,
    particles: 1, pickups: 1, obstacles: 1, camera: 1,
    state: 1, mode: 1, modeId: 1, STATE: 1,
    highScore: 1, score: 1, autoShoot: 1, characterModel: 1,
    wave: 1, zombieKillCount: 1, spawnTimer: 1, difficultyTimer: 1,
    spawnInterval: 1, maxEnemies: 1, shakeTimer: 1, animTime: 1
  };

  function buildSnapshot() {
    var snap = {
      modeId: currentModeId,
      score: score,
      player: player,
      truck: truck,
      bullets: bullets,
      enemyBullets: enemyBullets,
      enemies: enemies,
      particles: particles,
      pickups: pickups,
      obstacles: obstacles,
      camera: camera,
      animTime: animTime,
      zombieKillCount: zombieKillCount,
      spawnTimer: spawnTimer,
      difficultyTimer: difficultyTimer,
      spawnInterval: spawnInterval,
      maxEnemies: maxEnemies,
      wave: wave,
      extra: {}
    };
    for (var k in g) {
      if (!Object.prototype.hasOwnProperty.call(g, k)) continue;
      if (SNAPSHOT_SKIP[k]) continue;
      var v = g[k];
      if (typeof v === 'function' || v === g || v === document) continue;
      try {
        if (JSON.stringify(v) !== undefined) snap.extra[k] = v;
      } catch (err) { /* skip non-serializable leftovers */ }
    }
    return snap;
  }

  function persistSave() {
    try {
      lastSave = buildSnapshot();
      localStorage.setItem(SAVE_KEY, JSON.stringify(lastSave));
    } catch (err) {
      console.warn('Save failed:', err);
    }
  }

  function loadSave() {
    if (lastSave) return lastSave;
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      lastSave = raw ? JSON.parse(raw) : null;
    } catch (err) {
      lastSave = null;
    }
    return lastSave;
  }

  function clearSave() {
    lastSave = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ }
  }

  function resumeGame() {
    var snap = loadSave();
    if (!snap || !snap.player) return;
    paused = false;

    if (snap.modeId && currentModeId !== snap.modeId) {
      currentModeId = snap.modeId;
      selectMode(currentModeId);
    }
    setCanvasForMode();
    mode = resolveMode();

    // Island worlds are generated once per run; rebuild if we came back
    // after a full page reload.
    if (flag('xl') && window.XLMode && !XLMode.hasWorld()) {
      XLMode.generateWorld((snap.extra && snap.extra.islandSeed) || Date.now());
    }

    player = snap.player;
    bullets = snap.bullets || [];
    enemyBullets = snap.enemyBullets || [];
    enemies = snap.enemies || [];
    particles = snap.particles || [];
    pickups = snap.pickups || [];
    obstacles = snap.obstacles || [];
    truck = snap.truck || null;
    camera = snap.camera || { x: 0, y: 0 };
    animTime = snap.animTime || 0;
    zombieKillCount = snap.zombieKillCount || 0;
    spawnTimer = snap.spawnTimer || 0;
    difficultyTimer = snap.difficultyTimer || 0;
    spawnInterval = snap.spawnInterval != null ? snap.spawnInterval : 2.2;
    maxEnemies = snap.maxEnemies != null ? snap.maxEnemies : 12;
    wave = snap.wave || { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };
    score = snap.score || 0;

    // Dodge a dead-on-arrival continue: 1hp if you died with 0.
    if (player.health != null && player.health <= 0) player.health = 1;

    if (snap.extra) {
      for (var k in snap.extra) {
        if (Object.prototype.hasOwnProperty.call(snap.extra, k)) {
          g[k] = snap.extra[k];
        }
      }
    }

    syncGRefs();
    pullFromG();

    state = STATE.PLAYING;
    hideOverlay();
    setPlayControlsVisible(true);
    hudAutoshoot.hidden = false;
    loadHighScoreForMode(currentModeId);
    updateHud();
    clearSave();
    GameAudio.resume();
  }

  function updateBestProgress() {
    // Persistent progression for wave-based modes.
    var n = 0;
    var key = null;
    if (currentModeId === 'waves') {
      n = (wave && wave.number) || 0;
      key = WAVES_BEST_KEY;
    } else if (currentModeId === 'stickinvaders') {
      n = (g.invaders && g.invaders.wave) || 0;
      key = INVADERS_BEST_KEY;
    }
    if (!n || !key) return;
    var stored = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    if (n > stored) {
      localStorage.setItem(key, String(n));
      g.highestWave = n;
      g.bestWave = n;
    }
  }

  function syncGRefs() {
    g.player = player;
    g.truck = truck;
    g.bullets = bullets;
    g.enemyBullets = enemyBullets;
    g.enemies = enemies;
    g.particles = particles;
    g.pickups = pickups;
    g.obstacles = obstacles;
    g.camera = camera;
    g.state = state;
    g.mode = mode;
    g.modeId = currentModeId;
    g.characterModel = characterModel;
    g.shakeTimer = shakeTimer;
    g.animTime = animTime;
    g.score = score;
    g.highScore = highScore;
    g.spawnTimer = spawnTimer;
    g.difficultyTimer = difficultyTimer;
    g.spawnInterval = spawnInterval;
    g.maxEnemies = maxEnemies;
    g.wave = wave;
    g.zombieKillCount = zombieKillCount;
  }

  function pullFromG() {
    spawnTimer = g.spawnTimer;
    difficultyTimer = g.difficultyTimer;
    spawnInterval = g.spawnInterval;
    maxEnemies = g.maxEnemies;
    score = g.score;
    zombieKillCount = g.zombieKillCount;
    wave = g.wave;
    truck = g.truck;
    obstacles = g.obstacles;
    shakeTimer = g.shakeTimer;
  }

  function syncSpeedUi() {
    speedBtn.textContent = SPEED_LABELS[speedIndex];
    speedBtn.title = 'Game speed: ' + SPEED_LABELS[speedIndex];
  }

  function toggleSpeed() {
    speedIndex = (speedIndex + 1) % SPEED_STEPS.length;
    gameSpeed = SPEED_STEPS[speedIndex];
    syncSpeedUi();
  }

  function setPlayControlsVisible(visible) {
    playControls.hidden = !visible;
    if (!visible) resetPauseUi();
  }

  function resolveMode() {
    var m = GameModes.get(currentModeId) || GameModes.get('horde');
    if (!m) {
      console.error('No modes registered; falling back to stub');
      return { id: 'stub', name: 'Stub', desc: '', hint: '', flags: {} };
    }
    return m;
  }

  // Back-compat: some modes still write g.ui.waveBanner directly.
  // Route those writes through the central banner timer.
  function armWaveBannerCompat() {
    if (!waveBanner || waveBanner.__bannerPatched) return;
    waveBanner.__bannerPatched = true;
    var origAdd = waveBanner.classList.add.bind(waveBanner.classList);
    waveBanner.classList.add = function (cls) {
      var r = origAdd.apply(null, arguments);
      if (cls === 'visible' && bannerTimer <= 0) bannerTimer = 1.4;
      return r;
    };
  }

  function flag(name) {
    return mode && mode.flags && mode.flags[name];
  }

  syncModelBtn();
  armWaveBannerCompat();
  try {
    mode = resolveMode();
    buildModePicker();
  } catch (err) {
    console.error('Menu build failed:', err);
  }
  setCanvasForMode();
  syncAutoshootUi();
  syncSpeedUi();
  loadHighScoreForMode(currentModeId);

  function syncAutoshootUi() {
    var label = autoShoot ? 'Auto: ON' : 'Auto: OFF';
    autoshootBtn.textContent = label;
    autoshootBtn.classList.toggle('on', autoShoot);
    hudAutoshoot.textContent = label;
    hudAutoshoot.classList.toggle('on', autoShoot);
  }

  function toggleAutoshoot() {
    autoShoot = !autoShoot;
    g.autoShoot = autoShoot;
    localStorage.setItem(AUTO_SHOOT_KEY, autoShoot ? '1' : '0');
    syncAutoshootUi();
  }

  function getModelName(id) {
    if (!window.CharacterModels) return 'Classic';
    for (var i = 0; i < CharacterModels.list.length; i++) {
      if (CharacterModels.list[i].id === id) return CharacterModels.list[i].name;
    }
    return 'Classic';
  }

  function drawModelPreview(canvasEl) {
    if (!canvasEl || !window.CharacterModels) return;
    var pctx = canvasEl.getContext('2d');
    pctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    pctx.fillStyle = '#0d1117';
    pctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    var bob = Math.sin(animTime * 3) * 2;
    CharacterModels.draw(pctx, characterModel, canvasEl.width / 2, canvasEl.height / 2 + bob, 1, 0, { armed: true });
  }

  function closeModelModal() {
    modelModal.hidden = true;
    modelModal.setAttribute('aria-hidden', 'true');
  }

  function openModelModal() {
    buildModelModalGrid();
    drawModelPreview(modelModalPreview);
    modelModal.hidden = false;
    modelModal.setAttribute('aria-hidden', 'false');
  }

  function selectCharacterModel(id) {
    characterModel = id;
    g.characterModel = characterModel;
    localStorage.setItem(CHARACTER_KEY, characterModel);
    modelBtn.textContent = 'Model · ' + getModelName(characterModel);
    buildModelModalGrid();
    drawModelPreview(modelModalPreview);
  }

  function buildModelModalGrid() {
    if (!window.CharacterModels) return;
    modelModalGrid.innerHTML = '';
    CharacterModels.list.forEach(function (model) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'model-pick' + (model.id === characterModel ? ' selected' : '');
      btn.textContent = model.name;
      btn.addEventListener('click', function () {
        selectCharacterModel(model.id);
      });
      modelModalGrid.appendChild(btn);
    });
  }

  function syncModelBtn() {
    if (!modelBtn) return;
    modelBtn.textContent = 'Model · ' + getModelName(characterModel);
  }

  function canvasPoint(evt) {
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width;
    var sy = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy
    };
  }

  function getWorldMouse() {
    if (mode && mode.getWorldMouse) return mode.getWorldMouse(g);
    if (flag('xl') && player) {
      return { x: mouse.x + camera.x, y: mouse.y + camera.y };
    }
    return { x: mouse.x, y: mouse.y };
  }

  function exitToMenu() {
    var wasInGame = state === STATE.PLAYING || state === STATE.GAMEOVER;
    state = STATE.MODES;
    syncGRefs();
    // Keep a snapshot when quitting mid-run or after death so "Continue"
    // is available from the menu. Fresh deploys clear it in resetGame().
    if (wasInGame && player) persistSave();
    setPlayControlsVisible(false);
    hudAutoshoot.hidden = true;
    Gore.clear();
    resetPauseUi();
    showModeSelect();
  }

  // Merged legacy redirects stay registered (old saves/scores carry over)
  // but stay off the landing grid — Horde Survival is the single card.
  var HIDDEN_FROM_PICKER = { zombie: true, shooters: true, medkits: true, variants: true, leaderboard: true };

  function isHiddenFromPicker(id) {
    if (!HIDDEN_FROM_PICKER) return false;
    return !!HIDDEN_FROM_PICKER[id];
  }

  function buildModePicker() {
    modePicker.innerHTML = '';
    var entries = [];
    try {
      entries = GameModes.list();
    } catch (err) {
      console.error('Menu build failed:', err);
      entries = [];
    }
    var visible = entries.filter(function (entry) {
      return entry && entry.id && !isHiddenFromPicker(entry.id);
    });
    if (visible.length === 0 && entries.length > 0) {
      // never show an empty menu — fall back to all entries
      console.warn('Mode filter hid everything; showing all modes');
      visible = entries.filter(function (entry) { return entry && entry.id; });
    }
    visible.forEach(function (entry) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mode-card' + (entry.id === currentModeId ? ' selected' : '');
      if (entry.id === expandedModeId) card.classList.add('expanded');
      card.dataset.mode = entry.id;
      card.innerHTML =
        '<div class="mode-card-head"><h3>' + entry.name + '</h3><span class="mode-chevron">▸</span></div>' +
        '<p class="mode-desc">' + entry.desc + '</p>';

      card.addEventListener('click', function (e) {
        if (e.target.classList.contains('mode-chevron')) return;
        selectMode(entry.id);
        GameAudio.resume();
        GameAudio.playModeTune(entry.id);
      });

      card.querySelector('.mode-chevron').addEventListener('click', function (e) {
        e.stopPropagation();
        selectMode(entry.id);
        if (card.classList.contains('expanded')) {
          card.classList.remove('expanded');
          expandedModeId = null;
        } else {
          modePicker.querySelectorAll('.mode-card').forEach(function (c) {
            c.classList.remove('expanded');
          });
          card.classList.add('expanded');
          expandedModeId = entry.id;
        }
        GameAudio.resume();
        GameAudio.playModeTune(entry.id);
      });

      modePicker.appendChild(card);
    });
  }

  function setCanvasForMode() {
    mode = resolveMode();
    if (mode.setCanvas) {
      mode.setCanvas(g);
    } else {
      canvas.width = 960;
      canvas.height = 540;
      gameWrapper.classList.remove('xl-mode');
    }
    if (mode.onCanvasResize) mode.onCanvasResize(g);
    syncGRefs();
  }

  function selectMode(modeId) {
    currentModeId = modeId;
    mode = resolveMode();
    setCanvasForMode();
    loadHighScoreForMode(modeId);
    overlayHint.textContent = mode.hint;
    overlaySubtitle.textContent = mode.desc;
    buildModePicker();
  }

  function loadHighScoreForMode(modeId) {
    var m = GameModes.get(modeId);
    var stored = localStorage.getItem(HIGH_SCORE_PREFIX + modeId);
    if (!stored && m && m.legacyHighScoreKeys) {
      for (var i = 0; i < m.legacyHighScoreKeys.length; i++) {
        stored = localStorage.getItem(HIGH_SCORE_PREFIX + m.legacyHighScoreKeys[i]);
        if (stored) break;
      }
    }
    highScore = stored ? parseInt(stored, 10) : 0;
    g.highScore = highScore;
    highScoreEl.textContent = highScore;
  }

  function saveHighScore(value) {
    localStorage.setItem(HIGH_SCORE_PREFIX + currentModeId, String(value));
    highScoreEl.textContent = value;
  }

  function resetGame() {
    clearSave();
    mode = resolveMode();
    setCanvasForMode();
    Gore.clear();

    if (mode.createPlayer) {
      player = mode.createPlayer(g);
    } else {
      player = S.defaultTopDownPlayer(g);
    }

    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    obstacles = [];
    truck = null;
    camera = { x: 0, y: 0 };
    animTime = 0;
    zombieKillCount = 0;
    score = 0;
    spawnTimer = 0;
    difficultyTimer = 0;
    spawnInterval = 2.2;
    maxEnemies = 12;
    wave = { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };

    syncGRefs();
    if (mode.reset) mode.reset(g);
    pullFromG();

    waveBanner.classList.remove('visible');
    waveBanner.textContent = '';
    updateHud();
    modeBadge.hidden = false;
    modeBadge.textContent = mode.name;
  }

  function updateHud() {
    var pct = Math.max(0, player.health / player.maxHealth * 100);
    healthFill.style.width = pct + '%';
    healthFill.classList.toggle('low', pct <= 40 && pct > 20);
    healthFill.classList.toggle('critical', pct <= 20);
    healthText.textContent = Math.max(0, Math.ceil(player.health));
    scoreEl.textContent = score;
  }

  function showOverlay(title, subtitle, options) {
    options = options || {};
    overlay.classList.remove('hidden');
    overlayTitle.textContent = title;
    overlaySubtitle.textContent = subtitle;
    startBtn.hidden = !options.showDeploy;
    autoshootBtn.hidden = !options.showDeploy;
    modelBtn.hidden = !options.showDeploy;
    modePicker.hidden = !options.showPicker;
    if (overlayBody) overlayBody.classList.toggle('picking-modes', !!options.showPicker);
    if (options.showDeploy) syncModelBtn();
    closeModelModal();
    startBtn.textContent = options.deployLabel || 'Deploy';

    // Continue-from-death: offer whenever a usable snapshot exists
    resumeBtn.hidden = true;
    if (options.showResume) {
      var snap = loadSave();
      if (snap && snap.player) {
        resumeBtn.hidden = false;
        resumeBtn.textContent = 'Continue · ' + (snap.score || 0);
      }
    }

    var existingBoard = document.getElementById('mock-leaderboard');
    if (existingBoard) existingBoard.remove();

    if (options.mockLeaderboard) {
      var board = document.createElement('div');
      board.id = 'mock-leaderboard';
      board.innerHTML = '<h3>Global ranks (demo)</h3><ol></ol><p style="margin-top:8px;font-size:0.72rem;color:#6e7681">Not connected — mock data only</p>';
      var list = board.querySelector('ol');
      var entries = MOCK_LEADERBOARD.slice(0, 4).concat([{ name: 'You', score: score }]);
      entries.sort(function (a, b) { return b.score - a.score; });
      entries.forEach(function (entry) {
        var li = document.createElement('li');
        if (entry.name === 'You') li.className = 'you';
        li.innerHTML = '<span>' + entry.name + '</span><span>' + entry.score + '</span>';
        list.appendChild(li);
      });
      overlaySubtitle.after(board);
    }
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    var existingBoard = document.getElementById('mock-leaderboard');
    if (existingBoard) existingBoard.remove();
  }

  function startIntro() {
    state = STATE.INTRO;
    syncGRefs();
    showOverlay('Stickman Commando', 'Loading mission brief...', {});
    GameAudio.playIntroSting().then(showModeSelect);
  }

  function showModeSelect() {
    state = STATE.MODES;
    syncGRefs();
    Gore.clear();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    syncGRefs();
    resetPauseUi();
    selectMode(currentModeId);
    showOverlay('Pick a demo', mode.desc, {
      showPicker: true, showDeploy: true, deployLabel: 'Deploy',
      showResume: true
    });
    GameAudio.playModeTune(currentModeId);
  }

  function launchGame() {
    startGame();
    try {
      var p = GameAudio.resume();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (err) { /* audio optional */ }
  }

  function startGame() {
    resetGame();
    resetPauseUi();
    state = STATE.PLAYING;
    syncGRefs();
    hideOverlay();
    setPlayControlsVisible(true);
    hudAutoshoot.hidden = false;
    GameAudio.resume();
  }

  function endGame() {
    if (state === STATE.GAMEOVER) return;
    state = STATE.GAMEOVER;
    syncGRefs();
    if (score > highScore) {
      highScore = score;
      g.highScore = highScore;
      saveHighScore(highScore);
    }
    persistSave();
    updateBestProgress();
    showOverlay(
      'KIA',
      'Score: ' + score + (score >= highScore && score > 0 ? ' — New best!' : ''),
      {
        showDeploy: true,
        deployLabel: 'Redeploy',
        mockLeaderboard: flag('mockLeaderboard'),
        showResume: true
      }
    );
    setPlayControlsVisible(true);
    hudAutoshoot.hidden = true;
  }

  function shoot() {
    if (player.shootCooldown > 0) return;

    var dx = player.aimX;
    var dy = player.aimY;
    if (mode.getShootVector) {
      var sv = mode.getShootVector(g);
      dx = sv.x;
      dy = sv.y;
    }

    var len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    var offset = mode.shootStartOffset ? mode.shootStartOffset(g) : { x: dx * 8, y: dy * 8 };
    var bSpeed = mode.bulletSpeed ? mode.bulletSpeed(g) : 520;

    bullets.push({
      x: player.x + offset.x,
      y: player.y + offset.y,
      vx: dx * bSpeed,
      vy: dy * bSpeed,
      life: flag('droneDrive') ? 1.5 : 1.2
    });

    player.shootCooldown = mode.shootCooldown ? mode.shootCooldown(g) : 0.18;
  }

  function enemyShoot(enemy) {
    var ex = player.x - enemy.x;
    var ey = player.y - enemy.y;
    var len = Math.hypot(ex, ey) || 1;
    enemyBullets.push({
      x: enemy.x,
      y: enemy.y,
      vx: (ex / len) * 180,
      vy: (ey / len) * 180,
      life: 3
    });
  }

  function hurtPlayer(amount) {
    if (player.invuln > 0 || state !== STATE.PLAYING) return;
    player.health -= amount;
    player.invuln = 0.8;
    shakeTimer = 0.25;
    g.shakeTimer = shakeTimer;
    var pColor = mode.hurtParticleColor ? mode.hurtParticleColor(g) : '#58a6ff';
    S.spawnParticles(g, player.x, player.y, pColor, 6);
    updateHud();
    if (player.health <= 0) endGame();
  }

  function killEnemy(index, hitAngle) {
    var e = enemies[index];
    score += e.points || 10;
    g.score = score;
    S.spawnParticles(g, e.x, e.y, e.color || '#f85149', e.isDrone ? 12 : 8);
    if (mode.onKill) mode.onKill(g, e, hitAngle);
    score = g.score;
    enemies.splice(index, 1);
    if (mode.afterKill) mode.afterKill(g);
    score = g.score;
    updateHud();
  }

  function getWorldBounds() {
    if (mode.getWorldBounds) return mode.getWorldBounds(g);
    return { w: canvas.width, h: canvas.height };
  }

  function update(dt) {
    if (state !== STATE.PLAYING) return;
    syncGRefs();

    animTime += dt;
    g.animTime = animTime;

    if (mode.spawn) mode.spawn(g, dt);
    if (mode.move) mode.move(g, dt);
    if (mode.updateObstacles) mode.updateObstacles(g, dt);
    if (mode.tick) mode.tick(g, dt);
    pullFromG();

    if (flag('tetris')) {
      score = g.score;
      updateHud();
      return;
    }

    if (keys[' '] || keys['Space']) shoot();
    else if (autoShoot) shoot();

    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      g.shakeTimer = shakeTimer;
    }
    if (window.Gore) Gore.update(dt);

    var bounds = getWorldBounds();

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || b.x < -20 || b.x > bounds.w + 20 || b.y < -20 || b.y > bounds.h + 20) {
        bullets.splice(i, 1);
        continue;
      }

      if (mode.interceptBullet && mode.interceptBullet(g, b)) {
        bullets.splice(i, 1);
        continue;
      }

      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        var hitRadius = e.radius + (e.isDrone ? 6 : 4);
        if (S.dist(b.x, b.y, e.x, e.y) < hitRadius) {
          bullets.splice(i, 1);
          e.health -= 1;
          if (e.health <= 0) killEnemy(j, Math.atan2(b.vy, b.vx));
          else S.spawnParticles(g, e.x, e.y, e.color, 3);
          break;
        }
      }
    }

    if (flag('enemyShoots')) {
      for (var eb = enemyBullets.length - 1; eb >= 0; eb--) {
        var bullet = enemyBullets[eb];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (bullet.life <= 0 || bullet.x < -20 || bullet.x > bounds.w + 20 || bullet.y < -20 || bullet.y > bounds.h + 20) {
          enemyBullets.splice(eb, 1);
          continue;
        }
        if (mode.interceptEnemyBullet && mode.interceptEnemyBullet(g, bullet)) {
          enemyBullets.splice(eb, 1);
          continue;
        }
        if (S.dist(bullet.x, bullet.y, player.x, player.y) < player.radius + 3) {
          enemyBullets.splice(eb, 1);
          hurtPlayer(12);
        }
      }
    }

    for (var k = enemies.length - 1; k >= 0; k--) {
      var enemy = enemies[k];
      var customResult;

      if (mode.updateEnemy) {
        customResult = mode.updateEnemy(g, dt, enemy, k);
        if (customResult === 'removed') continue;
      } else {
        S.chaseEnemy(g, dt, enemy);
      }

      enemy.wobble += dt * 6;
      if (enemy.animPhase !== undefined) {
        enemy.animPhase += dt * (0.5 + enemy.speed / 80);
      }

      if (flag('enemyShoots') && !flag('invaders') && enemy.shootCooldown !== undefined) {
        enemy.shootCooldown -= dt;
        var range = S.dist(enemy.x, enemy.y, player.x, player.y);
        var sameFloor = flag('platform') ? Math.abs(enemy.y - player.y) < 120 : true;
        if (enemy.shootCooldown <= 0 && range < 320 && range > 40 && sameFloor) {
          enemyShoot(enemy);
          enemy.shootCooldown = 1.4 + Math.random() * 0.8;
        }
      }

      if (customResult !== 'skipContact' && !enemy.isDrone &&
          S.dist(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius) {
        var dmg = mode.contactDamage ? mode.contactDamage(g, enemy) : (enemy.isBrute ? 28 : (enemy.isZombie ? 12 : 18));
        hurtPlayer(dmg);
      }
    }

    for (var pi = pickups.length - 1; pi >= 0; pi--) {
      var pick = pickups[pi];
      pick.bob += dt * 4;
      if (S.dist(pick.x, pick.y, player.x, player.y) < pick.radius + player.radius) {
        player.health = Math.min(player.maxHealth, player.health + 25);
        S.spawnParticles(g, pick.x, pick.y, '#3fb950', 6);
        pickups.splice(pi, 1);
        updateHud();
      }
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var part = particles[p];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.life -= dt;
      if (part.life <= 0) particles.splice(p, 1);
    }
  }

  function renderDefault() {
    if (state !== STATE.PLAYING && state !== STATE.GAMEOVER) {
      ctx.fillStyle = '#1a2332';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.save();

    if (shakeTimer > 0) {
      var shake = shakeTimer * 12;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    var worldCam = mode.getCamera ? mode.getCamera(g) : null;
    if (worldCam) {
      ctx.save();
      ctx.translate(-worldCam.x, -worldCam.y);
    }

    if (mode.drawBackground) {
      mode.drawBackground(g, ctx);
    } else {
      S.drawGridBackground(ctx, canvas, 40);
    }

    S.drawParticles(ctx, particles);

    for (var pk = 0; pk < pickups.length; pk++) {
      var pick = pickups[pk];
      var bobY = Math.sin(pick.bob) * 3;
      ctx.fillStyle = '#3fb950';
      ctx.fillRect(pick.x - 8, pick.y - 8 + bobY, 16, 16);
      ctx.strokeStyle = '#e6edf3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pick.x, pick.y - 5 + bobY);
      ctx.lineTo(pick.x, pick.y + 5 + bobY);
      ctx.moveTo(pick.x - 5, pick.y + bobY);
      ctx.lineTo(pick.x + 5, pick.y + bobY);
      ctx.stroke();
    }

    if (mode.drawObstacles) mode.drawObstacles(g, ctx);

    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      var handled = mode.drawEnemy && mode.drawEnemy(g, ctx, e);
      if (handled) continue;

      var wobbleOffset = Math.sin(e.wobble) * 2;
      var faceX = flag('jetSide') ? -1 : player.x - e.x;
      var faceY = flag('jetSide') ? 0 : player.y - e.y;
      var legSwing = e.isZombie ? Math.sin(e.shamble) * 4 : 0;

      S.drawStickmanUpright(ctx, e.x, e.y + wobbleOffset, faceX, faceY, e.color || '#f85149', e.scale || 1, {
        armed: flag('enemyShoots'),
        zombieArms: e.isZombie && !e.isBrute,
        legSwing: legSwing,
        brute: e.isBrute
      });
    }

    if (state === STATE.PLAYING && !flag('droneDrive')) {
      if (player.invuln <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        if (mode.renderPlayer) {
          mode.renderPlayer(g, ctx);
        } else if (window.CharacterModels && flag('topDown')) {
          CharacterModels.draw(ctx, characterModel, player.x, player.y, player.aimX, player.aimY, { armed: true });
        } else {
          S.drawStickmanUpright(ctx, player.x, player.y, player.aimX, player.aimY, '#58a6ff', 1.1, { armed: true });
        }
      }
    }

    if (state === STATE.PLAYING && flag('droneDrive') && mode.renderPlayer) {
      mode.renderPlayer(g, ctx);
    }

    var bColor = mode.bulletColor ? mode.bulletColor(g) : '#e3b341';
    var bRadius = mode.bulletRadius ? mode.bulletRadius(g) : 3;
    S.drawBullets(ctx, bullets, bColor, bRadius);

    if (flag('enemyShoots')) {
      S.drawBullets(ctx, enemyBullets, '#ff7b72', 4);
    }

    if (window.Gore && flag('gore')) {
      Gore.render(ctx);
    }

    if (worldCam) {
      ctx.restore();
    }

    if (mode.drawHud) mode.drawHud(g, ctx);

    if (mode.renderOverlay) mode.renderOverlay(g, ctx);

    ctx.restore();
  }

  function render() {
    mode = resolveMode();
    syncGRefs();
    g.mode = mode;
    if (!modelModal.hidden) {
      drawModelPreview(modelModalPreview);
    }
    if (mode.render) {
      mode.render(g, ctx);
      return;
    }
    renderDefault();
  }

  function loop(timestamp) {
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    try {
      if (!paused) tickBanner(dt * gameSpeed);
      if (state === STATE.PLAYING && !paused) {
        update(dt * gameSpeed);
      }
      render();
    } catch (err) {
      console.error('Game loop error [mode=' + currentModeId + ' state=' + state + ']:', err);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
    keys[e.key] = true;

    if (e.key === ' ' && state === STATE.MODES && !startBtn.hidden) {
      launchGame();
    }
    if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && state === STATE.PLAYING) {
      togglePause();
    }
  });

  window.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  startBtn.addEventListener('click', launchGame);
  resumeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    resumeGame();
  });

  autoshootBtn.addEventListener('click', toggleAutoshoot);
  hudAutoshoot.addEventListener('click', toggleAutoshoot);
  exitBtn.addEventListener('click', exitToMenu);
  speedBtn.addEventListener('click', toggleSpeed);
  pauseBtn.addEventListener('click', togglePause);

  canvas.addEventListener('mousemove', function (e) {
    var pt = canvasPoint(e);
    mouse.x = pt.x;
    mouse.y = pt.y;
    mouse.active = true;
  });

  canvas.addEventListener('mouseleave', function () {
    mouse.active = false;
  });

  canvas.addEventListener('mousedown', function () {
    mouse.down = true;
  });

  window.addEventListener('mouseup', function () {
    mouse.down = false;
  });

  modelBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openModelModal();
  });

  modelModalClose.addEventListener('click', closeModelModal);
  modelModal.querySelector('.modal-backdrop').addEventListener('click', closeModelModal);

  overlay.addEventListener('click', function (e) {
    if (e.target.closest('.mode-card') || e.target.closest('.mode-chevron') ||
        e.target.closest('#model-modal') || e.target === modelBtn ||
        e.target === startBtn || e.target === autoshootBtn ||
        e.target === resumeBtn) return;
    if (state === STATE.MODES && !startBtn.hidden) {
      launchGame();
    }
    if (state === STATE.GAMEOVER && !startBtn.hidden) {
      launchGame();
    }
  });

  startIntro();
  requestAnimationFrame(loop);
})();

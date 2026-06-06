(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlay-title');
  var overlaySubtitle = document.getElementById('overlay-subtitle');
  var overlayHint = document.getElementById('overlay-hint');
  var modePicker = document.getElementById('mode-picker');
  var startBtn = document.getElementById('start-btn');
  var autoshootBtn = document.getElementById('autoshoot-btn');
  var hudAutoshoot = document.getElementById('hud-autoshoot');
  var exitBtn = document.getElementById('exit-btn');
  var characterPicker = document.getElementById('character-picker');
  var modeBadge = document.getElementById('mode-badge');
  var waveBanner = document.getElementById('wave-banner');
  var healthFill = document.getElementById('health-fill');
  var healthText = document.getElementById('health-text');
  var scoreEl = document.getElementById('score');
  var highScoreEl = document.getElementById('high-score');

  var GROUND_Y = canvas.height - 80;
  var ZOMBIE_GRID = 48;
  var AUTO_SHOOT_KEY = 'stickmanCommandoAutoshoot';
  var CHARACTER_KEY = 'stickmanCommandoCharacter';
  var HIGH_SCORE_PREFIX = 'stickmanCommandoHighScore_';
  var STATE = { INTRO: 'intro', MODES: 'modes', PLAYING: 'playing', GAMEOVER: 'gameover' };

  var MODES = [
    {
      id: 'zombie',
      name: 'Zombie Arena',
      desc: 'Grid-lane horde. Every 10 kills a slow brute rises — 10 hits to drop it.',
      hint: '↑ ↓ ← → or mouse · SPACE shoot · nail the brutes'
    },
    {
      id: 'animatedxl',
      name: 'Animated XL',
      desc: 'Big scrollable wilds — hills, rivers, bridges, trees. Lean stickmen, enemy fire.',
      hint: '↑ ↓ ← → or mouse · SPACE · dodge red bullets · use bridges'
    },
    {
      id: 'dronedrive',
      name: 'Drone Drive',
      desc: 'Terminator-style truck bed turret. Insane road, crosshair sways — pick off chasing drones.',
      hint: '↑ ↓ ← → or mouse aim · SPACE shoot · hold on tight'
    },
    {
      id: 'jetside',
      name: 'Jet Side',
      desc: 'Jetpack between three lanes. Shoot baddies, dodge debris.',
      hint: '↑ ↓ change lane · → thrust · SPACE shoot · mouse aim'
    },
    {
      id: 'shooters',
      name: 'Enemy fire',
      desc: 'Hostiles shoot back when in range. Keep moving.',
      hint: '↑ ↓ ← → or mouse · SPACE shoot · dodge red bullets'
    },
    {
      id: 'waves',
      name: 'Waves',
      desc: 'Clear each wave, short breather, then the next wave hits harder.',
      hint: '↑ ↓ ← → or mouse · SPACE shoot · survive each wave'
    },
    {
      id: 'medkits',
      name: 'Medkits',
      desc: 'Kills sometimes drop green medkits. Walk over them to heal.',
      hint: '↑ ↓ ← → or mouse · SPACE shoot · grab green crosses'
    },
    {
      id: 'variants',
      name: 'Enemy types',
      desc: 'Orange runners, red grunts, purple tanks — different speed and HP.',
      hint: '↑ ↓ ← → or mouse · SPACE shoot · prioritize targets'
    },
    {
      id: 'leaderboard',
      name: 'Leaderboard demo',
      desc: 'Zombie Arena with a mock global scoreboard on game over (not live yet).',
      hint: '↑ ↓ ← → or mouse · SPACE shoot · see mock ranks on death'
    }
  ];

  var ENEMY_TYPES = {
    walker: { color: '#7d9a6a', speed: 32, health: 1, radius: 11, scale: 1, score: 5, zombie: true },
    brute: { color: '#4a3355', speed: 22, health: 10, radius: 18, scale: 1.45, score: 100, zombie: true, isBrute: true },
    grunt: { color: '#f85149', speed: 55, health: 1, radius: 12, scale: 1, score: 10 },
    runner: { color: '#ffa657', speed: 110, health: 1, radius: 10, scale: 0.9, score: 15 },
    tank: { color: '#bc8cff', speed: 35, health: 3, radius: 16, scale: 1.3, score: 30 },
    drone: { color: '#c9d1d9', speed: 95, health: 1, radius: 10, scale: 0.75, score: 20, isDrone: true }
  };

  var JET_LANES = [130, 270, 410];

  var MOCK_LEADERBOARD = [
    { name: 'GhostOps', score: 1240 },
    { name: 'StickSniper', score: 980 },
    { name: 'NightRaid', score: 870 },
    { name: 'ZeroHour', score: 650 },
    { name: 'You?', score: 0 }
  ];

  var state = STATE.INTRO;
  var currentMode = 'zombie';
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
  var gameWrapper = document.getElementById('game-wrapper');

  var score = 0;
  var highScore = 0;
  var spawnInterval = 2.2;
  var maxEnemies = 12;

  var wave = { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };
  var zombieKillCount = 0;
  var obstacles = [];
  var autoShoot = localStorage.getItem(AUTO_SHOOT_KEY) === '1';
  var characterModel = localStorage.getItem(CHARACTER_KEY) || 'classic';
  var mouse = { x: 0, y: 0, down: false, active: false };

  buildCharacterPicker();
  buildModePicker();
  setCanvasForMode();
  syncAutoshootUi();
  loadHighScoreForMode(currentMode);

  function isTopDown() {
    return currentMode === 'zombie' || currentMode === 'shooters' ||
      currentMode === 'waves' || currentMode === 'medkits' ||
      currentMode === 'variants' || currentMode === 'leaderboard';
  }

  function isXLMode() {
    return currentMode === 'animatedxl';
  }

  function isDroneDrive() {
    return currentMode === 'dronedrive';
  }

  function isJetSide() {
    return currentMode === 'jetside';
  }

  function usesMouseMove() {
    return isTopDown() || isXLMode() || currentMode === 'shooters' ||
      currentMode === 'waves' || currentMode === 'medkits' || currentMode === 'variants';
  }

  function syncAutoshootUi() {
    var label = autoShoot ? 'Auto: ON' : 'Auto: OFF';
    autoshootBtn.textContent = label;
    autoshootBtn.classList.toggle('on', autoShoot);
    hudAutoshoot.textContent = label;
    hudAutoshoot.classList.toggle('on', autoShoot);
  }

  function toggleAutoshoot() {
    autoShoot = !autoShoot;
    localStorage.setItem(AUTO_SHOOT_KEY, autoShoot ? '1' : '0');
    syncAutoshootUi();
  }

  function buildCharacterPicker() {
    if (!window.CharacterModels) return;
    characterPicker.innerHTML = '<p class="picker-label">Commando model</p>';
    CharacterModels.list.forEach(function (model) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'char-card' + (model.id === characterModel ? ' selected' : '');
      btn.textContent = model.name;
      btn.dataset.char = model.id;
      btn.addEventListener('click', function () {
        characterModel = model.id;
        localStorage.setItem(CHARACTER_KEY, characterModel);
        buildCharacterPicker();
      });
      characterPicker.appendChild(btn);
    });
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
    if (isXLMode() && player) {
      return { x: mouse.x + camera.x, y: mouse.y + camera.y };
    }
    return { x: mouse.x, y: mouse.y };
  }

  function applyMouseAim() {
    if (!player || !mouse.active) return;
    var wm = getWorldMouse();
    var dx = wm.x - player.x;
    var dy = wm.y - player.y;
    if (Math.hypot(dx, dy) > 8) {
      var len = Math.hypot(dx, dy);
      player.aimX = dx / len;
      player.aimY = dy / len;
    }
  }

  function applyMouseMove(dt) {
    if (!player || !mouse.active || !usesMouseMove()) return;
    var wm = getWorldMouse();
    var dx = wm.x - player.x;
    var dy = wm.y - player.y;
    var dist = Math.hypot(dx, dy);
    if (dist > 18) {
      var spd = player.speed * 0.85 * dt;
      player.x += (dx / dist) * Math.min(spd, dist);
      player.y += (dy / dist) * Math.min(spd, dist);
      if (isXLMode()) {
        if (!XLMode.isWalkable(player.x, player.y)) {
          player.x -= (dx / dist) * Math.min(spd, dist);
          player.y -= (dy / dist) * Math.min(spd, dist);
        }
      } else {
        player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
        player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
      }
    }
  }

  function exitToMenu() {
    state = STATE.MODES;
    exitBtn.hidden = true;
    hudAutoshoot.hidden = true;
    Gore.clear();
    showModeSelect();
  }

  function buildModePicker() {
    modePicker.innerHTML = '';
    MODES.forEach(function (mode) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mode-card' + (mode.id === currentMode ? ' selected' : '');
      card.dataset.mode = mode.id;
      card.innerHTML = '<h3>' + mode.name + '</h3><p>' + mode.desc + '</p>';
      card.addEventListener('click', function () {
        selectMode(mode.id);
        GameAudio.resume();
        GameAudio.playModeTune(mode.id);
      });
      modePicker.appendChild(card);
    });
  }

  function snapGrid(val) {
    return Math.round(val / ZOMBIE_GRID) * ZOMBIE_GRID;
  }

  function setCanvasForMode() {
    if (isXLMode()) {
      canvas.width = XLMode.CANVAS_W;
      canvas.height = XLMode.CANVAS_H;
      gameWrapper.classList.add('xl-mode');
    } else {
      canvas.width = 960;
      canvas.height = 540;
      gameWrapper.classList.remove('xl-mode');
    }
    GROUND_Y = canvas.height - 80;
    if (truck) {
      truck.bedCX = canvas.width / 2;
      truck.bedCY = canvas.height - 98;
    }
  }

  function selectMode(modeId) {
    currentMode = modeId;
    setCanvasForMode();
    loadHighScoreForMode(modeId);
    overlayHint.textContent = getMode().hint;
    overlaySubtitle.textContent = getMode().desc;
    buildModePicker();
  }

  function getMode() {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].id === currentMode) return MODES[i];
    }
    return MODES[0];
  }

  function loadHighScoreForMode(modeId) {
    var stored = localStorage.getItem(HIGH_SCORE_PREFIX + modeId);
    if (!stored && modeId === 'zombie') {
      stored = localStorage.getItem(HIGH_SCORE_PREFIX + 'arena');
    }
    if (!stored && modeId === 'jetside') {
      stored = localStorage.getItem(HIGH_SCORE_PREFIX + 'sidescroll');
    }
    if (!stored && modeId === 'dronedrive') {
      stored = localStorage.getItem(HIGH_SCORE_PREFIX + 'dronechase');
    }
    highScore = stored ? parseInt(stored, 10) : 0;
    highScoreEl.textContent = highScore;
  }

  function saveHighScore(value) {
    localStorage.setItem(HIGH_SCORE_PREFIX + currentMode, String(value));
    highScoreEl.textContent = value;
  }

  function createTruck() {
    return {
      roadT: 0,
      speed: 320,
      bumpY: 0,
      bumpVel: 0,
      pitch: 0,
      roll: 0,
      inertiaX: 0,
      inertiaY: 0,
      bedCX: canvas.width / 2,
      bedCY: canvas.height - 98
    };
  }

  function createPlayer() {
    if (isXLMode()) {
      return {
        x: XLMode.worldPixelW / 2,
        y: XLMode.worldPixelH / 2,
        vx: 0,
        vy: 0,
        speed: 240,
        radius: 14,
        health: 100,
        maxHealth: 100,
        aimX: 1,
        aimY: 0,
        shootCooldown: 0,
        invuln: 0,
        animPhase: 0
      };
    }

    if (isDroneDrive()) {
      return {
        offsetX: 0,
        offsetY: 0,
        x: canvas.width / 2,
        y: canvas.height - 98,
        aimX: 0,
        aimY: -1,
        speed: 260,
        radius: 12,
        health: 100,
        maxHealth: 100,
        shootCooldown: 0,
        invuln: 0
      };
    }

    if (isJetSide()) {
      return {
        x: 100,
        y: JET_LANES[1],
        targetLane: 1,
        vx: 0,
        speed: 280,
        radius: 14,
        health: 100,
        maxHealth: 100,
        aimX: 1,
        aimY: 0,
        facing: 1,
        shootCooldown: 0,
        invuln: 0,
        thrust: 0
      };
    }

    var isSide = false;
    return {
      x: isSide ? 120 : canvas.width / 2,
      y: isSide ? GROUND_Y : canvas.height / 2,
      vx: 0,
      vy: 0,
      speed: isSide ? 200 : 220,
      radius: 14,
      health: 100,
      maxHealth: 100,
      aimX: 1,
      aimY: 0,
      facing: 1,
      shootCooldown: 0,
      invuln: 0,
      grounded: isSide,
      jumpForce: 380
    };
  }

  function resetGame() {
    setCanvasForMode();
    Gore.clear();
    player = createPlayer();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    truck = isDroneDrive() ? createTruck() : null;
    camera = { x: 0, y: 0 };
    animTime = 0;
    zombieKillCount = 0;
    obstacles = [];
    score = 0;
    spawnTimer = 0;
    difficultyTimer = 0;

    if (isXLMode()) {
      XLMode.generateWorld(Date.now());
      spawnInterval = 2;
      maxEnemies = 18;
    } else if (currentMode === 'zombie') {
      spawnInterval = 0.35;
      maxEnemies = 50;
    } else if (currentMode === 'dronedrive') {
      spawnInterval = 1.6;
      maxEnemies = 10;
    } else {
      spawnInterval = 2.2;
      maxEnemies = currentMode === 'waves' ? 99 : 12;
    }

    wave = { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };
    waveBanner.classList.remove('visible');
    waveBanner.textContent = '';
    if (currentMode === 'waves') startNextWave();
    updateHud();
    modeBadge.hidden = false;
    modeBadge.textContent = getMode().name;
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
    characterPicker.hidden = !options.showPicker;
    modePicker.hidden = !options.showPicker;
    startBtn.textContent = options.deployLabel || 'Deploy';

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
    showOverlay('Stickman Commando', 'Loading mission brief...', {});
    GameAudio.playIntroSting().then(showModeSelect);
  }

  function showModeSelect() {
    state = STATE.MODES;
    Gore.clear();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    selectMode(currentMode);
    showOverlay('Pick a demo', getMode().desc, {
      showPicker: true, showDeploy: true, deployLabel: 'Deploy'
    });
    GameAudio.playModeTune(currentMode);
  }

  function startGame() {
    resetGame();
    state = STATE.PLAYING;
    hideOverlay();
    exitBtn.hidden = false;
    hudAutoshoot.hidden = false;
    GameAudio.resume();
  }

  function endGame() {
    if (state === STATE.GAMEOVER) return;
    state = STATE.GAMEOVER;
    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
    }
    showOverlay(
      'KIA',
      'Score: ' + score + (score >= highScore && score > 0 ? ' — New best!' : ''),
      {
        showDeploy: true,
        deployLabel: 'Redeploy',
        mockLeaderboard: currentMode === 'leaderboard'
      }
    );
    exitBtn.hidden = false;
    hudAutoshoot.hidden = true;
  }

  function startNextWave() {
    wave.number += 1;
    wave.toSpawn = 4 + wave.number * 2;
    wave.phase = 'break';
    wave.breakTimer = 2.5;
    wave.bannerTimer = 2;
    waveBanner.textContent = 'Wave ' + wave.number;
    waveBanner.classList.add('visible');
  }

  function roadProfile(t) {
    return Math.sin(t * 0.007) * 55 +
      Math.sin(t * 0.019) * 28 +
      Math.sin(t * 0.003) * 90 +
      Math.sin(t * 0.0012) * 120;
  }

  function roadSlope(t) {
    return (roadProfile(t + 8) - roadProfile(t - 8)) / 16;
  }

  function spawnEnemyAt(x, y, typeKey, extra) {
    if (enemies.length >= maxEnemies) return;
    extra = extra || {};

    var type = ENEMY_TYPES[typeKey || 'grunt'];
    var speed = (extra.speed != null ? extra.speed : type.speed) + Math.min(score * 0.15, 30);

    enemies.push({
      x: x,
      y: y,
      radius: type.radius,
      speed: speed,
      health: type.health,
      maxHealth: type.health,
      wobble: Math.random() * Math.PI * 2,
      shamble: Math.random() * Math.PI * 2,
      type: typeKey || 'grunt',
      color: type.color,
      scale: type.scale,
      points: type.score,
      shootCooldown: 1 + Math.random(),
      isDrone: !!type.isDrone,
      isZombie: !!type.zombie,
      isBrute: !!type.isBrute,
      weave: Math.random() * Math.PI * 2,
      z: extra.z || 0,
      animPhase: Math.random() * 10
    });
  }

  function spawnTopDownEnemy() {
    var margin = 40;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;

    if (edge === 0) { x = Math.random() * canvas.width; y = -margin; }
    else if (edge === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
    else { x = -margin; y = Math.random() * canvas.height; }

    if (currentMode === 'zombie' || currentMode === 'leaderboard') {
      if (edge === 0 || edge === 2) x = snapGrid(x);
      else y = snapGrid(y);
      y = Math.max(ZOMBIE_GRID, Math.min(canvas.height - ZOMBIE_GRID, y));
      x = Math.max(ZOMBIE_GRID, Math.min(canvas.width - ZOMBIE_GRID, x));
      spawnEnemyAt(x, y, 'walker');
      return;
    }

    if (currentMode === 'variants') {
      var roll = Math.random();
      var typeKey = roll < 0.35 ? 'runner' : roll < 0.7 ? 'grunt' : 'tank';
      spawnEnemyAt(x, y, typeKey);
    } else {
      spawnEnemyAt(x, y, 'grunt');
    }
  }

  function spawnBrute() {
    var margin = 50;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;
    if (edge === 0) { x = Math.random() * canvas.width; y = -margin; }
    else if (edge === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
    else { x = -margin; y = Math.random() * canvas.height; }
    if (edge === 0 || edge === 2) x = snapGrid(x);
    else y = snapGrid(y);
    spawnEnemyAt(x, y, 'brute');
    waveBanner.textContent = 'BRUTE!';
    waveBanner.classList.add('visible');
    setTimeout(function () { waveBanner.classList.remove('visible'); }, 1200);
  }

  function spawnWalkerBurst() {
    var n = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < n; i++) spawnTopDownEnemy();
  }

  function spawnXLEnemy() {
    for (var attempt = 0; attempt < 8; attempt++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = 380 + Math.random() * 420;
      var ex = player.x + Math.cos(angle) * dist;
      var ey = player.y + Math.sin(angle) * dist;
      if (XLMode.isWalkable(ex, ey)) {
        spawnEnemyAt(ex, ey, 'grunt');
        return;
      }
    }
  }

  function spawnJetEnemy() {
    var lane = Math.floor(Math.random() * 3);
    spawnEnemyAt(canvas.width + 50, JET_LANES[lane], 'grunt');
    enemies[enemies.length - 1].speed = 120 + Math.random() * 60;
  }

  function spawnJetObstacle() {
    var lane = Math.floor(Math.random() * 3);
    obstacles.push({
      x: canvas.width + 40,
      y: JET_LANES[lane],
      radius: 16,
      speed: 180 + Math.random() * 40
    });
  }

  function spawnDrone() {
    var x = 80 + Math.random() * (canvas.width - 160);
    spawnEnemyAt(x, -30, 'drone', {
      speed: 85 + Math.random() * 40,
      z: 0.2 + Math.random() * 0.5
    });
  }

  function maybeDropMedkit(x, y) {
    if (currentMode !== 'medkits') return;
    if (Math.random() > 0.35) return;
    pickups.push({ x: x, y: y, radius: 10, bob: 0 });
  }

  function shoot() {
    if (player.shootCooldown > 0) return;

    var dx = player.aimX;
    var dy = player.aimY;

    if (isJetSide()) {
      dx = 1;
      dy = 0;
    } else if (isDroneDrive()) {
      dx = 0;
      dy = -1;
    }

    var len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    var startX = player.x + dx * 8;
    var startY = player.y + dy * 8 - (isJetSide() ? 10 : 0);

    bullets.push({
      x: startX,
      y: startY,
      vx: dx * (isDroneDrive() ? 680 : 520),
      vy: dy * (isDroneDrive() ? 680 : 520),
      life: isDroneDrive() ? 1.5 : 1.2
    });

    player.shootCooldown = isDroneDrive() ? 0.14 : 0.18;
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

  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 120;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        color: color
      });
    }
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function hurtPlayer(amount) {
    if (player.invuln > 0 || state !== STATE.PLAYING) return;
    player.health -= amount;
    player.invuln = 0.8;
    shakeTimer = 0.25;
    spawnParticles(player.x, player.y, isDroneDrive() ? '#e3b341' : '#58a6ff', 6);
    updateHud();
    if (player.health <= 0) endGame();
  }

  function killEnemy(index, hitAngle) {
    var e = enemies[index];
    score += e.points || 10;
    spawnParticles(e.x, e.y, e.color || '#f85149', e.isDrone ? 12 : 8);

    if (e.isZombie && !e.isBrute && (currentMode === 'zombie' || currentMode === 'leaderboard')) {
      zombieKillCount += 1;
      if (zombieKillCount % 10 === 0) spawnBrute();
    }

    if (e.isBrute && window.Gore) {
      Gore.spawnExplosion(e.x, e.y, e.color, hitAngle);
      Gore.spawnExplosion(e.x, e.y, e.color, (hitAngle || 0) + 1);
    } else if (e.isZombie && window.Gore) {
      Gore.spawnExplosion(e.x, e.y, e.color || '#7d9a6a', hitAngle);
    }

    maybeDropMedkit(e.x, e.y);
    enemies.splice(index, 1);
    updateHud();
  }

  function handleSpawning(dt) {
    if (isXLMode()) {
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
        spawnTimer = 0;
        spawnXLEnemy();
      }
      difficultyTimer += dt;
      if (difficultyTimer > 12) {
        difficultyTimer = 0;
        spawnInterval = Math.max(0.9, spawnInterval - 0.12);
        maxEnemies = Math.min(28, maxEnemies + 1);
      }
      return;
    }

    if (isDroneDrive()) {
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
        spawnTimer = 0;
        spawnDrone();
        if (score > 80 && Math.random() < 0.4) spawnDrone();
      }
      spawnInterval = Math.max(0.9, 1.7 - score * 0.004);
      return;
    }

    if (isJetSide()) {
      spawnTimer += dt;
      if (spawnTimer >= 1.8 && enemies.length < 8) {
        spawnTimer = 0;
        spawnJetEnemy();
      }
      if (Math.random() < dt * 0.35) spawnJetObstacle();
      return;
    }

    if (currentMode === 'waves') {
      if (wave.phase === 'break') {
        wave.breakTimer -= dt;
        wave.bannerTimer -= dt;
        if (wave.bannerTimer <= 0) waveBanner.classList.remove('visible');
        if (wave.breakTimer <= 0) {
          wave.phase = 'fight';
          waveBanner.textContent = 'Fight!';
          wave.bannerTimer = 1;
          waveBanner.classList.add('visible');
        }
        return;
      }

      while (wave.toSpawn > 0 && enemies.length < maxEnemies) {
        spawnTopDownEnemy();
        wave.toSpawn -= 1;
      }

      if (wave.phase === 'fight' && enemies.length === 0 && wave.toSpawn === 0) {
        startNextWave();
      }
      return;
    }

    if (currentMode === 'zombie' || currentMode === 'leaderboard') {
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
        spawnTimer = 0;
        spawnWalkerBurst();
      }
      difficultyTimer += dt;
      if (difficultyTimer > 20) {
        difficultyTimer = 0;
        spawnInterval = Math.max(0.22, spawnInterval - 0.03);
      }
      return;
    }

    difficultyTimer += dt;
    if (difficultyTimer > 15) {
      difficultyTimer = 0;
      spawnInterval = Math.max(0.8, spawnInterval - 0.15);
      maxEnemies = Math.min(20, maxEnemies + 1);
    }

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
      spawnTimer = 0;
      spawnTopDownEnemy();
    }
  }

  function updateDroneChase(dt) {
    truck.roadT += truck.speed * dt;
    var targetBump = roadProfile(truck.roadT) * 0.55;
    truck.bumpVel += (targetBump - truck.bumpY) * 8 * dt;
    truck.bumpVel *= 0.88;
    truck.bumpY += truck.bumpVel * dt;
    truck.pitch = roadSlope(truck.roadT) * 0.85;
    truck.roll = Math.sin(truck.roadT * 0.011) * 0.12 + truck.bumpVel * 0.008;

    truck.inertiaX += truck.bumpVel * 0.06 + truck.roll * 40 * dt;
    truck.inertiaY += truck.pitch * 32 * dt;
    truck.inertiaX *= 0.86;
    truck.inertiaY *= 0.86;

    var moveX = 0;
    var moveY = 0;
    if (keys['ArrowLeft']) moveX -= 1;
    if (keys['ArrowRight']) moveX += 1;
    if (keys['ArrowUp']) moveY -= 1;
    if (keys['ArrowDown']) moveY += 1;

    if (mouse.active && isDroneDrive()) {
      var aimDx = mouse.x - (truck.bedCX + player.offsetX);
      var aimDy = mouse.y - (truck.bedCY + player.offsetY);
      moveX += Math.max(-1, Math.min(1, aimDx / 80));
      moveY += Math.max(-1, Math.min(1, aimDy / 50));
    }

    if (moveX !== 0 || moveY !== 0) {
      var ml = Math.hypot(moveX, moveY);
      player.offsetX += (moveX / ml) * player.speed * dt;
      player.offsetY += (moveY / ml) * player.speed * dt;
    }

    player.offsetX = Math.max(-85, Math.min(85, player.offsetX));
    player.offsetY = Math.max(-35, Math.min(35, player.offsetY));

    player.x = truck.bedCX + player.offsetX + truck.inertiaX + truck.bumpY * 0.22 + truck.roll * 30;
    player.y = truck.bedCY + player.offsetY + truck.inertiaY + truck.bumpY * 0.55;
    player.aimX = 0;
    player.aimY = -1;
  }

  function updateXLMovement(dt) {
    player.vx = 0;
    player.vy = 0;
    if (keys['ArrowLeft']) player.vx -= 1;
    if (keys['ArrowRight']) player.vx += 1;
    if (keys['ArrowUp']) player.vy -= 1;
    if (keys['ArrowDown']) player.vy += 1;

    if (player.vx !== 0 || player.vy !== 0) {
      var moveLen = Math.hypot(player.vx, player.vy);
      player.aimX = player.vx / moveLen;
      player.aimY = player.vy / moveLen;
      player.animPhase += dt * (1 + moveLen);
    }

    var mult = XLMode.moveSpeedMult(player.x, player.y);
    var spd = player.speed * mult * dt;
    var nx = player.x + player.vx * spd;
    var ny = player.y + player.vy * spd;

    if (XLMode.isWalkable(nx, player.y)) player.x = nx;
    if (XLMode.isWalkable(player.x, ny)) player.y = ny;

    player.x = Math.max(24, Math.min(XLMode.worldPixelW - 24, player.x));
    player.y = Math.max(24, Math.min(XLMode.worldPixelH - 24, player.y));

    if (isXLMode()) {
      applyMouseAim();
      applyMouseMove(dt);
    }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(XLMode.worldPixelW - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(XLMode.worldPixelH - canvas.height, camera.y));
  }

  function updateMovement(dt) {
    if (isXLMode()) {
      updateXLMovement(dt);
      return;
    }

    if (isDroneDrive()) {
      updateDroneChase(dt);
      return;
    }

    player.vx = 0;
    player.vy = 0;

    if (isJetSide()) {
      if (keys['ArrowUp']) player.targetLane = Math.max(0, player.targetLane - 1);
      if (keys['ArrowDown']) player.targetLane = Math.min(2, player.targetLane + 1);
      var targetY = JET_LANES[player.targetLane];
      player.y += (targetY - player.y) * 8 * dt;
      if (keys['ArrowRight']) player.x += player.speed * dt;
      if (keys['ArrowLeft']) player.x -= player.speed * 0.5 * dt;
      player.thrust = keys['ArrowRight'] ? 1 : 0;
      player.x = Math.max(60, Math.min(canvas.width - 40, player.x));
      player.aimX = 1;
      player.aimY = 0;
      if (mouse.active) {
        var bestLane = 0;
        var bestDist = Infinity;
        for (var li = 0; li < JET_LANES.length; li++) {
          var ld = Math.abs(mouse.y - JET_LANES[li]);
          if (ld < bestDist) { bestDist = ld; bestLane = li; }
        }
        player.targetLane = bestLane;
      }
      return;
    }

    applyMouseAim();
    applyMouseMove(dt);

    if (keys['ArrowLeft']) player.vx -= 1;
    if (keys['ArrowRight']) player.vx += 1;
    if (keys['ArrowUp']) player.vy -= 1;
    if (keys['ArrowDown']) player.vy += 1;

    if (player.vx !== 0 || player.vy !== 0) {
      var moveLen = Math.hypot(player.vx, player.vy);
      player.aimX = player.vx / moveLen;
      player.aimY = player.vy / moveLen;
    }

    player.x += player.vx * player.speed * dt;
    player.y += player.vy * player.speed * dt;
    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
  }

  function update(dt) {
    if (state !== STATE.PLAYING) return;

    animTime += dt;
    handleSpawning(dt);
    updateMovement(dt);

    if (keys[' '] || keys['Space']) shoot();
    else if (autoShoot) shoot();

    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (shakeTimer > 0) shakeTimer -= dt;
    if (window.Gore) Gore.update(dt);

    var worldW = isXLMode() ? XLMode.worldPixelW : canvas.width;
    var worldH = isXLMode() ? XLMode.worldPixelH : canvas.height;

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      var outOfBounds = b.life <= 0 || b.x < -20 || b.x > worldW + 20 || b.y < -20 || b.y > worldH + 20;
      if (outOfBounds) {
        bullets.splice(i, 1);
        continue;
      }

      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        var hitRadius = e.radius + (e.isDrone ? 6 : 4);
        if (dist(b.x, b.y, e.x, e.y) < hitRadius) {
          bullets.splice(i, 1);
          e.health -= 1;
          if (e.health <= 0) killEnemy(j, Math.atan2(b.vy, b.vx));
          else spawnParticles(e.x, e.y, e.color, 3);
          break;
        }
      }
    }

    if (currentMode === 'shooters' || isXLMode()) {
      for (var eb = enemyBullets.length - 1; eb >= 0; eb--) {
        var bullet = enemyBullets[eb];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (bullet.life <= 0 || bullet.x < -20 || bullet.x > worldW + 20 || bullet.y < -20 || bullet.y > worldH + 20) {
          enemyBullets.splice(eb, 1);
          continue;
        }
        if (dist(bullet.x, bullet.y, player.x, player.y) < player.radius + 3) {
          enemyBullets.splice(eb, 1);
          hurtPlayer(12);
        }
      }
    }

    for (var k = enemies.length - 1; k >= 0; k--) {
      var enemy = enemies[k];

      if (enemy.isDrone && truck) {
        enemy.weave += dt * 3;
        enemy.z = Math.min(1, enemy.z + dt * 0.35);
        var targetX = player.x + Math.sin(enemy.weave) * 40;
        var targetY = truck.bedCY - 20;
        var dx = targetX - enemy.x;
        var dy = targetY - enemy.y;
        var dlen = Math.hypot(dx, dy) || 1;
        var approach = enemy.speed * (0.5 + enemy.z * 0.8);
        enemy.x += (dx / dlen) * approach * dt;
        enemy.y += (dy / dlen) * approach * dt;
        enemy.scale = 0.55 + enemy.z * 0.45;

        if (enemy.y > truck.bedCY - 30) {
          hurtPlayer(15);
          enemies.splice(k, 1);
          spawnParticles(enemy.x, enemy.y, '#ff7b72', 10);
          continue;
        }
      } else if (isJetSide()) {
        enemy.x -= enemy.speed * dt;
        if (enemy.x < -40) {
          enemies.splice(k, 1);
          continue;
        }
      } else {
        var ex = player.x - enemy.x;
        var ey = player.y - enemy.y;
        if (enemy.isZombie) {
          enemy.shamble += dt * 4;
          ex += Math.sin(enemy.shamble) * 18;
          ey += Math.cos(enemy.shamble * 0.7) * 12;
        }
        var elen = Math.hypot(ex, ey) || 1;
        enemy.x += (ex / elen) * enemy.speed * dt;
        enemy.y += (ey / elen) * enemy.speed * dt;
        if (enemy.isZombie) {
          enemy.y += (snapGrid(enemy.y) - enemy.y) * 2.8 * dt;
        }
      }

      enemy.wobble += dt * 6;
      if (enemy.animPhase !== undefined) {
        enemy.animPhase += dt * (0.5 + enemy.speed / 80);
      }

      if ((currentMode === 'shooters' || isXLMode()) && enemy.shootCooldown !== undefined) {
        enemy.shootCooldown -= dt;
        var range = dist(enemy.x, enemy.y, player.x, player.y);
        if (enemy.shootCooldown <= 0 && range < 320 && range > 60) {
          enemyShoot(enemy);
          enemy.shootCooldown = 1.4 + Math.random() * 0.8;
        }
      }

      if (!enemy.isDrone && dist(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius) {
        hurtPlayer(isJetSide() ? 20 : (enemy.isBrute ? 28 : (enemy.isZombie ? 12 : 18)));
      }
    }

    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      var obs = obstacles[oi];
      obs.x -= obs.speed * dt;
      if (obs.x < -40) {
        obstacles.splice(oi, 1);
        continue;
      }
      if (dist(obs.x, obs.y, player.x, player.y) < obs.radius + player.radius) {
        hurtPlayer(22);
        obstacles.splice(oi, 1);
        spawnParticles(obs.x, obs.y, '#8b949e', 8);
      }
    }

    for (var pi = pickups.length - 1; pi >= 0; pi--) {
      var pick = pickups[pi];
      pick.bob += dt * 4;
      if (dist(pick.x, pick.y, player.x, player.y) < pick.radius + player.radius) {
        player.health = Math.min(player.maxHealth, player.health + 25);
        spawnParticles(pick.x, pick.y, '#3fb950', 6);
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

  /** Always-upright stick figure. Faces left/right only — never flips upside down. */
  function drawStickmanUpright(x, y, faceX, faceY, color, scale, options) {
    options = options || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    var flip = faceX < 0 ? -1 : 1;
    ctx.scale(flip, 1);

    var lean = Math.max(-0.4, Math.min(0.4, faceY * 0.35));
    ctx.rotate(lean);

    ctx.strokeStyle = color;
    ctx.lineWidth = options.brute ? 3.5 : 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 10);
    ctx.stroke();

    if (options.zombieArms) {
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(9, -4);
      ctx.moveTo(0, -2);
      ctx.lineTo(9, 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-7, 8);
      ctx.stroke();

      if (options.armed) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(10, 0, 8, 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 8);
        ctx.stroke();
      }
    }

    var legSwing = options.legSwing || 0;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-5 + legSwing, 22);
    ctx.moveTo(0, 10);
    ctx.lineTo(5 - legSwing, 22);
    ctx.stroke();

    ctx.restore();
  }

  function drawDrone(x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-14, -16);
    ctx.lineTo(0, -22);
    ctx.lineTo(14, -16);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -8, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-8, 10);
    ctx.moveTo(0, 2);
    ctx.lineTo(8, 10);
    ctx.moveTo(0, 8);
    ctx.lineTo(-4, 16);
    ctx.moveTo(0, 8);
    ctx.lineTo(4, 16);
    ctx.stroke();

    ctx.fillStyle = '#ff7b72';
    ctx.beginPath();
    ctx.arc(0, -8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawJetPlayer(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 10);
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, 6);
    ctx.moveTo(0, 0);
    ctx.lineTo(10, 2);
    ctx.stroke();
    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(-10, 8, 8, 12);
    ctx.fillRect(2, 8, 8, 12);
    if (p.thrust) {
      ctx.fillStyle = '#ffa657';
      ctx.beginPath();
      ctx.moveTo(-8, 20);
      ctx.lineTo(-4, 32 + Math.random() * 8);
      ctx.lineTo(0, 20);
      ctx.lineTo(4, 32 + Math.random() * 8);
      ctx.lineTo(8, 20);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDroneDriveScene() {
    var bump = truck.bumpY;
    var pitch = truck.pitch;
    var roll = truck.roll || 0;
    var cx = canvas.width / 2;

    var sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#050810');
    sky.addColorStop(0.45, '#1a2030');
    sky.addColorStop(1, '#2a1810');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cx, canvas.height * 0.42 + bump * 0.5);
    ctx.rotate(roll * 0.15);

    ctx.fillStyle = '#1f2937';
    for (var m = -3; m < 4; m++) {
      var mx = m * 200 - (truck.roadT * 0.2) % 200;
      ctx.beginPath();
      ctx.moveTo(mx, 60);
      ctx.lineTo(mx + 60, -40);
      ctx.lineTo(mx + 120, 60);
      ctx.fill();
    }

    var horizonY = 80 + bump * 0.2;
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath();
    ctx.moveTo(-cx, horizonY);
    ctx.lineTo(cx, horizonY);
    ctx.lineTo(cx + 200, canvas.height);
    ctx.lineTo(-cx - 200, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.moveTo(-cx, horizonY);
    ctx.lineTo(cx, horizonY);
    ctx.lineTo(cx, canvas.height);
    ctx.lineTo(-cx, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 220, 120, 0.45)';
    ctx.lineWidth = 3;
    var stripeOffset = (truck.roadT * 2.2) % 80;
    for (var s = 0; s < 16; s++) {
      var sy = horizonY + 30 + s * 55 + stripeOffset;
      var t = (sy - horizonY) / (canvas.height - horizonY);
      var halfW = 8 + t * cx * 0.85;
      ctx.beginPath();
      ctx.moveTo(-halfW, sy);
      ctx.lineTo(halfW, sy);
      ctx.stroke();
    }
    ctx.restore();

    var bedY = truck.bedCY + bump * 0.5;
    ctx.save();
    ctx.translate(cx + roll * 40, bedY);
    ctx.fillStyle = '#1a1f26';
    ctx.fillRect(-180, 0, 360, 120);
    ctx.fillStyle = '#3d444d';
    ctx.fillRect(-160, -55, 320, 70);
    ctx.fillStyle = '#21262d';
    ctx.fillRect(-145, -48, 290, 55);
    ctx.strokeStyle = '#6e7681';
    ctx.lineWidth = 4;
    ctx.strokeRect(-145, -48, 290, 55);
    ctx.fillStyle = '#484f58';
    ctx.fillRect(-50, -95, 100, 45);
    ctx.restore();
  }

  function drawCrosshair(x, y) {
    var depth = 1 + Math.sin(animTime * 4) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(depth, depth);
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(227, 179, 65, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -8);
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 22);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 80, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** @deprecated use drawDroneDriveScene */
  function drawDroneChaseScene() {
    drawDroneDriveScene();
  }

  function drawBackground() {
    if (isDroneDrive()) {
      drawDroneDriveScene();
      return;
    }

    if (isJetSide()) {
      ctx.fillStyle = '#0a0e18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var lane = 0; lane < JET_LANES.length; lane++) {
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, JET_LANES[lane]);
        ctx.lineTo(canvas.width, JET_LANES[lane]);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(88, 166, 255, 0.04)';
      for (var star = 0; star < 40; star++) {
        ctx.fillRect((star * 97 + animTime * 20) % canvas.width, (star * 53) % canvas.height, 2, 2);
      }
      return;
    }

    if (currentMode === 'zombie' || currentMode === 'leaderboard') {
      ctx.fillStyle = '#141a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(60, 80, 55, 0.35)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx <= canvas.width; gx += ZOMBIE_GRID) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }
      for (var gy = 0; gy <= canvas.height; gy += ZOMBIE_GRID) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
        if (gy > 0 && gy < canvas.height) {
          ctx.fillStyle = 'rgba(125, 154, 106, 0.04)';
          ctx.fillRect(0, gy - 1, canvas.width, 2);
        }
      }

      ctx.fillStyle = 'rgba(125, 154, 106, 0.06)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 90, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(48, 54, 61, 0.6)';
    ctx.lineWidth = 1;
    var g = 40;
    for (var gxi = 0; gxi <= canvas.width; gxi += g) {
      ctx.beginPath();
      ctx.moveTo(gxi, 0);
      ctx.lineTo(gxi, canvas.height);
      ctx.stroke();
    }
    for (var gyi = 0; gyi <= canvas.height; gyi += g) {
      ctx.beginPath();
      ctx.moveTo(0, gyi);
      ctx.lineTo(canvas.width, gyi);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(88, 166, 255, 0.04)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderXL() {
    ctx.save();

    if (shakeTimer > 0) {
      var shake = shakeTimer * 12;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    var sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#1a2840');
    sky.addColorStop(1, '#2d4a32');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!XLMode.hasWorld()) {
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Deploy to generate the map', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'left';
      ctx.restore();
      return;
    }

    XLMode.drawWorld(ctx, camera.x, camera.y, canvas.width, canvas.height, animTime);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life * 3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      XLMode.drawStickmanLean(ctx, e.x, e.y, player.x - e.x, player.y - e.y, e.color, {
        armed: true,
        animPhase: e.animPhase || 0
      });
    }

    if (state === STATE.PLAYING && (player.invuln <= 0 || Math.floor(Date.now() / 100) % 2 === 0)) {
      XLMode.drawStickmanLean(ctx, player.x, player.y, player.aimX, player.aimY, '#58a6ff', {
        armed: true,
        animPhase: player.animPhase || 0,
        scale: 1.2
      });
    }

    ctx.fillStyle = '#e3b341';
    for (var k = 0; k < bullets.length; k++) {
      var b = bullets[k];
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ff7b72';
    for (var eb = 0; eb < enemyBullets.length; eb++) {
      var ebItem = enemyBullets[eb];
      ctx.beginPath();
      ctx.arc(ebItem.x, ebItem.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (window.Gore) Gore.render(ctx);

    ctx.restore();

    ctx.fillStyle = 'rgba(230, 237, 243, 0.75)';
    ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
    ctx.fillText('Animated XL — explore the wilds', 16, 24);

    ctx.restore();
  }

  function render() {
    if (isXLMode()) {
      renderXL();
      return;
    }

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

    drawBackground();

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life * 3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

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

    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      var wobbleOffset = Math.sin(e.wobble) * 2;

      if (e.isDrone) {
        drawDrone(e.x, e.y, e.scale || 0.75, e.color);
        continue;
      }

      var faceX = isJetSide() ? -1 : player.x - e.x;
      var faceY = isJetSide() ? 0 : player.y - e.y;
      var legSwing = e.isZombie ? Math.sin(e.shamble) * 4 : 0;

      drawStickmanUpright(
        e.x,
        e.y + wobbleOffset,
        faceX,
        faceY,
        e.color || '#f85149',
        e.scale || 1,
        {
          armed: currentMode === 'shooters',
          zombieArms: e.isZombie && !e.isBrute,
          legSwing: legSwing,
          brute: e.isBrute
        }
      );
    }

    for (var ob = 0; ob < obstacles.length; ob++) {
      var o = obstacles[ob];
      ctx.fillStyle = '#6e7681';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8b949e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (state === STATE.PLAYING && !isDroneDrive()) {
      if (player.invuln <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        if (isJetSide()) {
          drawJetPlayer(player);
        } else if (window.CharacterModels && isTopDown()) {
          CharacterModels.draw(ctx, characterModel, player.x, player.y, player.aimX, player.aimY, { armed: true });
        } else {
          var pFaceX = player.aimX;
          var pFaceY = player.aimY;
          drawStickmanUpright(player.x, player.y, pFaceX, pFaceY, '#58a6ff', 1.1, { armed: true });
        }
      }
    }

    if (state === STATE.PLAYING && isDroneDrive()) {
      drawCrosshair(player.x, player.y);
    }

    ctx.fillStyle = isDroneDrive() ? '#79c0ff' : '#e3b341';
    for (var k = 0; k < bullets.length; k++) {
      var b = bullets[k];
      ctx.beginPath();
      ctx.arc(b.x, b.y, isDroneDrive() ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ff7b72';
    for (var eb = 0; eb < enemyBullets.length; eb++) {
      var ebItem = enemyBullets[eb];
      ctx.beginPath();
      ctx.arc(ebItem.x, ebItem.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (window.Gore && (currentMode === 'zombie' || currentMode === 'leaderboard')) {
      Gore.render(ctx);
    }

    if (currentMode === 'waves' && state === STATE.PLAYING) {
      ctx.fillStyle = 'rgba(230, 237, 243, 0.85)';
      ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Wave ' + wave.number, 16, canvas.height - 16);
      if (wave.phase === 'break') {
        ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
        ctx.fillText('Breather...', 16, canvas.height - 34);
      }
    }

    if (isDroneDrive() && state === STATE.PLAYING) {
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Drone Drive — aim from the truck bed', 16, 24);
    }

    ctx.restore();
  }

  function loop(timestamp) {
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    try {
      if (state === STATE.PLAYING) {
        update(dt);
      }
      render();
    } catch (err) {
      console.error('Game loop error:', err);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
    keys[e.key] = true;

    if (e.key === ' ' && state === STATE.MODES && !startBtn.hidden) {
      startGame();
    }
  });

  window.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  startBtn.addEventListener('click', function () {
    GameAudio.resume().then(startGame);
  });

  autoshootBtn.addEventListener('click', toggleAutoshoot);
  hudAutoshoot.addEventListener('click', toggleAutoshoot);
  exitBtn.addEventListener('click', exitToMenu);

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

  overlay.addEventListener('click', function (e) {
    if (e.target.closest('.mode-card') || e.target.closest('.char-card') ||
        e.target === startBtn || e.target === autoshootBtn) return;
    if (state === STATE.MODES && !startBtn.hidden) {
      GameAudio.resume().then(startGame);
    }
    if (state === STATE.GAMEOVER && !startBtn.hidden) {
      GameAudio.resume().then(startGame);
    }
  });

  startIntro();
  requestAnimationFrame(loop);
})();

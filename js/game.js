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
  var modesBtn = document.getElementById('modes-btn');
  var modeBadge = document.getElementById('mode-badge');
  var waveBanner = document.getElementById('wave-banner');
  var healthFill = document.getElementById('health-fill');
  var healthText = document.getElementById('health-text');
  var scoreEl = document.getElementById('score');
  var highScoreEl = document.getElementById('high-score');

  var GROUND_Y = canvas.height - 80;
  var HIGH_SCORE_PREFIX = 'stickmanCommandoHighScore_';
  var STATE = { INTRO: 'intro', MODES: 'modes', PLAYING: 'playing', GAMEOVER: 'gameover' };

  var MODES = [
    {
      id: 'arena',
      name: 'Arena',
      desc: 'Top-down survival. Endless spawns from all sides.',
      hint: '↑ ↓ ← → move · SPACE shoot'
    },
    {
      id: 'sidescroll',
      name: 'Side-scroll',
      desc: 'Classic run-and-gun. Move, jump, shoot left or right.',
      hint: '← → move · ↑ jump · SPACE shoot'
    },
    {
      id: 'shooters',
      name: 'Enemy fire',
      desc: 'Hostiles shoot back when in range. Keep moving.',
      hint: '↑ ↓ ← → move · SPACE shoot · dodge red bullets'
    },
    {
      id: 'waves',
      name: 'Waves',
      desc: 'Clear each wave, short breather, then the next wave hits harder.',
      hint: '↑ ↓ ← → move · SPACE shoot · survive each wave'
    },
    {
      id: 'medkits',
      name: 'Medkits',
      desc: 'Kills sometimes drop green medkits. Walk over them to heal.',
      hint: '↑ ↓ ← → move · SPACE shoot · grab green crosses'
    },
    {
      id: 'variants',
      name: 'Enemy types',
      desc: 'Orange runners, red grunts, purple tanks — different speed and HP.',
      hint: '↑ ↓ ← → move · SPACE shoot · prioritize targets'
    },
    {
      id: 'leaderboard',
      name: 'Leaderboard demo',
      desc: 'Same arena play, but game over shows a mock global scoreboard (not live yet).',
      hint: '↑ ↓ ← → move · SPACE shoot · see mock ranks on death'
    }
  ];

  var ENEMY_TYPES = {
    grunt: { color: '#f85149', speed: 55, health: 1, radius: 12, scale: 1, score: 10 },
    runner: { color: '#ffa657', speed: 110, health: 1, radius: 10, scale: 0.9, score: 15 },
    tank: { color: '#bc8cff', speed: 35, health: 3, radius: 16, scale: 1.3, score: 30 }
  };

  var MOCK_LEADERBOARD = [
    { name: 'GhostOps', score: 1240 },
    { name: 'StickSniper', score: 980 },
    { name: 'NightRaid', score: 870 },
    { name: 'ZeroHour', score: 650 },
    { name: 'You?', score: 0 }
  ];

  var state = STATE.INTRO;
  var currentMode = 'arena';
  var keys = {};
  var lastTime = 0;
  var spawnTimer = 0;
  var difficultyTimer = 0;
  var shakeTimer = 0;

  var player = createPlayer();
  var bullets = [];
  var enemyBullets = [];
  var enemies = [];
  var particles = [];
  var pickups = [];

  var score = 0;
  var highScore = 0;
  var spawnInterval = 2.2;
  var maxEnemies = 12;

  var wave = { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };

  buildModePicker();
  loadHighScoreForMode(currentMode);

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
      });
      modePicker.appendChild(card);
    });
  }

  function selectMode(modeId) {
    currentMode = modeId;
    var mode = getMode();
    loadHighScoreForMode(modeId);
    overlayHint.textContent = mode.hint;
    overlaySubtitle.textContent = mode.desc;
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
    highScore = stored ? parseInt(stored, 10) : 0;
    highScoreEl.textContent = highScore;
  }

  function saveHighScore(value) {
    localStorage.setItem(HIGH_SCORE_PREFIX + currentMode, String(value));
    highScoreEl.textContent = value;
  }

  function createPlayer() {
    var isSide = currentMode === 'sidescroll';
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
    player = createPlayer();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = [];
    score = 0;
    spawnTimer = 0;
    difficultyTimer = 0;
    spawnInterval = 2.2;
    maxEnemies = currentMode === 'waves' ? 99 : 12;
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
    modesBtn.hidden = !options.showModes;
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
      entries.forEach(function (entry, idx) {
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
    selectMode(currentMode);
    showOverlay(
      'Pick a demo',
      getMode().desc,
      { showPicker: true, showDeploy: true, showModes: false, deployLabel: 'Deploy' }
    );
  }

  function startGame() {
    resetGame();
    state = STATE.PLAYING;
    hideOverlay();
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
        showModes: true,
        deployLabel: 'Redeploy',
        mockLeaderboard: currentMode === 'leaderboard'
      }
    );
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

  function spawnEnemyAt(x, y, typeKey) {
    if (enemies.length >= maxEnemies) return;

    var type = ENEMY_TYPES[typeKey || 'grunt'];
    var speed = type.speed + Math.min(score * 0.2, 40);

    enemies.push({
      x: x,
      y: y,
      radius: type.radius,
      speed: speed,
      health: type.health,
      maxHealth: type.health,
      wobble: Math.random() * Math.PI * 2,
      type: typeKey || 'grunt',
      color: type.color,
      scale: type.scale,
      points: type.score,
      shootCooldown: 1 + Math.random()
    });
  }

  function spawnArenaEnemy() {
    var margin = 40;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;

    if (edge === 0) { x = Math.random() * canvas.width; y = -margin; }
    else if (edge === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
    else { x = -margin; y = Math.random() * canvas.height; }

    if (currentMode === 'variants') {
      var roll = Math.random();
      var typeKey = roll < 0.35 ? 'runner' : roll < 0.7 ? 'grunt' : 'tank';
      spawnEnemyAt(x, y, typeKey);
    } else {
      spawnEnemyAt(x, y, 'grunt');
    }
  }

  function spawnSideEnemy() {
    spawnEnemyAt(canvas.width + 40, GROUND_Y, 'grunt');
    enemies[enemies.length - 1].speed = 70 + Math.random() * 30;
  }

  function maybeDropMedkit(x, y) {
    if (currentMode !== 'medkits' && currentMode !== 'arena') return;
    if (currentMode === 'arena') return;
    if (Math.random() > 0.35) return;
    pickups.push({ x: x, y: y, radius: 10, bob: 0 });
  }

  function shoot() {
    if (player.shootCooldown > 0) return;

    var dx = player.aimX;
    var dy = player.aimY;
    if (currentMode === 'sidescroll') {
      dx = player.facing;
      dy = 0;
    }
    var len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    bullets.push({
      x: player.x + dx * 18,
      y: player.y + dy * 18 - (currentMode === 'sidescroll' ? 10 : 0),
      vx: dx * 520,
      vy: dy * 520,
      life: 1.2
    });

    player.shootCooldown = 0.18;
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
    spawnParticles(player.x, player.y, '#58a6ff', 6);
    updateHud();
    if (player.health <= 0) endGame();
  }

  function killEnemy(index) {
    var e = enemies[index];
    score += e.points || 10;
    spawnParticles(e.x, e.y, e.color || '#f85149', 8);
    maybeDropMedkit(e.x, e.y);
    enemies.splice(index, 1);
    updateHud();
  }

  function handleSpawning(dt) {
    if (currentMode === 'sidescroll') {
      spawnTimer += dt;
      if (spawnTimer >= 2.5 && enemies.length < 6) {
        spawnTimer = 0;
        spawnSideEnemy();
      }
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
        spawnArenaEnemy();
        wave.toSpawn -= 1;
      }

      if (wave.phase === 'fight' && enemies.length === 0 && wave.toSpawn === 0) {
        startNextWave();
      }
      return;
    }

    difficultyTimer += dt;
    if (difficultyTimer > 15 && currentMode === 'arena') {
      difficultyTimer = 0;
      spawnInterval = Math.max(0.8, spawnInterval - 0.15);
      maxEnemies = Math.min(20, maxEnemies + 1);
    }

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
      spawnTimer = 0;
      spawnArenaEnemy();
    }
  }

  function updateMovement(dt) {
    player.vx = 0;
    player.vy = 0;

    if (currentMode === 'sidescroll') {
      if (keys['ArrowLeft']) { player.vx -= 1; player.facing = -1; }
      if (keys['ArrowRight']) { player.vx += 1; player.facing = 1; }
      player.aimX = player.facing;
      player.aimY = 0;

      if (keys['ArrowUp'] && player.grounded) {
        player.vy = -player.jumpForce;
        player.grounded = false;
      }

      player.vy += 900 * dt;
      player.x += player.vx * player.speed * dt;
      player.y += player.vy * dt;

      if (player.y >= GROUND_Y) {
        player.y = GROUND_Y;
        player.vy = 0;
        player.grounded = true;
      }

      player.x = Math.max(30, Math.min(canvas.width - 30, player.x));
      return;
    }

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

    handleSpawning(dt);
    updateMovement(dt);

    if (keys[' '] || keys['Space']) shoot();

    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (shakeTimer > 0) shakeTimer -= dt;

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || b.x < -20 || b.x > canvas.width + 20 || b.y < -20 || b.y > canvas.height + 20) {
        bullets.splice(i, 1);
        continue;
      }

      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (dist(b.x, b.y, e.x, e.y) < e.radius + 4) {
          bullets.splice(i, 1);
          e.health -= 1;
          if (e.health <= 0) killEnemy(j);
          else spawnParticles(e.x, e.y, e.color, 3);
          break;
        }
      }
    }

    if (currentMode === 'shooters') {
      for (var eb = enemyBullets.length - 1; eb >= 0; eb--) {
        var bullet = enemyBullets[eb];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (bullet.life <= 0 || bullet.x < -20 || bullet.x > canvas.width + 20 || bullet.y < -20 || bullet.y > canvas.height + 20) {
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

      if (currentMode === 'sidescroll') {
        enemy.x -= enemy.speed * dt;
        if (enemy.x < -40) {
          enemies.splice(k, 1);
          continue;
        }
      } else {
        var ex = player.x - enemy.x;
        var ey = player.y - enemy.y;
        var elen = Math.hypot(ex, ey) || 1;
        enemy.x += (ex / elen) * enemy.speed * dt;
        enemy.y += (ey / elen) * enemy.speed * dt;
      }

      enemy.wobble += dt * 6;

      if (currentMode === 'shooters' && enemy.shootCooldown !== undefined) {
        enemy.shootCooldown -= dt;
        var range = dist(enemy.x, enemy.y, player.x, player.y);
        if (enemy.shootCooldown <= 0 && range < 320 && range > 60) {
          enemyShoot(enemy);
          enemy.shootCooldown = 1.4 + Math.random() * 0.8;
        }
      }

      if (dist(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius) {
        hurtPlayer(currentMode === 'sidescroll' ? 25 : 18);
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

  function drawStickman(x, y, facingX, facingY, color, scale, armed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    var angle = Math.atan2(facingY, facingX);
    ctx.rotate(angle);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 8);
    ctx.stroke();

    if (armed) {
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

    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-5, 22);
    ctx.moveTo(0, 10);
    ctx.lineTo(5, 22);
    ctx.stroke();

    ctx.restore();
  }

  function drawBackground() {
    if (currentMode === 'sidescroll') {
      ctx.fillStyle = '#141c28';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, GROUND_Y + 12, canvas.width, canvas.height - GROUND_Y);

      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 12);
      ctx.lineTo(canvas.width, GROUND_Y + 12);
      ctx.stroke();

      for (var i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(48, 54, 61, 0.5)';
        ctx.fillRect(i * 140 + 20, GROUND_Y - 40 - (i % 3) * 30, 60, 40 + (i % 3) * 30);
      }
      return;
    }

    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(48, 54, 61, 0.6)';
    ctx.lineWidth = 1;
    var grid = 40;
    for (var gx = 0; gx <= canvas.width; gx += grid) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (var gy = 0; gy <= canvas.height; gy += grid) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(88, 166, 255, 0.04)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  function render() {
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
      var faceX = currentMode === 'sidescroll' ? -1 : player.x - e.x;
      var faceY = currentMode === 'sidescroll' ? 0 : player.y - e.y;
      drawStickman(e.x, e.y + wobbleOffset, faceX, faceY, e.color || '#f85149', e.scale || 1, currentMode === 'shooters');
    }

    if (state === STATE.PLAYING && (player.invuln <= 0 || Math.floor(Date.now() / 100) % 2 === 0)) {
      drawStickman(player.x, player.y, player.aimX, player.aimY, '#58a6ff', 1.1, true);
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

    if (currentMode === 'waves' && state === STATE.PLAYING) {
      ctx.fillStyle = 'rgba(230, 237, 243, 0.85)';
      ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Wave ' + wave.number, 16, canvas.height - 16);
      if (wave.phase === 'break') {
        ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
        ctx.fillText('Breather...', 16, canvas.height - 34);
      }
    }

    ctx.restore();
  }

  function loop(timestamp) {
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    update(dt);
    render();
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
    if (state === STATE.GAMEOVER) {
      GameAudio.resume().then(startGame);
    } else {
      GameAudio.resume().then(startGame);
    }
  });

  modesBtn.addEventListener('click', function () {
    showModeSelect();
  });

  overlay.addEventListener('click', function (e) {
    if (e.target.closest('.mode-card') || e.target === modesBtn || e.target === startBtn) return;
    if (state === STATE.MODES && !startBtn.hidden) {
      GameAudio.resume().then(startGame);
    }
  });

  startIntro();
  requestAnimationFrame(loop);
})();

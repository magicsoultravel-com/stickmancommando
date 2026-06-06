(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlay-title');
  var overlaySubtitle = document.getElementById('overlay-subtitle');
  var startBtn = document.getElementById('start-btn');
  var healthFill = document.getElementById('health-fill');
  var healthText = document.getElementById('health-text');
  var scoreEl = document.getElementById('score');
  var highScoreEl = document.getElementById('high-score');

  var HIGH_SCORE_KEY = 'stickmanCommandoHighScore';
  var STATE = { INTRO: 'intro', PLAYING: 'playing', GAMEOVER: 'gameover' };

  var state = STATE.INTRO;
  var keys = {};
  var lastTime = 0;
  var spawnTimer = 0;
  var difficultyTimer = 0;
  var shakeTimer = 0;

  var player = createPlayer();
  var bullets = [];
  var enemies = [];
  var particles = [];

  var score = 0;
  var highScore = loadHighScore();
  var spawnInterval = 2.2;
  var maxEnemies = 12;

  highScoreEl.textContent = highScore;

  function loadHighScore() {
    var stored = localStorage.getItem(HIGH_SCORE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  function saveHighScore(value) {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
    highScoreEl.textContent = value;
  }

  function createPlayer() {
    return {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: 0,
      vy: 0,
      speed: 220,
      radius: 14,
      health: 100,
      maxHealth: 100,
      aimX: 1,
      aimY: 0,
      shootCooldown: 0,
      invuln: 0
    };
  }

  function resetGame() {
    player = createPlayer();
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    spawnTimer = 0;
    difficultyTimer = 0;
    spawnInterval = 2.2;
    maxEnemies = 12;
    updateHud();
  }

  function updateHud() {
    var pct = Math.max(0, player.health / player.maxHealth * 100);
    healthFill.style.width = pct + '%';
    healthFill.classList.toggle('low', pct <= 40 && pct > 20);
    healthFill.classList.toggle('critical', pct <= 20);
    healthText.textContent = Math.max(0, Math.ceil(player.health));
    scoreEl.textContent = score;
  }

  function showOverlay(title, subtitle, showButton) {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = title;
    overlaySubtitle.textContent = subtitle;
    startBtn.hidden = !showButton;
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function startIntro() {
    state = STATE.INTRO;
    showOverlay('Stickman Commando', 'Loading mission brief...', false);
    GameAudio.playIntroSting().then(function () {
      overlaySubtitle.textContent = 'Hostiles inbound. Hold the line.';
      startBtn.hidden = false;
    });
  }

  function startGame() {
    resetGame();
    state = STATE.PLAYING;
    hideOverlay();
    GameAudio.resume();
  }

  function endGame() {
    state = STATE.GAMEOVER;
    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
    }
    showOverlay(
      'KIA',
      'Score: ' + score + (score >= highScore && score > 0 ? ' — New best!' : ''),
      true
    );
    startBtn.textContent = 'Redeploy';
  }

  function spawnEnemy() {
    if (enemies.length >= maxEnemies) return;

    var margin = 40;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;

    if (edge === 0) {
      x = Math.random() * canvas.width;
      y = -margin;
    } else if (edge === 1) {
      x = canvas.width + margin;
      y = Math.random() * canvas.height;
    } else if (edge === 2) {
      x = Math.random() * canvas.width;
      y = canvas.height + margin;
    } else {
      x = -margin;
      y = Math.random() * canvas.height;
    }

    var speed = 55 + Math.min(score * 0.4, 80);
    enemies.push({
      x: x,
      y: y,
      radius: 12,
      speed: speed,
      health: 1,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function shoot() {
    if (player.shootCooldown > 0) return;

    var len = Math.hypot(player.aimX, player.aimY) || 1;
    var dx = player.aimX / len;
    var dy = player.aimY / len;

    bullets.push({
      x: player.x + dx * 18,
      y: player.y + dy * 18,
      vx: dx * 520,
      vy: dy * 520,
      life: 1.2
    });

    player.shootCooldown = 0.18;
  }

  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 120;
      particles.push({
        x: x,
        y: y,
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

  function update(dt) {
    if (state !== STATE.PLAYING) return;

    difficultyTimer += dt;
    if (difficultyTimer > 15) {
      difficultyTimer = 0;
      spawnInterval = Math.max(0.8, spawnInterval - 0.15);
      maxEnemies = Math.min(20, maxEnemies + 1);
    }

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEnemy();
    }

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
    }

    var moveSpeed = player.speed;
    player.x += player.vx * moveSpeed * dt;
    player.y += player.vy * moveSpeed * dt;
    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    if (keys[' '] || keys['Space']) {
      shoot();
    }

    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (shakeTimer > 0) shakeTimer -= dt;

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (
        b.life <= 0 ||
        b.x < -20 || b.x > canvas.width + 20 ||
        b.y < -20 || b.y > canvas.height + 20
      ) {
        bullets.splice(i, 1);
        continue;
      }

      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (dist(b.x, b.y, e.x, e.y) < e.radius + 4) {
          bullets.splice(i, 1);
          enemies.splice(j, 1);
          score += 10;
          spawnParticles(e.x, e.y, '#f85149', 8);
          updateHud();
          break;
        }
      }
    }

    for (var k = enemies.length - 1; k >= 0; k--) {
      var enemy = enemies[k];
      var ex = player.x - enemy.x;
      var ey = player.y - enemy.y;
      var elen = Math.hypot(ex, ey) || 1;
      enemy.x += (ex / elen) * enemy.speed * dt;
      enemy.y += (ey / elen) * enemy.speed * dt;
      enemy.wobble += dt * 6;

      if (dist(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius) {
        if (player.invuln <= 0) {
          player.health -= 18;
          player.invuln = 0.8;
          shakeTimer = 0.25;
          spawnParticles(player.x, player.y, '#58a6ff', 6);
          updateHud();

          if (player.health <= 0) {
            endGame();
            return;
          }
        }
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
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
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

    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      var wobbleOffset = Math.sin(e.wobble) * 2;
      drawStickman(e.x, e.y + wobbleOffset, player.x - e.x, player.y - e.y, '#f85149', 1, false);
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

    if (e.key === ' ' && state === STATE.INTRO && !startBtn.hidden) {
      startGame();
    }
  });

  window.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  startBtn.addEventListener('click', function () {
    GameAudio.resume().then(startGame);
  });

  overlay.addEventListener('click', function (e) {
    if (state === STATE.INTRO && !startBtn.hidden && e.target !== startBtn) {
      GameAudio.resume().then(startGame);
    }
    if (state === STATE.GAMEOVER) {
      GameAudio.resume().then(startGame);
    }
  });

  startIntro();
  requestAnimationFrame(loop);
})();

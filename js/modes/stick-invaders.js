(function () {
  'use strict';
  var S = window.GameShared;

  var COLS = 11;
  var ROWS = 5;
  var CELL_X = 52;
  var CELL_Y = 44;
  var FORM_TOP = 72;

  var INVADER_ROWS = [
    { health: 1, radius: 11, scale: 0.9, points: 30, color: '#ffa657', label: 'runner' },
    { health: 1, radius: 11, scale: 0.9, points: 30, color: '#ffa657', label: 'runner' },
    { health: 1, radius: 11, scale: 1, points: 20, color: '#f85149', label: 'grunt' },
    { health: 1, radius: 11, scale: 1, points: 20, color: '#f85149', label: 'grunt' },
    { health: 3, radius: 14, scale: 1.15, points: 40, color: '#bc8cff', label: 'tank' }
  ];

  function createShields(g) {
    var shields = [];
    var baseY = g.canvas.height - 128;
    var slots = [g.canvas.width * 0.18, g.canvas.width * 0.5, g.canvas.width * 0.82];
    for (var s = 0; s < slots.length; s++) {
      var cx = slots[s];
      for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 7; col++) {
          if (row === 3 && (col === 0 || col === 6)) continue;
          shields.push({
            x: cx + (col - 3) * 9,
            y: baseY + row * 9,
            hp: 1,
            w: 8,
            h: 8
          });
        }
      }
    }
    return shields;
  }

  function layoutInvader(g, enemy) {
    var form = g.invaders;
    enemy.x = form.ox + enemy.col * CELL_X;
    enemy.y = form.oy + enemy.row * CELL_Y;
  }

  function layoutFormation(g) {
    for (var i = 0; i < g.enemies.length; i++) {
      layoutInvader(g, g.enemies[i]);
    }
  }

  function spawnWave(g) {
    g.enemies.length = 0;
    var form = g.invaders;
    form.ox = (g.canvas.width - (COLS - 1) * CELL_X) / 2;
    form.oy = FORM_TOP;
    form.dir = 1;
    form.stepTimer = 0;
    form.dropPending = false;

    for (var row = 0; row < ROWS; row++) {
      var rowDef = INVADER_ROWS[row];
      for (var col = 0; col < COLS; col++) {
        g.enemies.push({
          x: 0,
          y: 0,
          col: col,
          row: row,
          radius: rowDef.radius,
          speed: 0,
          health: rowDef.health,
          maxHealth: rowDef.health,
          wobble: Math.random() * Math.PI * 2,
          type: rowDef.label,
          color: rowDef.color,
          scale: rowDef.scale,
          points: rowDef.points,
          isInvader: true,
          shootCooldown: 0
        });
      }
    }
    layoutFormation(g);
    g.shields = createShields(g);
    g.ui.waveBanner.textContent = 'Wave ' + form.wave;
    g.ui.waveBanner.classList.add('visible');
    setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 1200);
  }

  function livingInColumn(g, col) {
    var best = null;
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (e.col !== col) continue;
      if (!best || e.row > best.row) best = e;
    }
    return best;
  }

  function invaderShoot(g, enemy) {
    g.enemyBullets.push({
      x: enemy.x,
      y: enemy.y + 12,
      vx: 0,
      vy: 200 + g.invaders.wave * 12,
      life: 4
    });
  }

  function stepFormation(g) {
    var form = g.invaders;
    var margin = 36;
    var stepX = 10;
    var nextOx = form.ox + form.dir * stepX;
    var minX = margin;
    var maxX = g.canvas.width - margin - (COLS - 1) * CELL_X;

    if (nextOx < minX || nextOx > maxX) {
      form.dir *= -1;
      form.oy += 16;
      form.dropPending = false;
    } else {
      form.ox = nextOx;
    }
    layoutFormation(g);
  }

  function hitShield(g, x, y, radius) {
    var shields = g.shields;
    if (!shields) return false;
    for (var i = 0; i < shields.length; i++) {
      var block = shields[i];
      if (block.hp <= 0) continue;
      if (Math.abs(x - block.x) < block.w / 2 + radius &&
          Math.abs(y - block.y) < block.h / 2 + radius) {
        block.hp -= 1;
        S.spawnParticles(g, block.x, block.y, '#58a6ff', 3);
        return true;
      }
    }
    return false;
  }

  GameModes.register({
    id: 'stickinvaders',
    name: 'Stick Invaders',
    desc: 'Classic formation shooter. Clear waves, hide behind bunkers, don\'t let them land.',
    hint: '← → move · SPACE shoot · bunkers block fire',
    flags: { invaders: true, enemyShoots: true, topDown: true },

    reset: function (g) {
      g.invaders = {
        wave: 0,
        ox: 0,
        oy: FORM_TOP,
        dir: 1,
        stepTimer: 0,
        stepInterval: 0.55,
        shootTimer: 2.2,
        shootGap: 2.2
      };
      g.shields = [];
      nextWave(g);
    },

    createPlayer: function (g) {
      return {
        x: g.canvas.width / 2,
        y: g.canvas.height - 46,
        speed: 300,
        radius: 12,
        health: 100,
        maxHealth: 100,
        aimX: 0,
        aimY: -1,
        shootCooldown: 0,
        invuln: 0
      };
    },

    move: function (g, dt) {
      var p = g.player;
      if (g.keys['ArrowLeft']) p.x -= p.speed * dt;
      if (g.keys['ArrowRight']) p.x += p.speed * dt;
      if (g.mouse.active && g.mouse.down) {
        p.x += (g.mouse.x - p.x) * 8 * dt;
      }
      p.x = Math.max(24, Math.min(g.canvas.width - 24, p.x));
      p.aimX = 0;
      p.aimY = -1;
    },

    tick: function (g, dt) {
      var form = g.invaders;
      if (g.enemies.length === 0) return;

      form.stepTimer += dt;
      if (form.stepTimer >= form.stepInterval) {
        form.stepTimer = 0;
        stepFormation(g);
      }

      form.shootTimer -= dt;
      if (form.shootTimer <= 0 && g.enemies.length > 0) {
        form.shootTimer = Math.max(0.45, form.shootGap - form.wave * 0.08);
        var col = Math.floor(Math.random() * COLS);
        var shooter = livingInColumn(g, col);
        if (!shooter) {
          for (var tryCol = 0; tryCol < COLS && !shooter; tryCol++) {
            shooter = livingInColumn(g, (col + tryCol) % COLS);
          }
        }
        if (shooter) invaderShoot(g, shooter);
      }

      for (var i = 0; i < g.enemies.length; i++) {
        if (g.enemies[i].y > g.canvas.height - 88) {
          g.endGame();
          return;
        }
      }
    },

    afterKill: function (g) {
      if (g.enemies.length === 0) {
        g.score += 100 + g.invaders.wave * 25;
        nextWave(g);
      }
    },

    getShootVector: function () {
      return { x: 0, y: -1 };
    },

    shootStartOffset: function () {
      return { x: 0, y: -14 };
    },

    bulletSpeed: function () {
      return 560;
    },

    shootCooldown: function () {
      return 0.32;
    },

    interceptBullet: function (g, bullet) {
      return hitShield(g, bullet.x, bullet.y, 3);
    },

    interceptEnemyBullet: function (g, bullet) {
      return hitShield(g, bullet.x, bullet.y, 3);
    },

    updateEnemy: function () {
      return 'skipContact';
    },

    drawBackground: function (g, ctx) {
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);
      for (var i = 0; i < 50; i++) {
        var sx = (i * 113 + g.animTime * 12) % g.canvas.width;
        var sy = (i * 67) % (g.canvas.height * 0.55);
        ctx.fillStyle = i % 7 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
        ctx.fillRect(sx, sy, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
      }
      ctx.fillStyle = 'rgba(88, 166, 255, 0.06)';
      ctx.fillRect(0, g.canvas.height - 72, g.canvas.width, 72);
    },

    drawObstacles: function (g, ctx) {
      var shields = g.shields;
      if (!shields) return;
      for (var i = 0; i < shields.length; i++) {
        var block = shields[i];
        if (block.hp <= 0) continue;
        ctx.fillStyle = '#3fb950';
        ctx.fillRect(block.x - block.w / 2, block.y - block.h / 2, block.w, block.h);
        ctx.strokeStyle = '#2ea043';
        ctx.lineWidth = 1;
        ctx.strokeRect(block.x - block.w / 2, block.y - block.h / 2, block.w, block.h);
      }
    },

    drawEnemy: function (g, ctx, e) {
      var bob = Math.sin(g.animTime * 5 + e.col * 0.4 + e.row * 0.6) * 2;
      S.drawStickmanUpright(ctx, e.x, e.y + bob, 0, 1, e.color, e.scale, {
        armed: false,
        legSwing: Math.sin(g.animTime * 8 + e.col) * 2
      });
      return true;
    },

    drawHud: function (g, ctx) {
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Wave ' + g.invaders.wave, 16, 24);
      ctx.fillText(g.enemies.length + ' invaders', 16, 42);
    }
  });

  function nextWave(g) {
    g.invaders.wave += 1;
    g.invaders.stepInterval = Math.max(0.22, 0.55 - g.invaders.wave * 0.035);
    g.invaders.shootGap = Math.max(0.5, 2.2 - g.invaders.wave * 0.15);
    g.invaders.shootTimer = 1.2;
    spawnWave(g);
  }
})();

(function () {
  'use strict';

  var ENEMY_TYPES = {
    walker: { color: '#7d9a6a', speed: 42, health: 1, radius: 11, scale: 1, score: 5, zombie: true },
    brute: { color: '#4a3548', speed: 18, health: 10, radius: 26, scale: 2.05, score: 100, zombie: true, isBrute: true },
    grunt: { color: '#f85149', speed: 55, health: 1, radius: 12, scale: 1, score: 10 },
    runner: { color: '#ffa657', speed: 110, health: 1, radius: 10, scale: 0.9, score: 15 },
    tank: { color: '#bc8cff', speed: 35, health: 3, radius: 16, scale: 1.3, score: 30 },
    drone: { color: '#c9d1d9', speed: 95, health: 1, radius: 10, scale: 0.75, score: 20, isDrone: true }
  };

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function snapGrid(val, grid) {
    return Math.round(val / grid) * grid;
  }

  function spawnEnemyAt(g, x, y, typeKey, extra) {
    if (g.enemies.length >= g.maxEnemies) return;
    extra = extra || {};
    var type = ENEMY_TYPES[typeKey || 'grunt'];
    var speed = (extra.speed != null ? extra.speed : type.speed) + Math.min(g.score * 0.15, 30);

    g.enemies.push({
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
      animPhase: Math.random() * 10,
      laneY: type.zombie ? snapGrid(y, g.ZOMBIE_GRID) : undefined
    });
  }

  function spawnParticles(g, x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 120;
      g.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        color: color
      });
    }
  }

  function spawnTopDownGrunt(g, typeKey) {
    var margin = 40;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;
    if (edge === 0) { x = Math.random() * g.canvas.width; y = -margin; }
    else if (edge === 1) { x = g.canvas.width + margin; y = Math.random() * g.canvas.height; }
    else if (edge === 2) { x = Math.random() * g.canvas.width; y = g.canvas.height + margin; }
    else { x = -margin; y = Math.random() * g.canvas.height; }
    spawnEnemyAt(g, x, y, typeKey || 'grunt');
  }

  function defaultTopDownPlayer(g) {
    return {
      x: g.canvas.width / 2,
      y: g.canvas.height / 2,
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

  function applyMouseAim(g) {
    if (!g.player || !g.mouse.active) return;
    var wm = g.getWorldMouse();
    var dx = wm.x - g.player.x;
    var dy = wm.y - g.player.y;
    if (Math.hypot(dx, dy) > 8) {
      var len = Math.hypot(dx, dy);
      g.player.aimX = dx / len;
      g.player.aimY = dy / len;
    }
  }

  function applyMouseMoveXL(g, dt) {
    if (!g.player || !g.mouse.active) return;
    var wm = g.getWorldMouse();
    var dx = wm.x - g.player.x;
    var dy = wm.y - g.player.y;
    var d = Math.hypot(dx, dy);
    if (d > 18) {
      var spd = g.player.speed * 0.85 * dt;
      var ox = g.player.x;
      var oy = g.player.y;
      g.player.x += (dx / d) * Math.min(spd, d);
      g.player.y += (dy / d) * Math.min(spd, d);
      if (!XLMode.isWalkable(g.player.x, g.player.y)) {
        g.player.x = ox;
        g.player.y = oy;
      }
    }
  }

  function applyMouseMove(g, dt) {
    if (!g.player || !g.mouse.active || !g.mode.flags.mouseMove) return;
    var wm = g.getWorldMouse();
    var dx = wm.x - g.player.x;
    var dy = wm.y - g.player.y;
    var d = Math.hypot(dx, dy);
    if (d > 18) {
      var spd = g.player.speed * 0.85 * dt;
      g.player.x += (dx / d) * Math.min(spd, d);
      g.player.y += (dy / d) * Math.min(spd, d);
      g.player.x = Math.max(20, Math.min(g.canvas.width - 20, g.player.x));
      g.player.y = Math.max(20, Math.min(g.canvas.height - 20, g.player.y));
    }
  }

  function moveTopDown(g, dt) {
    applyMouseAim(g);
    applyMouseMove(g, dt);
    g.player.vx = 0;
    g.player.vy = 0;
    if (g.keys['ArrowLeft']) g.player.vx -= 1;
    if (g.keys['ArrowRight']) g.player.vx += 1;
    if (g.keys['ArrowUp']) g.player.vy -= 1;
    if (g.keys['ArrowDown']) g.player.vy += 1;
    if (g.player.vx !== 0 || g.player.vy !== 0) {
      var ml = Math.hypot(g.player.vx, g.player.vy);
      g.player.aimX = g.player.vx / ml;
      g.player.aimY = g.player.vy / ml;
    }
    g.player.x += g.player.vx * g.player.speed * dt;
    g.player.y += g.player.vy * g.player.speed * dt;
    g.player.x = Math.max(20, Math.min(g.canvas.width - 20, g.player.x));
    g.player.y = Math.max(20, Math.min(g.canvas.height - 20, g.player.y));
  }

  function chaseEnemy(g, dt, enemy) {
    if (enemy.isZombie) {
      chaseZombie(g, dt, enemy);
      return;
    }
    var ex = g.player.x - enemy.x;
    var ey = g.player.y - enemy.y;
    var elen = Math.hypot(ex, ey) || 1;
    enemy.x += (ex / elen) * enemy.speed * dt;
    enemy.y += (ey / elen) * enemy.speed * dt;
  }

  function chaseZombie(g, dt, enemy) {
    var grid = g.ZOMBIE_GRID;
    if (enemy.laneY == null) enemy.laneY = snapGrid(enemy.y, grid);

    enemy.shamble += dt * (enemy.isBrute ? 3 : 5);

    var targetLane = snapGrid(g.player.y, grid);
    targetLane = Math.max(grid, Math.min(g.canvas.height - grid, targetLane));
    var laneDiff = targetLane - enemy.laneY;

    if (Math.abs(laneDiff) > 1) {
      var laneSpeed = enemy.speed * (enemy.isBrute ? 0.45 : 0.85);
      var laneStep = laneSpeed * dt;
      if (Math.abs(laneDiff) <= laneStep) {
        enemy.laneY = targetLane;
      } else {
        enemy.laneY += Math.sign(laneDiff) * laneStep;
      }
    }

    var dx = g.player.x - enemy.x;
    var xDir = Math.abs(dx) < 2 ? 0 : Math.sign(dx);
    if (xDir !== 0) {
      enemy.x += xDir * enemy.speed * dt;
    }

    var wobbleY = Math.sin(enemy.shamble) * (enemy.isBrute ? 1.5 : 3);
    enemy.y = enemy.laneY + wobbleY;

    var sepX = 0;
    for (var i = 0; i < g.enemies.length; i++) {
      var other = g.enemies[i];
      if (other === enemy || !other.isZombie) continue;
      var ox = enemy.x - other.x;
      var oy = enemy.y - other.y;
      if (Math.abs(oy) > grid * 0.6) continue;
      var od = Math.abs(ox);
      var minDist = enemy.radius + other.radius + 8;
      if (od > 0 && od < minDist) {
        sepX += Math.sign(ox) * (minDist - od) / minDist;
      }
    }
    enemy.x += sepX * enemy.speed * 0.4 * dt;

    enemy.x = Math.max(-20, Math.min(g.canvas.width + 20, enemy.x));
    enemy.laneY = Math.max(grid, Math.min(g.canvas.height - grid, enemy.laneY));
    enemy.y = enemy.laneY + wobbleY;
  }

  function drawStickmanUpright(ctx, x, y, faceX, faceY, color, scale, options) {
    options = options || {};
    if (options.brute) {
      drawBruteZombie(ctx, x, y, faceX, faceY, color, scale, options);
      return;
    }
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

  function drawBruteZombie(ctx, x, y, faceX, faceY, color, scale, options) {
    options = options || {};
    var legSwing = options.legSwing || 0;
    var pulse = Math.sin(Date.now() * 0.003) * 0.05;
    var sway = Math.sin(Date.now() * 0.002) * 2;

    ctx.save();
    ctx.translate(x + sway, y);
    ctx.scale(scale * (1 + pulse), scale * (1.08 + pulse * 0.5));
    var flip = faceX < 0 ? -1 : 1;
    ctx.scale(flip, 1);
    var lean = Math.max(-0.2, Math.min(0.2, faceY * 0.15));
    ctx.rotate(lean);

    var bodyColor = color || '#4a3548';
    ctx.strokeStyle = bodyColor;
    ctx.fillStyle = 'rgba(35, 22, 38, 0.75)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.ellipse(0, 10, 20, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.quadraticCurveTo(0, 24, 18, 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 40, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 10, 6, 0, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(-22, 6, -14, 12);
    ctx.moveTo(16, -2);
    ctx.quadraticCurveTo(22, 6, 14, 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -20, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(12, 6, 14, 0.85)';
    ctx.fill();

    ctx.fillStyle = '#ff2d20';
    ctx.beginPath();
    ctx.arc(-2.5, -21, 2.5, 0, Math.PI * 2);
    ctx.arc(2.5, -21, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -16, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(-3, -15);
    ctx.lineTo(0, -12);
    ctx.lineTo(3, -15);
    ctx.fill();

    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, -6);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-22, -10);
    ctx.moveTo(0, -4);
    ctx.lineTo(-24, 2);
    ctx.moveTo(0, -2);
    ctx.lineTo(22, -8);
    ctx.moveTo(0, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();

    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-10, 28);
    ctx.lineTo(-14 + legSwing, 44);
    ctx.moveTo(10, 28);
    ctx.lineTo(14 - legSwing, 44);
    ctx.stroke();

    ctx.restore();
  }

  function spawnExplosion(g, x, y, color, size) {
    size = size || 1;
    var count = Math.floor(14 * size);
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (60 + Math.random() * 180) * size;
      g.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: (0.35 + Math.random() * 0.45) * size,
        color: color,
        size: 2 + Math.random() * 3 * size
      });
    }
  }

  function drawGridBackground(ctx, canvas, grid, tint) {
    ctx.fillStyle = tint || '#1a2332';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.6)';
    ctx.lineWidth = 1;
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
  }

  function drawZombieGrid(ctx, g) {
    ctx.fillStyle = '#141a14';
    ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);
    ctx.strokeStyle = 'rgba(60, 80, 55, 0.35)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= g.canvas.width; gx += g.ZOMBIE_GRID) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, g.canvas.height);
      ctx.stroke();
    }
    for (var gy = 0; gy <= g.canvas.height; gy += g.ZOMBIE_GRID) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(g.canvas.width, gy);
      ctx.stroke();
      if (gy > 0 && gy < g.canvas.height) {
        ctx.fillStyle = 'rgba(125, 154, 106, 0.04)';
        ctx.fillRect(0, gy - 1, g.canvas.width, 2);
      }
    }
    if (g.player) {
      ctx.fillStyle = 'rgba(125, 154, 106, 0.06)';
      ctx.beginPath();
      ctx.arc(g.player.x, g.player.y, 90, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(ctx, particles) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBullets(ctx, bullets, color, radius) {
    ctx.fillStyle = color;
    for (var k = 0; k < bullets.length; k++) {
      var b = bullets[k];
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.GameShared = {
    ENEMY_TYPES: ENEMY_TYPES,
    dist: dist,
    snapGrid: snapGrid,
    spawnEnemyAt: spawnEnemyAt,
    spawnParticles: spawnParticles,
    spawnTopDownGrunt: spawnTopDownGrunt,
    defaultTopDownPlayer: defaultTopDownPlayer,
    applyMouseAim: applyMouseAim,
    applyMouseMove: applyMouseMove,
    applyMouseMoveXL: applyMouseMoveXL,
    drawParticles: drawParticles,
    drawBullets: drawBullets,
    moveTopDown: moveTopDown,
    chaseEnemy: chaseEnemy,
    chaseZombie: chaseZombie,
    drawStickmanUpright: drawStickmanUpright,
    drawBruteZombie: drawBruteZombie,
    spawnExplosion: spawnExplosion,
    drawGridBackground: drawGridBackground,
    drawZombieGrid: drawZombieGrid
  };
})();

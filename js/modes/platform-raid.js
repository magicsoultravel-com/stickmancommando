(function () {
  'use strict';
  var S = window.GameShared;

  var CLIMB_SPEED = 130;
  var WALK_SPEED = 180;
  var PLAYER_W = 18;

  var LEVELS = [
    {
      name: 'Dockyard',
      worldW: 1920,
      platforms: [
        { x: 0, y: 468, w: 1920, h: 72 },
        { x: 80, y: 368, w: 220, h: 14 },
        { x: 420, y: 288, w: 200, h: 14 },
        { x: 720, y: 368, w: 280, h: 14 },
        { x: 1080, y: 248, w: 240, h: 14 },
        { x: 1420, y: 328, w: 260, h: 14 }
      ],
      ladders: [
        { x: 240, y: 368, h: 100 },
        { x: 500, y: 288, h: 80 },
        { x: 860, y: 368, h: 100 },
        { x: 1180, y: 248, h: 220 },
        { x: 1540, y: 328, h: 140 }
      ],
      spawns: [
        { x: 140, y: 368, minX: 100, maxX: 260, type: 'grunt' },
        { x: 460, y: 288, minX: 440, maxX: 580, type: 'grunt' },
        { x: 800, y: 368, minX: 740, maxX: 960, type: 'runner' },
        { x: 1140, y: 248, minX: 1100, maxX: 1280, type: 'grunt' },
        { x: 1500, y: 328, minX: 1450, maxX: 1640, type: 'tank' }
      ],
      exit: { x: 1780, y: 468, w: 48, h: 72 },
      playerStart: { x: 48, y: 468 }
    },
    {
      name: 'Refinery',
      worldW: 2400,
      platforms: [
        { x: 0, y: 468, w: 2400, h: 72 },
        { x: 160, y: 388, w: 180, h: 14 },
        { x: 400, y: 308, w: 160, h: 14 },
        { x: 620, y: 388, w: 200, h: 14 },
        { x: 900, y: 268, w: 220, h: 14 },
        { x: 1180, y: 348, w: 180, h: 14 },
        { x: 1420, y: 268, w: 240, h: 14 },
        { x: 1720, y: 348, w: 200, h: 14 },
        { x: 1980, y: 268, w: 260, h: 14 }
      ],
      ladders: [
        { x: 280, y: 388, h: 80 },
        { x: 460, y: 308, h: 80 },
        { x: 680, y: 388, h: 80 },
        { x: 980, y: 268, h: 200 },
        { x: 1240, y: 348, h: 120 },
        { x: 1520, y: 268, h: 200 },
        { x: 1780, y: 348, h: 120 },
        { x: 2080, y: 268, h: 200 }
      ],
      spawns: [
        { x: 200, y: 388, minX: 170, maxX: 310, type: 'grunt' },
        { x: 440, y: 308, minX: 410, maxX: 530, type: 'runner' },
        { x: 680, y: 388, minX: 640, maxX: 780, type: 'grunt' },
        { x: 960, y: 268, minX: 920, maxX: 1080, type: 'runner' },
        { x: 1220, y: 348, minX: 1190, maxX: 1330, type: 'grunt' },
        { x: 1480, y: 268, minX: 1440, maxX: 1620, type: 'tank' },
        { x: 1760, y: 348, minX: 1730, maxX: 1870, type: 'runner' },
        { x: 2040, y: 268, minX: 2000, maxX: 2200, type: 'grunt' }
      ],
      exit: { x: 2280, y: 468, w: 48, h: 72 },
      playerStart: { x: 40, y: 468 }
    },
    {
      name: 'Tower',
      worldW: 1600,
      platforms: [
        { x: 0, y: 468, w: 1600, h: 72 },
        { x: 100, y: 388, w: 140, h: 14 },
        { x: 320, y: 308, w: 140, h: 14 },
        { x: 540, y: 228, w: 140, h: 14 },
        { x: 760, y: 308, w: 140, h: 14 },
        { x: 980, y: 388, w: 140, h: 14 },
        { x: 1200, y: 308, w: 140, h: 14 },
        { x: 1380, y: 228, w: 160, h: 14 }
      ],
      ladders: [
        { x: 160, y: 388, h: 80 },
        { x: 380, y: 308, h: 80 },
        { x: 600, y: 228, h: 80 },
        { x: 820, y: 308, h: 160 },
        { x: 1040, y: 388, h: 80 },
        { x: 1260, y: 308, h: 80 },
        { x: 1440, y: 228, h: 240 }
      ],
      spawns: [
        { x: 130, y: 388, minX: 110, maxX: 220, type: 'runner' },
        { x: 350, y: 308, minX: 330, maxX: 440, type: 'grunt' },
        { x: 570, y: 228, minX: 550, maxX: 660, type: 'runner' },
        { x: 790, y: 308, minX: 770, maxX: 880, type: 'tank' },
        { x: 1010, y: 388, minX: 990, maxX: 1100, type: 'grunt' },
        { x: 1230, y: 308, minX: 1210, maxX: 1320, type: 'runner' },
        { x: 1420, y: 228, minX: 1390, maxX: 1510, type: 'tank' }
      ],
      exit: { x: 1480, y: 228, w: 48, h: 14 },
      playerStart: { x: 40, y: 468 }
    }
  ];

  function ladderBottom(lad) {
    return lad.y + lad.h;
  }

  function onPlatform(level, feetX, feetY) {
    for (var i = 0; i < level.platforms.length; i++) {
      var p = level.platforms[i];
      if (Math.abs(feetY - p.y) > 3) continue;
      if (feetX >= p.x + PLAYER_W / 2 && feetX <= p.x + p.w - PLAYER_W / 2) return p;
    }
    return null;
  }

  function nearLadder(level, x, y) {
    for (var i = 0; i < level.ladders.length; i++) {
      var lad = level.ladders[i];
      if (Math.abs(x - lad.x) > 16) continue;
      if (y >= lad.y - 4 && y <= ladderBottom(lad) + 4) return lad;
    }
    return null;
  }

  function canWalkTo(level, fromY, toX) {
    return !!onPlatform(level, toX, fromY);
  }

  function spawnLevelEnemies(g) {
    var level = g.platformLevel;
    g.enemies.length = 0;
    for (var i = 0; i < level.spawns.length; i++) {
      var sp = level.spawns[i];
      var type = S.ENEMY_TYPES[sp.type] || S.ENEMY_TYPES.grunt;
      g.enemies.push({
        x: sp.x,
        y: sp.y,
        minX: sp.minX,
        maxX: sp.maxX,
        dir: 1,
        radius: type.radius,
        speed: type.speed * 0.55,
        health: type.health,
        maxHealth: type.health,
        color: type.color,
        scale: type.scale,
        points: type.score,
        type: sp.type,
        wobble: Math.random() * Math.PI * 2,
        animPhase: Math.random() * 10,
        shootCooldown: 1 + Math.random(),
        platformY: sp.y,
        isPatrol: true
      });
    }
  }

  function loadLevel(g, index) {
    if (index >= LEVELS.length) {
      g.ui.waveBanner.textContent = 'SECTOR CLEAR!';
      g.ui.waveBanner.classList.add('visible');
      g.score += 500;
      setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 2000);
      index = 0;
    }
    g.platformLevelIndex = index;
    g.platformLevel = LEVELS[index];
    var level = g.platformLevel;
    g.player.x = level.playerStart.x;
    g.player.y = level.playerStart.y;
    g.player.vx = 0;
    g.player.climbing = null;
    g.player.animPhase = 0;
    spawnLevelEnemies(g);
    g.ui.waveBanner.textContent = level.name;
    g.ui.waveBanner.classList.add('visible');
    setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 1400);
  }

  function updatePlayer(g, dt) {
    var p = g.player;
    var level = g.platformLevel;
    var wm = g.getWorldMouse();
    var dx = wm.x - p.x;
    var dy = wm.y - (p.y - 18);
    if (Math.hypot(dx, dy) > 6) p.aimAngle = Math.atan2(dy, dx);

    var left = g.keys['ArrowLeft'];
    var right = g.keys['ArrowRight'];
    var up = g.keys['ArrowUp'];
    var down = g.keys['ArrowDown'];
    var moving = false;

    if (p.climbing) {
      var lad = p.climbing;
      var climbDir = 0;
      if (up) climbDir -= 1;
      if (down) climbDir += 1;
      if (climbDir !== 0) {
        p.y += climbDir * CLIMB_SPEED * dt;
        moving = true;
      }
      p.x += (lad.x - p.x) * 12 * dt;
      p.y = Math.max(lad.y, Math.min(ladderBottom(lad), p.y));
      if (p.y <= lad.y + 2 && !up) {
        if (onPlatform(level, p.x, lad.y)) {
          p.climbing = null;
          p.y = lad.y;
        }
      }
      if (p.y >= ladderBottom(lad) - 2 && !down) {
        if (onPlatform(level, p.x, ladderBottom(lad))) {
          p.climbing = null;
          p.y = ladderBottom(lad);
        }
      }
      if (!up && !down) {
        var plat = onPlatform(level, p.x, p.y);
        if (plat && (left || right)) p.climbing = null;
      }
    } else {
      var plat = onPlatform(level, p.x, p.y);
      var hDir = 0;
      if (left) hDir -= 1;
      if (right) hDir += 1;
      if (hDir !== 0 && plat) {
        var nextX = p.x + hDir * WALK_SPEED * dt;
        if (canWalkTo(level, p.y, nextX)) {
          p.x = nextX;
          moving = true;
        }
      }
      var lad = nearLadder(level, p.x, p.y);
      if (lad && (up || down)) {
        p.climbing = lad;
        p.x = lad.x;
        moving = true;
      }
    }

    p.facing = p.aimAngle > Math.PI / 2 || p.aimAngle < -Math.PI / 2 ? -1 : 1;
    if (moving) p.animPhase += dt * (p.climbing ? 1.4 : 1);
    else p.animPhase += dt * 0.35;

    if (p.climbing) p.pose = 'climb';
    else if (moving && (left || right)) p.pose = 'walk';
    else if (g.keys[' '] || g.autoShoot) p.pose = 'aim';
    else p.pose = 'idle';

    var exit = level.exit;
    if (Math.abs(p.y - exit.y) < 4 && p.x >= exit.x && p.x <= exit.x + exit.w && g.enemies.length === 0) {
      loadLevel(g, g.platformLevelIndex + 1);
    }
  }

  function drawLevel(g, ctx) {
    var level = g.platformLevel;
    var camX = g.camera.x;

    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, level.worldW, g.canvas.height);

    for (var bg = 0; bg < 3; bg++) {
      ctx.fillStyle = 'rgba(88, 166, 255, ' + (0.03 + bg * 0.02) + ')';
      var parallax = camX * (0.08 + bg * 0.06);
      for (var px = Math.floor(parallax / 80) * 80 - 80; px < camX + g.canvas.width + 80; px += 80) {
        ctx.fillRect(px - parallax + bg * 30, 120 + bg * 40, 24, 180 + bg * 30);
      }
    }

    for (var i = 0; i < level.ladders.length; i++) {
      var lad = level.ladders[i];
      ctx.strokeStyle = '#6e7681';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lad.x - 7, lad.y);
      ctx.lineTo(lad.x - 7, ladderBottom(lad));
      ctx.moveTo(lad.x + 7, lad.y);
      ctx.lineTo(lad.x + 7, ladderBottom(lad));
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#484f58';
      for (var rung = lad.y + 12; rung < ladderBottom(lad); rung += 16) {
        ctx.beginPath();
        ctx.moveTo(lad.x - 7, rung);
        ctx.lineTo(lad.x + 7, rung);
        ctx.stroke();
      }
    }

    for (var pi = 0; pi < level.platforms.length; pi++) {
      var pf = level.platforms[pi];
      ctx.fillStyle = '#21262d';
      ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
      ctx.fillStyle = '#30363d';
      ctx.fillRect(pf.x, pf.y, pf.w, 4);
      ctx.strokeStyle = '#484f58';
      ctx.lineWidth = 1;
      ctx.strokeRect(pf.x + 0.5, pf.y + 0.5, pf.w - 1, pf.h - 1);
    }

    var ex = level.exit;
    ctx.fillStyle = g.enemies.length === 0 ? 'rgba(63, 185, 80, 0.35)' : 'rgba(110, 118, 129, 0.25)';
    ctx.fillRect(ex.x, ex.y - 52, ex.w, 52);
    ctx.strokeStyle = g.enemies.length === 0 ? '#3fb950' : '#484f58';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex.x, ex.y - 52, ex.w, 52);
    ctx.fillStyle = g.enemies.length === 0 ? '#3fb950' : '#6e7681';
    ctx.font = '600 10px Segoe UI, system-ui, sans-serif';
    ctx.fillText('EXIT', ex.x + 8, ex.y - 22);
  }

  GameModes.register({
    id: 'platform',
    name: 'Platform Raid',
    desc: 'Side-view levels with platforms and ladders. Climb between floors — no jumping yet.',
    hint: '← → walk · ↑ ↓ ladders · mouse aim · SPACE shoot · clear then exit',
    flags: { platform: true, mouseMove: true, enemyShoots: true },

    reset: function (g) {
      g.platformLevelIndex = 0;
      g.maxEnemies = 24;
      loadLevel(g, 0);
    },

    createPlayer: function (g) {
      return {
        x: 48,
        y: 468,
        speed: WALK_SPEED,
        radius: 14,
        health: 100,
        maxHealth: 100,
        aimX: 1,
        aimY: 0,
        aimAngle: 0,
        facing: 1,
        shootCooldown: 0,
        invuln: 0,
        climbing: null,
        animPhase: 0,
        pose: 'idle'
      };
    },

    move: function (g, dt) {
      updatePlayer(g, dt);
      var p = g.player;
      g.camera.x = p.x - g.canvas.width * 0.35;
      g.camera.x = Math.max(0, Math.min(g.platformLevel.worldW - g.canvas.width, g.camera.x));
      g.camera.y = 0;
    },

    getCamera: function (g) {
      return g.camera;
    },

    getWorldMouse: function (g) {
      return { x: g.mouse.x + g.camera.x, y: g.mouse.y + g.camera.y };
    },

    getWorldBounds: function (g) {
      return { w: g.platformLevel.worldW, h: g.canvas.height };
    },

    spawn: function () {},

    getShootVector: function (g) {
      return { x: Math.cos(g.player.aimAngle), y: Math.sin(g.player.aimAngle) };
    },

    shootStartOffset: function (g) {
      var a = g.player.aimAngle;
      return { x: Math.cos(a) * 12, y: Math.sin(a) * 12 - 14 };
    },

    updateEnemy: function (g, dt, enemy) {
      if (!enemy.isPatrol) return;
      enemy.x += enemy.dir * enemy.speed * dt;
      if (enemy.x <= enemy.minX) { enemy.x = enemy.minX; enemy.dir = 1; }
      if (enemy.x >= enemy.maxX) { enemy.x = enemy.maxX; enemy.dir = -1; }
      enemy.y = enemy.platformY;
      enemy.animPhase += dt * (enemy.speed / 40);
      enemy.facing = enemy.dir;
      return 'skipContact';
    },

    drawBackground: function (g, ctx) {
      drawLevel(g, ctx);
    },

    drawEnemy: function (g, ctx, e) {
      if (!window.CharacterModels || !CharacterModels.drawAnimated) return false;
      var pose = Math.abs(e.dir) > 0 ? 'walk' : 'idle';
      CharacterModels.drawAnimated(ctx, g.characterModel, e.x, e.y, {
        color: e.color,
        pose: pose,
        phase: e.animPhase,
        facing: e.facing || 1,
        armed: true,
        aimAngle: e.facing > 0 ? 0.2 : Math.PI - 0.2,
        scale: (e.scale || 1) * 1.05
      });
      return true;
    },

    renderPlayer: function (g, ctx) {
      if (!window.CharacterModels || !CharacterModels.drawAnimated) return;
      var p = g.player;
      if (p.invuln > 0 && Math.floor(Date.now() / 100) % 2 === 1) return;
      CharacterModels.drawAnimated(ctx, g.characterModel, p.x, p.y, {
        pose: p.pose,
        phase: p.animPhase,
        facing: p.facing,
        armed: true,
        aimAngle: p.aimAngle,
        scale: 1.12
      });
    },

    drawHud: function (g, ctx) {
      ctx.fillStyle = 'rgba(139, 148, 158, 0.92)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText(g.platformLevel.name + '  ·  ' + (g.platformLevelIndex + 1) + '/' + LEVELS.length, 16, 24);
      if (g.enemies.length > 0) {
        ctx.fillText(g.enemies.length + ' hostiles left', 16, 42);
      } else {
        ctx.fillStyle = 'rgba(63, 185, 80, 0.95)';
        ctx.fillText('Reach the exit', 16, 42);
      }
    }
  });
})();

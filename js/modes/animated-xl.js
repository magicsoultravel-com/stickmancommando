(function () {
  'use strict';
  var S = window.GameShared;

  GameModes.register({
    id: 'stickmanisland',
    name: 'Stickman Island',
    desc: '88×88 grid · 64 px tiles (5632×5632 px world). You spawn at the centre — simple stickman lawns west, wild rivers & bridges east.',
    hint: '↑ ↓ ← → or mouse · SPACE · cross bridges · explore east',
    legacyHighScoreKeys: ['animatedxl'],
    flags: { xl: true, mouseMove: true, enemyShoots: true },

    reset: function (g) {
      XLMode.generateWorld(Date.now());
      g.spawnInterval = 2;
      g.maxEnemies = 18;
      g.exploredEast = false;
      g.islandKills = 0;
    },

    setCanvas: function (g) {
      g.canvas.width = XLMode.CANVAS_W;
      g.canvas.height = XLMode.CANVAS_H;
      g.gameWrapper.classList.add('xl-mode');
    },

    createPlayer: function (g) {
      var spawn = XLMode.getSpawnPoint();
      return {
        x: spawn.x,
        y: spawn.y,
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
    },

    spawn: function (g, dt) {
      g.spawnTimer += dt;
      if (g.spawnTimer >= g.spawnInterval && g.enemies.length < g.maxEnemies) {
        g.spawnTimer = 0;
        for (var attempt = 0; attempt < 10; attempt++) {
          var angle = Math.random() * Math.PI * 2;
          var dist = 380 + Math.random() * 420;
          var ex = g.player.x + Math.cos(angle) * dist;
          var ey = g.player.y + Math.sin(angle) * dist;
          if (XLMode.isWalkable(ex, ey)) {
            S.spawnEnemyAt(g, ex, ey, 'grunt');
            return;
          }
        }
      }
      g.difficultyTimer += dt;
      if (g.difficultyTimer > 12) {
        g.difficultyTimer = 0;
        g.spawnInterval = Math.max(0.9, g.spawnInterval - 0.12);
        g.maxEnemies = Math.min(28, g.maxEnemies + 1);
      }
    },

    move: function (g, dt) {
      g.player.vx = 0;
      g.player.vy = 0;
      if (g.keys['ArrowLeft']) g.player.vx -= 1;
      if (g.keys['ArrowRight']) g.player.vx += 1;
      if (g.keys['ArrowUp']) g.player.vy -= 1;
      if (g.keys['ArrowDown']) g.player.vy += 1;

      if (g.player.vx !== 0 || g.player.vy !== 0) {
        var moveLen = Math.hypot(g.player.vx, g.player.vy);
        g.player.aimX = g.player.vx / moveLen;
        g.player.aimY = g.player.vy / moveLen;
        g.player.animPhase += dt * (1 + moveLen);
      }

      var mult = XLMode.moveSpeedMult(g.player.x, g.player.y);
      var spd = g.player.speed * mult * dt;
      var nx = g.player.x + g.player.vx * spd;
      var ny = g.player.y + g.player.vy * spd;

      if (XLMode.isWalkable(nx, g.player.y)) g.player.x = nx;
      if (XLMode.isWalkable(g.player.x, ny)) g.player.y = ny;

      g.player.x = Math.max(24, Math.min(XLMode.worldPixelW - 24, g.player.x));
      g.player.y = Math.max(24, Math.min(XLMode.worldPixelH - 24, g.player.y));

      S.applyMouseAim(g);
      S.applyMouseMoveXL(g, dt);

      if (!g.exploredEast && g.player.x > XLMode.SPLIT_X * XLMode.TILE) {
        g.exploredEast = true;
        g.score += 75;
        g.ui.waveBanner.textContent = 'Wild east discovered +75';
        g.ui.waveBanner.classList.add('visible');
        setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 1600);
      }

      g.camera.x = g.player.x - g.canvas.width / 2;
      g.camera.y = g.player.y - g.canvas.height / 2;
      g.camera.x = Math.max(0, Math.min(XLMode.worldPixelW - g.canvas.width, g.camera.x));
      g.camera.y = Math.max(0, Math.min(XLMode.worldPixelH - g.canvas.height, g.camera.y));
    },

    getWorldMouse: function (g) {
      return { x: g.mouse.x + g.camera.x, y: g.mouse.y + g.camera.y };
    },

    getWorldBounds: function () {
      return { w: XLMode.worldPixelW, h: XLMode.worldPixelH };
    },

    onKill: function (g) {
      g.islandKills = (g.islandKills || 0) + 1;
      if (g.islandKills % 15 === 0) {
        g.maxEnemies = Math.min(32, g.maxEnemies + 2);
        g.spawnInterval = Math.max(0.75, g.spawnInterval - 0.08);
      }
    },

    updateEnemy: function (g, dt, enemy) {
      S.chaseEnemy(g, dt, enemy);
    },

    render: function (g, ctx) {
      ctx.save();

      if (g.shakeTimer > 0) {
        var shake = g.shakeTimer * 12;
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      var sky = ctx.createLinearGradient(0, 0, 0, g.canvas.height);
      sky.addColorStop(0, '#1a2840');
      sky.addColorStop(1, '#2d4a32');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);

      if (!XLMode.hasWorld()) {
        ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
        ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press Deploy to generate the island', g.canvas.width / 2, g.canvas.height / 2);
        ctx.textAlign = 'left';
        ctx.restore();
        return;
      }

      XLMode.drawWorld(ctx, g.camera.x, g.camera.y, g.canvas.width, g.canvas.height, g.animTime);

      ctx.save();
      ctx.translate(-g.camera.x, -g.camera.y);

      S.drawParticles(ctx, g.particles);

      for (var j = 0; j < g.enemies.length; j++) {
        var e = g.enemies[j];
        XLMode.drawStickmanLean(ctx, e.x, e.y, g.player.x - e.x, g.player.y - e.y, e.color, {
          armed: true,
          animPhase: e.animPhase || 0
        });
      }

      if (g.state === g.STATE.PLAYING && (g.player.invuln <= 0 || Math.floor(Date.now() / 100) % 2 === 0)) {
        XLMode.drawStickmanLean(ctx, g.player.x, g.player.y, g.player.aimX, g.player.aimY, '#58a6ff', {
          armed: true,
          animPhase: g.player.animPhase || 0,
          scale: 1.2
        });
      }

      S.drawBullets(ctx, g.bullets, '#e3b341', 3);
      S.drawBullets(ctx, g.enemyBullets, '#ff7b72', 4);

      if (window.Gore) Gore.render(ctx);

      ctx.restore();

      ctx.fillStyle = 'rgba(230, 237, 243, 0.75)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Stickman Island — ' + XLMode.gridLabel, 16, 24);

      ctx.restore();
    }
  });
})();

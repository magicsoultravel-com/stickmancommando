(function () {
  'use strict';
  var S = window.GameShared;

  GameModes.register({
    id: 'waves',
    name: 'Waves',
    desc: 'Clear each wave, short breather, then the next wave hits harder.',
    hint: '↑ ↓ ← → or mouse · SPACE shoot · survive each wave',
    flags: { mouseMove: true, topDown: true },

    reset: function (g) {
      g.maxEnemies = 99;
      g.wave = { number: 0, toSpawn: 0, phase: 'break', breakTimer: 0, bannerTimer: 0 };
      startNextWave(g);
    },

    createPlayer: function (g) {
      return S.defaultTopDownPlayer(g);
    },

    spawn: function (g, dt) {
      if (g.wave.phase === 'break') {
        g.wave.breakTimer -= dt;
        g.wave.bannerTimer -= dt;
        if (g.wave.bannerTimer <= 0) g.ui.waveBanner.classList.remove('visible');
        if (g.wave.breakTimer <= 0) {
          g.wave.phase = 'fight';
          g.ui.waveBanner.textContent = 'Fight!';
          g.wave.bannerTimer = 1;
          g.ui.waveBanner.classList.add('visible');
        }
        return;
      }
      while (g.wave.toSpawn > 0 && g.enemies.length < g.maxEnemies) {
        S.spawnTopDownGrunt(g, 'grunt');
        g.wave.toSpawn -= 1;
      }
      if (g.wave.phase === 'fight' && g.enemies.length === 0 && g.wave.toSpawn === 0) {
        g.player.health = Math.min(g.player.maxHealth, g.player.health + 12 + g.wave.number * 2);
        g.score += 20 + g.wave.number * 10;
        g.ui.waveBanner.textContent = 'Wave ' + g.wave.number + ' cleared!';
        startNextWave(g);
      }
    },

    move: function (g, dt) {
      S.moveTopDown(g, dt);
    },

    updateEnemy: function (g, dt, enemy) {
      S.chaseEnemy(g, dt, enemy);
    },

    drawBackground: function (g, ctx) {
      S.drawGridBackground(ctx, g.canvas, 40);
      if (g.player) {
        ctx.fillStyle = 'rgba(88, 166, 255, 0.04)';
        ctx.beginPath();
        ctx.arc(g.player.x, g.player.y, 80, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawHud: function (g, ctx) {
      ctx.fillStyle = 'rgba(230, 237, 243, 0.85)';
      ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Wave ' + g.wave.number, 16, g.canvas.height - 16);
      if (g.wave.phase === 'break') {
        ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
        ctx.fillText('Breather...', 16, g.canvas.height - 34);
      }
    }
  });

  function startNextWave(g) {
    g.wave.number += 1;
    g.wave.toSpawn = 4 + g.wave.number * 2;
    g.wave.phase = 'break';
    g.wave.breakTimer = 2.5;
    g.wave.bannerTimer = 2;
    g.ui.waveBanner.textContent = 'Wave ' + g.wave.number;
    g.ui.waveBanner.classList.add('visible');
  }
})();

(function () {
  'use strict';

  function registerTopDown(cfg) {
    var S = window.GameShared;
    GameModes.register({
      id: cfg.id,
      name: cfg.name,
      desc: cfg.desc,
      hint: cfg.hint,
      legacyHighScoreKeys: cfg.legacyHighScoreKeys || [],
      flags: {
        gore: false,
        mouseMove: true,
        topDown: true,
        enemyShoots: !!cfg.enemyShoots,
        medkits: !!cfg.medkits,
        variants: !!cfg.variants
      },

      reset: function (g) {
        g.spawnInterval = cfg.spawnInterval != null ? cfg.spawnInterval : 2.2;
        g.maxEnemies = cfg.maxEnemies != null ? cfg.maxEnemies : 12;
        g.streak = 0;
        g.streakTimer = 0;
      },

      createPlayer: function (g) {
        return S.defaultTopDownPlayer(g);
      },

      spawn: function (g, dt) {
        g.difficultyTimer += dt;
        if (g.difficultyTimer > 15) {
          g.difficultyTimer = 0;
          g.spawnInterval = Math.max(0.8, g.spawnInterval - 0.15);
          g.maxEnemies = Math.min(20, g.maxEnemies + 1);
        }
        g.spawnTimer += dt;
        if (g.spawnTimer >= g.spawnInterval && g.enemies.length < g.maxEnemies) {
          g.spawnTimer = 0;
          if (cfg.variants) {
            var roll = Math.random();
            var typeKey = roll < 0.35 ? 'runner' : roll < 0.7 ? 'grunt' : 'tank';
            S.spawnTopDownGrunt(g, typeKey);
          } else {
            S.spawnTopDownGrunt(g, 'grunt');
          }
        }
      },

      move: function (g, dt) {
        S.moveTopDown(g, dt);
      },

      onKill: function (g, enemy) {
        g.streakTimer = 2.5;
        g.streak = (g.streak || 0) + 1;
        if (g.streak > 1) g.score += g.streak * 2;
        if (cfg.medkits && Math.random() <= 0.35) {
          g.pickups.push({ x: enemy.x, y: enemy.y, radius: 10, bob: 0 });
        }
      },

      tick: function (g, dt) {
        if (g.streakTimer > 0) {
          g.streakTimer -= dt;
          if (g.streakTimer <= 0) g.streak = 0;
        }
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

      drawEnemy: function (g, ctx, e) {
        S.drawStickmanUpright(ctx, e.x, e.y + Math.sin(e.wobble) * 2, g.player.x - e.x, g.player.y - e.y, e.color, e.scale, {
          armed: cfg.enemyShoots
        });
        return true;
      }
    });
  }

  registerTopDown({
    id: 'shooters',
    name: 'Enemy fire',
    desc: 'Hostiles shoot back when in range. Keep moving.',
    hint: '↑ ↓ ← → or mouse · SPACE shoot · dodge red bullets',
    enemyShoots: true
  });

  registerTopDown({
    id: 'medkits',
    name: 'Medkits',
    desc: 'Kills sometimes drop green medkits. Walk over them to heal.',
    hint: '↑ ↓ ← → or mouse · SPACE shoot · grab green crosses',
    medkits: true
  });

  registerTopDown({
    id: 'variants',
    name: 'Enemy types',
    desc: 'Orange runners, red grunts, purple tanks — different speed and HP.',
    hint: '↑ ↓ ← → or mouse · SPACE shoot · prioritize targets',
    variants: true
  });
})();

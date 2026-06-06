(function () {
  'use strict';
  var S = window.GameShared;

  function spawnWalker(g) {
    var margin = 40;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;
    if (edge === 0) { x = Math.random() * g.canvas.width; y = -margin; }
    else if (edge === 1) { x = g.canvas.width + margin; y = Math.random() * g.canvas.height; }
    else if (edge === 2) { x = Math.random() * g.canvas.width; y = g.canvas.height + margin; }
    else { x = -margin; y = Math.random() * g.canvas.height; }
    if (edge === 0 || edge === 2) x = S.snapGrid(x, g.ZOMBIE_GRID);
    else y = S.snapGrid(y, g.ZOMBIE_GRID);
    y = Math.max(g.ZOMBIE_GRID, Math.min(g.canvas.height - g.ZOMBIE_GRID, y));
    x = Math.max(g.ZOMBIE_GRID, Math.min(g.canvas.width - g.ZOMBIE_GRID, x));
    S.spawnEnemyAt(g, x, y, 'walker');
  }

  function spawnBrute(g) {
    var margin = 50;
    var edge = Math.floor(Math.random() * 4);
    var x;
    var y;
    if (edge === 0) { x = Math.random() * g.canvas.width; y = -margin; }
    else if (edge === 1) { x = g.canvas.width + margin; y = Math.random() * g.canvas.height; }
    else if (edge === 2) { x = Math.random() * g.canvas.width; y = g.canvas.height + margin; }
    else { x = -margin; y = Math.random() * g.canvas.height; }
    if (edge === 0 || edge === 2) x = S.snapGrid(x, g.ZOMBIE_GRID);
    else y = S.snapGrid(y, g.ZOMBIE_GRID);
    S.spawnEnemyAt(g, x, y, 'brute');
    g.ui.waveBanner.textContent = 'BRUTE!';
    g.ui.waveBanner.classList.add('visible');
    setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 1200);
  }

  GameModes.register({
    id: 'zombie',
    name: 'Zombie Arena',
    desc: 'Grid-lane horde. Every 10 kills a slow brute rises — 10 hits to drop it.',
    hint: '↑ ↓ ← → or mouse · SPACE shoot · nail the brutes',
    legacyHighScoreKeys: ['arena'],
    flags: { gore: true, mouseMove: true, topDown: true },

    reset: function (g) {
      g.spawnInterval = 0.35;
      g.maxEnemies = 50;
      g.zombieKillCount = 0;
    },

    createPlayer: function (g) {
      return S.defaultTopDownPlayer(g);
    },

    spawn: function (g, dt) {
      g.spawnTimer += dt;
      if (g.spawnTimer >= g.spawnInterval && g.enemies.length < g.maxEnemies) {
        g.spawnTimer = 0;
        var n = 2 + Math.floor(Math.random() * 2);
        for (var i = 0; i < n; i++) spawnWalker(g);
      }
      g.difficultyTimer += dt;
      if (g.difficultyTimer > 20) {
        g.difficultyTimer = 0;
        g.spawnInterval = Math.max(0.22, g.spawnInterval - 0.03);
      }
    },

    move: function (g, dt) {
      S.moveTopDown(g, dt);
    },

    onKill: function (g, enemy, hitAngle) {
      if (enemy.isZombie && !enemy.isBrute) {
        g.zombieKillCount += 1;
        if (g.zombieKillCount % 10 === 0) spawnBrute(g);
      }
      if (enemy.isBrute && window.Gore) {
        Gore.spawnExplosion(enemy.x, enemy.y, enemy.color, hitAngle);
        Gore.spawnExplosion(enemy.x, enemy.y, enemy.color, (hitAngle || 0) + 1);
      } else if (enemy.isZombie && window.Gore) {
        Gore.spawnExplosion(enemy.x, enemy.y, enemy.color || '#7d9a6a', hitAngle);
      }
    },

    updateEnemy: function (g, dt, enemy) {
      S.chaseEnemy(g, dt, enemy);
    },

    contactDamage: function (g, enemy) {
      return enemy.isBrute ? 28 : 12;
    },

    drawBackground: function (g, ctx) {
      S.drawZombieGrid(ctx, g);
    },

    drawEnemy: function (g, ctx, e) {
      var wobble = Math.sin(e.wobble) * 2;
      S.drawStickmanUpright(ctx, e.x, e.y + wobble, g.player.x - e.x, g.player.y - e.y, e.color, e.scale, {
        zombieArms: !e.isBrute,
        legSwing: Math.sin(e.shamble) * 4,
        brute: e.isBrute
      });
      return true;
    }
  });
})();

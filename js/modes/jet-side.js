(function () {
  'use strict';
  var S = window.GameShared;

  var JET_LANES = [130, 270, 410];

  function drawJetPlayer(ctx, p) {
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

  GameModes.register({
    id: 'jetside',
    name: 'Jet Side',
    desc: 'Jetpack between three lanes. Shoot baddies, dodge debris.',
    hint: '↑ ↓ change lane · → thrust · SPACE shoot · mouse aim',
    legacyHighScoreKeys: ['sidescroll'],
    flags: { jetSide: true },

    reset: function (g) {
      g.JET_LANES = JET_LANES;
      g.obstacles = [];
    },

    createPlayer: function (g) {
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
    },

    spawn: function (g, dt) {
      g.spawnTimer += dt;
      if (g.spawnTimer >= 1.8 && g.enemies.length < 8) {
        g.spawnTimer = 0;
        var lane = Math.floor(Math.random() * 3);
        S.spawnEnemyAt(g, g.canvas.width + 50, JET_LANES[lane], 'grunt');
        g.enemies[g.enemies.length - 1].speed = 120 + Math.random() * 60;
      }
      if (Math.random() < dt * 0.35) {
        var obsLane = Math.floor(Math.random() * 3);
        g.obstacles.push({
          x: g.canvas.width + 40,
          y: JET_LANES[obsLane],
          radius: 16,
          speed: 180 + Math.random() * 40
        });
      }
    },

    move: function (g, dt) {
      if (g.keys['ArrowUp']) g.player.targetLane = Math.max(0, g.player.targetLane - 1);
      if (g.keys['ArrowDown']) g.player.targetLane = Math.min(2, g.player.targetLane + 1);
      var targetY = JET_LANES[g.player.targetLane];
      g.player.y += (targetY - g.player.y) * 8 * dt;
      if (g.keys['ArrowRight']) g.player.x += g.player.speed * dt;
      if (g.keys['ArrowLeft']) g.player.x -= g.player.speed * 0.5 * dt;
      g.player.thrust = g.keys['ArrowRight'] ? 1 : 0;
      g.player.x = Math.max(60, Math.min(g.canvas.width - 40, g.player.x));
      g.player.aimX = 1;
      g.player.aimY = 0;
      if (g.mouse.active) {
        var bestLane = 0;
        var bestDist = Infinity;
        for (var li = 0; li < JET_LANES.length; li++) {
          var ld = Math.abs(g.mouse.y - JET_LANES[li]);
          if (ld < bestDist) { bestDist = ld; bestLane = li; }
        }
        g.player.targetLane = bestLane;
      }
    },

    getShootVector: function () {
      return { x: 1, y: 0 };
    },

    shootStartOffset: function () {
      return { x: 8, y: -10 };
    },

    updateEnemy: function (g, dt, enemy, index) {
      enemy.x -= enemy.speed * dt;
      if (enemy.x < -40) {
        g.enemies.splice(index, 1);
        return 'removed';
      }
    },

    updateObstacles: function (g, dt) {
      for (var oi = g.obstacles.length - 1; oi >= 0; oi--) {
        var obs = g.obstacles[oi];
        obs.x -= obs.speed * dt;
        if (obs.x < -40) {
          g.obstacles.splice(oi, 1);
          continue;
        }
        if (S.dist(obs.x, obs.y, g.player.x, g.player.y) < obs.radius + g.player.radius) {
          g.hurtPlayer(22);
          g.obstacles.splice(oi, 1);
          S.spawnParticles(g, obs.x, obs.y, '#8b949e', 8);
        }
      }
    },

    contactDamage: function () {
      return 20;
    },

    drawBackground: function (g, ctx) {
      ctx.fillStyle = '#0a0e18';
      ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);
      for (var lane = 0; lane < JET_LANES.length; lane++) {
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, JET_LANES[lane]);
        ctx.lineTo(g.canvas.width, JET_LANES[lane]);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(88, 166, 255, 0.04)';
      for (var star = 0; star < 40; star++) {
        ctx.fillRect((star * 97 + g.animTime * 20) % g.canvas.width, (star * 53) % g.canvas.height, 2, 2);
      }
    },

    drawObstacles: function (g, ctx) {
      for (var ob = 0; ob < g.obstacles.length; ob++) {
        var o = g.obstacles[ob];
        ctx.fillStyle = '#6e7681';
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8b949e';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },

    drawEnemy: function (g, ctx, e) {
      var wobbleOffset = Math.sin(e.wobble) * 2;
      S.drawStickmanUpright(ctx, e.x, e.y + wobbleOffset, -1, 0, e.color || '#f85149', e.scale || 1, {});
      return true;
    },

    renderPlayer: function (g, ctx) {
      drawJetPlayer(ctx, g.player);
    }
  });
})();

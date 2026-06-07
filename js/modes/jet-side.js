(function () {
  'use strict';
  var S = window.GameShared;

  var JET_LANES = [130, 270, 410];

  function drawJetBlast(ctx, nozzleX, nozzleY, flicker, strong, dir) {
    dir = dir || -1;
    var len = strong ? flicker * 1.35 : flicker * 0.65;
    var ex = nozzleX + dir * len;
    var grad = ctx.createLinearGradient(nozzleX, nozzleY, ex, nozzleY);
    grad.addColorStop(0, strong ? '#fff4a3' : '#ffa657');
    grad.addColorStop(0.25, strong ? '#ff7b72' : '#ff9f43');
    grad.addColorStop(0.65, 'rgba(255, 100, 40, 0.45)');
    grad.addColorStop(1, 'rgba(255, 80, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(nozzleX, nozzleY - 3);
    ctx.lineTo(ex, nozzleY + 1);
    ctx.lineTo(nozzleX + dir * len * 0.55, nozzleY + 5);
    ctx.lineTo(nozzleX, nozzleY + 3);
    ctx.closePath();
    ctx.fill();
  }

  function drawJetFighter(ctx, x, y, animTime, options) {
    options = options || {};
    var facing = options.facing || 1;
    var color = options.color || '#58a6ff';
    var blasting = options.blast !== false;
    var strongBlast = !!options.strongBlast;
    var flicker = 20 + Math.sin(animTime * 38) * 6 + Math.random() * 4;
    var packX = facing > 0 ? -15 : 4;
    var nozzleX = facing > 0 ? -17 : 7;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    if (blasting) {
      drawJetBlast(ctx, nozzleX, 5, flicker, strongBlast, facing > 0 ? -1 : 1);
      drawJetBlast(ctx, nozzleX, 15, flicker * 0.92, strongBlast, facing > 0 ? -1 : 1);
    }

    ctx.fillStyle = '#3d444d';
    ctx.fillRect(packX, -4, 11, 24);
    ctx.strokeStyle = '#6e7681';
    ctx.lineWidth = 2;
    ctx.strokeRect(packX, -4, 11, 24);
    ctx.fillStyle = color;
    ctx.fillRect(packX + 2, 0, 7, 8);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 10);
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 8);
    ctx.moveTo(0, 0);
    ctx.lineTo(10, 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(10, 0, 8, 3);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-5, 22);
    ctx.moveTo(0, 10);
    ctx.lineTo(5, 22);
    ctx.stroke();

    ctx.restore();
  }

  GameModes.register({
    id: 'jetside',
    name: 'Jet Side',
    desc: 'Three-lane jetpack duel. Hostiles pack boosters and shoot back — dodge debris.',
    hint: '↑ ↓ lane · → thrust · SPACE shoot · dodge red bolts',
    legacyHighScoreKeys: ['sidescroll'],
    flags: { jetSide: true, enemyShoots: true },

    reset: function (g) {
      g.JET_LANES = JET_LANES;
      g.obstacles = [];
      g.jetKills = 0;
      g.jetTier = 0;
      g.jetLaneLatch = { up: false, down: false };
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
      var cap = 8 + g.jetTier;
      if (g.spawnTimer >= Math.max(1.2, 1.9 - g.jetTier * 0.08) && g.enemies.length < cap) {
        g.spawnTimer = 0;
        var lane = Math.floor(Math.random() * 3);
        S.spawnEnemyAt(g, g.canvas.width + 50, JET_LANES[lane], 'grunt');
        var e = g.enemies[g.enemies.length - 1];
        e.speed = 110 + Math.random() * 70 + g.jetTier * 8;
        e.color = g.jetTier > 2 ? '#ffa657' : '#f85149';
        e.shootCooldown = 0.6 + Math.random() * 0.8;
        e.jetLane = lane;
      }
      if (Math.random() < dt * (0.28 + g.jetTier * 0.04)) {
        var obsLane = Math.floor(Math.random() * 3);
        g.obstacles.push({
          x: g.canvas.width + 40,
          y: JET_LANES[obsLane],
          radius: 14 + Math.min(6, g.jetTier),
          speed: 170 + Math.random() * 50 + g.jetTier * 10
        });
      }
    },

    move: function (g, dt) {
      if (!g.jetLaneLatch) g.jetLaneLatch = { up: false, down: false };

      var up = !!g.keys['ArrowUp'];
      var down = !!g.keys['ArrowDown'];
      if (up && !g.jetLaneLatch.up) {
        g.player.targetLane = Math.max(0, g.player.targetLane - 1);
      }
      if (down && !g.jetLaneLatch.down) {
        g.player.targetLane = Math.min(2, g.player.targetLane + 1);
      }
      g.jetLaneLatch.up = up;
      g.jetLaneLatch.down = down;

      var targetY = JET_LANES[g.player.targetLane];
      g.player.y += (targetY - g.player.y) * 10 * dt;
      if (Math.abs(g.player.y - targetY) < 1) g.player.y = targetY;

      if (g.keys['ArrowRight']) g.player.x += g.player.speed * dt;
      if (g.keys['ArrowLeft']) g.player.x -= g.player.speed * 0.5 * dt;
      g.player.thrust = g.keys['ArrowRight'] ? 1 : 0;
      g.player.x = Math.max(60, Math.min(g.canvas.width - 40, g.player.x));
      g.player.aimX = 1;
      g.player.aimY = 0;

      if (g.mouse.active && g.mouse.down) {
        var bestLane = 0;
        var bestDist = Infinity;
        for (var li = 0; li < JET_LANES.length; li++) {
          var ld = Math.abs(g.mouse.y - JET_LANES[li]);
          if (ld < bestDist) { bestDist = ld; bestLane = li; }
        }
        g.player.targetLane = bestLane;
      }
    },

    onKill: function (g) {
      g.jetKills += 1;
      if (g.jetKills % 12 === 0) {
        g.jetTier += 1;
        g.ui.waveBanner.textContent = 'ACE WAVE ' + (g.jetTier + 1);
        g.ui.waveBanner.classList.add('visible');
        setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 1400);
      }
    },

    getShootVector: function () {
      return { x: 1, y: 0 };
    },

    shootStartOffset: function () {
      return { x: 8, y: -10 };
    },

    updateEnemy: function (g, dt, enemy, index) {
      var laneY = JET_LANES[enemy.jetLane != null ? enemy.jetLane : 1];
      enemy.y += (laneY - enemy.y) * 4 * dt;
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
      drawJetFighter(ctx, e.x, e.y + Math.sin(e.wobble) * 2, g.animTime, {
        facing: -1,
        color: e.color || '#f85149',
        blast: true,
        strongBlast: false
      });
      return true;
    },

    renderPlayer: function (g, ctx) {
      var laneDelta = Math.abs(g.player.y - JET_LANES[g.player.targetLane]);
      drawJetFighter(ctx, g.player.x, g.player.y, g.animTime, {
        facing: 1,
        color: '#58a6ff',
        blast: g.player.thrust || laneDelta > 2,
        strongBlast: !!g.player.thrust
      });
    },

    drawHud: function (g, ctx) {
      if (g.jetTier > 0) {
        ctx.fillStyle = 'rgba(255, 166, 87, 0.9)';
        ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
        ctx.fillText('Ace tier ' + (g.jetTier + 1), 16, 24);
      }
    }
  });
})();

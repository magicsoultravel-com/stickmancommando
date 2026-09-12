(function () {
  'use strict';
  var S = window.GameShared;

  var SLOT_SIZE = 46;
  var BEST_KEY = 'stickmanCommandoSniperBest';

  // Bunker windows the pop-up targets emerge from.
  var SLOTS = [
    { x: 160, y: 130 },
    { x: 320, y: 130 },
    { x: 480, y: 130 },
    { x: 640, y: 130 },
    { x: 800, y: 130 },
    { x: 240, y: 210 },
    { x: 400, y: 210 },
    { x: 560, y: 210 },
    { x: 720, y: 210 }
  ];

  function pickType(wave) {
    var r = Math.random();
    if (wave >= 5 && r < 0.15) return 'tank';
    if (wave >= 3 && r < 0.35) return 'runner';
    return 'grunt';
  }

  function createEnemy(g, slotIdx, type) {
    var slot = SLOTS[slotIdx];
    var def = type === 'tank'
      ? { hp: 2, radius: 15, points: 70, scale: 1.25, color: '#bc8cff', aimTime: 1.4 }
      : type === 'runner'
        ? { hp: 1, radius: 10, points: 35, scale: 0.88, color: '#ffa657', aimTime: 0.85 }
        : { hp: 1, radius: 12, points: 20, scale: 1, color: '#f85149', aimTime: 1.15 };
    var wave = g.sniper.wave;
    var aimTime = Math.max(0.4, def.aimTime - wave * 0.06);
    return {
      x: slot.x,
      y: slot.y + 38,
      targetY: slot.y,
      radius: def.radius,
      health: def.hp,
      maxHealth: def.hp,
      points: def.points,
      scale: def.scale,
      color: def.color,
      type: type,
      slot: slotIdx,
      state: 'emerge',
      timer: 0.35,
      aimTime: aimTime,
      aimTimer: aimTime,
      wobble: 0,
      animPhase: Math.random() * Math.PI * 2
    };
  }

  function startWave(g) {
    var w = g.sniper.wave;
    g.sniper.toSpawn = 3 + w * 2;
    g.sniper.spawnTimer = 0.55;
    g.sniper.spawnInterval = Math.max(0.5, 1.4 - w * 0.08);
    g.showBanner('Wave ' + w, 1.5);
  }

  function updateBestWave(g) {
    var stored = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
    if (g.sniper.wave > stored) {
      localStorage.setItem(BEST_KEY, String(g.sniper.wave));
      g.sniper.bestWave = g.sniper.wave;
    }
  }

  function nextWave(g) {
    g.sniper.wave += 1;
    g.score += 80 + g.sniper.wave * 20;
    g.player.health = Math.min(g.player.maxHealth, g.player.health + 20 + g.sniper.wave * 3);
    updateBestWave(g);
    startWave(g);
  }

  GameModes.register({
    id: 'sniperrange',
    name: 'Sniper Range',
    desc: 'Stationary marksman duels: pop-up stickmen telegraph their shots; drop them before they fire.',
    hint: 'mouse aim · SPACE shoot · drop targets before the red flash fires',
    flags: { topDown: true, enemyShoots: true, gore: true },

    reset: function (g) {
      g.sniper = {
        wave: 1,
        toSpawn: 0,
        spawnTimer: 0,
        spawnInterval: 1.2,
        bestWave: parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0
      };
      startWave(g);
    },

    createPlayer: function (g) {
      var p = S.defaultTopDownPlayer(g);
      p.x = g.canvas.width / 2;
      p.y = g.canvas.height - 66;
      p.speed = 0;
      p.radius = 10;
      p.aimX = 0;
      p.aimY = -1;
      return p;
    },

    shootCooldown: function () { return 0.72; },
    bulletSpeed: function () { return 1500; },
    shootStartOffset: function (g) {
      var p = g.player;
      return { x: p.aimX * 10, y: p.aimY * 10 };
    },

    updateEnemy: function () {
      return 'skipContact';
    },

    tick: function (g, dt) {
      var p = g.player;
      if (g.mouse.active) {
        var dx = g.mouse.x - p.x;
        var dy = g.mouse.y - p.y;
        var len = Math.hypot(dx, dy) || 1;
        p.aimX = dx / len;
        p.aimY = dy / len;
      } else {
        p.aimX = 0;
        p.aimY = -1;
      }

      var s = g.sniper;

      // Spawn pop-up targets one at a time into an empty slot.
      if (s.toSpawn > 0) {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          s.spawnTimer = s.spawnInterval;
          var open = [];
          for (var si = 0; si < SLOTS.length; si++) {
            var taken = false;
            for (var ei = 0; ei < g.enemies.length; ei++) {
              if (g.enemies[ei].slot === si) { taken = true; break; }
            }
            if (!taken) open.push(si);
          }
          if (open.length > 0) {
            var slotIdx = open[Math.floor(Math.random() * open.length)];
            g.enemies.push(createEnemy(g, slotIdx, pickType(s.wave)));
            s.toSpawn -= 1;
          }
        }
      }

      // Update the gallery targets.
      for (var i = g.enemies.length - 1; i >= 0; i--) {
        var e = g.enemies[i];
        e.wobble += dt * 5;
        e.animPhase += dt * 4;

        if (e.state === 'emerge') {
          e.timer -= dt;
          var t = Math.max(0, e.timer) / 0.35;
          e.y = e.targetY + 38 * t;
          if (e.timer <= 0) {
            e.state = 'aim';
            e.aimTimer = e.aimTime;
          }
        } else if (e.state === 'aim') {
          e.aimTimer -= dt;
          if (e.aimTimer <= 0) {
            e.state = 'fire';
          }
        } else if (e.state === 'fire') {
          var bx = e.x;
          var by = e.y + 10;
          var ex = p.x - bx;
          var ey = p.y - by;
          var bl = Math.hypot(ex, ey) || 1;
          g.enemyBullets.push({
            x: bx,
            y: by,
            vx: (ex / bl) * 620,
            vy: (ey / bl) * 620,
            life: 2.5
          });
          e.state = 'hide';
          e.timer = 0.3;
        } else if (e.state === 'hide') {
          e.timer -= dt;
          var ht = Math.max(0, e.timer) / 0.3;
          e.y = e.targetY + 38 * (1 - ht);
          if (e.timer <= 0) {
            g.enemies.splice(i, 1);
          }
        }
      }

      if (s.toSpawn === 0 && g.enemies.length === 0) {
        nextWave(g);
      }
    },

    onKill: function (g, e) {
      var bonus = 0;
      if (e.state === 'aim' && e.aimTimer > 0) {
        bonus = Math.floor((e.aimTimer / e.aimTime) * e.points);
      }
      g.score += bonus;
      updateBestWave(g);
    },

    drawBackground: function (g, ctx) {
      var w = g.canvas.width;
      var h = g.canvas.height;
      ctx.fillStyle = '#161b22';
      ctx.fillRect(0, 0, w, h);

      // Range floor
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, h - 120, w, 120);

      // Distance markers
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.12)';
      ctx.lineWidth = 2;
      for (var i = 0; i < 4; i++) {
        var yy = 90 + i * 65;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }

      // Bunker windows / slots
      for (var s = 0; s < SLOTS.length; s++) {
        var slot = SLOTS[s];
        ctx.fillStyle = '#0a0c10';
        ctx.fillRect(slot.x - SLOT_SIZE / 2, slot.y - 8, SLOT_SIZE, 48);
        ctx.strokeStyle = 'rgba(139, 148, 158, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(slot.x - SLOT_SIZE / 2, slot.y - 8, SLOT_SIZE, 48);
      }

      // Sandbag nest under the player
      var px = g.player.x;
      var py = g.player.y;
      ctx.fillStyle = '#3d444d';
      ctx.fillRect(px - 34, py + 10, 68, 18);
      ctx.fillStyle = '#7d8590';
      ctx.fillRect(px - 30, py + 4, 60, 8);
    },

    drawEnemy: function (g, ctx, e) {
      // Telegraph: pulsing laser sight while aiming.
      if (e.state === 'aim') {
        var p = g.player;
        ctx.save();
        ctx.strokeStyle = '#ff7b72';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.45 + 0.25 * Math.sin(g.animTime * 12);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 4);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Aim-progress bar
        var pct = 1 - (e.aimTimer / e.aimTime);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#30363d';
        ctx.fillRect(e.x - 16, e.y - 40, 32, 5);
        ctx.fillStyle = pct > 0.75 ? '#f85149' : '#ffa657';
        ctx.fillRect(e.x - 16, e.y - 40, 32 * pct, 5);
        ctx.restore();
      }

      var bob = Math.sin(e.wobble) * 1.5;
      S.drawStickmanUpright(ctx, e.x, e.y + bob, g.player.x - e.x, 0, e.color, e.scale, {
        armed: true,
        legSwing: Math.sin(e.animPhase) * 2
      });
      return true;
    },

    drawHud: function (g, ctx) {
      var s = g.sniper;
      ctx.fillStyle = 'rgba(230, 237, 243, 0.9)';
      ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Wave ' + s.wave + (s.bestWave > 0 ? '  ·  best ' + s.bestWave : ''), 16, g.canvas.height - 16);
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.fillText('Targets left ' + (s.toSpawn + g.enemies.length), 16, g.canvas.height - 34);

      // Mouse crosshair
      if (g.mouse.active) {
        var mx = g.mouse.x;
        var my = g.mouse.y;
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mx - 16, my);
        ctx.lineTo(mx + 16, my);
        ctx.moveTo(mx, my - 16);
        ctx.lineTo(mx, my + 16);
        ctx.stroke();
      }
    }
  });
})();

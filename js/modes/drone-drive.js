(function () {
  'use strict';
  var S = window.GameShared;

  function roadProfile(t) {
    var wave = Math.sin(t * 0.007) * 45 +
      Math.sin(t * 0.019) * 30 +
      Math.sin(t * 0.003) * 75;
    var serpentine = Math.sin(t * 0.028) * 55 + Math.sin(t * 0.061) * 28;
    var crest = Math.sin(t * 0.009);
    var jump = crest > 0.88 ? Math.pow((crest - 0.88) / 0.12, 2) * 140 : 0;
    var ravine = crest < -0.82 ? Math.pow((-0.82 - crest) / 0.18, 1.6) * 110 : 0;
    var hairpin = Math.sin(t * 0.0045) * Math.sin(t * 0.017) * 65;
    return wave + serpentine + hairpin + jump - ravine;
  }

  function roadSlope(t) {
    return (roadProfile(t + 6) - roadProfile(t - 6)) / 12;
  }

  function roadCurvature(t) {
    return (roadSlope(t + 10) - roadSlope(t - 10)) / 20;
  }

  function ravineDepth(t) {
    var crest = Math.sin(t * 0.009);
    if (crest >= -0.82) return 0;
    return Math.pow((-0.82 - crest) / 0.18, 1.4);
  }

  function createTruck(g) {
    return {
      roadT: 0,
      speed: 380,
      bumpY: 0,
      bumpVel: 0,
      pitch: 0,
      roll: 0,
      inertiaX: 0,
      inertiaY: 0,
      bedCX: g.canvas.width / 2,
      bedCY: g.canvas.height - 98,
      airborne: false,
      airTime: 0,
      lastImpact: 0,
      fx: []
    };
  }

  function spawnRoadExplosion(g, x, y, size) {
    S.spawnExplosion(g, x, y, '#ffa657', size || 1);
    S.spawnExplosion(g, x, y, '#ff7b72', (size || 1) * 0.7);
    S.spawnExplosion(g, x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20, '#e3b341', (size || 1) * 0.5);
  }

  function drawDrone(ctx, x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -16);
    ctx.lineTo(0, -22);
    ctx.lineTo(14, -16);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-8, 10);
    ctx.moveTo(0, 2);
    ctx.lineTo(8, 10);
    ctx.moveTo(0, 8);
    ctx.lineTo(-4, 16);
    ctx.moveTo(0, 8);
    ctx.lineTo(4, 16);
    ctx.stroke();
    ctx.fillStyle = '#ff7b72';
    ctx.beginPath();
    ctx.arc(0, -8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCrosshair(ctx, x, y, animTime) {
    var depth = 1 + Math.sin(animTime * 4) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(depth, depth);
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(227, 179, 65, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -8);
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 22);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 80, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawScene(ctx, g) {
    var truck = g.truck;
    var bump = truck.bumpY;
    var roll = truck.roll || 0;
    var pitch = truck.pitch || 0;
    var cx = g.canvas.width / 2;
    var ravine = ravineDepth(truck.roadT);

    var sky = ctx.createLinearGradient(0, 0, 0, g.canvas.height);
    sky.addColorStop(0, '#020408');
    sky.addColorStop(0.35, '#141c28');
    sky.addColorStop(0.7, '#2a1810');
    sky.addColorStop(1, '#1a0a08');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);

    ctx.save();
    ctx.translate(cx, g.canvas.height * 0.38 + bump * 0.65);
    ctx.rotate(roll * 0.28 + pitch * 0.08);

    ctx.fillStyle = '#111820';
    for (var m = -4; m < 5; m++) {
      var mx = m * 180 - (truck.roadT * 0.35) % 180;
      var peak = 50 + Math.sin(truck.roadT * 0.01 + m) * 30;
      ctx.beginPath();
      ctx.moveTo(mx, 70);
      ctx.lineTo(mx + 50, -peak);
      ctx.lineTo(mx + 110, 70);
      ctx.fill();
    }

    var horizonY = 70 + bump * 0.35 + pitch * 18;
    var roadTilt = roll * 0.22;

    ctx.save();
    ctx.rotate(roadTilt);

    ctx.fillStyle = ravine > 0.35 ? '#120605' : '#3a2a20';
    ctx.beginPath();
    ctx.moveTo(-cx - 300, horizonY);
    ctx.lineTo(cx + 300, horizonY);
    ctx.lineTo(cx + 350, g.canvas.height);
    ctx.lineTo(-cx - 350, g.canvas.height);
    ctx.closePath();
    ctx.fill();

    if (ravine > 0.2) {
      var glow = ctx.createLinearGradient(0, horizonY + 20, 0, horizonY + 180);
      glow.addColorStop(0, 'rgba(255, 90, 30, 0.55)');
      glow.addColorStop(0.5, 'rgba(180, 40, 10, 0.35)');
      glow.addColorStop(1, 'rgba(40, 10, 5, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-cx, horizonY + 10, cx * 2, 200 * ravine);

      ctx.strokeStyle = 'rgba(255, 140, 60, 0.4)';
      ctx.lineWidth = 2;
      for (var ri = 0; ri < 6; ri++) {
        var rx = -60 + ri * 24 + (truck.roadT * 3) % 24;
        ctx.beginPath();
        ctx.moveTo(rx, horizonY + 40 + ri * 8);
        ctx.lineTo(rx + 8, horizonY + 90 + ri * 14);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#241810';
    ctx.beginPath();
    ctx.moveTo(-cx - 300, horizonY);
    ctx.lineTo(cx + 300, horizonY);
    ctx.lineTo(cx, g.canvas.height);
    ctx.lineTo(-cx, g.canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = ravine > 0.45 ? 'rgba(255, 180, 80, 0.15)' : 'rgba(255, 220, 120, 0.5)';
    ctx.lineWidth = ravine > 0.45 ? 1 : 3;
    var stripeOffset = (truck.roadT * 3.4) % 70;
    for (var s = 0; s < 18; s++) {
      var sy = horizonY + 24 + s * 48 + stripeOffset;
      if (ravine > 0.5 && s % 5 === 2) continue;
      var t = (sy - horizonY) / (g.canvas.height - horizonY);
      var halfW = 6 + t * cx * 0.9;
      ctx.beginPath();
      ctx.moveTo(-halfW, sy);
      ctx.lineTo(halfW, sy);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    for (var fi = 0; fi < truck.fx.length; fi++) {
      var fx = truck.fx[fi];
      var alpha = fx.life / fx.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.radius * (1 + (1 - alpha) * 0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    var bedY = truck.bedCY + bump * 0.65 + pitch * 12;
    ctx.save();
    ctx.translate(cx + roll * 55, bedY);
    ctx.rotate(roll * 0.18);
    ctx.fillStyle = '#1a1f26';
    ctx.fillRect(-180, 0, 360, 120);
    ctx.fillStyle = '#3d444d';
    ctx.fillRect(-160, -55, 320, 70);
    ctx.fillStyle = '#21262d';
    ctx.fillRect(-145, -48, 290, 55);
    ctx.strokeStyle = '#6e7681';
    ctx.lineWidth = 4;
    ctx.strokeRect(-145, -48, 290, 55);
    ctx.fillStyle = '#484f58';
    ctx.fillRect(-50, -95, 100, 45);

    if (truck.airborne) {
      ctx.strokeStyle = 'rgba(255, 160, 60, 0.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(-160, 72);
      ctx.lineTo(160, 72);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  GameModes.register({
    id: 'dronedrive',
    name: 'Drone Drive',
    desc: 'Terminator-style truck bed turret. Insane road, crosshair sways — pick off chasing drones.',
    hint: '↑ ↓ ← → or mouse aim · SPACE shoot · hold on tight',
    legacyHighScoreKeys: ['dronechase'],
    flags: { droneDrive: true },

    reset: function (g) {
      g.truck = createTruck(g);
      g.spawnInterval = 1.4;
      g.maxEnemies = 12;
    },

    createPlayer: function (g) {
      return {
        offsetX: 0,
        offsetY: 0,
        x: g.canvas.width / 2,
        y: g.canvas.height - 98,
        aimX: 0,
        aimY: -1,
        speed: 260,
        radius: 12,
        health: 100,
        maxHealth: 100,
        shootCooldown: 0,
        invuln: 0
      };
    },

    onCanvasResize: function (g) {
      if (g.truck) {
        g.truck.bedCX = g.canvas.width / 2;
        g.truck.bedCY = g.canvas.height - 98;
      }
    },

    spawn: function (g, dt) {
      g.spawnTimer += dt;
      if (g.spawnTimer >= g.spawnInterval && g.enemies.length < g.maxEnemies) {
        g.spawnTimer = 0;
        var x = 80 + Math.random() * (g.canvas.width - 160);
        S.spawnEnemyAt(g, x, -30, 'drone', {
          speed: 95 + Math.random() * 50,
          z: 0.2 + Math.random() * 0.5
        });
        if (g.score > 60 && Math.random() < 0.5) {
          x = 80 + Math.random() * (g.canvas.width - 160);
          S.spawnEnemyAt(g, x, -30, 'drone', {
            speed: 95 + Math.random() * 50,
            z: 0.2 + Math.random() * 0.5
          });
        }
      }
      g.spawnInterval = Math.max(0.75, 1.5 - g.score * 0.004);

      if (Math.random() < dt * 0.12) {
        var side = Math.random() < 0.5 ? -1 : 1;
        spawnRoadExplosion(g,
          g.canvas.width / 2 + side * (120 + Math.random() * 180),
          g.canvas.height * 0.35 + Math.random() * 80,
          0.6 + Math.random() * 0.5);
      }
    },

    move: function (g, dt) {
      var truck = g.truck;
      truck.roadT += truck.speed * dt;

      var targetBump = roadProfile(truck.roadT) * 0.72;
      var prevVel = truck.bumpVel;
      truck.bumpVel += (targetBump - truck.bumpY) * 11 * dt;
      truck.bumpVel *= 0.84;
      truck.bumpY += truck.bumpVel * dt;

      truck.pitch = roadSlope(truck.roadT) * 1.15;
      var curve = roadCurvature(truck.roadT);
      truck.roll = Math.sin(truck.roadT * 0.014) * 0.22 + curve * 2.2 + truck.bumpVel * 0.012;

      var wasAirborne = truck.airborne;
      truck.airborne = truck.bumpY < -35 || Math.abs(truck.bumpVel) > 95;
      if (truck.airborne) truck.airTime += dt;
      else truck.airTime = 0;

      if (wasAirborne && !truck.airborne && truck.bumpVel > 40) {
        spawnRoadExplosion(g, g.canvas.width / 2 + truck.roll * 40, g.canvas.height - 40, 1.4);
        g.shakeTimer = Math.max(g.shakeTimer, 0.45);
        truck.lastImpact = g.animTime;
      }

      if (Math.abs(truck.bumpVel - prevVel) > 120 * dt && g.animTime - truck.lastImpact > 0.25) {
        spawnRoadExplosion(g,
          g.canvas.width / 2 + (Math.random() - 0.5) * 200,
          g.canvas.height * 0.55 + Math.random() * 60,
          0.9);
        g.shakeTimer = Math.max(g.shakeTimer, 0.3);
        truck.lastImpact = g.animTime;
      }

      if (ravineDepth(truck.roadT) > 0.55 && Math.random() < dt * 2.5) {
        spawnRoadExplosion(g, g.canvas.width / 2 + (Math.random() - 0.5) * 80, g.canvas.height * 0.42, 1.1);
        g.shakeTimer = Math.max(g.shakeTimer, 0.35);
      }

      truck.inertiaX += truck.bumpVel * 0.09 + truck.roll * 55 * dt + curve * 80 * dt;
      truck.inertiaY += truck.pitch * 42 * dt;
      truck.inertiaX *= 0.82;
      truck.inertiaY *= 0.82;

      var moveX = 0;
      var moveY = 0;
      if (g.keys['ArrowLeft']) moveX -= 1;
      if (g.keys['ArrowRight']) moveX += 1;
      if (g.keys['ArrowUp']) moveY -= 1;
      if (g.keys['ArrowDown']) moveY += 1;

      if (g.mouse.active) {
        var aimDx = g.mouse.x - (truck.bedCX + g.player.offsetX);
        var aimDy = g.mouse.y - (truck.bedCY + g.player.offsetY);
        moveX += Math.max(-1, Math.min(1, aimDx / 80));
        moveY += Math.max(-1, Math.min(1, aimDy / 50));
      }

      if (moveX !== 0 || moveY !== 0) {
        var ml = Math.hypot(moveX, moveY);
        g.player.offsetX += (moveX / ml) * g.player.speed * dt;
        g.player.offsetY += (moveY / ml) * g.player.speed * dt;
      }

      g.player.offsetX = Math.max(-85, Math.min(85, g.player.offsetX));
      g.player.offsetY = Math.max(-35, Math.min(35, g.player.offsetY));

      g.player.x = truck.bedCX + g.player.offsetX + truck.inertiaX + truck.bumpY * 0.28 + truck.roll * 38;
      g.player.y = truck.bedCY + g.player.offsetY + truck.inertiaY + truck.bumpY * 0.62;

      for (var fi = truck.fx.length - 1; fi >= 0; fi--) {
        truck.fx[fi].life -= dt;
        truck.fx[fi].radius += dt * 90;
        if (truck.fx[fi].life <= 0) truck.fx.splice(fi, 1);
      }

      g.player.aimX = 0;
      g.player.aimY = -1;
    },

    onKill: function (g, enemy) {
      if (enemy.isDrone) {
        S.spawnExplosion(g, enemy.x, enemy.y, '#ff7b72', 1.2);
        S.spawnExplosion(g, enemy.x, enemy.y, '#ffa657', 0.8);
        g.shakeTimer = Math.max(g.shakeTimer, 0.15);
      }
    },

    getShootVector: function () {
      return { x: 0, y: -1 };
    },

    bulletSpeed: function () {
      return 680;
    },

    shootCooldown: function () {
      return 0.14;
    },

    hurtParticleColor: function () {
      return '#e3b341';
    },

    updateEnemy: function (g, dt, enemy, index) {
      if (!enemy.isDrone || !g.truck) return;
      enemy.weave += dt * 3.5;
      enemy.z = Math.min(1, enemy.z + dt * 0.4);
      var targetX = g.player.x + Math.sin(enemy.weave) * 50;
      var targetY = g.truck.bedCY - 20;
      var dx = targetX - enemy.x;
      var dy = targetY - enemy.y;
      var dlen = Math.hypot(dx, dy) || 1;
      var approach = enemy.speed * (0.55 + enemy.z * 0.85);
      enemy.x += (dx / dlen) * approach * dt;
      enemy.y += (dy / dlen) * approach * dt;
      enemy.scale = 0.55 + enemy.z * 0.45;

      if (enemy.y > g.truck.bedCY - 30) {
        g.hurtPlayer(15);
        S.spawnExplosion(g, enemy.x, enemy.y, '#ff7b72', 1.3);
        g.enemies.splice(index, 1);
        g.shakeTimer = Math.max(g.shakeTimer, 0.25);
        return 'removed';
      }
      return 'skipContact';
    },

    drawBackground: function (g, ctx) {
      drawScene(ctx, g);
    },

    drawEnemy: function (g, ctx, e) {
      drawDrone(ctx, e.x, e.y, e.scale || 0.75, e.color);
      return true;
    },

    renderPlayer: function (g, ctx) {
      drawCrosshair(ctx, g.player.x, g.player.y, g.animTime);
    },

    drawHud: function (g, ctx) {
      var truck = g.truck;
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Drone Drive — aim from the truck bed', 16, 24);
      if (truck.airborne) {
        ctx.fillStyle = 'rgba(255, 160, 60, 0.95)';
        ctx.fillText('AIRBORNE!', 16, 42);
      } else if (ravineDepth(truck.roadT) > 0.45) {
        ctx.fillStyle = 'rgba(255, 100, 60, 0.95)';
        ctx.fillText('RAVINE!', 16, 42);
      }
    },

    bulletColor: function () {
      return '#79c0ff';
    },

    bulletRadius: function () {
      return 4;
    }
  });
})();

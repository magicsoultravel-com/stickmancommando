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
      inRavine: false,
      ravinePhase: 0,
      fx: [],
      cinematic: null,
      cinemaCooldown: 18 + Math.random() * 12,
      lightningTimer: 0
    };
  }

  function triggerCinematic(g, text, duration) {
    g.truck.cinematic = { text: text, timer: duration || 2.4 };
  }

  function drawLightning(ctx, x, y, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff8e7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6, y + h * 0.35);
    ctx.lineTo(x - 4, y + h * 0.55);
    ctx.lineTo(x + 8, y + h);
    ctx.stroke();
    ctx.restore();
  }

  function drawRavineFx(ctx, g, ravine, horizonY, cx) {
    if (ravine < 0.15) return;

    ctx.save();
    var pulse = 0.5 + Math.sin(g.animTime * 6 + g.truck.ravinePhase) * 0.5;
    var vignette = ctx.createRadialGradient(cx, horizonY + 80, 40, cx, horizonY + 80, g.canvas.width * 0.65);
    vignette.addColorStop(0, 'rgba(255, 60, 20, 0)');
    vignette.addColorStop(1, 'rgba(80, 10, 0, ' + (0.25 + ravine * 0.35) + ')');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);

    ctx.fillStyle = 'rgba(255, 120, 40, ' + (0.08 + ravine * 0.12 * pulse) + ')';
    ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);

    if (ravine > 0.35 && g.truck.lightningTimer <= 0) {
      drawLightning(ctx, cx + (Math.random() - 0.5) * 200, horizonY - 20, 120 + Math.random() * 80, 0.5 + Math.random() * 0.4);
      g.truck.lightningTimer = 0.12 + Math.random() * 0.18;
    }

    for (var d = 0; d < 5; d++) {
      var dx = (d * 97 + g.truck.roadT * 4) % (g.canvas.width + 40) - 20;
      var dy = horizonY + 60 + d * 22 + Math.sin(g.animTime * 2 + d) * 8;
      ctx.fillStyle = 'rgba(60, 40, 35, 0.55)';
      ctx.beginPath();
      ctx.arc(dx, dy, 4 + d, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCinematic(ctx, g) {
    var c = g.truck.cinematic;
    if (!c || c.timer <= 0) return;
    var alpha = Math.min(1, c.timer / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, g.canvas.height * 0.12, g.canvas.width, 52);
    ctx.strokeStyle = 'rgba(227, 179, 65, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, g.canvas.height * 0.12, g.canvas.width - 48, 52);
    ctx.fillStyle = '#e3b341';
    ctx.font = '700 18px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.text, g.canvas.width / 2, g.canvas.height * 0.12 + 33);
    ctx.textAlign = 'left';
    ctx.restore();
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
    truck.ravinePhase = ravine;

    var sky = ctx.createLinearGradient(0, 0, 0, g.canvas.height);
    if (ravine > 0.45) {
      sky.addColorStop(0, '#1a0810');
      sky.addColorStop(0.4, '#3a1018');
      sky.addColorStop(1, '#120608');
    } else {
      sky.addColorStop(0, '#020408');
      sky.addColorStop(0.35, '#141c28');
      sky.addColorStop(0.7, '#2a1810');
      sky.addColorStop(1, '#1a0a08');
    }
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
      var glow = ctx.createLinearGradient(0, horizonY + 20, 0, horizonY + 220);
      glow.addColorStop(0, 'rgba(255, 90, 30, ' + (0.45 + ravine * 0.4) + ')');
      glow.addColorStop(0.35, 'rgba(200, 50, 15, ' + (0.3 + ravine * 0.25) + ')');
      glow.addColorStop(0.7, 'rgba(120, 20, 5, 0.35)');
      glow.addColorStop(1, 'rgba(20, 5, 2, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-cx, horizonY + 10, cx * 2, 240 * ravine);

      ctx.strokeStyle = 'rgba(255, 160, 80, ' + (0.25 + ravine * 0.35) + ')';
      ctx.lineWidth = 2;
      for (var ri = 0; ri < 8; ri++) {
        var rx = -80 + ri * 22 + (truck.roadT * 4) % 22;
        ctx.beginPath();
        ctx.moveTo(rx, horizonY + 35 + ri * 10);
        ctx.lineTo(rx + 10, horizonY + 100 + ri * 16);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 200, 80, ' + (0.15 * ravine) + ')';
      for (var em = 0; em < 4; em++) {
        ctx.beginPath();
        ctx.arc(-60 + em * 40 + Math.sin(g.animTime * 3 + em) * 6, horizonY + 70 + em * 18, 3, 0, Math.PI * 2);
        ctx.fill();
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

    drawRavineFx(ctx, g, ravine, horizonY + bump * 0.35, cx);

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

      var rav = ravineDepth(truck.roadT);
      if (rav > 0.45 && !truck.inRavine) {
        truck.inRavine = true;
        triggerCinematic(g, 'RAVINE — HOLD THE LINE!');
        g.shakeTimer = Math.max(g.shakeTimer, 0.4);
      } else if (rav <= 0.35) {
        truck.inRavine = false;
      }

      if (wasAirborne && !truck.airborne && truck.bumpVel > 40) {
        spawnRoadExplosion(g, g.canvas.width / 2 + truck.roll * 40, g.canvas.height - 40, 1.4);
        g.shakeTimer = Math.max(g.shakeTimer, 0.45);
        truck.lastImpact = g.animTime;
        triggerCinematic(g, 'HARD LANDING!');
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

      truck.cinemaCooldown -= dt;
      if (truck.cinemaCooldown <= 0 && !truck.cinematic) {
        var lines = ['DRONE SWARM INBOUND', 'KEEP FIRING', 'ROAD GETS WORSE AHEAD', 'TRUCK HEAVY — AIM STEADY'];
        triggerCinematic(g, lines[Math.floor(Math.random() * lines.length)]);
        truck.cinemaCooldown = 28 + Math.random() * 22;
      }

      if (truck.cinematic) {
        truck.cinematic.timer -= dt;
        if (truck.cinematic.timer <= 0) truck.cinematic = null;
      }
      if (truck.lightningTimer > 0) truck.lightningTimer -= dt;

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

    renderOverlay: function (g, ctx) {
      drawCinematic(ctx, g);
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

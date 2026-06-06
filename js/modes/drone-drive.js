(function () {
  'use strict';
  var S = window.GameShared;

  function roadProfile(t) {
    return Math.sin(t * 0.007) * 55 +
      Math.sin(t * 0.019) * 28 +
      Math.sin(t * 0.003) * 90 +
      Math.sin(t * 0.0012) * 120;
  }

  function roadSlope(t) {
    return (roadProfile(t + 8) - roadProfile(t - 8)) / 16;
  }

  function createTruck(g) {
    return {
      roadT: 0,
      speed: 320,
      bumpY: 0,
      bumpVel: 0,
      pitch: 0,
      roll: 0,
      inertiaX: 0,
      inertiaY: 0,
      bedCX: g.canvas.width / 2,
      bedCY: g.canvas.height - 98
    };
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
    var cx = g.canvas.width / 2;

    var sky = ctx.createLinearGradient(0, 0, 0, g.canvas.height);
    sky.addColorStop(0, '#050810');
    sky.addColorStop(0.45, '#1a2030');
    sky.addColorStop(1, '#2a1810');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);

    ctx.save();
    ctx.translate(cx, g.canvas.height * 0.42 + bump * 0.5);
    ctx.rotate(roll * 0.15);

    ctx.fillStyle = '#1f2937';
    for (var m = -3; m < 4; m++) {
      var mx = m * 200 - (truck.roadT * 0.2) % 200;
      ctx.beginPath();
      ctx.moveTo(mx, 60);
      ctx.lineTo(mx + 60, -40);
      ctx.lineTo(mx + 120, 60);
      ctx.fill();
    }

    var horizonY = 80 + bump * 0.2;
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath();
    ctx.moveTo(-cx, horizonY);
    ctx.lineTo(cx, horizonY);
    ctx.lineTo(cx + 200, g.canvas.height);
    ctx.lineTo(-cx - 200, g.canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.moveTo(-cx, horizonY);
    ctx.lineTo(cx, horizonY);
    ctx.lineTo(cx, g.canvas.height);
    ctx.lineTo(-cx, g.canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 220, 120, 0.45)';
    ctx.lineWidth = 3;
    var stripeOffset = (truck.roadT * 2.2) % 80;
    for (var s = 0; s < 16; s++) {
      var sy = horizonY + 30 + s * 55 + stripeOffset;
      var t = (sy - horizonY) / (g.canvas.height - horizonY);
      var halfW = 8 + t * cx * 0.85;
      ctx.beginPath();
      ctx.moveTo(-halfW, sy);
      ctx.lineTo(halfW, sy);
      ctx.stroke();
    }
    ctx.restore();

    var bedY = truck.bedCY + bump * 0.5;
    ctx.save();
    ctx.translate(cx + roll * 40, bedY);
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
      g.spawnInterval = 1.6;
      g.maxEnemies = 10;
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
          speed: 85 + Math.random() * 40,
          z: 0.2 + Math.random() * 0.5
        });
        if (g.score > 80 && Math.random() < 0.4) {
          x = 80 + Math.random() * (g.canvas.width - 160);
          S.spawnEnemyAt(g, x, -30, 'drone', {
            speed: 85 + Math.random() * 40,
            z: 0.2 + Math.random() * 0.5
          });
        }
      }
      g.spawnInterval = Math.max(0.9, 1.7 - g.score * 0.004);
    },

    move: function (g, dt) {
      var truck = g.truck;
      truck.roadT += truck.speed * dt;
      var targetBump = roadProfile(truck.roadT) * 0.55;
      truck.bumpVel += (targetBump - truck.bumpY) * 8 * dt;
      truck.bumpVel *= 0.88;
      truck.bumpY += truck.bumpVel * dt;
      truck.pitch = roadSlope(truck.roadT) * 0.85;
      truck.roll = Math.sin(truck.roadT * 0.011) * 0.12 + truck.bumpVel * 0.008;

      truck.inertiaX += truck.bumpVel * 0.06 + truck.roll * 40 * dt;
      truck.inertiaY += truck.pitch * 32 * dt;
      truck.inertiaX *= 0.86;
      truck.inertiaY *= 0.86;

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

      g.player.x = truck.bedCX + g.player.offsetX + truck.inertiaX + truck.bumpY * 0.22 + truck.roll * 30;
      g.player.y = truck.bedCY + g.player.offsetY + truck.inertiaY + truck.bumpY * 0.55;
      g.player.aimX = 0;
      g.player.aimY = -1;
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
      enemy.weave += dt * 3;
      enemy.z = Math.min(1, enemy.z + dt * 0.35);
      var targetX = g.player.x + Math.sin(enemy.weave) * 40;
      var targetY = g.truck.bedCY - 20;
      var dx = targetX - enemy.x;
      var dy = targetY - enemy.y;
      var dlen = Math.hypot(dx, dy) || 1;
      var approach = enemy.speed * (0.5 + enemy.z * 0.8);
      enemy.x += (dx / dlen) * approach * dt;
      enemy.y += (dy / dlen) * approach * dt;
      enemy.scale = 0.55 + enemy.z * 0.45;

      if (enemy.y > g.truck.bedCY - 30) {
        g.hurtPlayer(15);
        g.enemies.splice(index, 1);
        S.spawnParticles(g, enemy.x, enemy.y, '#ff7b72', 10);
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
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Drone Drive — aim from the truck bed', 16, 24);
    },

    bulletColor: function () {
      return '#79c0ff';
    },

    bulletRadius: function () {
      return 4;
    }
  });
})();

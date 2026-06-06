(function () {
  'use strict';

  var parts = [];

  function spawnPart(x, y, type, color, burstAngle) {
    var angle = burstAngle + (Math.random() - 0.5) * 1.4;
    var speed = 80 + Math.random() * 180;
    parts.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 12,
      life: 1.8 + Math.random() * 1.2,
      type: type,
      color: color,
      flip: Math.random() > 0.5 ? 1 : -1
    });
  }

  function spawnExplosion(x, y, color, hitAngle) {
    var base = hitAngle != null ? hitAngle : Math.random() * Math.PI * 2;
    spawnPart(x, y, 'head', color, base);
    spawnPart(x, y - 4, 'arm', color, base + 0.5);
    spawnPart(x, y + 2, 'arm', color, base - 0.5);
    spawnPart(x, y + 6, 'hand', color, base + 1);
    spawnPart(x, y + 8, 'hand', color, base - 1);
    spawnPart(x, y + 10, 'leg', color, base + 0.3);
    spawnPart(x, y + 10, 'leg', color, base - 0.3);

    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 60 + Math.random() * 140;
      parts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: 0,
        spin: 0,
        life: 0.35 + Math.random() * 0.45,
        type: 'blood',
        color: '#5a1a1a',
        size: 2 + Math.random() * 3
      });
    }
  }

  function drawPart(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.flip || 1, 1);
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (p.type === 'head') {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#3d0a0a';
      ctx.beginPath();
      ctx.arc(1, 1, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'arm') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, -2);
      ctx.stroke();
    } else if (p.type === 'hand') {
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(5, 2);
      ctx.stroke();
    } else if (p.type === 'leg') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(4, 12);
      ctx.stroke();
    } else if (p.type === 'blood') {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.beginPath();
      ctx.arc(0, 0, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  window.Gore = {
    parts: parts,

    spawnExplosion: spawnExplosion,

    clear: function () {
      parts.length = 0;
    },

    update: function (dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.vy += 420 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.rot += p.spin * dt;
        p.life -= dt;
        if (p.life <= 0) parts.splice(i, 1);
      }
    },

    render: function (ctx) {
      for (var i = 0; i < parts.length; i++) {
        drawPart(ctx, parts[i]);
      }
    }
  };
})();

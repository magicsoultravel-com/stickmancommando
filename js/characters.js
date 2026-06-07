(function () {
  'use strict';

  var MODELS = [
    { id: 'classic', name: 'Classic', color: '#58a6ff' },
    { id: 'lean', name: 'Lean', color: '#79c0ff' },
    { id: 'heavy', name: 'Heavy', color: '#388bfd' },
    { id: 'scout', name: 'Scout', color: '#a5d6ff' },
    { id: 'ninja', name: 'Ninja', color: '#8b949e' },
    { id: 'sage', name: 'Sage', color: '#e3b341' }
  ];

  function drawHeadAndBody(ctx, modelId, color) {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    if (modelId === 'ninja') {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -10, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#d73a49';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7, -12);
      ctx.lineTo(7, -12);
      ctx.stroke();
      ctx.fillStyle = '#d73a49';
      ctx.beginPath();
      ctx.moveTo(7, -12);
      ctx.lineTo(12, -11);
      ctx.lineTo(7, -10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 10);
      ctx.stroke();
    } else if (modelId === 'sage') {
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-14, -8);
      ctx.lineTo(14, -8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a88620';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, 4);
      ctx.lineTo(9, 4);
      ctx.stroke();
    } else if (modelId === 'lean') {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -13, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 14);
      ctx.stroke();
    } else if (modelId === 'heavy') {
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, -11, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-8, -2, 16, 8);
    } else if (modelId === 'scout') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -10, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(6, -8);
      ctx.stroke();
    } else {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -10, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 10);
      ctx.stroke();
    }
  }

  function draw(ctx, modelId, x, y, faceX, faceY, options) {
    options = options || {};
    var model = null;
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].id === modelId) { model = MODELS[i]; break; }
    }
    if (!model) model = MODELS[0];
    var color = options.color || model.color;
    var scale = options.scale || 1.1;
    var armed = options.armed !== false;
    var legSwing = options.legSwing || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    var flip = faceX < 0 ? -1 : 1;
    ctx.scale(flip, 1);
    var lean = Math.max(-0.4, Math.min(0.4, faceY * 0.35));
    ctx.rotate(lean);

    drawHeadAndBody(ctx, modelId, color);

    ctx.strokeStyle = color;
    ctx.lineWidth = modelId === 'heavy' ? 3 : modelId === 'lean' ? 1.6 : 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7 + legSwing * 0.2, 8);
    ctx.stroke();

    if (armed) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(10, 0, modelId === 'heavy' ? 10 : 8, modelId === 'heavy' ? 4 : 3);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(7, 8);
      ctx.stroke();
    }

    var legBase = modelId === 'lean' ? 14 : modelId === 'sage' ? 12 : 10;
    var legLen = modelId === 'lean' ? 24 : 22;
    ctx.beginPath();
    ctx.moveTo(0, legBase);
    ctx.lineTo(-5 + legSwing, legLen);
    ctx.moveTo(0, legBase);
    ctx.lineTo(5 - legSwing, legLen);
    ctx.stroke();

    ctx.restore();
  }

  function drawAnimated(ctx, modelId, x, y, options) {
    options = options || {};
    var pose = options.pose || 'idle';
    var phase = options.phase || 0;
    var facing = options.facing != null ? options.facing : 1;
    var color = options.color || '#58a6ff';
    var armed = options.armed !== false;
    var aimAngle = options.aimAngle != null ? options.aimAngle : (facing > 0 ? 0 : Math.PI);
    var scale = options.scale || 1.1;

    var walkSin = Math.sin(phase * 9);
    var walkCos = Math.cos(phase * 9);
    var breathe = Math.sin(phase * 2.2) * 1.2;
    var legSwing = 0;
    var armSwing = 0;
    var bodyBob = 0;
    var climbOffset = 0;
    var backArm = 0;
    var frontArm = 0;

    if (pose === 'walk') {
      legSwing = walkSin * 7;
      armSwing = walkSin * 5;
      bodyBob = Math.abs(walkCos) * 2;
    } else if (pose === 'climb') {
      climbOffset = Math.sin(phase * 11) * 2;
      legSwing = Math.sin(phase * 11) * 4;
      armSwing = Math.sin(phase * 11 + Math.PI) * 9;
      bodyBob = Math.sin(phase * 11 * 2) * 1.5;
    } else if (pose === 'aim') {
      bodyBob = breathe * 0.4;
    } else {
      bodyBob = breathe;
      armSwing = Math.sin(phase * 1.8) * 1.5;
    }

    ctx.save();
    ctx.translate(x, y - bodyBob);
    ctx.scale(facing * scale, scale);

    var hipY = 0;
    var shoulderY = -12;
    var headY = -22;

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-4 + legSwing * 0.15, hipY);
    ctx.lineTo(-5 + legSwing, 20);
    ctx.moveTo(4 - legSwing * 0.15, hipY);
    ctx.lineTo(5 - legSwing, 20);
    ctx.stroke();

    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, shoulderY);
    ctx.stroke();

    if (pose === 'climb') {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, shoulderY + climbOffset);
      ctx.lineTo(-8 + armSwing * 0.3, shoulderY - 10 + climbOffset);
      ctx.moveTo(0, shoulderY + climbOffset);
      ctx.lineTo(8 - armSwing * 0.3, shoulderY - 10 + climbOffset);
      ctx.stroke();
    } else if (armed && (pose === 'aim' || pose === 'walk' || pose === 'idle')) {
      var gx = Math.cos(aimAngle) * 14;
      var gy = Math.sin(aimAngle) * 14;
      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(-6 - armSwing * 0.35, shoulderY + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(gx, shoulderY + gy);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(gx - 2, shoulderY + gy - 2, 9, 3);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(-7 - armSwing, shoulderY + 5);
      ctx.moveTo(0, shoulderY);
      ctx.lineTo(7 + armSwing, shoulderY + 5);
      ctx.stroke();
    }

    ctx.lineWidth = 2.5;
    if (modelId === 'ninja') {
      ctx.beginPath();
      ctx.arc(0, headY, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#d73a49';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7, headY - 2);
      ctx.lineTo(7, headY - 2);
      ctx.stroke();
    } else if (modelId === 'sage') {
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.moveTo(0, headY - 12);
      ctx.lineTo(-12, headY);
      ctx.lineTo(12, headY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, headY + 2, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, headY, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  window.CharacterModels = {
    list: MODELS,
    draw: draw,
    drawAnimated: drawAnimated
  };
})();

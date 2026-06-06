(function () {
  'use strict';

  var MODELS = [
    { id: 'classic', name: 'Classic', color: '#58a6ff' },
    { id: 'lean', name: 'Lean', color: '#79c0ff' },
    { id: 'heavy', name: 'Heavy', color: '#388bfd' },
    { id: 'scout', name: 'Scout', color: '#a5d6ff' }
  ];

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

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    if (modelId === 'lean') {
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

    ctx.lineWidth = modelId === 'heavy' ? 3 : modelId === 'lean' ? 1.6 : 2.5;

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

    var legLen = modelId === 'lean' ? 24 : 22;
    ctx.beginPath();
    ctx.moveTo(0, modelId === 'lean' ? 14 : 10);
    ctx.lineTo(-5 + legSwing, legLen);
    ctx.moveTo(0, modelId === 'lean' ? 14 : 10);
    ctx.lineTo(5 - legSwing, legLen);
    ctx.stroke();

    ctx.restore();
  }

  window.CharacterModels = {
    list: MODELS,
    draw: draw
  };
})();

(function () {
  'use strict';

  var TILE = 64;
  var WORLD_W = 88;
  var WORLD_H = 88;
  var CANVAS_W = 1280;
  var CANVAS_H = 720;

  var TILE_GRASS = 0;
  var TILE_HILL = 1;
  var TILE_WATER = 2;
  var TILE_BRIDGE = 3;
  var TILE_FOREST = 4;

  var world = null;
  var trees = [];
  var seed = 0;

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.001) * 43758.5453;
    return n - Math.floor(n);
  }

  function smoothNoise(x, y) {
    var ix = Math.floor(x);
    var iy = Math.floor(y);
    var fx = x - ix;
    var fy = y - iy;
    var a = hash(ix, iy);
    var b = hash(ix + 1, iy);
    var c = hash(ix, iy + 1);
    var d = hash(ix + 1, iy + 1);
    var ux = fx * fx * (3 - 2 * fx);
    var uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y) {
    var v = 0;
    var amp = 0.5;
    for (var i = 0; i < 4; i++) {
      v += smoothNoise(x * (1 + i * 0.5), y * (1 + i * 0.5)) * amp;
      amp *= 0.5;
    }
    return v;
  }

  function generateWorld(worldSeed) {
    seed = worldSeed || Date.now();
    world = new Uint8Array(WORLD_W * WORLD_H);
    trees = [];

    for (var ty = 0; ty < WORLD_H; ty++) {
      for (var tx = 0; tx < WORLD_W; tx++) {
        var elev = fbm(tx * 0.08, ty * 0.08);
        var moist = fbm(tx * 0.06 + 50, ty * 0.06 + 50);
        var idx = ty * WORLD_W + tx;

        if (moist > 0.62 && elev < 0.55) {
          world[idx] = TILE_WATER;
        } else if (elev > 0.68) {
          world[idx] = TILE_HILL;
        } else if (elev > 0.38 && hash(tx, ty) > 0.72) {
          world[idx] = TILE_FOREST;
          trees.push({
            tx: tx,
            ty: ty,
            phase: hash(tx + 1, ty + 2) * Math.PI * 2,
            scale: 0.85 + hash(tx, ty + 3) * 0.35
          });
        } else {
          world[idx] = TILE_GRASS;
        }
      }
    }

    for (var ry = 2; ry < WORLD_H - 2; ry++) {
      for (var rx = 2; rx < WORLD_W - 2; rx++) {
        var i = ry * WORLD_W + rx;
        if (world[i] !== TILE_WATER) continue;
        var left = world[i - 1];
        var right = world[i + 1];
        var up = world[i - WORLD_W];
        var down = world[i + WORLD_W];
        if ((left !== TILE_WATER && left !== TILE_BRIDGE) ||
            (right !== TILE_WATER && right !== TILE_BRIDGE) ||
            (up !== TILE_WATER && up !== TILE_BRIDGE) ||
            (down !== TILE_WATER && down !== TILE_BRIDGE)) {
          if (hash(rx, ry + seed) > 0.55) world[i] = TILE_BRIDGE;
        }
      }
    }
  }

  function getTile(tx, ty) {
    if (!world) return TILE_GRASS;
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return TILE_HILL;
    return world[ty * WORLD_W + tx];
  }

  function worldToTile(wx, wy) {
    return {
      tx: Math.floor(wx / TILE),
      ty: Math.floor(wy / TILE)
    };
  }

  function isWalkable(wx, wy) {
    if (!world) return true;
    var t = worldToTile(wx, wy);
    var tile = getTile(t.tx, t.ty);
    return tile !== TILE_WATER && tile !== TILE_FOREST;
  }

  function moveSpeedMult(wx, wy) {
    if (!world) return 1;
    var t = worldToTile(wx, wy);
    var tile = getTile(t.tx, t.ty);
    if (tile === TILE_HILL) return 0.75;
    if (tile === TILE_BRIDGE) return 1;
    return 1;
  }

  function drawWorld(ctx, camX, camY, cw, ch, time) {
    if (!world) {
      ctx.fillStyle = '#1a2840';
      ctx.fillRect(0, 0, cw, ch);
      return;
    }

    var startTx = Math.floor(camX / TILE);
    var startTy = Math.floor(camY / TILE);
    var endTx = Math.ceil((camX + cw) / TILE);
    var endTy = Math.ceil((camY + ch) / TILE);

    for (var ty = startTy; ty <= endTy; ty++) {
      for (var tx = startTx; tx <= endTx; tx++) {
        var tile = getTile(tx, ty);
        var sx = tx * TILE - camX;
        var sy = ty * TILE - camY;

        if (tile === TILE_GRASS) {
          ctx.fillStyle = '#2d4a32';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          ctx.fillStyle = 'rgba(60, 120, 70, 0.15)';
          ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
        } else if (tile === TILE_HILL) {
          ctx.fillStyle = '#3d5238';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          ctx.fillStyle = '#4a6344';
          ctx.beginPath();
          ctx.moveTo(sx, sy + TILE);
          ctx.lineTo(sx + TILE * 0.5, sy + 8);
          ctx.lineTo(sx + TILE, sy + TILE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILE_WATER) {
          ctx.fillStyle = '#1a3a52';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          var wave = Math.sin(time * 2 + tx * 0.5 + ty * 0.3) * 3;
          ctx.fillStyle = 'rgba(88, 166, 255, 0.25)';
          ctx.fillRect(sx, sy + 20 + wave, TILE, 8);
        } else if (tile === TILE_BRIDGE) {
          ctx.fillStyle = '#1a3a52';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          ctx.fillStyle = '#6e4f2e';
          ctx.fillRect(sx + 4, sy + 22, TILE - 8, TILE - 28);
          ctx.strokeStyle = '#8b6914';
          ctx.lineWidth = 2;
          for (var pl = 0; pl < 3; pl++) {
            ctx.beginPath();
            ctx.moveTo(sx + 8 + pl * 18, sy + 24);
            ctx.lineTo(sx + 8 + pl * 18, sy + TILE - 6);
            ctx.stroke();
          }
        } else if (tile === TILE_FOREST) {
          ctx.fillStyle = '#243828';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
        }
      }
    }

    for (var i = 0; i < trees.length; i++) {
      var tree = trees[i];
      if (tree.tx < startTx - 1 || tree.tx > endTx + 1 || tree.ty < startTy - 1 || tree.ty > endTy + 1) {
        continue;
      }
      var tsx = tree.tx * TILE + TILE * 0.5 - camX;
      var tsy = tree.ty * TILE + TILE * 0.65 - camY;
      var sway = Math.sin(time * 1.5 + tree.phase) * 3;
      drawTree(ctx, tsx + sway, tsy, tree.scale);
    }
  }

  function drawTree(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(-3, -8, 6, 18);
    ctx.fillStyle = '#2d6a3a';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-14, -6);
    ctx.lineTo(14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a8550';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-11, -4);
    ctx.lineTo(11, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Lean, tall stick figure with walk-cycle animation. */
  function drawStickmanLean(ctx, x, y, faceX, faceY, color, options) {
    options = options || {};
    var anim = options.animPhase || 0;
    var scale = options.scale || 1.15;
    var legSwing = Math.sin(anim * 8) * 6;
    var armSwing = Math.sin(anim * 8 + Math.PI) * 5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    var flip = faceX < 0 ? -1 : 1;
    ctx.scale(flip, 1);

    var lean = Math.max(-0.35, Math.min(0.35, faceY * 0.3));
    ctx.rotate(lean);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, -14, 4.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-6 + armSwing * 0.3, 6 + armSwing);
    ctx.stroke();

    if (options.armed) {
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(11, -2, 9, 2.5);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(6 - armSwing * 0.3, 6 - armSwing);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(-4 + legSwing, 28);
    ctx.moveTo(0, 12);
    ctx.lineTo(4 - legSwing, 28);
    ctx.stroke();

    ctx.restore();
  }

  window.XLMode = {
    TILE: TILE,
    WORLD_W: WORLD_W,
    WORLD_H: WORLD_H,
    CANVAS_W: CANVAS_W,
    CANVAS_H: CANVAS_H,
    worldPixelW: WORLD_W * TILE,
    worldPixelH: WORLD_H * TILE,

    generateWorld: generateWorld,
    isWalkable: isWalkable,
    moveSpeedMult: moveSpeedMult,
    drawWorld: drawWorld,
    drawStickmanLean: drawStickmanLean,

    hasWorld: function () {
      return world !== null;
    },

    get world() { return world; }
  };
})();

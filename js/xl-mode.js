(function () {
  'use strict';

  var TILE = 64;
  var WORLD_W = 88;
  var WORLD_H = 88;
  var CANVAS_W = 1280;
  var CANVAS_H = 720;
  var SPLIT_X = Math.floor(WORLD_W * 0.42);

  var TILE_GRASS = 0;
  var TILE_HILL = 1;
  var TILE_WATER = 2;
  var TILE_BRIDGE = 3;
  var TILE_FOREST = 4;

  var world = null;
  var trees = [];
  var seed = 0;
  var spawnPoint = { x: WORLD_W * TILE * 0.5, y: WORLD_H * TILE * 0.5 };

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

  function islandFactor(tx, ty) {
    var cx = WORLD_W * 0.5;
    var cy = WORLD_H * 0.5;
    var rx = (tx - cx) / (WORLD_W * 0.44);
    var ry = (ty - cy) / (WORLD_H * 0.4);
    return Math.hypot(rx, ry);
  }

  function isSimpleRegion(tx) {
    return tx < SPLIT_X;
  }

  function tileWalkable(tile) {
    return tile === TILE_GRASS || tile === TILE_HILL || tile === TILE_BRIDGE;
  }

  function setTile(tx, ty, tile) {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
    world[ty * WORLD_W + tx] = tile;
  }

  function carveHorizontalBridges() {
    for (var ty = 2; ty < WORLD_H - 2; ty++) {
      var runStart = -1;
      for (var tx = 2; tx < WORLD_W - 2; tx++) {
        var tile = getTile(tx, ty);
        if (tile === TILE_WATER) {
          if (runStart < 0) runStart = tx;
        } else if (runStart >= 0) {
          placeHorizontalBridge(ty, runStart, tx - 1);
          runStart = -1;
        }
      }
      if (runStart >= 0) placeHorizontalBridge(ty, runStart, WORLD_W - 3);
    }
  }

  function placeHorizontalBridge(ty, x0, x1) {
    var len = x1 - x0 + 1;
    if (len < 1 || len > 10) return;
    var northWalk = tileWalkable(getTile(x0, ty - 1)) && tileWalkable(getTile(x1, ty - 1));
    var southWalk = tileWalkable(getTile(x0, ty + 1)) && tileWalkable(getTile(x1, ty + 1));
    if (!northWalk || !southWalk) return;
    for (var tx = x0; tx <= x1; tx++) {
      setTile(tx, ty, TILE_BRIDGE);
    }
  }

  function carveVerticalBridges() {
    for (var tx = 2; tx < WORLD_W - 2; tx++) {
      var runStart = -1;
      for (var ty = 2; ty < WORLD_H - 2; ty++) {
        var tile = getTile(tx, ty);
        if (tile === TILE_WATER) {
          if (runStart < 0) runStart = ty;
        } else if (runStart >= 0) {
          placeVerticalBridge(tx, runStart, ty - 1);
          runStart = -1;
        }
      }
      if (runStart >= 0) placeVerticalBridge(tx, runStart, WORLD_H - 3);
    }
  }

  function placeVerticalBridge(tx, y0, y1) {
    var len = y1 - y0 + 1;
    if (len < 1 || len > 10) return;
    var westWalk = tileWalkable(getTile(tx - 1, y0)) && tileWalkable(getTile(tx - 1, y1));
    var eastWalk = tileWalkable(getTile(tx + 1, y0)) && tileWalkable(getTile(tx + 1, y1));
    if (!westWalk || !eastWalk) return;
    for (var ty = y0; ty <= y1; ty++) {
      setTile(tx, ty, TILE_BRIDGE);
    }
  }

  function findSpawnPoint() {
    var cx = Math.floor(WORLD_W / 2);
    var cy = Math.floor(WORLD_H / 2);
    for (var r = 0; r < 24; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          var tx = cx + dx;
          var ty = cy + dy;
          var tile = getTile(tx, ty);
          if (tile === TILE_GRASS || tile === TILE_BRIDGE) {
            return {
              x: tx * TILE + TILE * 0.5,
              y: ty * TILE + TILE * 0.5
            };
          }
        }
      }
    }
    return { x: cx * TILE + TILE * 0.5, y: cy * TILE + TILE * 0.5 };
  }

  function generateWorld(worldSeed) {
    seed = worldSeed || Date.now();
    world = new Uint8Array(WORLD_W * WORLD_H);
    trees = [];

    for (var ty = 0; ty < WORLD_H; ty++) {
      for (var tx = 0; tx < WORLD_W; tx++) {
        var idx = ty * WORLD_W + tx;
        var dist = islandFactor(tx, ty);

        if (dist > 1.02) {
          world[idx] = TILE_WATER;
          continue;
        }

        if (isSimpleRegion(tx)) {
          if (dist > 0.9) {
            world[idx] = TILE_WATER;
          } else {
            world[idx] = TILE_GRASS;
          }
          continue;
        }

        var elev = fbm(tx * 0.08, ty * 0.08);
        var moist = fbm(tx * 0.06 + 50, ty * 0.06 + 50);

        if (dist > 0.94) {
          world[idx] = TILE_WATER;
        } else if (moist > 0.6 && elev < 0.58) {
          world[idx] = TILE_WATER;
        } else if (elev > 0.68) {
          world[idx] = TILE_HILL;
        } else if (elev > 0.4 && hash(tx, ty) > 0.68) {
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

    carveHorizontalBridges();
    carveVerticalBridges();

    for (var pass = 0; pass < 2; pass++) {
      carveHorizontalBridges();
      carveVerticalBridges();
    }

    spawnPoint = findSpawnPoint();
  }

  function getTile(tx, ty) {
    if (!world) return TILE_GRASS;
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return TILE_WATER;
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
    if (tileWalkable(tile)) return true;
    var offsets = [[0, 0], [-10, 0], [10, 0], [0, -10], [0, 10]];
    for (var i = 0; i < offsets.length; i++) {
      var ot = worldToTile(wx + offsets[i][0], wy + offsets[i][1]);
      if (tileWalkable(getTile(ot.tx, ot.ty))) return true;
    }
    return false;
  }

  function moveSpeedMult(wx, wy) {
    if (!world) return 1;
    var t = worldToTile(wx, wy);
    var tile = getTile(t.tx, t.ty);
    if (tile === TILE_HILL) return 0.75;
    if (tile === TILE_BRIDGE) return 1;
    return 1;
  }

  function drawSimpleGrass(ctx, sx, sy, tx, ty) {
    ctx.fillStyle = '#3d6b48';
    ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
    ctx.strokeStyle = 'rgba(90, 150, 100, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
    if ((tx + ty) % 2 === 0) {
      ctx.fillStyle = 'rgba(120, 190, 130, 0.08)';
      ctx.fillRect(sx + 8, sy + 8, TILE - 16, TILE - 16);
    }
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
        var simple = isSimpleRegion(tx);

        if (tile === TILE_GRASS) {
          if (simple) {
            drawSimpleGrass(ctx, sx, sy, tx, ty);
          } else {
            ctx.fillStyle = '#2d4a32';
            ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(60, 120, 70, 0.15)';
            ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
          }
        } else if (tile === TILE_HILL) {
          ctx.fillStyle = simple ? '#4a7050' : '#3d5238';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          ctx.fillStyle = simple ? '#5a8060' : '#4a6344';
          ctx.beginPath();
          ctx.moveTo(sx, sy + TILE);
          ctx.lineTo(sx + TILE * 0.5, sy + (simple ? 14 : 8));
          ctx.lineTo(sx + TILE, sy + TILE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILE_WATER) {
          ctx.fillStyle = simple ? '#2a5570' : '#1a3a52';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          var wave = Math.sin(time * 2 + tx * 0.5 + ty * 0.3) * 3;
          ctx.fillStyle = 'rgba(88, 166, 255, 0.25)';
          ctx.fillRect(sx, sy + 20 + wave, TILE, 8);
        } else if (tile === TILE_BRIDGE) {
          ctx.fillStyle = '#1a3a52';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          ctx.fillStyle = '#6e4f2e';
          ctx.fillRect(sx + 2, sy + 20, TILE - 4, TILE - 24);
          ctx.strokeStyle = '#8b6914';
          ctx.lineWidth = 2;
          for (var pl = 0; pl < 4; pl++) {
            ctx.beginPath();
            ctx.moveTo(sx + 6 + pl * 14, sy + 22);
            ctx.lineTo(sx + 6 + pl * 14, sy + TILE - 4);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(200, 160, 80, 0.35)';
          ctx.fillRect(sx + 4, sy + 24, TILE - 8, 6);
        } else if (tile === TILE_FOREST) {
          ctx.fillStyle = '#243828';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
        }
      }
    }

    if (startTx <= SPLIT_X && endTx >= SPLIT_X) {
      var splitSx = SPLIT_X * TILE - camX;
      ctx.fillStyle = 'rgba(88, 166, 255, 0.12)';
      ctx.fillRect(splitSx - 1, 0, 2, ch);
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
    SPLIT_X: SPLIT_X,
    gridLabel: WORLD_W + '×' + WORLD_H + ' tiles · ' + TILE + ' px each (' + (WORLD_W * TILE) + '×' + (WORLD_H * TILE) + ' px)',

    generateWorld: generateWorld,
    getSpawnPoint: function () {
      return { x: spawnPoint.x, y: spawnPoint.y };
    },
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

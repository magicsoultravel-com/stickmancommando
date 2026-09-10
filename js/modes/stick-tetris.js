(function () {
  'use strict';

  var COLS = 10;
  var ROWS = 20;
  var CELL = 24;

  var PIECES = {
    I: {
      color: '#79c0ff',
      rots: [
        [[0, 1], [1, 1], [2, 1], [3, 1]],
        [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]],
        [[1, 0], [1, 1], [1, 2], [1, 3]]
      ]
    },
    O: {
      color: '#e3b341',
      rots: [[[1, 0], [2, 0], [1, 1], [2, 1]]]
    },
    T: {
      color: '#bc8cff',
      rots: [
        [[1, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [1, 2]],
        [[1, 0], [0, 1], [1, 1], [1, 2]]
      ]
    },
    S: {
      color: '#3fb950',
      rots: [
        [[1, 0], [2, 0], [0, 1], [1, 1]],
        [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[1, 1], [2, 1], [0, 2], [1, 2]],
        [[0, 0], [0, 1], [1, 1], [1, 2]]
      ]
    },
    Z: {
      color: '#f85149',
      rots: [
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[2, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 2]],
        [[1, 0], [0, 1], [1, 1], [0, 2]]
      ]
    },
    J: {
      color: '#388bfd',
      rots: [
        [[0, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [0, 2], [1, 2]]
      ]
    },
    L: {
      color: '#ffa657',
      rots: [
        [[2, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 1], [0, 2]],
        [[0, 0], [1, 0], [1, 1], [1, 2]]
      ]
    }
  };

  var PIECE_IDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  function layoutOf(g) { return boardLayout(g); }

  function boardLayout(g) {
    var boardW = COLS * CELL;
    var boardH = ROWS * CELL;
    return {
      ox: Math.floor((g.canvas.width - boardW) / 2) - 40,
      oy: Math.floor((g.canvas.height - boardH) / 2),
      w: boardW,
      h: boardH
    };
  }

  function emptyBoard() {
    var board = [];
    for (var r = 0; r < ROWS; r++) {
      board[r] = [];
      for (var c = 0; c < COLS; c++) board[r][c] = null;
    }
    return board;
  }

  function pieceFromId(id) {
    return { id: id, color: PIECES[id].color, rot: 0, x: 3, y: 0 };
  }

  function randomPieceId() {
    return PIECE_IDS[Math.floor(Math.random() * PIECE_IDS.length)];
  }

  function randomPiece() {
    return pieceFromId(randomPieceId());
  }

  function cellsFor(piece) {
    var def = PIECES[piece.id];
    var rotIdx = piece.rot % def.rots.length;
    return def.rots[rotIdx];
  }

  function eachCell(piece, fn) {
    var cells = cellsFor(piece);
    for (var i = 0; i < cells.length; i++) {
      fn(cells[i][0] + piece.x, cells[i][1] + piece.y, i);
    }
  }

  function collides(board, piece) {
    var hit = false;
    eachCell(piece, function (cx, cy) {
      if (cx < 0 || cx >= COLS || cy >= ROWS) hit = true;
      else if (cy >= 0 && board[cy][cx]) hit = true;
    });
    return hit;
  }

  function lockPiece(g) {
    var t = g.tetris;
    eachCell(t.current, function (cx, cy, idx) {
      if (cy < 0) return;
      t.board[cy][cx] = {
        color: t.current.color,
        seed: t.current.id.charCodeAt(0) + idx * 17 + cx * 3 + cy * 7
      };
    });
    clearLines(g);
    t.current = pieceFromId(t.next);
    t.next = randomPieceId();
    if (collides(t.board, t.current)) {
      g.endGame();
    }
  }

  function clearLines(g) {
    var t = g.tetris;
    var cleared = 0;
    for (var row = ROWS - 1; row >= 0; row--) {
      var full = true;
      for (var col = 0; col < COLS; col++) {
        if (!t.board[row][col]) { full = false; break; }
      }
      if (!full) continue;
      cleared += 1;
      t.board.splice(row, 1);
      var emptyRow = [];
      for (var c = 0; c < COLS; c++) emptyRow.push(null);
      t.board.unshift(emptyRow);
      row += 1;
    }
    if (cleared > 0) {
      var points = [0, 100, 300, 500, 800];
      g.score += points[cleared] * t.level;
      t.lines += cleared;
      t.level = 1 + Math.floor(t.lines / 10);
      t.dropInterval = Math.max(0.08, 0.85 - t.level * 0.06);
      t.booms = t.booms || [];
      for (var bi = 0; bi < cleared; bi++) {
        // one exploding stickman per cleared row, launched from that row
        t.booms.push({
          x: layoutOf(g).ox + Math.random() * layoutOf(g).w,
          y: layoutOf(g).oy + (ROWS - 1 - bi) * CELL,
          vx: (Math.random() - 0.5) * 320,
          vy: -180 - Math.random() * 220,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 14,
          life: 1.4 + Math.random() * 0.6,
          color: ['#ff7b72', '#ffa657', '#e3b341', '#79c0ff'][Math.floor(Math.random() * 4)],
          seed: Math.random() * 100
        });
      }
      // screen juice: flash + shake + particles
      t.flash = 0.28;
      g.shakeTimer = Math.max(g.shakeTimer || 0, 0.1 + cleared * 0.06);
      var layoutC = layoutOf(g);
      for (var pi = 0; pi < cleared * 16; pi++) {
        g.particles.push({
          x: layoutC.ox + Math.random() * layoutC.w,
          y: layoutC.oy + Math.random() * layoutC.h,
          vx: (Math.random() - 0.5) * 380,
          vy: (Math.random() - 0.5) * 380,
          life: 0.4 + Math.random() * 0.4,
          color: pi % 3 === 0 ? '#ffd33d' : pi % 3 === 1 ? '#ff7b72' : '#ffa657',
          size: 2 + Math.random() * 3
        });
      }
      g.showBanner(cleared === 4 ? 'STICKNOVA!' : cleared > 1 ? 'CHAIN BOOM x' + cleared : 'BOOM!', 0.8);
      g.updateHud();
    }
  }

  function tryMove(g, dx, dy) {
    var t = g.tetris;
    var moved = {
      id: t.current.id,
      color: t.current.color,
      rot: t.current.rot,
      x: t.current.x + dx,
      y: t.current.y + dy
    };
    if (!collides(t.board, moved)) {
      t.current = moved;
      return true;
    }
    return false;
  }

  function tryRotate(g, dir) {
    var t = g.tetris;
    var def = PIECES[t.current.id];
    var next = {
      id: t.current.id,
      color: t.current.color,
      rot: (t.current.rot + dir + def.rots.length) % def.rots.length,
      x: t.current.x,
      y: t.current.y
    };
    if (!collides(t.board, next)) {
      t.current = next;
      return;
    }
    if (!collides(t.board, { id: next.id, color: next.color, rot: next.rot, x: next.x - 1, y: next.y })) {
      next.x -= 1;
    } else if (!collides(t.board, { id: next.id, color: next.color, rot: next.rot, x: next.x + 1, y: next.y })) {
      next.x += 1;
    } else return;
    t.current = next;
  }

  function hardDrop(g) {
    var t = g.tetris;
    while (tryMove(g, 0, 1)) {
      g.score += 2;
    }
    lockPiece(g);
    t.dropTimer = 0;
  }

  function ghostY(g) {
    var t = g.tetris;
    var ghost = {
      id: t.current.id,
      color: t.current.color,
      rot: t.current.rot,
      x: t.current.x,
      y: t.current.y
    };
    while (!collides(t.board, { id: ghost.id, color: ghost.color, rot: ghost.rot, x: ghost.x, y: ghost.y + 1 })) {
      ghost.y += 1;
    }
    return ghost.y;
  }

  function drawBomb(ctx, x, y, size, seed, color, animTime, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    var cx = x + size / 2, cy = y + size / 2;
    var r = size * 0.36;
    // bomb body
    var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
    grad.addColorStop(0, '#3d444d');
    grad.addColorStop(0.55, '#161b22');
    grad.addColorStop(1, '#060810');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.36, r * 0.14, 0, Math.PI * 2); ctx.fill();
    // cap + fuse with spark
    ctx.fillStyle = '#6e7681';
    ctx.fillRect(cx - 2.5, cy - r - 5, 5, 4);
    var flick = Math.sin(animTime * 18 + seed) * 2;
    ctx.strokeStyle = '#8b949e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - r - 5);
    ctx.quadraticCurveTo(cx + 3 + flick, cy - r - 9, cx + 5, cy - r - 6);
    ctx.stroke();
    var sparkR = 1.5 + Math.abs(Math.sin(animTime * 22 + seed * 2)) * 1.8;
    ctx.fillStyle = Math.sin(animTime * 22 + seed) > 0 ? '#ffd33d' : '#ff7b72';
    ctx.beginPath(); ctx.arc(cx + 5, cy - r - 6, sparkR, 0, Math.PI * 2); ctx.fill();
    // skull tick mark in piece color
    ctx.fillStyle = color;
    ctx.font = '700 7px Segoe UI, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('x', cx, cy + 2.5);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawDisfiguredStick(ctx, x, y, size, seed, color, animTime, alpha) {
    // legacy name kept: blocks are bombs now
    drawBomb(ctx, x, y, size, seed, color, animTime, alpha);
  }

  function drawFlyingStick(ctx, b) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life * 1.5);
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.strokeStyle = b.color; ctx.fillStyle = b.color;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    var flail = Math.sin(b.seed + b.life * 18) * 6;
    ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-6, 2 + flail); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(6, 2 - flail); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, 16); ctx.moveTo(0, 6); ctx.lineTo(4, 16); ctx.stroke();
    // fuse spark on the way out
    ctx.fillStyle = '#ffd33d';
    ctx.beginPath(); ctx.arc(6, -12, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawCellStick(ctx, layout, col, row, cell, animTime, alpha) {
    drawDisfiguredStick(
      ctx,
      layout.ox + col * CELL,
      layout.oy + row * CELL,
      CELL,
      cell.seed,
      cell.color,
      animTime,
      alpha
    );
  }

  function drawPiece(ctx, layout, piece, animTime, alpha, overrideY) {
    var yOff = overrideY != null ? overrideY : piece.y;
    eachCell(piece, function (cx, cy, idx) {
      if (cy < 0 && overrideY == null) return;
      drawDisfiguredStick(
        ctx,
        layout.ox + cx * CELL,
        layout.oy + (overrideY != null ? overrideY + (cy - piece.y) : cy) * CELL,
        CELL,
        piece.id.charCodeAt(0) + idx * 19 + cx * 5,
        piece.color,
        animTime,
        alpha
      );
    });
  }

  function drawScene(g, ctx) {
    var t = g.tetris;
    var layout = boardLayout(g);

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, g.canvas.width, g.canvas.height);

    for (var i = 0; i < 30; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (i % 5 === 0 ? 0.25 : 0.08) + ')';
      ctx.fillRect((i * 131 + g.animTime * 8) % g.canvas.width, (i * 73) % g.canvas.height, 1, 1);
    }

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(layout.ox - 4, layout.oy - 4, layout.w + 8, layout.h + 8);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.strokeRect(layout.ox - 4, layout.oy - 4, layout.w + 8, layout.h + 8);

    ctx.strokeStyle = 'rgba(48, 54, 61, 0.35)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= COLS; gx++) {
      ctx.beginPath();
      ctx.moveTo(layout.ox + gx * CELL, layout.oy);
      ctx.lineTo(layout.ox + gx * CELL, layout.oy + layout.h);
      ctx.stroke();
    }
    for (var gy = 0; gy <= ROWS; gy++) {
      ctx.beginPath();
      ctx.moveTo(layout.ox, layout.oy + gy * CELL);
      ctx.lineTo(layout.ox + layout.w, layout.oy + gy * CELL);
      ctx.stroke();
    }

    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        if (t.board[row][col]) {
          drawCellStick(ctx, layout, col, row, t.board[row][col], g.animTime, 1);
        }
      }
    }

    if (t.current && g.state === g.STATE.PLAYING) {
      var gy = ghostY(g);
      drawPiece(ctx, layout, t.current, g.animTime, 0.22, gy);
      drawPiece(ctx, layout, t.current, g.animTime, 1);
    }

    // detonation aftermath: exploding stickmen tumbling + blast flash
    if (t.booms) {
      for (var bi = 0; bi < t.booms.length; bi++) {
        drawFlyingStick(ctx, t.booms[bi]);
      }
    }
    S.drawParticles(ctx, g.particles);
    if (t.flash > 0) {
      ctx.fillStyle = 'rgba(255, 211, 61, ' + Math.min(0.35, t.flash) + ')';
      ctx.fillRect(layout.ox - 4, layout.oy - 4, layout.w + 8, layout.h + 8);
    }

    var panelX = layout.ox + layout.w + 24;
    ctx.fillStyle = '#8b949e';
    ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
    ctx.fillText('BOMB TETRIS', panelX, layout.oy + 8);
    ctx.fillStyle = '#58a6ff';
    ctx.font = '600 13px Segoe UI, system-ui, sans-serif';
    ctx.fillText('Level ' + t.level, panelX, layout.oy + 32);
    ctx.fillStyle = '#8b949e';
    ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
    ctx.fillText('Lines ' + t.lines, panelX, layout.oy + 52);
    ctx.fillText('Next', panelX, layout.oy + 88);
    if (t.next) {
      var preview = { id: t.next, color: PIECES[t.next].color, rot: 0, x: 0, y: 0 };
      eachCell(preview, function (cx, cy, idx) {
        drawDisfiguredStick(
          ctx,
          panelX + cx * 16,
          layout.oy + 96 + cy * 16,
          16,
          t.next.charCodeAt(0) + idx * 13,
          PIECES[t.next].color,
          g.animTime,
          0.85
        );
      });
    }

    ctx.fillStyle = '#6e7681';
    ctx.font = '600 10px Segoe UI, system-ui, sans-serif';
    ctx.fillText('← → move', panelX, layout.oy + 170);
    ctx.fillText('↑ rotate', panelX, layout.oy + 186);
    ctx.fillText('↓ soft drop', panelX, layout.oy + 202);
    ctx.fillText('SPACE slam', panelX, layout.oy + 218);
  }

  GameModes.register({
    id: 'sticktetris',
    name: 'Stick Tetris',
    desc: 'Bomb blocks fall - full rows detonate into exploding stickmen.',
    hint: '← → move · ↑ rotate · ↓ drop · SPACE slam · rows go BOOM',
    flags: { tetris: true },

    reset: function (g) {
      var first = randomPieceId();
      g.tetris = {
        board: emptyBoard(),
        current: pieceFromId(first),
        next: randomPieceId(),
        dropTimer: 0,
        dropInterval: 0.85,
        level: 1,
        lines: 0,
        latch: {},
        moveDelay: 0,
        softDrop: false,
        booms: [],
        flash: 0
      };
      g.score = 0;
    },

    createPlayer: function () {
      return { x: 0, y: 0, radius: 0, health: 1, maxHealth: 1, shootCooldown: 0, invuln: 0 };
    },

    move: function (g, dt) {
      var t = g.tetris;
      if (!t || g.state !== g.STATE.PLAYING) return;

      if (!t.latch) t.latch = {};

      var left = !!g.keys['ArrowLeft'];
      var right = !!g.keys['ArrowRight'];
      var up = !!g.keys['ArrowUp'];
      var down = !!g.keys['ArrowDown'];
      var space = !!g.keys[' '] || !!g.keys['Space'];

      if (up && !t.latch.up) tryRotate(g, 1);
      if (space && !t.latch.space) hardDrop(g);

      t.moveDelay -= dt;
      if (t.moveDelay <= 0) {
        if (left && !right) {
          tryMove(g, -1, 0);
          t.moveDelay = t.latch.left ? 0.05 : 0.12;
        } else if (right && !left) {
          tryMove(g, 1, 0);
          t.moveDelay = t.latch.right ? 0.05 : 0.12;
        }
      }

      if (down) {
        if (tryMove(g, 0, 1)) g.score += 1;
        t.dropTimer = 0;
      }

      t.latch.up = up;
      t.latch.left = left;
      t.latch.right = right;
      t.latch.down = down;
      t.latch.space = space;
    },

    tick: function (g, dt) {
      var t = g.tetris;
      if (!t || g.state !== g.STATE.PLAYING) return;
      if (t.flash > 0) t.flash -= dt;
      // flying exploding stickmen
      if (t.booms) {
        for (var i = t.booms.length - 1; i >= 0; i--) {
          var b = t.booms[i];
          b.vy += 700 * dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          b.rot += b.spin * dt; b.life -= dt;
          if (b.life <= 0) t.booms.splice(i, 1);
        }
      }
      // falling particles (shared with shooter modes)
      for (var p = g.particles.length - 1; p >= 0; p--) {
        var part = g.particles[p];
        part.x += part.vx * dt; part.y += part.vy * dt;
        part.life -= dt;
        if (part.life <= 0) g.particles.splice(p, 1);
      }
      if (!t.current) return;
      t.dropTimer += dt;
      if (t.dropTimer >= t.dropInterval) {
        t.dropTimer = 0;
        if (!tryMove(g, 0, 1)) {
          lockPiece(g);
        }
      }
    },

    spawn: function (g) {
      var t = g.tetris;
      if (t && !t.current) {
        t.current = randomPiece();
      }
    },

    render: function (g, ctx) {
      drawScene(g, ctx);
    },

    drawHud: function (g, ctx) {
      ctx.fillStyle = 'rgba(139, 148, 158, 0.9)';
      ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Stick Tetris', 16, 24);
    }
  });
})();

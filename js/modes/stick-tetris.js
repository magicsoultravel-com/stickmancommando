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
      g.ui.waveBanner.textContent = cleared === 4 ? 'BONK TETRIS!' : 'Cleared ' + cleared;
      g.ui.waveBanner.classList.add('visible');
      setTimeout(function () { g.ui.waveBanner.classList.remove('visible'); }, 700);
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

  function drawDisfiguredStick(ctx, x, y, size, seed, color, animTime, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x + size / 2, y + size - 3);
    var s = size / 26;
    ctx.scale(s, s);

    var wobble = Math.sin(animTime * 5 + seed) * 0.25;
    var lean = Math.sin(seed * 1.7) * 0.35 + wobble;
    ctx.rotate(lean);

    var headOffX = Math.sin(seed * 2.3) * 4;
    var headOffY = -16 + Math.cos(seed * 1.1) * 3;
    var legL = 8 + Math.sin(seed * 4) * 12;
    var legR = 8 + Math.cos(seed * 3.5) * 12;
    var armL = Math.sin(seed * 5) * 14;
    var armR = Math.cos(seed * 4.2) * 14;

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(-3 + Math.sin(seed) * 2, -2);
    ctx.lineTo(-4 + legL * 0.2, 18);
    ctx.moveTo(3 - Math.sin(seed) * 2, -2);
    ctx.lineTo(4 + legR * 0.2, 18);
    ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(Math.sin(seed * 2) * 3, -10);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-6 + armL * 0.3, -4 + armL * 0.15);
    ctx.moveTo(0, -10);
    ctx.lineTo(6 + armR * 0.3, -6 + armR * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(headOffX, headOffY, 3.5 + Math.sin(seed) * 0.8, 0, Math.PI * 2);
    ctx.stroke();

    if (seed % 3 === 0) {
      ctx.fillStyle = '#ff7b72';
      ctx.beginPath();
      ctx.arc(headOffX - 1.5, headOffY - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

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

    var panelX = layout.ox + layout.w + 24;
    ctx.fillStyle = '#8b949e';
    ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
    ctx.fillText('STICK TETRIS', panelX, layout.oy + 8);
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
    desc: 'Classic falling stacks — every block is a twisted stickman corpse.',
    hint: '← → move · ↑ rotate · ↓ drop · SPACE slam',
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
        softDrop: false
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
      if (!t || !t.current || g.state !== g.STATE.PLAYING) return;

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

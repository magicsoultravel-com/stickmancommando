(function () {
  'use strict';
  var S = window.GameShared;

  // ── Tower Defense v1 ──────────────────────────────────────────────
  // Fixed S-path, build-grid placement, "first" targeting.
  // Towers scale ONLY dmg + rateOfFire across 4 levels (range/cost fixed shape).
  var GRID = 40;
  var START_GOLD = 200;
  var START_LIVES = 20;
  var SELL_RATE = 0.7;
  var EARLY_BONUS = 20;
  var BREAK_TIME = 8;

  var PATH = [
    { x: -40, y: 100 }, { x: 820, y: 100 }, { x: 820, y: 270 },
    { x: 140, y: 270 }, { x: 140, y: 440 }, { x: 1000, y: 440 }
  ];

  var TOWER_DEFS = {
    mg: {
      name: 'Machine Gun', short: 'MG', color: '#58a6ff', targets: 'ground',
      cost: [50, 40, 70, 110], dmg: [6, 8, 10, 12], rof: [3.0, 3.8, 4.8, 6.0],
      range: 135, desc: 'Fast tracer fire. Ground only.'
    },
    grenade: {
      name: 'Grenade', short: 'GR', color: '#ffa657', targets: 'groundSplash',
      cost: [100, 50, 80, 120], dmg: [22, 30, 42, 60], rof: [0.7, 0.75, 0.8, 0.9],
      range: 140, splash: 55, desc: 'Lobbed shells, splash 55. Ground only.'
    },
    aa: {
      name: 'AA', short: 'AA', color: '#7ee787', targets: 'air',
      cost: [75, 45, 75, 115], dmg: [8, 10, 13, 16], rof: [4.0, 5.0, 6.0, 7.5],
      range: 175, aaMult: 2, desc: 'Air only, x2 dmg vs air.'
    },
    sniper: {
      name: 'Sniper', short: 'SN', color: '#bc8cff', targets: 'both',
      cost: [125, 60, 90, 130], dmg: [80, 120, 180, 260], rof: [0.5, 0.55, 0.6, 0.65],
      range: 260, desc: 'Slow heavy hits. Ground + air.'
    }
  };
  var BUILD_ORDER = ['mg', 'grenade', 'aa', 'sniper'];

  var ENEMY_STYLE = {
    walker: { color: '#7d9a6a', scale: 1, radius: 11 },
    grunt: { color: '#f85149', scale: 1, radius: 12 },
    runner: { color: '#ffa657', scale: 0.9, radius: 10 },
    tank: { color: '#bc8cff', scale: 1.3, radius: 16 },
    brute: { color: '#4a3548', scale: 2.05, radius: 26 },
    drone: { color: '#c9d1d9', scale: 0.75, radius: 10 }
  };

  // 5 simple levels, increasing difficulty.
  var WAVES = [
    [{ type: 'walker', count: 10, gap: 0.9, hp: 12, speed: 42, reward: 6, points: 5 }],
    [
      { type: 'grunt', count: 8, gap: 0.7, hp: 20, speed: 55, reward: 8, points: 10 },
      { type: 'runner', count: 6, gap: 0.5, hp: 14, speed: 110, reward: 9, points: 15, delay: 3 }
    ],
    [{ type: 'drone', count: 12, gap: 0.6, hp: 16, speed: 95, air: true, reward: 10, points: 20 }],
    [
      { type: 'tank', count: 6, gap: 1.1, hp: 90, speed: 35, reward: 20, points: 30, leak: 2 },
      { type: 'runner', count: 8, gap: 0.5, hp: 18, speed: 110, reward: 9, points: 15, delay: 2 }
    ],
    [
      { type: 'brute', count: 1, gap: 1, hp: 350, speed: 20, reward: 100, points: 100, leak: 5 },
      { type: 'grunt', count: 8, gap: 0.6, hp: 24, speed: 55, reward: 8, points: 10, delay: 1 },
      { type: 'drone', count: 6, gap: 0.7, hp: 20, speed: 95, air: true, reward: 10, points: 20, delay: 4 }
    ]
  ];

  // ── geometry helpers ──────────────────────────────────────────────
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function distToPath(x, y) {
    var best = Infinity;
    for (var i = 0; i < PATH.length - 1; i++) {
      var d = segDist(x, y, PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y);
      if (d < best) best = d;
    }
    return best;
  }

  function canBuildAt(t, x, y, H) {
    if (x < 20 || y < 60 || x > 940 || y > H - 84) return false;
    if (distToPath(x, y) < 30) return false;
    for (var i = 0; i < t.towers.length; i++) {
      if (Math.hypot(x - t.towers[i].cx, y - t.towers[i].cy) < 30) return false;
    }
    return true;
  }

  function upgradeCost(type, lvl) {
    var def = TOWER_DEFS[type];
    if (lvl >= 4) return null;
    return def.cost[lvl]; // cost[lvl] = price to go lvl -> lvl+1 (lvl is 1-based current)
  }

  function towerSpent(type, lvl) {
    var sum = 0;
    var def = TOWER_DEFS[type];
    for (var i = 0; i < lvl; i++) sum += def.cost[i];
    return sum;
  }

  function canHit(def, enemy) {
    if (def.targets === 'ground') return !enemy.air;
    if (def.targets === 'groundSplash') return !enemy.air;
    if (def.targets === 'air') return !!enemy.air;
    return true; // both
  }

  function pickTarget(tower, def, enemies) {
    var best = null, bestKey = -1;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;
      if (!canHit(def, e)) continue;
      if (Math.hypot(e.x - tower.cx, e.y - tower.cy) > def.range) continue;
      var key = e.wp * 10000 + e.dist;
      if (key > bestKey) { bestKey = key; best = e; }
    }
    return best;
  }

  function damageEnemy(t, g, e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.dead = true;
      t.gold += e.reward;
      g.score += e.points || 5;
      S.spawnParticles(g, e.x, e.y, e.color, e.air ? 12 : 8);
      if (window.Gore) Gore.spawnExplosion(e.x, e.y, e.color, Math.random() * 6);
    } else {
      S.spawnParticles(g, e.x, e.y, e.color, 2);
    }
  }

  function buildQueue(waveIdx) {
    var q = [];
    var groups = WAVES[waveIdx];
    for (var gi = 0; gi < groups.length; gi++) {
      var gr = groups[gi];
      for (var k = 0; k < gr.count; k++) {
        q.push({
          type: gr.type, delay: (gr.delay || 0) + k * gr.gap,
          hp: gr.hp, speed: gr.speed, air: !!gr.air,
          reward: gr.reward, points: gr.points, leak: gr.leak || 1
        });
      }
    }
    q.sort(function (a, b) { return a.delay - b.delay; });
    return q;
  }

  function spawnEnemy(t, g, spec) {
    var st = ENEMY_STYLE[spec.type] || ENEMY_STYLE.grunt;
    g.enemies.push({
      x: PATH[0].x, y: PATH[0].y, wp: 0, dist: 0,
      hp: spec.hp, maxHp: spec.hp, speed: spec.speed,
      air: !!spec.air, type: spec.type, color: st.color, scale: st.scale,
      radius: st.radius, reward: spec.reward, points: spec.points,
      leak: spec.leak || 1, wobble: Math.random() * 6.28,
      animPhase: Math.random() * 10, dead: false
    });
    t.spawned += 1;
  }

  function tryBuild(t, g, type, cx, cy) {
    var def = TOWER_DEFS[type];
    if (!def) return 'Unknown tower';
    if (t.gold < def.cost[0]) return 'Need ' + def.cost[0] + 'g';
    if (!canBuildAt(t, cx, cy, g.canvas.height)) return 'Blocked: path / tower / edge';
    t.gold -= def.cost[0];
    t.towers.push({ type: type, lvl: 1, cx: cx, cy: cy, cd: 0, aim: 0, flash: 0 });
    g.score = Math.max(g.score, t.towers.length * 5);
    S.spawnParticles(g, cx, cy, def.color, 8);
    return null;
  }

  function tryUpgrade(t, g, tower) {
    if (!tower || tower.lvl >= 4) return 'MAX level';
    var cost = upgradeCost(tower.type, tower.lvl);
    if (t.gold < cost) return 'Need ' + cost + 'g';
    t.gold -= cost;
    tower.lvl += 1;
    tower.flash = 0.4;
    g.score += 10 * tower.lvl;
    S.spawnParticles(g, tower.cx, tower.cy, '#e3b341', 10);
    return null;
  }

  function trySell(t, g, idx) {
    var tower = t.towers[idx];
    if (!tower) return;
    t.gold += Math.floor(towerSpent(tower.type, tower.lvl) * SELL_RATE);
    S.spawnParticles(g, tower.cx, tower.cy, '#8b949e', 8);
    t.towers.splice(idx, 1);
    if (t.sel === idx) t.sel = -1;
    else if (t.sel > idx) t.sel -= 1;
  }

  function towerAt(t, x, y) {
    for (var i = 0; i < t.towers.length; i++) {
      if (Math.hypot(x - t.towers[i].cx, y - t.towers[i].cy) < 20) return i;
    }
    return -1;
  }

  function fireTower(t, g, tower, def, target) {
    var li = tower.lvl - 1;
    var dmg = def.dmg[li] * (def.aaMult && target.air ? def.aaMult : 1);
    tower.aim = Math.atan2(target.y - tower.cy, target.x - tower.cx);
    tower.flash = 0.08;
    if (def.targets === 'groundSplash') {
      t.shells.push({ x: tower.cx, y: tower.cy - 14, tx: target.x, ty: target.y, dmg: dmg, splash: def.splash, speed: 300 });
    } else if (tower.type === 'sniper') {
      damageEnemy(t, g, target, dmg);
      t.tracers.push({ x1: tower.cx, y1: tower.cy - 14, x2: target.x, y2: target.y, life: 0.14, color: '#bc8cff' });
      g.shakeTimer = Math.max(g.shakeTimer || 0, 0.05);
    } else {
      damageEnemy(t, g, target, dmg);
      t.tracers.push({ x1: tower.cx, y1: tower.cy - 14, x2: target.x, y2: target.y, life: 0.1, color: tower.type === 'aa' ? '#7ee787' : '#e3b341' });
      S.spawnParticles(g, target.x, target.y, '#e3b341', 2);
    }
    if (window.Gore && tower.type === 'grenade') Gore.spawnExplosion(tower.cx, tower.cy - 14, '#ffa657', tower.aim);
  }

  // Rule: enemies walk waypoints. pos += dir*speed*dt; snap at <4px.
  // moveEnemies OWNED here; the central loop must NOT also move them, so
  // this mode runs with flags.tetris (central move/bullet loops return early).
  function moveEnemies(t, g, dt) {
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (e.dead) continue;
      var wp = PATH[e.wp + 1];
      if (!wp) continue;
      var dx = wp.x - e.x, dy = wp.y - e.y;
      var d = Math.hypot(dx, dy);
      if (d < 4) {
        e.wp += 1; e.dist = 0;
        if (e.wp >= PATH.length - 1) {
          e.dead = true;
          t.lives -= e.leak || 1;
          g.shakeTimer = Math.max(g.shakeTimer || 0, 0.3);
          S.spawnParticles(g, g.canvas.width - 14, e.y, '#f85149', 10);
          continue;
        }
      } else {
        var step = e.speed * dt;
        e.x += dx / d * Math.min(step, d);
        e.y += dy / d * Math.min(step, d);
        e.dist += Math.min(step, d);
      }
      e.wobble += dt * 6;
      e.animPhase += dt * (0.5 + e.speed / 80);
    }
    for (var k = g.enemies.length - 1; k >= 0; k--) {
      if (g.enemies[k].dead && g.enemies[k].hp <= 0) g.enemies.splice(k, 1);
      else if (g.enemies[k].dead) g.enemies.splice(k, 1);
    }
  }

  function tickTowers(t, g, dt) {
    for (var i = 0; i < t.towers.length; i++) {
      var tw = t.towers[i];
      var def = TOWER_DEFS[tw.type];
      if (tw.flash > 0) tw.flash -= dt;
      tw.cd -= dt;
      if (tw.cd > 0) continue;
      var target = pickTarget(tw, def, g.enemies);
      if (!target) continue;
      fireTower(t, g, tw, def, target);
      tw.cd = 1 / def.rof[tw.lvl - 1];
    }
    // grenade shells: fly to (tx,ty), then splash falloff
    for (var s = t.shells.length - 1; s >= 0; s--) {
      var sh = t.shells[s];
      var dx = sh.tx - sh.x, dy = sh.ty - sh.y;
      var d = Math.hypot(dx, dy);
      var step = sh.speed * dt;
      if (d <= Math.max(6, step)) {
        S.spawnExplosion(g, sh.tx, sh.ty, '#ffa657', 0.9);
        if (window.Gore) Gore.spawnExplosion(sh.tx, sh.ty, '#ffa657', 0);
        g.shakeTimer = Math.max(g.shakeTimer || 0, 0.12);
        for (var e2 = 0; e2 < g.enemies.length; e2++) {
          var en = g.enemies[e2];
          if (en.dead || en.air) continue;
          var dd = Math.hypot(en.x - sh.tx, en.y - sh.ty);
          if (dd <= sh.splash) {
            damageEnemy(t, g, en, sh.dmg * (1 - (dd / sh.splash) * 0.5));
          }
        }
        for (var k2 = g.enemies.length - 1; k2 >= 0; k2--) {
          if (g.enemies[k2].dead) g.enemies.splice(k2, 1);
        }
        t.shells.splice(s, 1);
      } else {
        sh.x += dx / d * step;
        sh.y += dy / d * step;
      }
    }
    // sweep any kills from hitscan this tick
    for (var k3 = g.enemies.length - 1; k3 >= 0; k3--) {
      if (g.enemies[k3].dead) g.enemies.splice(k3, 1);
    }
    // tracers decay (mode-owned so tetris central loop never touches them)
    for (var tb = t.tracers.length - 1; tb >= 0; tb--) {
      t.tracers[tb].life -= dt;
      if (t.tracers[tb].life <= 0) t.tracers.splice(tb, 1);
    }
  }

  function startWave(t, g) {
    t.phase = 'fight';
    t.queue = buildQueue(t.wave);
    t.queueTimer = 0;
    t.spawned = 0;
    g.showBanner('Wave ' + (t.wave + 1) + ' / ' + WAVES.length, 1.6);
  }

  function clearWave(t, g) {
    var bonus = 40 + (t.wave + 1) * 15;
    t.gold += bonus;
    g.score += 20 + (t.wave + 1) * 10;
    // small heal between waves is gold, not HP — TD has no player HP
    if (t.wave + 1 >= WAVES.length) {
      t.won = true;
      g.score += t.lives * 50 + t.gold;
      g.showBanner('VICTORY! +' + (t.lives * 50 + t.gold), 3);
      g.endGame();
      return;
    }
    g.showBanner('Wave cleared! +' + bonus + 'g', 2);
    t.wave += 1;
    t.phase = 'build';
    t.breakTimer = BREAK_TIME;
  }

  function handleInput(t, g, dt) {
    t.clickCd = Math.max(0, (t.clickCd || 0) - dt);
    // keyboard shortcuts 1-4 select build type
    if (g.keys['1'] && !t.latch.k1) t.pending = 'mg';
    if (g.keys['2'] && !t.latch.k2) t.pending = 'grenade';
    if (g.keys['3'] && !t.latch.k3) t.pending = 'aa';
    if (g.keys['4'] && !t.latch.k4) t.pending = 'sniper';
    if ((g.keys['u'] || g.keys['U']) && !t.latch.ku) {
      if (t.sel >= 0 && t.towers[t.sel]) {
        var msg = tryUpgrade(t, g, t.towers[t.sel]);
        if (msg) { t.msg = msg; t.msgTimer = 1.2; }
      }
    }
    if ((g.keys['x'] || g.keys['X']) && !t.latch.kx) {
      if (t.sel >= 0) trySell(t, g, t.sel);
    }
    if ((g.keys[' '] || g.keys['Space']) && !t.latch.space) {
      if (t.phase === 'build' && g.state === g.STATE.PLAYING) {
        t.gold += EARLY_BONUS;
        startWave(t, g);
      }
    }
    if (g.keys['Escape'] && !t.latch.esc) { t.pending = null; t.sel = -1; }
    t.latch.k1 = !!g.keys['1']; t.latch.k2 = !!g.keys['2'];
    t.latch.k3 = !!g.keys['3']; t.latch.k4 = !!g.keys['4'];
    t.latch.ku = !!(g.keys['u'] || g.keys['U']);
    t.latch.kx = !!(g.keys['x'] || g.keys['X']);
    t.latch.space = !!(g.keys[' '] || g.keys['Space']);
    t.latch.esc = !!g.keys['Escape'];

    // mouse click (edge-triggered via clickCd + mouse.down latch)
    if (g.mouse.active && g.mouse.down && !t.latch.mouse && t.clickCd <= 0) {
      t.latch.mouse = true;
      t.clickCd = 0.15;
      onCanvasClick(t, g, g.mouse.x, g.mouse.y);
    }
    if (!g.mouse.down) t.latch.mouse = false;
    if (t.msgTimer > 0) { t.msgTimer -= dt; if (t.msgTimer <= 0) t.msg = ''; }
  }

  function inBottomBar(g, y) { return y > g.canvas.height - 76; }

  function barButtonAt(g, x, y) {
    if (!inBottomBar(g, y)) return null;
    for (var i = 0; i < t_uiRects.length; i++) {
      var r = t_uiRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
    }
    return null;
  }
  var t_uiRects = [];

  function onCanvasClick(t, g, x, y) {
    if (g.state !== g.STATE.PLAYING) return;
    if (inBottomBar(g, y)) {
      var id = barButtonAt(g, x, y);
      if (!id) return;
      if (id === 'wave') {
        if (t.phase === 'build') { t.gold += EARLY_BONUS; startWave(t, g); }
        return;
      }
      if (id === 'upgrade') {
        if (t.sel >= 0 && t.towers[t.sel]) {
          var m = tryUpgrade(t, g, t.towers[t.sel]);
          if (m) { t.msg = m; t.msgTimer = 1.2; }
        }
        return;
      }
      if (id === 'sell') { if (t.sel >= 0) trySell(t, g, t.sel); return; }
      if (id === 'cancel') { t.pending = null; return; }
      t.pending = (t.pending === id ? null : id); // mg/grenade/aa/sniper
      return;
    }
    // playfield: tower select takes priority
    var idx = towerAt(t, x, y);
    if (idx >= 0 && !t.pending) { t.sel = (t.sel === idx ? -1 : idx); return; }
    if (t.pending) {
      var gx = Math.round(x / GRID) * GRID, gy = Math.round(y / GRID) * GRID;
      var err = tryBuild(t, g, t.pending, gx, gy);
      if (err) { t.msg = err; t.msgTimer = 1.4; }
      else { t.sel = t.towers.length - 1; }
      return;
    }
    if (idx >= 0) t.sel = idx;
    else t.sel = -1;
  }

  GameModes.register({
    id: 'towerdefense',
    name: 'Tower Defense',
    desc: 'Hold the S-path. 4 towers x 4 upgrades (dmg + fire rate), 5 waves of walkers, runners, drones, tanks and a brute.',
    hint: 'click / 1-4 build - click tower select - U upgrade - X sell (70%) - SPACE start wave',
    flags: { tetris: true, towerDefense: true, gore: true },

    reset: function (g) {
      g.td = {
        gold: START_GOLD, lives: START_LIVES, wave: 0,
        phase: 'build', breakTimer: BREAK_TIME + 2,
        queue: [], queueTimer: 0, spawned: 0,
        towers: [], shells: [], tracers: [],
        pending: null, sel: -1, latch: {},
        clickCd: 0, msg: '', msgTimer: 0, won: false
      };
      g.enemies.length = 0;
      g.bullets.length = 0;
      g.enemyBullets.length = 0;
      g.maxEnemies = 99;
      g.player.health = 100; g.player.maxHealth = 100;
      g.showBanner('Build! Wave 1 soon', 2);
    },

    createPlayer: function () {
      return { x: -100, y: -100, radius: 0, health: 100, maxHealth: 100, shootCooldown: 999, invuln: 999, aimX: 1, aimY: 0 };
    },

    shootCooldown: function () { return 999; },

    move: function (g, dt) {
      var t = g.td;
      if (!t || g.state !== g.STATE.PLAYING) return;
      handleInput(t, g, dt);
      if (t.breakTimer > 0 && t.phase === 'build') {
        t.breakTimer -= dt;
        if (t.breakTimer <= 0) startWave(t, g);
      }
      if (t.phase === 'fight') {
        t.queueTimer += dt;
        while (t.queue.length && t.queue[0].delay <= t.queueTimer) {
          spawnEnemy(t, g, t.queue.shift());
        }
      }
      moveEnemies(t, g, dt);
      tickTowers(t, g, dt);
      for (var k = g.enemies.length - 1; k >= 0; k--) {
        if (g.enemies[k].dead) g.enemies.splice(k, 1);
      }
      for (var p = g.particles.length - 1; p >= 0; p--) {
        var part = g.particles[p];
        part.x += part.vx * dt; part.y += part.vy * dt;
        part.life -= dt;
        if (part.life <= 0) g.particles.splice(p, 1);
      }
      if (window.Gore) Gore.update(dt);
      if (t.lives <= 0 && !t.won) {
        g.player.health = 0;
        g.endGame();
        return;
      }
      g.player.health = Math.max(1, t.lives * 5);
      g.player.maxHealth = 100;
      if (t.phase === 'fight' && t.queue.length === 0 && g.enemies.length === 0) {
        clearWave(t, g);
      }
    },

    tick: function () { },

    updateEnemy: function () { return 'skipContact'; },
    renderPlayer: function () { },
    interceptBullet: function () { return true; },
    interceptEnemyBullet: function () { return true; },

    drawEnemy: function () { return true; },

    drawBackground: function (g, ctx) {
      S.drawGridBackground(ctx, g.canvas, GRID, '#141b26');
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2b3442'; ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (var i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
      ctx.stroke();
      ctx.strokeStyle = '#3b4657'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (var j = 1; j < PATH.length; j++) ctx.lineTo(PATH[j].x, PATH[j].y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f85149';
      ctx.fillRect(2, PATH[0].y - 16, 10, 32);
      ctx.fillStyle = '#3fb950';
      ctx.fillRect(g.canvas.width - 12, PATH[PATH.length - 1].y - 16, 10, 32);
    },

    drawObstacles: function (g, ctx) {
      var t = g.td;
      if (!t) return;
      var i, s, tr, e;
      for (i = 0; i < t.towers.length; i++) drawTower(g, ctx, t.towers[i], i === t.sel);
      for (s = 0; s < t.shells.length; s++) {
        ctx.fillStyle = '#ffa657';
        ctx.beginPath(); ctx.arc(t.shells[s].x, t.shells[s].y, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (tr = 0; tr < t.tracers.length; tr++) {
        var tc = t.tracers[tr];
        ctx.strokeStyle = tc.color;
        ctx.globalAlpha = Math.min(1, tc.life * 8);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tc.x1, tc.y1); ctx.lineTo(tc.x2, tc.y2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (e = 0; e < g.enemies.length; e++) drawTdEnemy(g, ctx, g.enemies[e]);
      if (t.pending && g.mouse.active && !inBottomBar(g, g.mouse.y)) {
        var def = TOWER_DEFS[t.pending];
        var gx = Math.round(g.mouse.x / GRID) * GRID, gy = Math.round(g.mouse.y / GRID) * GRID;
        var ok = canBuildAt(t, gx, gy, g.canvas.height) && t.gold >= def.cost[0];
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = def.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(gx, gy, def.range, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = ok ? def.color : '#f85149';
        ctx.fillRect(gx - 12, gy - 12, 24, 24);
        ctx.globalAlpha = 1;
      }
      if (t.sel >= 0 && t.towers[t.sel]) {
        var st = t.towers[t.sel];
        ctx.strokeStyle = 'rgba(230,237,243,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(st.cx, st.cy, TOWER_DEFS[st.type].range, 0, Math.PI * 2); ctx.stroke();
      }
    },

    drawHud: function (g, ctx) {
      var t = g.td;
      if (!t) return;
      t_uiRects.length = 0;
      ctx.font = '600 13px Segoe UI, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230, 237, 243, 0.92)';
      var waveLabel = t.won ? 'CLEAR!' : (t.phase === 'build' ? 'Wave ' + (t.wave + 1) + ' soon ' + Math.ceil(Math.max(0, t.breakTimer)) + 's' : 'Wave ' + (t.wave + 1) + '/' + WAVES.length);
      ctx.fillText('HP ' + Math.max(0, t.lives) + '  Gold ' + t.gold + 'g  ' + waveLabel, 16, 22);
      ctx.fillStyle = '#e3b341';
      ctx.fillText('Score ' + g.score, 16, 40);
      if (t.msg) { ctx.fillStyle = '#ff7b72'; ctx.fillText(t.msg, 16, 58); }
      drawBar(g, ctx, t);
      if (t.sel >= 0 && t.towers[t.sel]) {
        var st = t.towers[t.sel];
        var def = TOWER_DEFS[st.type];
        var li = st.lvl - 1;
        var line = def.name + ' Lv' + st.lvl + ' ' + def.dmg[li] + 'dmg x' + def.rof[li] + '/s';
        line += st.lvl < 4 ? ' [U] ' + upgradeCost(st.type, st.lvl) + 'g' : ' MAX';
        line += ' [X] +' + Math.floor(towerSpent(st.type, st.lvl) * SELL_RATE) + 'g';
        ctx.fillStyle = 'rgba(139, 148, 158, 0.95)';
        ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
        ctx.fillText(line, 16, g.canvas.height - 84);
      }
    }
  }); // end register

  function drawTower(g, ctx, tw, selected) {
    var def = TOWER_DEFS[tw.type];
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(tw.cx - 14, tw.cy - 10, 28, 24);
    ctx.fillStyle = '#212b3a';
    ctx.fillRect(tw.cx - 12, tw.cy - 12, 24, 24);
    ctx.strokeStyle = selected ? '#e6edf3' : def.color;
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.strokeRect(tw.cx - 12, tw.cy - 12, 24, 24);
    ctx.save();
    ctx.translate(tw.cx, tw.cy);
    ctx.rotate(tw.aim || 0);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = tw.type === 'sniper' ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = def.color;
    ctx.font = '700 9px Segoe UI, system-ui, sans-serif';
    ctx.fillText(def.short, tw.cx - 8, tw.cy + 3);
    for (var p = 0; p < 4; p++) {
      ctx.fillStyle = p < tw.lvl ? '#e3b341' : 'rgba(255,255,255,0.2)';
      ctx.fillRect(tw.cx - 12 + p * 6.5, tw.cy + 14, 5, 3);
    }
    if (tw.flash > 0) {
      ctx.strokeStyle = 'rgba(227,179,65,' + Math.min(1, tw.flash * 3) + ')';
      ctx.lineWidth = 2;
      ctx.strokeRect(tw.cx - 14, tw.cy - 14, 28, 28);
    }
    void g;
  }

  function drawTdEnemy(g, ctx, e) {
    var wob = Math.sin(e.wobble) * 2;
    if (e.air) {
      var bob = Math.sin(g.animTime * 6 + e.animPhase) * 3;
      ctx.strokeStyle = e.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob - 8, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.x - 10, e.y + bob - 4); ctx.lineTo(e.x + 10, e.y + bob - 4);
      ctx.stroke();
    } else {
      S.drawStickmanUpright(ctx, e.x, e.y + wob, 1, 0, e.color, e.scale, {
        armed: e.type === 'tank' || e.type === 'brute',
        zombieArms: e.type === 'walker',
        brute: e.type === 'brute'
      });
    }
    if (e.maxHp > 20) {
      var w = e.type === 'brute' ? 44 : 28;
      var pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 14, w, 4);
      ctx.fillStyle = pct > 0.35 ? '#ff7b72' : '#ff3b30';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 14, w * pct, 4);
    }
  }

  function drawBar(g, ctx, t) {
    var y = g.canvas.height - 70;
    var x = 10;
    var H = 60, W = g.canvas.width - 20;
    ctx.fillStyle = 'rgba(13,17,23,0.92)';
    ctx.fillRect(x, y, W, H);
    ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, W, H);
    var bx = x + 8;
    for (var i = 0; i < BUILD_ORDER.length; i++) {
      var id = BUILD_ORDER[i];
      var def = TOWER_DEFS[id];
      var bw = 104, bh = 46;
      var afford = t.gold >= def.cost[0];
      ctx.fillStyle = t.pending === id ? 'rgba(88,166,255,0.25)' : 'rgba(33,43,58,1)';
      ctx.fillRect(bx, y + 7, bw, bh);
      ctx.strokeStyle = t.pending === id ? '#58a6ff' : (afford ? def.color : '#484f58');
      ctx.lineWidth = t.pending === id ? 2 : 1;
      ctx.strokeRect(bx, y + 7, bw, bh);
      ctx.fillStyle = afford ? 'rgba(230,237,243,0.95)' : 'rgba(139,148,158,0.7)';
      ctx.font = '700 11px Segoe UI, system-ui, sans-serif';
      ctx.fillText((i + 1) + ' ' + def.short + ' ' + def.cost[0] + 'g', bx + 6, y + 23);
      ctx.fillStyle = 'rgba(139,148,158,0.9)';
      ctx.font = '400 9px Segoe UI, system-ui, sans-serif';
      var tag = def.targets === 'both' ? 'ground+air' : (def.targets === 'air' ? 'air x2' : (def.targets === 'groundSplash' ? 'splash' : 'ground'));
      ctx.fillText(tag, bx + 6, y + 37);
      ctx.fillText(def.dmg[0] + 'x' + def.rof[0], bx + 6, y + 48);
      t_uiRects.push({ id: id, x: bx, y: y + 7, w: bw, h: bh });
      bx += bw + 6;
    }
    var bw2 = 110;
    ctx.fillStyle = t.phase === 'build' ? 'rgba(63,185,80,0.3)' : 'rgba(33,43,58,1)';
    ctx.fillRect(bx, y + 7, bw2, 46);
    ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, y + 7, bw2, 46);
    ctx.fillStyle = 'rgba(230,237,243,0.95)';
    ctx.font = '700 11px Segoe UI, system-ui, sans-serif';
    ctx.fillText(t.phase === 'build' ? 'START+20g' : 'WAVE...', bx + 8, y + 30);
    t_uiRects.push({ id: 'wave', x: bx, y: y + 7, w: bw2, h: 46 });
    bx += bw2 + 6;
    var hasSel = t.sel >= 0 && t.towers[t.sel];
    var upCost = hasSel ? upgradeCost(t.towers[t.sel].type, t.towers[t.sel].lvl) : null;
    ctx.fillStyle = 'rgba(33,43,58,1)';
    ctx.fillRect(bx, y + 7, 88, 46);
    ctx.strokeStyle = upCost != null ? '#e3b341' : '#484f58';
    ctx.strokeRect(bx, y + 7, 88, 46);
    ctx.fillStyle = 'rgba(230,237,243,0.9)';
    ctx.font = '700 11px Segoe UI, system-ui, sans-serif';
    ctx.fillText(upCost != null ? 'UP ' + upCost + 'g' : 'UP -', bx + 8, y + 30);
    t_uiRects.push({ id: 'upgrade', x: bx, y: y + 7, w: 88, h: 46 });
    bx += 94;
    ctx.fillStyle = 'rgba(33,43,58,1)';
    ctx.fillRect(bx, y + 7, 66, 46);
    ctx.strokeStyle = hasSel ? '#f85149' : '#484f58';
    ctx.strokeRect(bx, y + 7, 66, 46);
    ctx.fillStyle = 'rgba(230,237,243,0.9)';
    ctx.font = '700 11px Segoe UI, system-ui, sans-serif';
    ctx.fillText('SELL', bx + 8, y + 30);
    t_uiRects.push({ id: 'sell', x: bx, y: y + 7, w: 66, h: 46 });
  }

})();

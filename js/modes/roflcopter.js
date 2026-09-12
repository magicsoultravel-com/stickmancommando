(function () {
  'use strict';
  var S = window.GameShared;

  var HQ_INDEX = 3;
  var SCALE = 0.5;
  var GROUND = 470;
  var PAD = { x: 450, y: 458, w: 60, h: 10 };
  var HOVER_SPEED = 55;
  var HOVER_ARM = 0.45;
  var ROPE_LEN = 110;
  var LZ = { x: 380, y: GROUND, w: 200 };
  var ENTRY_Y = 160;
  var RESCUE_RESPAWN = 4.5;
  var FUEL_MAX = 300;
  var FUEL_BURN = 3.2;       // per second while airborne — tune here
  var FUEL_REFUEL = 28;      // per second on HQ pad
  var HEAL_REFUEL = 22;      // HP per second while refueling on HQ pad
  var STORM_CEILING = 95;    // flying above this in storm biomes hurts
  var PLANE_Y = 58;

  var MISSIONS = [
    {
      id: 'west_then_east',
      title: 'Strike west, then rescue east',
      legs: [{ type: 'destroy', sector: 0 }, { type: 'rescue', sector: 6 }]
    },
    {
      id: 'east_then_west',
      title: 'Rescue east, then strike west',
      legs: [{ type: 'rescue', sector: 6 }, { type: 'destroy', sector: 0 }]
    },
    {
      id: 'destroy_only',
      title: 'Destroy the western base',
      legs: [{ type: 'destroy', sector: 0 }]
    },
    {
      id: 'rescue_only',
      title: 'Extract the eastern hostages',
      legs: [{ type: 'rescue', sector: 6 }]
    },
    {
      id: 'escort_w_e',
      title: 'Escort Mr President · west → east',
      legs: [
        { type: 'escort_pickup', sector: 0 },
        { type: 'escort_drop', sector: 6 }
      ]
    },
    {
      id: 'escort_e_w',
      title: 'Escort Mr President · east → west',
      legs: [
        { type: 'escort_pickup', sector: 6 },
        { type: 'escort_drop', sector: 0 }
      ]
    }
  ];

  var VIP_LZ = { x: 380, y: GROUND, w: 200 };

  // Obstacles stay clear of x<90 and x>870 entry corridors at flight height.
  var SECTORS = [
    {
      id: 'W3',
      name: 'Enemy Base',
      biome: 'fortified',
      role: 'base',
      skyTop: '#2a1410',
      skyBot: '#4a2018',
      ground: '#3a2820',
      accent: '#f85149',
      air: 4,
      groundN: 7,
      airCap: 5,
      groundCap: 9,
      obstacles: [
        { x: 200, y: 250, w: 36, h: 220, kind: 'tower' },
        { x: 460, y: 200, w: 40, h: 270, kind: 'tower' },
        { x: 720, y: 260, w: 34, h: 210, kind: 'tower' }
      ],
      structures: [
        { x: 280, y: GROUND - 40, w: 70, h: 40, hp: 8, label: 'bunker' },
        { x: 520, y: GROUND - 70, w: 18, h: 70, hp: 5, label: 'mast' }
      ],
      aa: { count: [2, 3], sites: [260, 400, 560, 720, 820], hp: [3, 5], rockets: 0.55 }
    },
    {
      id: 'W2',
      name: 'Mountains',
      biome: 'mountains',
      role: 'transit',
      skyTop: '#0e1a2e',
      skyBot: '#1a3048',
      ground: '#2a3038',
      accent: '#c9d1d9',
      air: 3,
      groundN: 5,
      airCap: 4,
      groundCap: 7,
      obstacles: [
        { x: 180, y: 300, w: 50, h: 170, kind: 'peak' },
        { x: 380, y: 200, w: 60, h: 270, kind: 'peak' },
        { x: 580, y: 260, w: 48, h: 210, kind: 'peak' },
        { x: 760, y: 220, w: 55, h: 250, kind: 'peak' }
      ],
      updraft: 55,
      storm: true,
      aa: { count: [0, 2], sites: [240, 480, 700], hp: [3, 4], rockets: 0.35 }
    },
    {
      id: 'W1',
      name: 'River Valley',
      biome: 'river',
      role: 'transit',
      skyTop: '#0a2030',
      skyBot: '#143848',
      ground: '#1a3830',
      accent: '#39c5cf',
      air: 2,
      groundN: 5,
      airCap: 3,
      groundCap: 7,
      obstacles: [
        { x: 220, y: 290, w: 180, h: 16, kind: 'bridge' },
        { x: 540, y: 250, w: 200, h: 16, kind: 'bridge' },
        { x: 360, y: 360, w: 24, h: 110, kind: 'cliff' },
        { x: 620, y: 340, w: 24, h: 130, kind: 'cliff' }
      ]
    },
    {
      id: 'HQ',
      name: 'Army HQ',
      biome: 'basecamp',
      role: 'hq',
      skyTop: '#101820',
      skyBot: '#1a2838',
      ground: '#2a3340',
      accent: '#58a6ff',
      air: 0,
      groundN: 0,
      airCap: 0,
      groundCap: 0,
      obstacles: [],
      pad: true,
      hqBuilding: true
    },
    {
      id: 'E1',
      name: 'Jungle',
      biome: 'jungle',
      role: 'transit',
      skyTop: '#061810',
      skyBot: '#0e2818',
      ground: '#1a3a22',
      accent: '#3fb950',
      air: 2,
      groundN: 6,
      airCap: 3,
      groundCap: 8,
      obstacles: [
        { x: 160, y: 160, w: 28, h: 310, kind: 'trunk' },
        { x: 320, y: 100, w: 32, h: 370, kind: 'trunk' },
        { x: 500, y: 180, w: 26, h: 290, kind: 'trunk' },
        { x: 660, y: 90, w: 34, h: 380, kind: 'trunk' },
        { x: 780, y: 140, w: 28, h: 330, kind: 'trunk' }
      ]
    },
    {
      id: 'E2',
      name: 'Urban Ruins',
      biome: 'ruins',
      role: 'transit',
      skyTop: '#1a1420',
      skyBot: '#2a2030',
      ground: '#2c2830',
      accent: '#d2a8ff',
      air: 3,
      groundN: 6,
      airCap: 4,
      groundCap: 8,
      obstacles: [
        { x: 140, y: 200, w: 80, h: 270, kind: 'building' },
        { x: 320, y: 120, w: 55, h: 180, kind: 'rubble' },
        { x: 480, y: 220, w: 90, h: 250, kind: 'building' },
        { x: 700, y: 140, w: 60, h: 330, kind: 'building' }
      ],
      aa: { count: [1, 2], sites: [220, 400, 580, 760], hp: [3, 4], rockets: 0.4 },
      topPlane: true
    },
    {
      id: 'E3',
      name: 'Hostage Compound',
      biome: 'compound',
      role: 'hostage',
      skyTop: '#201810',
      skyBot: '#3a2818',
      ground: '#4a3a28',
      accent: '#e3b341',
      air: 3,
      groundN: 6,
      airCap: 5,
      groundCap: 9,
      obstacles: [
        { x: 120, y: 320, w: 40, h: 150, kind: 'fence' },
        { x: 800, y: 300, w: 40, h: 170, kind: 'fence' }
      ],
      aa: { count: [1, 3], sites: [160, 300, 700, 820], hp: [3, 4], rockets: 0.5 },
      hostages: 3
    }
  ];

  // Shrink colliders/props so the same screen has more flight room.
  (function scaleSectorGeometry() {
    for (var si = 0; si < SECTORS.length; si++) {
      var sec = SECTORS[si];
      var list = sec.obstacles || [];
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        var oldW = o.w;
        var oldH = o.h;
        var cx = o.x + oldW / 2;
        var cy = o.y + oldH / 2;
        var bottom = o.y + oldH;
        o.w = Math.max(8, oldW * SCALE);
        o.h = Math.max(6, oldH * SCALE);
        if (bottom >= GROUND - 8) {
          o.x = cx - o.w / 2;
          o.y = GROUND - o.h;
        } else {
          o.x = cx - o.w / 2;
          o.y = cy - o.h / 2;
        }
      }
      var structs = sec.structures || [];
      for (var j = 0; j < structs.length; j++) {
        var st = structs[j];
        var scx = st.x + st.w / 2;
        st.w = Math.max(10, st.w * SCALE);
        st.h = Math.max(10, st.h * SCALE);
        st.x = scx - st.w / 2;
        st.y = GROUND - st.h;
      }
    }
  })();

  function sector(g) {
    return SECTORS[g.heliSector];
  }

  function rectHit(px, py, r, rect) {
    var cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
    var cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
    return S.dist(px, py, cx, cy) < r;
  }

  function clearOfObstacles(sec, x, y, r) {
    var obs = sec.obstacles || [];
    for (var i = 0; i < obs.length; i++) {
      if (rectHit(x, y, r, obs[i])) return false;
    }
    return true;
  }

  function placeAtEntry(g, fromDir) {
    var sec = sector(g);
    var x = fromDir === 'left' ? g.canvas.width - 55 : 55;
    var y = ENTRY_Y;
    if (!clearOfObstacles(sec, x, y, g.player.radius + 4)) {
      y = 100;
      if (!clearOfObstacles(sec, x, y, g.player.radius + 4)) y = 220;
    }
    g.player.x = x;
    g.player.y = y;
    g.player.vx = fromDir === 'left' ? -80 : 80;
    g.player.vy = 0;
    g.player.landed = false;
    g.player.facing = fromDir === 'left' ? -1 : 1;
  }

  function pickMission() {
    return MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
  }

  function currentLeg(g) {
    if (!g.heliMission) return null;
    return g.heliMission.legs[g.heliLeg] || null;
  }

  function legBanner(g) {
    var leg = currentLeg(g);
    if (!leg) {
      g.showBanner('MISSION COMPLETE', 2.2);
      return;
    }
    var sec = SECTORS[leg.sector];
    if (leg.type === 'destroy') g.showBanner('DESTROY · ' + sec.name, 2);
    else if (leg.type === 'rescue') g.showBanner('RESCUE · ' + sec.name, 2);
    else if (leg.type === 'escort_pickup') g.showBanner('ESCORT · CLEAR & EXTRACT · ' + sec.name, 2.2);
    else if (leg.type === 'escort_drop') g.showBanner('ESCORT · CLEAR & DELIVER · ' + sec.name, 2.2);
  }

  function isEscortLeg(leg) {
    return leg && (leg.type === 'escort_pickup' || leg.type === 'escort_drop');
  }

  function escortHere(g) {
    var leg = currentLeg(g);
    return isEscortLeg(leg) && leg.sector === g.heliSector;
  }

  function siegeCleared(g) {
    if (g.enemies.length > 0) return false;
    for (var i = 0; i < g.heliAA.length; i++) {
      if (g.heliAA[i].alive) return false;
    }
    return true;
  }

  function initVipForLeg(g, leg) {
    if (leg.type === 'escort_pickup') {
      g.heliVip = {
        state: 'hidden',
        x: VIP_LZ.x + VIP_LZ.w / 2,
        y: GROUND - 10,
        climb: 0,
        clearTimer: 0
      };
    } else if (leg.type === 'escort_drop') {
      g.heliVip = {
        state: 'aboard',
        x: VIP_LZ.x + VIP_LZ.w / 2,
        y: GROUND - 10,
        climb: 0,
        clearTimer: 0
      };
    }
  }

  var SHOUTS = [
    'WHAT WAS THAT?!',
    'HOSTAGES ARE NOT TARGETS!',
    'MY PAD! MY RULES!',
    'GET BACK OUT THERE!',
    'DO YOU EVEN ROFL?!',
    'THAT BRIEFING WAS NOT OPTIONAL!'
  ];
  var PRAISE = [
    'NOT BAD, PILOT.',
    'SECTOR QUIET — FOR NOW.',
    'GOOD WORK. NEXT BRIEFING.',
    'ROFL AFFIRMATIVE.'
  ];

  function missionBriefLines(mission) {
    var lines = ['JOHN STICKMAN!', 'YOUR MISSION IS…'];
    var legs = mission.legs || [];
    for (var i = 0; i < legs.length; i++) {
      var leg = legs[i];
      var prefix = i === 0 ? '' : 'THEN — ';
      if (leg.type === 'destroy') {
        lines.push(prefix + 'FLY WEST AND LEVEL THE ENEMY BASE.');
      } else if (leg.type === 'rescue') {
        lines.push(prefix + 'EXTRACT THE HOSTAGES FROM THE EAST COMPOUND.');
      } else if (leg.type === 'escort_pickup' && leg.sector === 0) {
        lines.push(prefix + 'CLEAR THE WEST EMBASSY. EXTRACT MR PRESIDENT.');
      } else if (leg.type === 'escort_pickup' && leg.sector === 6) {
        lines.push(prefix + 'CLEAR THE EAST EMBASSY. EXTRACT MR PRESIDENT.');
      } else if (leg.type === 'escort_drop' && leg.sector === 6) {
        lines.push(prefix + 'DELIVER HIM TO THE EAST EMBASSY.');
      } else if (leg.type === 'escort_drop' && leg.sector === 0) {
        lines.push(prefix + 'DELIVER HIM TO THE WEST EMBASSY.');
      }
    }
    lines.push('DO NOT EMBARRASS THIS PAD. DISMISSED!');
    return lines;
  }

  function lockPlayerOnPad(g) {
    g.player.landed = true;
    g.player.x = PAD.x + PAD.w / 2;
    g.player.y = PAD.y - 10;
    g.player.vx = 0;
    g.player.vy = 0;
  }

  function startBriefing(g) {
    lockPlayerOnPad(g);
    g.enemies.length = 0;
    g.enemyBullets.length = 0;
    g.heliRockets = [];
    g.heliBombs = [];
    g.heliBriefTimer = 0;
    g.heliDrama = {
      phase: 'brief',
      timer: 0,
      lineIndex: -1,
      lineTimer: 0,
      lines: missionBriefLines(g.heliMission),
      shout: '…',
      commander: { x: 230, y: GROUND - 10, targetX: PAD.x - 24 }
    };
  }

  function endBriefing(g) {
    g.heliDrama = null;
    g.showBanner(g.heliMission.title, 2.2);
    g.heliBriefTimer = 2.3;
  }

  function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function buildAA(sec) {
    var cfg = sec.aa;
    if (!cfg) return [];
    var sites = shuffle(cfg.sites || []);
    var n = randInt(cfg.count[0], cfg.count[1]);
    n = Math.min(n, sites.length);
    var out = [];
    for (var i = 0; i < n; i++) {
      var hp = randInt(cfg.hp[0], cfg.hp[1]);
      out.push({
        x: sites[i] + (Math.random() - 0.5) * 40,
        y: GROUND - 4,
        hp: hp,
        maxHp: hp,
        alive: true,
        cooldown: 0.4 + Math.random() * 1.2,
        rocketCd: 1.5 + Math.random() * 2,
        flash: 0,
        radius: 14,
        rockets: Math.random() < (cfg.rockets || 0)
      });
    }
    return out;
  }

  function failMission(g, reason) {
    if (g.heliDrama) return;
    g.heliMissionFailed = true;
    g.heliMissionDone = false;
    g.player.cargo = 0;
    g.player.president = false;
    g.heliVip = null;
    g.heliDrama = { phase: 'recall', timer: 0, fail: true, reason: reason || 'Mission failed' };
    g.showBanner('MISSION FAILED — RETURN TO BASE', 3);
  }

  function completeMissionHome(g) {
    if (g.heliDrama) return;
    g.heliDrama = { phase: 'recall', timer: 0, fail: false };
    g.showBanner('MISSION COMPLETE — RETURN TO BASE', 2.8);
  }

  function startChewOut(g) {
    var fail = g.heliDrama && g.heliDrama.fail;
    g.heliDrama = {
      phase: 'chew',
      timer: 0,
      fail: fail,
      shout: fail
        ? SHOUTS[Math.floor(Math.random() * SHOUTS.length)]
        : PRAISE[Math.floor(Math.random() * PRAISE.length)],
      commander: { x: 230, y: GROUND - 10, targetX: PAD.x - 20 }
    };
    lockPlayerOnPad(g);
    g.enemies.length = 0;
    g.enemyBullets.length = 0;
    g.heliRockets = [];
    g.heliBombs = [];
  }

  function beginNextMission(g) {
    g.heliMission = pickMission();
    g.heliLeg = 0;
    g.heliMissionDone = false;
    g.heliMissionFailed = false;
    g.player.cargo = 0;
    g.player.president = false;
    g.heliVip = null;
    g.player.health = g.player.maxHealth;
    g.player.fuel = FUEL_MAX;
    g.player.invuln = 1.2;
    g.heliRockets = [];
    if (g.updateHud) g.updateHud();
    startBriefing(g);
  }

  function updateDrama(g, dt) {
    var d = g.heliDrama;
    if (!d) return;

    if (d.phase === 'recall') {
      d.timer += dt;
      var atHq = g.heliSector === HQ_INDEX && g.player.landed &&
        g.player.x > PAD.x && g.player.x < PAD.x + PAD.w;
      if (atHq) startChewOut(g);
      return;
    }

    if (d.phase === 'chew') {
      d.timer += dt;
      var c = d.commander;
      if (c.x < c.targetX) c.x = Math.min(c.targetX, c.x + 90 * dt);
      else if (c.x > c.targetX) c.x = Math.max(c.targetX, c.x - 90 * dt);
      if (d.timer > 4.2) beginNextMission(g);
      return;
    }

    if (d.phase === 'brief') {
      d.timer += dt;
      lockPlayerOnPad(g);
      var cm = d.commander;
      if (cm.x < cm.targetX) cm.x = Math.min(cm.targetX, cm.x + 95 * dt);
      else if (cm.x > cm.targetX) cm.x = Math.max(cm.targetX, cm.x - 95 * dt);

      var arrived = Math.abs(cm.x - cm.targetX) < 2;
      if (!arrived) return;

      if (d.lineIndex < 0) {
        d.lineIndex = 0;
        d.lineTimer = 0;
        d.shout = d.lines[0];
        return;
      }

      d.lineTimer += dt;
      var hold = d.lineIndex === 0 ? 1.6 : 2.4;
      if (d.lineTimer < hold) return;
      d.lineIndex += 1;
      d.lineTimer = 0;
      if (d.lineIndex >= d.lines.length) {
        endBriefing(g);
        return;
      }
      d.shout = d.lines[d.lineIndex];
    }
  }

  function advanceLeg(g) {
    g.heliLeg += 1;
    if (g.heliLeg >= g.heliMission.legs.length) {
      g.heliMissionDone = true;
      g.score += 500;
      completeMissionHome(g);
    } else {
      legBanner(g);
    }
  }

  function loadSector(g, index, fromDir) {
    g.heliSector = index;
    var sec = SECTORS[index];
    g.enemies.length = 0;
    g.bullets.length = 0;
    g.enemyBullets.length = 0;
    g.heliBombs = [];
    g.heliRockets = [];
    g.heliRespawnTimer = RESCUE_RESPAWN * 0.5;
    g.heliStructures = (sec.structures || []).map(function (s) {
      return {
        x: s.x, y: s.y, w: s.w, h: s.h,
        hp: s.hp, maxHp: s.hp, label: s.label, alive: true
      };
    });
    g.heliAA = buildAA(sec);
    g.heliHostages = [];
    var leg = currentLeg(g);
    if (sec.hostages && leg && leg.type === 'rescue' && !(g.heliDrama && g.heliDrama.phase === 'recall')) {
      for (var i = 0; i < sec.hostages; i++) {
        g.heliHostages.push({
          x: LZ.x + 40 + i * 50,
          y: GROUND - 10,
          climb: 0,
          aboard: false,
          dead: false
        });
      }
    }
    if (isEscortLeg(leg) && leg.sector === index) {
      initVipForLeg(g, leg);
    } else if (!(g.player && g.player.president)) {
      g.heliVip = null;
    }
    g.player.ropeDown = false;
    g.player.hoverTimer = 0;
    g.heliSpawned = false;
    g.heliPlane = null;
    g.heliStorm = null;
    g.heliStormFlash = 0;

    if (fromDir === 'left' || fromDir === 'right') placeAtEntry(g, fromDir);

    if (!(g.heliDrama && (g.heliDrama.phase === 'chew' || g.heliDrama.phase === 'brief'))) {
      g.showBanner(sec.name.toUpperCase(), 1.2);
    }
  }

  function countAir(g) {
    var n = 0;
    for (var i = 0; i < g.enemies.length; i++) if (g.enemies[i].heliAir) n += 1;
    return n;
  }

  function countGround(g) {
    var n = 0;
    for (var i = 0; i < g.enemies.length; i++) if (g.enemies[i].heliGround) n += 1;
    return n;
  }

  function spawnRocket(g, x, y, speed) {
    if (!g.heliRockets) g.heliRockets = [];
    var p = g.player;
    var dx = p.x - x;
    var dy = p.y - y;
    var len = Math.hypot(dx, dy) || 1;
    var spd = speed || 150;
    g.heliRockets.push({
      x: x,
      y: y,
      vx: (dx / len) * spd * 0.4,
      vy: (dy / len) * spd * 0.4,
      speed: spd,
      turn: 2.4,
      life: 5.5,
      hp: 1,
      radius: 8
    });
  }

  function spawnAirEnemy(g, x) {
    S.spawnEnemyAt(g, x != null ? x : 100 + Math.random() * 760, 70 + Math.random() * 140, 'grunt');
    var air = g.enemies[g.enemies.length - 1];
    if (!air) return;
    var elite = Math.random() < 0.28;
    air.heliAir = true;
    air.heliElite = elite;
    air.color = elite ? '#ffa657' : '#f85149';
    air.speed = elite ? 55 + Math.random() * 25 : 70 + Math.random() * 40;
    air.shootCooldown = elite ? 0.5 + Math.random() * 0.5 : 0.8 + Math.random();
    air.rocketCooldown = elite ? 1.5 + Math.random() : 999;
    air.radius = elite ? 14 : 10;
    air.health = elite ? 6 : 2;
    air.maxHealth = air.health;
    air.points = elite ? 45 : 20;
    air.heliScale = elite ? 1.4 : 1;
  }

  function spawnGroundEnemy(g) {
    var roll = Math.random();
    var kind = 'rifle';
    if (roll < 0.18) kind = 'runner';
    else if (roll < 0.32) kind = 'rpg';
    else if (roll < 0.48) kind = 'gunner';
    else if (roll < 0.58) kind = 'shield';

    var typeKey = kind === 'gunner' || kind === 'shield' ? 'tank' : (kind === 'runner' ? 'runner' : 'grunt');
    S.spawnEnemyAt(g, 80 + Math.random() * 800, GROUND - 10, typeKey);
    var gr = g.enemies[g.enemies.length - 1];
    if (!gr) return;
    gr.heliGround = true;
    gr.infantry = kind;
    gr.y = GROUND - 10;
    gr.radius = Math.max(5, (gr.radius || 12) * SCALE);
    gr.scale = kind === 'shield' ? 0.7 : kind === 'runner' ? 0.48 : 0.55;
    gr.speed = kind === 'runner' ? 70 + Math.random() * 30
      : kind === 'rpg' ? 22 + Math.random() * 15
      : kind === 'shield' ? 20 + Math.random() * 12
      : 35 + Math.random() * 25;
    gr.shootCooldown = kind === 'gunner' ? 0.45 + Math.random() * 0.3
      : kind === 'rpg' ? 2.2 + Math.random()
      : 0.9 + Math.random();
    gr.color = kind === 'runner' ? '#ffa657'
      : kind === 'rpg' ? '#d2a8ff'
      : kind === 'gunner' ? '#f85149'
      : kind === 'shield' ? '#8b949e'
      : '#f85149';
    if (kind === 'rpg') {
      gr.health = 2;
      gr.maxHealth = 2;
      gr.points = 18;
    } else if (kind === 'shield') {
      gr.health = 4;
      gr.maxHealth = 4;
      gr.points = 25;
    }
  }

  function spawnTopPlane(g) {
    if (g.heliPlane) return;
    S.spawnEnemyAt(g, -80, PLANE_Y, 'tank');
    var pl = g.enemies[g.enemies.length - 1];
    if (!pl) return;
    pl.heliPlane = true;
    pl.heliAir = false;
    pl.heliGround = false;
    pl.y = PLANE_Y;
    pl.x = -80;
    pl.facing = 1;
    pl.speed = 90;
    pl.radius = 22;
    pl.health = 48;
    pl.maxHealth = 48;
    pl.points = 120;
    pl.color = '#bc8cff';
    pl.shootCooldown = 1.5;
    pl.rocketCooldown = 2.5;
    g.heliPlane = pl;
  }

  function initStorm(g) {
    g.heliStorm = [];
    for (var i = 0; i < 5; i++) {
      g.heliStorm.push({
        x: Math.random() * 960,
        w: 120 + Math.random() * 100,
        bob: Math.random() * Math.PI * 2,
        spd: 18 + Math.random() * 22
      });
    }
    g.heliStormStrike = 1.5 + Math.random();
  }

  function updateStorm(g, dt) {
    var sec = sector(g);
    if (!sec.storm || !g.heliStorm) return;
    var p = g.player;
    for (var i = 0; i < g.heliStorm.length; i++) {
      var c = g.heliStorm[i];
      c.x += c.spd * dt;
      c.bob += dt * 1.4;
      if (c.x > 960 + c.w) c.x = -c.w;
    }
    g.heliStormStrike -= dt;
    if (g.heliStormStrike <= 0 && !g.heliDrama && !p.landed) {
      g.heliStormStrike = 1.8 + Math.random() * 2.2;
      if (p.y < STORM_CEILING) {
        g.heliStormFlash = 0.25;
        g.hurtPlayer(12);
        S.spawnParticles(g, p.x, p.y - 10, '#e3b341', 8);
      } else {
        g.heliStormFlash = 0.12;
      }
    }
    if (g.heliStormFlash > 0) g.heliStormFlash -= dt;
  }

  function drawStorm(ctx, g) {
    if (!g.heliStorm) return;
    var flash = g.heliStormFlash > 0;
    for (var i = 0; i < g.heliStorm.length; i++) {
      var c = g.heliStorm[i];
      var cy = 28 + Math.sin(c.bob) * 6;
      ctx.fillStyle = flash ? 'rgba(80,90,110,0.85)' : 'rgba(40,48,64,0.75)';
      ctx.beginPath();
      ctx.ellipse(c.x, cy, c.w * 0.5, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - c.w * 0.25, cy + 4, c.w * 0.28, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.w * 0.22, cy + 2, c.w * 0.3, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (flash) {
      ctx.strokeStyle = '#e3b341';
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.min(1, g.heliStormFlash * 5);
      ctx.beginPath();
      var lx = 200 + (g.animTime * 70) % 560;
      ctx.moveTo(lx, 8);
      ctx.lineTo(lx - 12, 40);
      ctx.lineTo(lx + 8, 44);
      ctx.lineTo(lx - 4, STORM_CEILING);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // danger line
    ctx.strokeStyle = 'rgba(248,81,73,0.25)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, STORM_CEILING);
    ctx.lineTo(960, STORM_CEILING);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPlane(ctx, e, animTime) {
    var facing = e.facing || 1;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(facing * SCALE * 1.6, SCALE * 1.6);
    ctx.strokeStyle = e.color || '#bc8cff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    // fuselage
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(30, 0);
    ctx.moveTo(18, -2);
    ctx.lineTo(32, 0);
    ctx.lineTo(18, 2);
    ctx.stroke();
    // wings
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-10, -14);
    ctx.lineTo(8, 0);
    ctx.moveTo(-4, 0);
    ctx.lineTo(-10, 14);
    ctx.lineTo(8, 0);
    ctx.stroke();
    // tail
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-30, -10);
    ctx.moveTo(-24, 0);
    ctx.lineTo(-28, 6);
    ctx.stroke();
    // prop blur
    var pr = animTime * 40;
    ctx.beginPath();
    ctx.moveTo(32, -Math.sin(pr) * 8);
    ctx.lineTo(32, Math.sin(pr) * 8);
    ctx.stroke();
    ctx.restore();
    // HP bar
    if (e.health < e.maxHealth) {
      ctx.fillStyle = '#21262d';
      ctx.fillRect(e.x - 20, e.y - 18, 40, 4);
      ctx.fillStyle = '#bc8cff';
      ctx.fillRect(e.x - 20, e.y - 18, 40 * (e.health / e.maxHealth), 4);
    }
  }

  function spawnSectorEnemies(g) {
    if (g.heliDrama) return;
    var sec = sector(g);
    var i;
    var leg = currentLeg(g);
    var escort = escortHere(g);
    g.heliPlane = null;
    var airN = sec.air + (escort ? 2 : 0);
    var groundN = sec.groundN + (escort ? 4 : 0);
    for (i = 0; i < airN; i++) spawnAirEnemy(g);
    for (i = 0; i < groundN; i++) spawnGroundEnemy(g);
    if (sec.role === 'base' || sec.role === 'hostage' || escort) {
      if (Math.random() < 0.75) spawnAirEnemy(g, Math.random() < 0.5 ? -50 : g.canvas.width + 50);
      if (escort) spawnAirEnemy(g, Math.random() < 0.5 ? -50 : g.canvas.width + 50);
    }
    if (sec.topPlane && !(escort && leg && leg.type === 'escort_pickup')) spawnTopPlane(g);
    if (escort && Math.random() < 0.5) spawnTopPlane(g);
    if (sec.storm) initStorm(g);
    else g.heliStorm = null;
    g.heliSpawned = true;
    if (escort) g.showBanner('SECTOR UNDER SIEGE — CLEAR THE LZ', 2);
  }

  function updateRescueRespawn(g, dt) {
    var sec = sector(g);
    if (sec.role !== 'hostage' || g.heliDrama || g.heliMissionFailed || g.heliMissionDone) return;
    var leg = currentLeg(g);
    if (!leg || leg.type !== 'rescue') return;

    g.heliRespawnTimer -= dt;
    if (g.heliRespawnTimer > 0) return;
    g.heliRespawnTimer = RESCUE_RESPAWN;

    if (countAir(g) < sec.airCap) {
      spawnAirEnemy(g, Math.random() < 0.5 ? -40 : g.canvas.width + 40);
    }
    if (countGround(g) < sec.groundCap) spawnGroundEnemy(g);
  }

  function updateEscort(g, dt) {
    var leg = currentLeg(g);
    if (!isEscortLeg(leg) || g.heliDrama || g.heliMissionFailed) return;
    if (g.heliSector !== leg.sector) return;
    if (!g.heliVip) initVipForLeg(g, leg);

    var vip = g.heliVip;
    var p = g.player;

    // Phase 1: clear the siege
    if (vip.state === 'hidden' || vip.state === 'aboard') {
      if (leg.type === 'escort_drop' && vip.state === 'aboard') {
        // waiting to clear for delivery
        if (siegeCleared(g)) {
          vip.clearTimer += dt;
          if (vip.clearTimer > 1.2) {
            vip.state = 'ready_drop';
            vip.x = VIP_LZ.x + VIP_LZ.w / 2;
            vip.y = GROUND - 10;
            vip.climb = 1;
            g.showBanner('LZ CLEAR — DELIVER MR PRESIDENT', 2.2);
          }
        } else {
          vip.clearTimer = 0;
        }
        return;
      }
      if (leg.type === 'escort_pickup' && vip.state === 'hidden') {
        if (siegeCleared(g)) {
          vip.clearTimer += dt;
          if (vip.clearTimer > 1.2) {
            vip.state = 'waiting';
            vip.climb = 0;
            g.showBanner('LZ CLEAR — EXTRACT MR PRESIDENT', 2.2);
          }
        } else {
          vip.clearTimer = 0;
        }
      }
      return;
    }

    // Hover / rope for pickup or drop
    var needHover = vip.state === 'waiting' || vip.state === 'ready_drop' || vip.state === 'climbing' || vip.state === 'descending';
    if (!needHover) return;

    var overLz = p.x > VIP_LZ.x && p.x < VIP_LZ.x + VIP_LZ.w &&
      p.y < GROUND - 40 && p.y > GROUND - ROPE_LEN - 40;
    var speed = Math.hypot(p.vx, p.vy);
    var still = overLz && !p.landed && speed < HOVER_SPEED;

    if (still) p.hoverTimer += dt;
    else p.hoverTimer = Math.max(0, p.hoverTimer - dt * 2);
    p.ropeDown = p.hoverTimer >= HOVER_ARM;

    if (!p.ropeDown) {
      if (vip.state === 'climbing') {
        vip.climb = Math.max(0, vip.climb - dt * 0.7);
        if (vip.climb <= 0) vip.state = 'waiting';
      }
      if (vip.state === 'descending') {
        vip.climb = Math.min(1, vip.climb + dt * 0.7);
        if (vip.climb >= 1) vip.state = 'ready_drop';
      }
      return;
    }

    if (leg.type === 'escort_pickup' && (vip.state === 'waiting' || vip.state === 'climbing')) {
      vip.state = 'climbing';
      vip.climb = Math.min(1, vip.climb + dt * 0.4);
      vip.x += (p.x - vip.x) * 2 * dt;
      if (vip.climb >= 1) {
        vip.state = 'aboard';
        p.president = true;
        p.cargo = Math.max(p.cargo, 1);
        g.score += 150;
        S.spawnParticles(g, p.x, p.y + 20, '#e3b341', 8);
        g.showBanner('PRESIDENT ABOARD — DELIVER TO THE OTHER EDGE', 2.4);
        advanceLeg(g);
      }
    }

    if (leg.type === 'escort_drop' && (vip.state === 'ready_drop' || vip.state === 'descending')) {
      vip.state = 'descending';
      vip.climb = Math.max(0, vip.climb - dt * 0.4);
      vip.x += (p.x - vip.x) * 2 * dt;
      if (vip.climb <= 0) {
        vip.state = 'delivered';
        p.president = false;
        p.cargo = 0;
        g.score += 350;
        S.spawnParticles(g, vip.x, vip.y, '#3fb950', 10);
        g.showBanner('PRESIDENT DELIVERED', 2);
        advanceLeg(g);
      }
    }
  }

  function tryCompleteDestroy(g) {
    var leg = currentLeg(g);
    if (!leg || leg.type !== 'destroy' || g.heliSector !== leg.sector) return;
    var left = 0;
    for (var i = 0; i < g.heliStructures.length; i++) {
      if (g.heliStructures[i].alive) left += 1;
    }
    if (left === 0) {
      g.score += 200;
      advanceLeg(g);
    }
  }

  function tryCompleteRescue(g) {
    var leg = currentLeg(g);
    if (!leg || leg.type !== 'rescue' || g.heliSector !== leg.sector) return;
    if (!g.heliHostages.length) return;
    for (var i = 0; i < g.heliHostages.length; i++) {
      if (!g.heliHostages[i].aboard && !g.heliHostages[i].dead) return;
    }
    var dead = 0;
    for (var j = 0; j < g.heliHostages.length; j++) {
      if (g.heliHostages[j].dead) dead += 1;
    }
    if (dead > 0) {
      failMission(g, 'Hostage KIA');
      return;
    }
    g.score += 250;
    g.player.cargo = g.heliHostages.length;
    advanceLeg(g);
  }

  function damageAA(g, aa, amount) {
    if (!aa.alive) return;
    aa.hp -= amount;
    S.spawnParticles(g, aa.x, aa.y - 8, '#ffa657', 4);
    if (aa.hp <= 0) {
      aa.alive = false;
      g.score += 25;
      S.spawnExplosion(g, aa.x, aa.y - 6, '#f85149');
    }
  }

  function updateAA(g, dt) {
    if (g.heliDrama) return;
    var p = g.player;
    for (var i = 0; i < g.heliAA.length; i++) {
      var aa = g.heliAA[i];
      if (aa.flash > 0) aa.flash = Math.max(0, aa.flash - dt * 4);
      if (!aa.alive) continue;
      aa.cooldown -= dt;
      aa.rocketCd -= dt;
      var dx = p.x - aa.x;
      var dy = p.y - aa.y;
      var dist = Math.hypot(dx, dy);
      if (p.landed || p.y > GROUND - 30 || dist < 40 || dist > 440) continue;

      if (aa.rockets && aa.rocketCd <= 0 && dist < 400) {
        aa.rocketCd = 3.2 + Math.random() * 1.8;
        aa.flash = 1;
        spawnRocket(g, aa.x, aa.y - 12, 145);
        continue;
      }

      if (aa.cooldown > 0) continue;
      aa.cooldown = 1.1 + Math.random() * 0.7;
      aa.flash = 1;
      var len = dist || 1;
      var speed = 220;
      g.enemyBullets.push({
        x: aa.x,
        y: aa.y - 8,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        life: 2.5,
        aaFlak: true
      });
    }
  }

  function updateRockets(g, dt) {
    if (!g.heliRockets) g.heliRockets = [];
    var p = g.player;
    for (var i = g.heliRockets.length - 1; i >= 0; i--) {
      var r = g.heliRockets[i];
      r.life -= dt;
      if (r.life <= 0 || r.hp <= 0) {
        if (r.hp <= 0) {
          g.score += 15;
          S.spawnParticles(g, r.x, r.y, '#ffa657', 6);
        }
        g.heliRockets.splice(i, 1);
        continue;
      }
      var dx = p.x - r.x;
      var dy = p.y - r.y;
      var want = Math.atan2(dy, dx);
      var have = Math.atan2(r.vy, r.vx);
      var diff = want - have;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var maxTurn = r.turn * dt;
      if (diff > maxTurn) diff = maxTurn;
      if (diff < -maxTurn) diff = -maxTurn;
      var ang = have + diff;
      r.vx = Math.cos(ang) * r.speed;
      r.vy = Math.sin(ang) * r.speed;
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      if (!g.heliDrama && S.dist(r.x, r.y, p.x, p.y) < p.radius + r.radius) {
        g.hurtPlayer(20);
        S.spawnExplosion(g, r.x, r.y, '#ff7b72');
        g.heliRockets.splice(i, 1);
      }
    }
  }

  function drawRocket(ctx, r) {
    var ang = Math.atan2(r.vy, r.vx);
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(ang);
    ctx.strokeStyle = '#ffa657';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.moveTo(4, -3);
    ctx.lineTo(8, 0);
    ctx.lineTo(4, 3);
    ctx.stroke();
    ctx.strokeStyle = '#f85149';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-14, -2);
    ctx.moveTo(-8, 0);
    ctx.lineTo(-14, 2);
    ctx.stroke();
    ctx.restore();
  }

  function damageStructure(g, st, amount) {
    if (!st.alive) return;
    st.hp -= amount;
    S.spawnParticles(g, st.x + st.w / 2, st.y + st.h / 2, '#ffa657', 5);
    if (st.hp <= 0) {
      st.alive = false;
      g.score += 40;
      S.spawnExplosion(g, st.x + st.w / 2, st.y + st.h / 2, '#ff7b72');
      tryCompleteDestroy(g);
    }
  }

  function dropBomb(g) {
    var p = g.player;
    if (p.landed || p.bombCooldown > 0) return;
    p.bombCooldown = 0.55;
    g.heliBombs.push({
      x: p.x,
      y: p.y + 8,
      vx: p.vx * 0.3,
      vy: 40,
      radius: 5
    });
  }

  function updateBombs(g, dt) {
    for (var i = g.heliBombs.length - 1; i >= 0; i--) {
      var b = g.heliBombs[i];
      b.vy += 420 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      var boom = false;
      if (b.y >= GROUND - 4) boom = true;
      for (var oi = 0; oi < (sector(g).obstacles || []).length; oi++) {
        if (rectHit(b.x, b.y, b.radius, sector(g).obstacles[oi])) boom = true;
      }
      for (var si = 0; si < g.heliStructures.length; si++) {
        var st = g.heliStructures[si];
        if (st.alive && rectHit(b.x, b.y, b.radius, st)) {
          boom = true;
          damageStructure(g, st, 3);
        }
      }
      for (var ai = 0; ai < g.heliAA.length; ai++) {
        var aa = g.heliAA[ai];
        if (aa.alive && S.dist(b.x, b.y, aa.x, aa.y) < 40) {
          boom = true;
          damageAA(g, aa, 3);
        }
      }
      if (boom) {
        S.spawnExplosion(g, b.x, Math.min(b.y, GROUND - 4), '#ffa657');
        for (var ei = g.enemies.length - 1; ei >= 0; ei--) {
          var e = g.enemies[ei];
          if (S.dist(b.x, b.y, e.x, e.y) < 55) {
            e.health -= 3;
            if (e.health <= 0) {
              g.score += e.points || 10;
              S.spawnParticles(g, e.x, e.y, e.color, 8);
              g.enemies.splice(ei, 1);
            }
          }
        }
        for (var hi = 0; hi < g.heliHostages.length; hi++) {
          var h = g.heliHostages[hi];
          if (!h.aboard && !h.dead && S.dist(b.x, b.y, h.x, h.y) < 50) {
            h.dead = true;
            failMission(g, 'Hostage KIA');
          }
        }
        if (g.heliVip && (g.heliVip.state === 'waiting' || g.heliVip.state === 'ready_drop' ||
            g.heliVip.state === 'climbing' || g.heliVip.state === 'descending')) {
          var vipY = g.heliVip.y - g.heliVip.climb * (ROPE_LEN - 10);
          if (S.dist(b.x, b.y, g.heliVip.x, vipY) < 50) {
            failMission(g, 'President KIA');
          }
        }
        g.heliBombs.splice(i, 1);
      }
    }
  }

  function updateRope(g, dt) {
    var p = g.player;
    var sec = sector(g);
    if (g.heliMissionFailed) {
      p.ropeDown = false;
      p.hoverTimer = 0;
      return;
    }
    // Escort VIP boarding/drop uses updateEscort for hover/rope
    if (escortHere(g)) return;
    if (sec.role !== 'hostage') {
      p.ropeDown = false;
      p.hoverTimer = 0;
      return;
    }

    var overLz = p.x > LZ.x && p.x < LZ.x + LZ.w && p.y < GROUND - 40 && p.y > GROUND - ROPE_LEN - 40;
    var speed = Math.hypot(p.vx, p.vy);
    var still = overLz && !p.landed && speed < HOVER_SPEED;

    if (still) p.hoverTimer += dt;
    else p.hoverTimer = Math.max(0, p.hoverTimer - dt * 2);

    p.ropeDown = p.hoverTimer >= HOVER_ARM;

    if (!p.ropeDown) {
      for (var i = 0; i < g.heliHostages.length; i++) {
        var h = g.heliHostages[i];
        if (!h.aboard && !h.dead) h.climb = Math.max(0, h.climb - dt * 0.7);
      }
      return;
    }

    var ropeX = p.x;
    for (var j = 0; j < g.heliHostages.length; j++) {
      var host = g.heliHostages[j];
      if (host.aboard || host.dead) continue;
      var near = Math.abs(host.x - ropeX) < 55;
      if (near) {
        host.climb = Math.min(1, host.climb + dt * 0.35);
        host.x += (ropeX - host.x) * 2 * dt;
        if (host.climb >= 1) {
          host.aboard = true;
          S.spawnParticles(g, p.x, p.y + 20, '#e3b341', 6);
        }
      } else {
        host.climb = Math.max(0, host.climb - dt * 0.5);
      }
    }
    tryCompleteRescue(g);
  }

  /** Classic line-art roflcopter — strokes only, stickman convention. */
  function drawHelicopter(ctx, x, y, animTime, options) {
    options = options || {};
    var facing = options.facing || 1;
    var color = options.color || '#58a6ff';
    var landed = !!options.landed;
    var rotor = animTime * (landed ? 5 : 32);
    var pitch = options.pitch || 0;
    var blade = 30;

    ctx.save();
    ctx.translate(x, y);
    var sc = (options.drawScale || 1) * SCALE;
    ctx.scale(facing * sc, sc);
    ctx.rotate(pitch);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // spinning main rotor (just lines)
    ctx.beginPath();
    ctx.moveTo(-Math.cos(rotor) * blade, -16);
    ctx.lineTo(Math.cos(rotor) * blade, -16);
    ctx.moveTo(-Math.sin(rotor) * blade * 0.85, -16);
    ctx.lineTo(Math.sin(rotor) * blade * 0.85, -16);
    ctx.stroke();

    // mast
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, -4);
    ctx.stroke();

    // cabin box
    ctx.strokeRect(-10, -4, 22, 12);

    // nose
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(26, 2);
    ctx.lineTo(12, 6);
    ctx.stroke();

    // tail boom + fin
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-36, 0);
    ctx.lineTo(-42, -10);
    ctx.moveTo(-36, 0);
    ctx.lineTo(-40, 6);
    ctx.stroke();

    // tail rotor (line)
    var tr = rotor * 2.4;
    ctx.beginPath();
    ctx.moveTo(-36, Math.sin(tr) * 7);
    ctx.lineTo(-36, -Math.sin(tr) * 7);
    ctx.stroke();

    // skids
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-10, 16);
    ctx.moveTo(8, 8);
    ctx.lineTo(12, 16);
    ctx.moveTo(-12, 16);
    ctx.lineTo(14, 16);
    ctx.stroke();

    // little "LOL" wink for player only
    if (options.rofl) {
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText('LOL', 1, 5);
      ctx.textAlign = 'start';
    }

    if (options.ropeDown) {
      ctx.strokeStyle = '#c9d1d9';
      ctx.lineWidth = 1.5 / SCALE;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(0, 12 + ROPE_LEN / SCALE);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAAGun(ctx, aa, animTime, player) {
    var ang = Math.atan2(player.y - aa.y, player.x - aa.x);
    // clamp mostly upward hemisphere
    if (ang > -0.15) ang = -0.15;
    if (ang < -Math.PI + 0.15) ang = -Math.PI + 0.15;

    ctx.save();
    ctx.translate(aa.x, aa.y);
    ctx.strokeStyle = aa.alive ? '#f85149' : '#484f58';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // base
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(-6, 0);
    ctx.lineTo(-6, 8);
    ctx.moveTo(6, 0);
    ctx.lineTo(6, 8);
    ctx.stroke();

    // barrel
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();
    // muzzle flash tick
    if (aa.flash > 0) {
      ctx.strokeStyle = '#ffa657';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(28 + aa.flash * 10, -3);
      ctx.moveTo(22, 0);
      ctx.lineTo(28 + aa.flash * 10, 3);
      ctx.stroke();
    }
    ctx.restore();

    if (aa.alive && aa.hp < aa.maxHp) {
      ctx.fillStyle = '#ff7b72';
      ctx.fillRect(-10, -14, 20 * (aa.hp / aa.maxHp), 3);
    }
    ctx.restore();
  }

  function drawCommander(ctx, cm, player, shout) {
    var face = cm.x < player.x ? 1 : -1;
    var sc = 0.7;
    S.drawStickmanUpright(ctx, cm.x, cm.y, face, 0, '#e3b341', sc, { armed: false });
    // officer hat
    ctx.save();
    ctx.translate(cm.x, cm.y);
    ctx.scale(face * sc, sc);
    ctx.fillStyle = '#1f6feb';
    ctx.fillRect(-8, -18, 16, 3);
    ctx.fillRect(-6, -26, 12, 8);
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-6, -26, 12, 8);
    ctx.fillStyle = '#e3b341';
    ctx.fillRect(-1, -26, 2, 8);
    ctx.restore();

    ctx.fillStyle = 'rgba(22,27,34,0.9)';
    ctx.font = '600 12px Segoe UI, system-ui, sans-serif';
    var tw = ctx.measureText(shout).width;
    var bx = cm.x - tw / 2 - 6;
    var by = cm.y - 48;
    ctx.fillRect(bx, by, tw + 12, 20);
    ctx.strokeStyle = '#e3b341';
    ctx.strokeRect(bx, by, tw + 12, 20);
    ctx.fillStyle = '#e3b341';
    ctx.fillText(shout, cm.x - tw / 2, by + 14);
  }

  function drawStickGround(ctx, x, y, color, scale, infantry) {
    S.drawStickmanUpright(ctx, x, y, 0, -1, color, scale || 1, { armed: true });
    if (infantry === 'rpg') {
      ctx.strokeStyle = '#d2a8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 4);
      ctx.lineTo(x + 12, y - 10);
      ctx.stroke();
    } else if (infantry === 'shield') {
      ctx.strokeStyle = '#8b949e';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 10, y - 8, 6, 12);
    }
  }

  function drawSkyGradient(ctx, w, h, top, bot) {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, GROUND);
  }

  function drawBiomeBackdrop(ctx, sec, animTime) {
    var w = 960;
    var biome = sec.biome;

    if (biome === 'mountains') {
      ctx.fillStyle = '#1a2838';
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      ctx.lineTo(0, 340);
      ctx.lineTo(120, 200);
      ctx.lineTo(220, 320);
      ctx.lineTo(360, 140);
      ctx.lineTo(480, 280);
      ctx.lineTo(620, 160);
      ctx.lineTo(760, 300);
      ctx.lineTo(900, 180);
      ctx.lineTo(960, 320);
      ctx.lineTo(960, GROUND);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(230,237,243,0.55)';
      ctx.beginPath();
      ctx.moveTo(360, 140);
      ctx.lineTo(400, 200);
      ctx.lineTo(320, 200);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(620, 160);
      ctx.lineTo(655, 210);
      ctx.lineTo(585, 210);
      ctx.closePath();
      ctx.fill();
    } else if (biome === 'river') {
      ctx.fillStyle = '#0e2830';
      ctx.fillRect(0, GROUND - 55, w, 55);
      ctx.fillStyle = '#1a6870';
      ctx.fillRect(0, GROUND - 42, w, 28);
      ctx.fillStyle = 'rgba(57,197,207,0.35)';
      for (var rw = 0; rw < 6; rw++) {
        var rx = (rw * 180 + animTime * 30) % (w + 40) - 20;
        ctx.fillRect(rx, GROUND - 36, 50, 3);
      }
      ctx.fillStyle = '#2a5040';
      ctx.fillRect(0, GROUND - 55, w, 10);
      ctx.fillRect(0, GROUND - 14, w, 14);
    } else if (biome === 'jungle') {
      ctx.fillStyle = 'rgba(20,80,40,0.55)';
      for (var c = 0; c < 12; c++) {
        var cx = 40 + c * 80;
        ctx.beginPath();
        ctx.ellipse(cx, 90 + (c % 3) * 20, 55, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(63,185,80,0.25)';
      ctx.lineWidth = 2;
      for (var v = 0; v < 8; v++) {
        var vx = 100 + v * 110;
        ctx.beginPath();
        ctx.moveTo(vx, 60);
        ctx.quadraticCurveTo(vx + 15, 180, vx - 10, 300);
        ctx.stroke();
      }
    } else if (biome === 'fortified') {
      ctx.fillStyle = 'rgba(248,81,73,0.08)';
      ctx.fillRect(0, 0, w, GROUND);
      ctx.fillStyle = '#2a1814';
      ctx.fillRect(0, GROUND - 20, w, 20);
      ctx.fillStyle = '#f85149';
      for (var s = 0; s < 16; s++) {
        if (s % 2 === 0) ctx.fillRect(s * 60, GROUND - 18, 30, 8);
      }
      ctx.fillStyle = '#3a2018';
      ctx.fillRect(40, 80, 70, 40);
      ctx.fillRect(850, 90, 60, 35);
    } else if (biome === 'ruins') {
      ctx.fillStyle = 'rgba(210,168,255,0.06)';
      ctx.fillRect(0, 0, w, GROUND);
      ctx.fillStyle = '#221c28';
      for (var b = 0; b < 5; b++) {
        var bx = 60 + b * 180;
        ctx.fillRect(bx, 80 + (b % 2) * 40, 40 + (b % 3) * 20, GROUND - 80 - (b % 2) * 40);
      }
      ctx.fillStyle = 'rgba(139,148,158,0.2)';
      for (var d = 0; d < 20; d++) {
        ctx.fillRect((d * 97 + animTime * 8) % w, 40 + (d * 37) % 200, 2, 2);
      }
    } else if (biome === 'compound') {
      ctx.fillStyle = 'rgba(227,179,65,0.07)';
      ctx.fillRect(0, 0, w, GROUND);
      ctx.strokeStyle = '#6e5a40';
      ctx.lineWidth = 3;
      ctx.strokeRect(200, GROUND - 120, 560, 120);
      ctx.fillStyle = '#3a3020';
      ctx.fillRect(220, GROUND - 100, 50, 100);
      ctx.fillRect(690, GROUND - 100, 50, 100);
    } else if (biome === 'basecamp') {
      ctx.fillStyle = 'rgba(88,166,255,0.05)';
      ctx.fillRect(0, 0, w, GROUND);
      ctx.strokeStyle = 'rgba(88,166,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, GROUND - 40);
      ctx.lineTo(w, GROUND - 40);
      ctx.stroke();
    }
  }

  function drawObstacle(ctx, o, sec) {
    var kind = o.kind || 'block';
    if (kind === 'trunk') {
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#238636';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + 10, o.w * 1.8, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'bridge') {
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(o.x, o.y - 4, o.w, 4);
      ctx.fillStyle = '#3a5048';
      ctx.fillRect(o.x + 10, o.y + o.h, 12, GROUND - o.y - o.h);
      ctx.fillRect(o.x + o.w - 22, o.y + o.h, 12, GROUND - o.y - o.h);
    } else if (kind === 'cliff') {
      ctx.fillStyle = '#3a5048';
      ctx.fillRect(o.x, o.y, o.w, o.h);
    } else if (kind === 'peak') {
      ctx.fillStyle = '#3a4450';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + o.h);
      ctx.lineTo(o.x + o.w / 2, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(230,237,243,0.5)';
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y);
      ctx.lineTo(o.x + o.w * 0.65, o.y + 40);
      ctx.lineTo(o.x + o.w * 0.35, o.y + 40);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'tower') {
      ctx.fillStyle = '#4a3030';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#f85149';
      ctx.fillRect(o.x - 4, o.y, o.w + 8, 10);
      ctx.fillStyle = '#6e2a2a';
      ctx.fillRect(o.x + 4, o.y + 20, o.w - 8, 14);
    } else if (kind === 'building') {
      ctx.fillStyle = '#3a3440';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#1a1520';
      for (var wy = o.y + 16; wy < o.y + o.h - 20; wy += 28) {
        for (var wx = o.x + 8; wx < o.x + o.w - 12; wx += 18) {
          if (((wx * 13 + wy * 7) % 10) > 2) ctx.fillRect(wx, wy, 10, 14);
        }
      }
      ctx.strokeStyle = sec.accent;
      ctx.globalAlpha = 0.4;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.globalAlpha = 1;
    } else if (kind === 'rubble') {
      ctx.fillStyle = '#484050';
      ctx.fillRect(o.x, o.y + o.h * 0.4, o.w, o.h * 0.6);
      ctx.fillStyle = '#2a2430';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + o.h * 0.4);
      ctx.lineTo(o.x + o.w * 0.4, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'fence') {
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 3;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.moveTo(o.x + o.w, o.y);
      ctx.lineTo(o.x, o.y + o.h);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#484f58';
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  }

  GameModes.register({
    id: 'roflcopter',
    name: 'Roflcopter',
    desc: 'Fly sector to sector. Strike, rescue, or escort Mr President under siege.',
    hint: '↑↓←→ fly · SPACE/CTRL gun · SHIFT bomb · hover rope · land HQ to refuel',
    flags: { roflcopter: true, enemyShoots: true },

    reset: function (g) {
      g.heliSector = HQ_INDEX;
      g.heliBombs = [];
      g.heliStructures = [];
      g.heliAA = [];
      g.heliRockets = [];
      g.heliHostages = [];
      g.heliVip = null;
      g.heliMission = pickMission();
      g.heliLeg = 0;
      g.heliMissionDone = false;
      g.heliMissionFailed = false;
      g.heliDrama = null;
      g.heliSpawned = false;
      g.heliRespawnTimer = RESCUE_RESPAWN;
      g.obstacles = [];
      loadSector(g, HQ_INDEX, null);
      startBriefing(g);
    },

    createPlayer: function () {
      return {
        x: PAD.x + PAD.w / 2,
        y: PAD.y - 10,
        vx: 0,
        vy: 0,
        speed: 280,
        radius: 10,
        health: 100,
        maxHealth: 100,
        aimX: 1,
        aimY: 0,
        facing: 1,
        shootCooldown: 0,
        bombCooldown: 0,
        invuln: 0,
        landed: true,
        ropeDown: false,
        hoverTimer: 0,
        cargo: 0,
        fuel: FUEL_MAX,
        maxFuel: FUEL_MAX,
        president: false
      };
    },

    getShootVector: function (g) {
      return { x: g.player.facing, y: 0 };
    },

    shootStartOffset: function (g) {
      return { x: g.player.facing * 16, y: 0 };
    },

    shootCooldown: function () {
      return 0.12;
    },

    bulletSpeed: function () {
      return 620;
    },

    contactDamage: function () {
      return 16;
    },

    spawn: function (g) {
      if (g.heliDrama) return;
      if (!g.heliSpawned && sector(g).role !== 'hq') {
        spawnSectorEnemies(g);
      }
    },

    move: function (g, dt) {
      var p = g.player;
      var sec = sector(g);
      var accel = p.speed;

      if (g.heliBriefTimer > 0) {
        g.heliBriefTimer -= dt;
        if (g.heliBriefTimer <= 0 && !g.heliDrama) legBanner(g);
      }

      if (p.bombCooldown > 0) p.bombCooldown -= dt;

      if (g.heliDrama && (g.heliDrama.phase === 'chew' || g.heliDrama.phase === 'brief')) {
        lockPlayerOnPad(g);
        updateDrama(g, dt);
        return;
      }

      var ax = 0;
      var ay = 0;
      if (g.keys['ArrowLeft']) ax -= 1;
      if (g.keys['ArrowRight']) ax += 1;
      if (g.keys['ArrowUp']) ay -= 1;
      if (g.keys['ArrowDown']) ay += 1;

      if (ax !== 0) p.facing = ax > 0 ? 1 : -1;
      p.aimX = p.facing;
      p.aimY = 0;

      if (p.fuel == null) p.fuel = FUEL_MAX;
      if (p.maxFuel == null) p.maxFuel = FUEL_MAX;

      if (p.landed) {
        p.vx = 0;
        p.vy = 0;
        if (sec.pad && p.x > PAD.x && p.x < PAD.x + PAD.w) {
          p.fuel = Math.min(p.maxFuel, p.fuel + FUEL_REFUEL * dt);
          p.health = Math.min(p.maxHealth, p.health + HEAL_REFUEL * dt);
          if (g.updateHud) g.updateHud();
        }
        if (ay < 0 && p.fuel > 1) {
          p.landed = false;
          p.vy = -120;
        }
      } else {
        var outOfFuel = p.fuel <= 0;
        if (outOfFuel) {
          ay = Math.max(ay, 0);
          if (!g.heliFuelWarn) {
            g.showBanner('OUT OF FUEL — return to HQ', 2);
            g.heliFuelWarn = true;
          }
        } else {
          g.heliFuelWarn = false;
          p.fuel = Math.max(0, p.fuel - FUEL_BURN * dt);
        }

        p.vx += ax * accel * 3.2 * dt;
        if (!outOfFuel) p.vy += ay * accel * 3.2 * dt;
        if (ay >= 0 || outOfFuel) p.vy += (outOfFuel ? 180 : 110) * dt;
        if (sec.updraft && !outOfFuel) p.vy -= sec.updraft * dt;
        p.vx *= Math.max(0, 1 - 2.8 * dt);
        p.vy *= Math.max(0, 1 - 2.4 * dt);
        var spd = Math.hypot(p.vx, p.vy);
        var maxSpd = outOfFuel ? 200 : 320;
        if (spd > maxSpd) {
          p.vx = (p.vx / spd) * maxSpd;
          p.vy = (p.vy / spd) * maxSpd;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.y > GROUND - 12) {
          p.y = GROUND - 12;
          p.vy = Math.min(0, p.vy);
          if (sec.pad && p.x > PAD.x && p.x < PAD.x + PAD.w && Math.abs(p.vy) < 100 &&
              (ay > 0 || outOfFuel || (g.heliDrama && g.heliDrama.phase === 'recall'))) {
            p.landed = true;
            p.y = PAD.y - 10;
            p.vx = 0;
            p.vy = 0;
          } else if (!sec.pad) {
            g.hurtPlayer(8);
            p.vy = -150;
          }
        }
        p.y = Math.max(40, p.y);
      }

      p.tilt = p.facing * Math.min(0.4, 0.14 + Math.abs(p.vx) * 0.0014);
      if (p.landed) p.tilt = 0;

      if (p.x < -10 && g.heliSector > 0) {
        loadSector(g, g.heliSector - 1, 'left');
      } else if (p.x > g.canvas.width + 10 && g.heliSector < SECTORS.length - 1) {
        loadSector(g, g.heliSector + 1, 'right');
      } else {
        p.x = Math.max(-10, Math.min(g.canvas.width + 10, p.x));
      }

      sec = sector(g);
      var obs = sec.obstacles || [];
      for (var i = 0; i < obs.length; i++) {
        if (rectHit(p.x, p.y, p.radius * 0.65, obs[i])) {
          g.hurtPlayer(14);
          p.vx *= -0.6;
          p.vy *= -0.6;
          p.x += p.vx * dt * 4;
          p.y += p.vy * dt * 4;
        }
      }

      if (!g.heliDrama && g.keys['Shift']) dropBomb(g);
      updateBombs(g, dt);
      updateAA(g, dt);
      updateRockets(g, dt);
      updateStorm(g, dt);
      updateRope(g, dt);
      updateEscort(g, dt);
      updateRescueRespawn(g, dt);
      updateDrama(g, dt);
    },

    updateEnemy: function (g, dt, enemy) {
      if (g.heliDrama && g.heliDrama.phase === 'chew') return 'skipContact';
      if (g.heliDrama && g.heliDrama.phase === 'brief') return 'skipContact';

      if (enemy.heliPlane) {
        enemy.y = PLANE_Y + Math.sin(g.animTime * 2) * 4;
        enemy.x += enemy.facing * enemy.speed * dt;
        if (enemy.x > g.canvas.width + 60) enemy.facing = -1;
        if (enemy.x < -60) enemy.facing = 1;
        if (!g.heliDrama) {
          enemy.shootCooldown -= dt;
          enemy.rocketCooldown -= dt;
          var pdx = g.player.x - enemy.x;
          var pdy = g.player.y - enemy.y;
          var pr = Math.hypot(pdx, pdy) || 1;
          if (enemy.shootCooldown <= 0 && pr < 420) {
            enemy.shootCooldown = 0.9 + Math.random() * 0.5;
            g.enemyBullets.push({
              x: enemy.x,
              y: enemy.y + 6,
              vx: (pdx / pr) * 240,
              vy: (pdy / pr) * 240,
              life: 2.8
            });
          }
          if (enemy.rocketCooldown <= 0 && pr < 500) {
            enemy.rocketCooldown = 2.8 + Math.random();
            spawnRocket(g, enemy.x, enemy.y + 8, 170);
          }
        }
        return 'skipContact';
      }

      if (enemy.heliAir) {
        var dx = g.player.x - enemy.x;
        var dy = g.player.y - enemy.y;
        var len = Math.hypot(dx, dy) || 1;
        enemy.x += (dx / len) * enemy.speed * dt * 0.55;
        enemy.y += (dy / len) * enemy.speed * dt * 0.35;
        enemy.y = Math.max(50, Math.min(GROUND - 80, enemy.y));
        enemy.facing = dx >= 0 ? 1 : -1;
        if (enemy.heliElite && !g.heliDrama) {
          enemy.rocketCooldown -= dt;
          if (enemy.rocketCooldown <= 0 && len < 380) {
            enemy.rocketCooldown = 2.4 + Math.random() * 1.5;
            spawnRocket(g, enemy.x, enemy.y + 6, 165);
          }
        }
        return;
      }
      if (enemy.heliGround) {
        enemy.y = GROUND - 10;
        var dir = g.player.x < enemy.x ? -1 : 1;
        enemy.x += dir * enemy.speed * 0.4 * dt;
        enemy.x = Math.max(40, Math.min(g.canvas.width - 40, enemy.x));
        if (enemy.infantry === 'rpg' && !g.heliDrama) {
          enemy.shootCooldown = 999;
          enemy.rpgCd = (enemy.rpgCd != null ? enemy.rpgCd : 2) - dt;
          if (enemy.rpgCd <= 0 && Math.abs(g.player.x - enemy.x) < 280) {
            enemy.rpgCd = 2.5 + Math.random();
            spawnRocket(g, enemy.x, enemy.y - 8, 120);
          }
        }
        if (g.player.y < GROUND - 40) return 'skipContact';
        return;
      }
    },

    interceptBullet: function (g, b) {
      if (!g.heliRockets) g.heliRockets = [];
      for (var ri = g.heliRockets.length - 1; ri >= 0; ri--) {
        var rk = g.heliRockets[ri];
        if (S.dist(b.x, b.y, rk.x, rk.y) < rk.radius + 4) {
          rk.hp -= 1;
          S.spawnParticles(g, rk.x, rk.y, '#ffa657', 4);
          return true;
        }
      }
      for (var i = 0; i < g.heliStructures.length; i++) {
        var st = g.heliStructures[i];
        if (st.alive && rectHit(b.x, b.y, 4, st)) {
          damageStructure(g, st, 1);
          return true;
        }
      }
      for (var ai = 0; ai < g.heliAA.length; ai++) {
        var aa = g.heliAA[ai];
        if (aa.alive && S.dist(b.x, b.y, aa.x, aa.y - 4) < aa.radius) {
          damageAA(g, aa, 1);
          return true;
        }
      }
      var obs = sector(g).obstacles || [];
      for (var oi = 0; oi < obs.length; oi++) {
        if (rectHit(b.x, b.y, 3, obs[oi])) return true;
      }
      return false;
    },

    drawBackground: function (g, ctx) {
      var sec = sector(g);
      var w = g.canvas.width;
      var h = g.canvas.height;
      drawSkyGradient(ctx, w, h, sec.skyTop, sec.skyBot);
      drawBiomeBackdrop(ctx, sec, g.animTime);
      if (sec.storm) drawStorm(ctx, g);

      ctx.fillStyle = sec.ground;
      ctx.fillRect(0, GROUND, w, h - GROUND);
      ctx.fillStyle = sec.accent;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, GROUND, w, 3);
      ctx.globalAlpha = 1;

      if (sec.pad) {
        ctx.fillStyle = '#4a5564';
        ctx.fillRect(PAD.x, PAD.y, PAD.w, PAD.h);
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(PAD.x, PAD.y, PAD.w, PAD.h);
        ctx.fillStyle = '#58a6ff';
        ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
        ctx.fillText('PAD', PAD.x + 16, PAD.y + 8);
      }
      if (sec.hqBuilding) {
        ctx.fillStyle = '#30363d';
        ctx.fillRect(200, GROUND - 50, 60, 50);
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(212, GROUND - 38, 12, 8);
        ctx.fillRect(236, GROUND - 38, 12, 8);
        ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
        ctx.fillText('HQ', 218, GROUND - 56);
      }

      if (sec.role === 'hostage' && currentLeg(g) && currentLeg(g).type === 'rescue') {
        ctx.strokeStyle = 'rgba(227,179,65,0.7)';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(LZ.x, GROUND - 8, LZ.w, 8);
        ctx.setLineDash([]);
        ctx.fillStyle = '#e3b341';
        ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
        ctx.fillText('LZ — hover still', LZ.x + 40, GROUND - 14);
      }

      // Escort VIP compound (HQ-like embassy under siege)
      if (escortHere(g)) {
        ctx.fillStyle = '#2a3340';
        ctx.fillRect(VIP_LZ.x + 40, GROUND - 55, 70, 55);
        ctx.fillStyle = '#e3b341';
        ctx.fillRect(VIP_LZ.x + 52, GROUND - 42, 14, 10);
        ctx.fillRect(VIP_LZ.x + 78, GROUND - 42, 14, 10);
        ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
        ctx.fillText('EMBASSY', VIP_LZ.x + 48, GROUND - 60);
        // flag pole
        ctx.strokeStyle = '#c9d1d9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(VIP_LZ.x + 30, GROUND);
        ctx.lineTo(VIP_LZ.x + 30, GROUND - 70);
        ctx.stroke();
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(VIP_LZ.x + 30, GROUND - 70, 22, 12);

        ctx.fillStyle = '#4a5564';
        ctx.fillRect(VIP_LZ.x, GROUND - 6, VIP_LZ.w, 8);
        ctx.strokeStyle = '#e3b341';
        ctx.lineWidth = 2;
        ctx.strokeRect(VIP_LZ.x, GROUND - 6, VIP_LZ.w, 8);
        var vipHint = 'CLEAR SIEGE';
        if (g.heliVip) {
          if (g.heliVip.state === 'waiting' || g.heliVip.state === 'climbing') vipHint = 'HOVER — EXTRACT';
          else if (g.heliVip.state === 'ready_drop' || g.heliVip.state === 'descending') vipHint = 'HOVER — DELIVER';
          else if (g.heliVip.state === 'aboard' || g.heliVip.state === 'hidden') vipHint = 'CLEAR SIEGE';
        }
        ctx.fillStyle = '#e3b341';
        ctx.fillText(vipHint, VIP_LZ.x + 50, GROUND - 14);
      }
    },

    drawObstacles: function (g, ctx) {
      var sec = sector(g);
      var obs = sec.obstacles || [];
      var i;
      for (i = 0; i < obs.length; i++) drawObstacle(ctx, obs[i], sec);

      for (i = 0; i < g.heliStructures.length; i++) {
        var st = g.heliStructures[i];
        if (!st.alive) continue;
        ctx.fillStyle = '#6e2a2a';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 2;
        ctx.strokeRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = '#ff7b72';
        ctx.fillRect(st.x, st.y - 6, st.w * (st.hp / st.maxHp), 4);
      }

      for (i = 0; i < g.heliAA.length; i++) {
        drawAAGun(ctx, g.heliAA[i], g.animTime, g.player);
      }

      if (g.heliRockets) {
        for (i = 0; i < g.heliRockets.length; i++) drawRocket(ctx, g.heliRockets[i]);
      }

      if (g.heliDrama && (g.heliDrama.phase === 'chew' || g.heliDrama.phase === 'brief') && g.heliDrama.commander) {
        drawCommander(ctx, g.heliDrama.commander, g.player, g.heliDrama.shout);
      }

      for (i = 0; i < g.heliBombs.length; i++) {
        var b = g.heliBombs[i];
        ctx.fillStyle = '#e3b341';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(b.x - 2, b.y - 10, 4, 8);
      }

      for (i = 0; i < g.heliHostages.length; i++) {
        var h = g.heliHostages[i];
        if (h.aboard || h.dead) continue;
        var hy = h.y - h.climb * (ROPE_LEN - 10);
        drawStickGround(ctx, h.x, hy, '#e3b341', 0.5);
      }

      if (g.heliVip && (g.heliVip.state === 'waiting' || g.heliVip.state === 'climbing' ||
          g.heliVip.state === 'ready_drop' || g.heliVip.state === 'descending')) {
        var vip = g.heliVip;
        var vy = vip.y - vip.climb * (ROPE_LEN - 10);
        S.drawStickmanUpright(ctx, vip.x, vy, 0, -1, '#e6edf3', 0.65, { armed: false });
        // tiny presidential sash / hat
        ctx.fillStyle = '#f85149';
        ctx.fillRect(vip.x - 5, vy - 6, 10, 3);
        ctx.fillStyle = '#1f6feb';
        ctx.fillRect(vip.x - 4, vy - 18, 8, 5);
        ctx.fillStyle = '#e3b341';
        ctx.font = '600 9px Segoe UI, system-ui, sans-serif';
        ctx.fillText('POTUS', vip.x - 14, vy - 22);
      }
    },

    drawEnemy: function (g, ctx, e) {
      if (e.heliPlane) {
        drawPlane(ctx, e, g.animTime);
        return true;
      }
      if (e.heliAir) {
        drawHelicopter(ctx, e.x, e.y + Math.sin(e.wobble) * 2, g.animTime, {
          facing: e.facing || (g.player.x < e.x ? -1 : 1),
          color: e.color || '#f85149',
          pitch: (e.facing || 1) * 0.18,
          drawScale: e.heliScale || 1
        });
        return true;
      }
      if (e.heliGround) {
        drawStickGround(ctx, e.x, e.y, e.color || '#f85149', e.scale || 0.55, e.infantry);
        return true;
      }
      return false;
    },

    renderPlayer: function (g, ctx) {
      var p = g.player;
      drawHelicopter(ctx, p.x, p.y, g.animTime, {
        facing: p.facing,
        color: p.fuel > 0 ? '#58a6ff' : '#6e7681',
        landed: p.landed,
        ropeDown: p.ropeDown,
        pitch: p.tilt || 0,
        rofl: true
      });
      if (p.cargo > 0 || p.president) {
        ctx.fillStyle = '#e3b341';
        ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
        ctx.fillText(p.president ? 'POTUS' : ('×' + p.cargo), p.x - 14, p.y - 32);
      }
    },

    drawHud: function (g, ctx) {
      var mapX = g.canvas.width - 210;
      var mapY = 14;
      var cellW = 26;
      var i;
      ctx.font = '600 11px Segoe UI, system-ui, sans-serif';
      for (i = 0; i < SECTORS.length; i++) {
        var x = mapX + i * (cellW + 2);
        var sec = SECTORS[i];
        var active = i === g.heliSector;
        ctx.fillStyle = active ? sec.accent : '#21262d';
        ctx.globalAlpha = active ? 0.95 : 0.75;
        ctx.fillRect(x, mapY, cellW, 16);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#8b949e';
        ctx.strokeRect(x, mapY, cellW, 16);
        ctx.fillStyle = active ? '#0d1117' : '#c9d1d9';
        ctx.fillText(sec.id, x + 4, mapY + 12);

        var leg = currentLeg(g);
        if (leg && leg.sector === i) {
          ctx.strokeStyle = '#e3b341';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, mapY - 1, cellW + 2, 18);
          ctx.lineWidth = 1;
        }
      }

      // fuel gauge
      var fuel = g.player.fuel != null ? g.player.fuel : FUEL_MAX;
      var fuelMax = g.player.maxFuel || FUEL_MAX;
      var fuelX = 16;
      var fuelY = g.canvas.height - 28;
      ctx.fillStyle = 'rgba(22,27,34,0.85)';
      ctx.fillRect(fuelX, fuelY, 120, 12);
      ctx.fillStyle = fuel < 25 ? '#f85149' : fuel < 50 ? '#e3b341' : '#3fb950';
      ctx.fillRect(fuelX, fuelY, 120 * (fuel / fuelMax), 12);
      ctx.strokeStyle = '#8b949e';
      ctx.strokeRect(fuelX, fuelY, 120, 12);
      ctx.fillStyle = '#e6edf3';
      ctx.fillText('FUEL', fuelX + 126, fuelY + 10);

      ctx.fillStyle = 'rgba(230,237,243,0.9)';
      ctx.fillText(sector(g).name, 16, 22);
      if (g.heliDrama && g.heliDrama.phase === 'recall') {
        ctx.fillStyle = g.heliDrama.fail ? '#f85149' : '#3fb950';
        ctx.fillText(g.heliDrama.fail ? 'RETURN TO BASE — land on pad' : 'RETURN TO BASE — debrief', 16, 40);
      } else if (g.heliDrama && g.heliDrama.phase === 'brief') {
        ctx.fillStyle = '#e3b341';
        ctx.fillText('Mission briefing…', 16, 40);
      } else if (g.heliDrama && g.heliDrama.phase === 'chew') {
        ctx.fillStyle = '#e3b341';
        ctx.fillText(g.heliDrama.fail ? 'Commander is not pleased…' : 'Debriefing…', 16, 40);
      } else if (g.heliMission && !g.heliMissionDone && !g.heliMissionFailed) {
        var leg2 = currentLeg(g);
        var legText = '';
        if (leg2) {
          if (leg2.type === 'destroy') legText = 'Leg: destroy base';
          else if (leg2.type === 'rescue') legText = 'Leg: rescue hostages';
          else if (leg2.type === 'escort_pickup') legText = 'Leg: clear & extract President';
          else if (leg2.type === 'escort_drop') legText = 'Leg: clear & deliver President';
        }
        ctx.fillStyle = 'rgba(227,179,65,0.95)';
        ctx.fillText(g.heliMission.title, 16, 40);
        if (legText) ctx.fillText(legText, 16, 56);
      } else if (g.heliMissionDone && !g.heliDrama) {
        ctx.fillStyle = '#3fb950';
        ctx.fillText('Mission complete', 16, 40);
      } else if (g.heliMissionFailed && !g.heliDrama) {
        ctx.fillStyle = '#f85149';
        ctx.fillText('Mission failed', 16, 40);
      }

      if (g.player.ropeDown) {
        ctx.fillStyle = '#e3b341';
        ctx.fillText('ROPE DOWN — hold position', 16, g.canvas.height - 16);
      }
    }
  });
})();

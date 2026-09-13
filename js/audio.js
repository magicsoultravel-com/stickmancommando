(function () {
  'use strict';

  let ctx = null;

  function getContext() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
    }
    return ctx;
  }

  function resume() {
    const audio = getContext();
    if (audio && audio.state === 'suspended') {
      return audio.resume();
    }
    return Promise.resolve();
  }

  function playTone(freq, start, duration, type, volume) {
    const audio = getContext();
    if (!audio) return;

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  // Cached periodic waves for chip-style pulse duties
  var pulseWaves = {};

  function getPulseWave(audio, duty) {
    var key = String(duty);
    if (pulseWaves[key]) return pulseWaves[key];
    // Fourier approx of a pulse wave at given duty cycle (0–1)
    var n = 32;
    var real = new Float32Array(n);
    var imag = new Float32Array(n);
    for (var i = 1; i < n; i++) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    }
    pulseWaves[key] = audio.createPeriodicWave(real, imag, { disableNormalization: false });
    return pulseWaves[key];
  }

  function envGain(audio, start, attack, peak, duration) {
    var gain = audio.createGain();
    var a = Math.max(0.005, attack || 0.01);
    var dur = Math.max(a + 0.04, duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    return { node: gain, stopAt: start + dur + 0.05 };
  }

  function getDistortionCurve(amount) {
    // Soft clip for electric-guitar grit
    var n = 256;
    var curve = new Float32Array(n);
    var k = typeof amount === 'number' ? amount : 28;
    for (var i = 0; i < n; i++) {
      var x = (i * 2) / n - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  function playKeyNote(freq, duration, voiceId) {
    resume();
    var audio = getContext();
    if (!audio || !freq) return;
    var dur = duration != null ? duration : 0.28;
    var voice = voiceId || currentKeyVoice || 'bright';
    var now = audio.currentTime;

    if (voice === 'organ') {
      // Electronic combo-organ — stacked partials, soft attack, sustained body
      // (old-game OST vibe: Farfisa/cheap Hammond, not a laser swoop)
      var master = audio.createGain();
      var stopAt = now + Math.max(0.55, dur * 1.6) + 0.08;
      var partials = [
        { ratio: 1, vol: 0.09, type: 'sine' },
        { ratio: 2, vol: 0.07, type: 'sine' },
        { ratio: 3, vol: 0.045, type: 'sine' },
        { ratio: 4, vol: 0.03, type: 'sine' },
        { ratio: 6, vol: 0.022, type: 'sine' },
        // thin square octave for that digital/game-OST edge
        { ratio: 1, vol: 0.028, type: 'square', detune: 4 },
        { ratio: 2, vol: 0.016, type: 'square', detune: -5 }
      ];
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(1, now + 0.045);
      master.gain.setValueAtTime(1, now + Math.max(0.2, dur * 0.55));
      master.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.55, dur * 1.55));
      master.connect(audio.destination);
      for (var i = 0; i < partials.length; i++) {
        var p = partials[i];
        var o = audio.createOscillator();
        var g = audio.createGain();
        if (p.type === 'square') o.type = 'square';
        else o.type = 'sine';
        o.frequency.setValueAtTime(freq * p.ratio, now);
        if (p.detune) o.detune.setValueAtTime(p.detune, now);
        g.gain.setValueAtTime(p.vol, now);
        o.connect(g);
        g.connect(master);
        o.start(now);
        o.stop(stopAt);
      }
      return;
    }

    if (voice === 'strings') {
      // Lush string section — slow bow attack, chorus of detuned saws
      var strMaster = audio.createGain();
      var strFilter = audio.createBiquadFilter();
      var strStop = now + Math.max(0.7, dur * 1.8) + 0.1;
      var strLayer = [
        { type: 'sawtooth', detune: -12, vol: 0.045 },
        { type: 'sawtooth', detune: 0, vol: 0.055 },
        { type: 'sawtooth', detune: 14, vol: 0.045 },
        { type: 'triangle', detune: 3, vol: 0.035 }
      ];
      strFilter.type = 'lowpass';
      strFilter.Q.setValueAtTime(0.7, now);
      strFilter.frequency.setValueAtTime(Math.min(3200, freq * 6), now);
      strMaster.gain.setValueAtTime(0.0001, now);
      strMaster.gain.exponentialRampToValueAtTime(1, now + 0.11);
      strMaster.gain.setValueAtTime(1, now + Math.max(0.25, dur * 0.6));
      strMaster.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.7, dur * 1.7));
      strFilter.connect(strMaster);
      strMaster.connect(audio.destination);
      for (var si = 0; si < strLayer.length; si++) {
        var sl = strLayer[si];
        var so = audio.createOscillator();
        var sg = audio.createGain();
        so.type = sl.type;
        so.frequency.setValueAtTime(freq, now);
        so.detune.setValueAtTime(sl.detune, now);
        sg.gain.setValueAtTime(sl.vol, now);
        so.connect(sg);
        sg.connect(strFilter);
        so.start(now);
        so.stop(strStop);
      }
      return;
    }

    if (voice === 'bass') {
      // Synth bass — sub sine + filtered saw, punchy filter envelope
      var bassGain = audio.createGain();
      var bassFilter = audio.createBiquadFilter();
      var bassStop = now + Math.max(0.4, dur * 1.2) + 0.06;
      var sub = audio.createOscillator();
      var saw = audio.createOscillator();
      var subG = audio.createGain();
      var sawG = audio.createGain();
      sub.type = 'sine';
      saw.type = 'sawtooth';
      sub.frequency.setValueAtTime(freq, now);
      saw.frequency.setValueAtTime(freq, now);
      // Slight pitch thump on the attack
      saw.frequency.setValueAtTime(freq * 1.06, now);
      saw.frequency.exponentialRampToValueAtTime(freq, now + 0.05);
      subG.gain.setValueAtTime(0.14, now);
      sawG.gain.setValueAtTime(0.09, now);
      bassFilter.type = 'lowpass';
      bassFilter.Q.setValueAtTime(6, now);
      bassFilter.frequency.setValueAtTime(Math.min(900, freq * 5.5), now);
      bassFilter.frequency.exponentialRampToValueAtTime(Math.max(90, freq * 1.4), now + dur * 0.55);
      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.exponentialRampToValueAtTime(1, now + 0.012);
      bassGain.gain.exponentialRampToValueAtTime(0.55, now + 0.08);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.4, dur * 1.15));
      sub.connect(subG);
      saw.connect(sawG);
      subG.connect(bassGain);
      sawG.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(audio.destination);
      sub.start(now);
      saw.start(now);
      sub.stop(bassStop);
      saw.stop(bassStop);
      return;
    }

    if (voice === 'guitar') {
      // Electric riff guitar — pick click + distorted saw through soft clip
      var gtrGain = audio.createGain();
      var gtrFilter = audio.createBiquadFilter();
      var drive = audio.createWaveShaper();
      var gtrStop = now + Math.max(0.45, dur * 1.25) + 0.06;
      var gtr = audio.createOscillator();
      var gtrOct = audio.createOscillator();
      var gtrG = audio.createGain();
      var octG = audio.createGain();
      var pick = audio.createOscillator();
      var pickG = audio.createGain();
      drive.curve = getDistortionCurve(32);
      drive.oversample = '2x';
      gtr.type = 'sawtooth';
      gtrOct.type = 'square';
      pick.type = 'triangle';
      gtr.frequency.setValueAtTime(freq * 1.03, now);
      gtr.frequency.exponentialRampToValueAtTime(freq, now + 0.035);
      gtrOct.frequency.setValueAtTime(freq * 2, now);
      pick.frequency.setValueAtTime(freq * 4.5, now);
      gtrG.gain.setValueAtTime(0.11, now);
      octG.gain.setValueAtTime(0.035, now);
      pickG.gain.setValueAtTime(0.0001, now);
      pickG.gain.exponentialRampToValueAtTime(0.07, now + 0.004);
      pickG.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      gtrFilter.type = 'bandpass';
      gtrFilter.Q.setValueAtTime(1.1, now);
      gtrFilter.frequency.setValueAtTime(Math.min(2800, freq * 4.5), now);
      gtrGain.gain.setValueAtTime(0.0001, now);
      gtrGain.gain.exponentialRampToValueAtTime(1, now + 0.01);
      gtrGain.gain.exponentialRampToValueAtTime(0.35, now + 0.12);
      gtrGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.45, dur * 1.2));
      gtr.connect(gtrG);
      gtrOct.connect(octG);
      gtrG.connect(drive);
      octG.connect(drive);
      pick.connect(pickG);
      pickG.connect(gtrGain);
      drive.connect(gtrFilter);
      gtrFilter.connect(gtrGain);
      gtrGain.connect(audio.destination);
      gtr.start(now);
      gtrOct.start(now);
      pick.start(now);
      gtr.stop(gtrStop);
      gtrOct.stop(gtrStop);
      pick.stop(now + 0.05);
      return;
    }

    if (voice === 'brass') {
      // Synth brass — bright saw, opening filter, short swell
      var brGain = audio.createGain();
      var brFilter = audio.createBiquadFilter();
      var brStop = now + Math.max(0.5, dur * 1.35) + 0.06;
      var br1 = audio.createOscillator();
      var br2 = audio.createOscillator();
      var br1G = audio.createGain();
      var br2G = audio.createGain();
      br1.type = 'sawtooth';
      br2.type = 'sawtooth';
      br1.frequency.setValueAtTime(freq, now);
      br2.frequency.setValueAtTime(freq, now);
      br2.detune.setValueAtTime(7, now);
      br1G.gain.setValueAtTime(0.09, now);
      br2G.gain.setValueAtTime(0.07, now);
      brFilter.type = 'lowpass';
      brFilter.Q.setValueAtTime(5, now);
      brFilter.frequency.setValueAtTime(Math.max(400, freq * 2), now);
      brFilter.frequency.exponentialRampToValueAtTime(Math.min(4500, freq * 9), now + 0.08);
      brFilter.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 3), now + dur * 0.7);
      brGain.gain.setValueAtTime(0.0001, now);
      brGain.gain.exponentialRampToValueAtTime(1, now + 0.04);
      brGain.gain.setValueAtTime(1, now + Math.max(0.15, dur * 0.4));
      brGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.5, dur * 1.3));
      br1.connect(br1G);
      br2.connect(br2G);
      br1G.connect(brFilter);
      br2G.connect(brFilter);
      brFilter.connect(brGain);
      brGain.connect(audio.destination);
      br1.start(now);
      br2.start(now);
      br1.stop(brStop);
      br2.stop(brStop);
      return;
    }

    if (voice === 'choir') {
      // Synth choir / ahh — soft sines + gentle vibrato, slow bloom
      var chMaster = audio.createGain();
      var chFilter = audio.createBiquadFilter();
      var chStop = now + Math.max(0.75, dur * 1.9) + 0.1;
      var chLfo = audio.createOscillator();
      var chLfoG = audio.createGain();
      var chParts = [
        { ratio: 1, detune: -8, vol: 0.06 },
        { ratio: 1, detune: 9, vol: 0.06 },
        { ratio: 2, detune: -4, vol: 0.028 },
        { ratio: 3, detune: 5, vol: 0.016 }
      ];
      chFilter.type = 'bandpass';
      chFilter.Q.setValueAtTime(0.9, now);
      chFilter.frequency.setValueAtTime(Math.min(1800, freq * 3.2), now);
      chLfo.frequency.setValueAtTime(4.2, now);
      chLfoG.gain.setValueAtTime(14, now);
      chMaster.gain.setValueAtTime(0.0001, now);
      chMaster.gain.exponentialRampToValueAtTime(1, now + 0.14);
      chMaster.gain.setValueAtTime(1, now + Math.max(0.3, dur * 0.65));
      chMaster.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.75, dur * 1.8));
      chFilter.connect(chMaster);
      chMaster.connect(audio.destination);
      chLfo.connect(chLfoG);
      chLfo.start(now);
      chLfo.stop(chStop);
      for (var ci = 0; ci < chParts.length; ci++) {
        var cp = chParts[ci];
        var co = audio.createOscillator();
        var cg = audio.createGain();
        co.type = 'sine';
        co.frequency.setValueAtTime(freq * cp.ratio, now);
        co.detune.setValueAtTime(cp.detune, now);
        chLfoG.connect(co.detune);
        cg.gain.setValueAtTime(cp.vol, now);
        co.connect(cg);
        cg.connect(chFilter);
        co.start(now);
        co.stop(chStop);
      }
      return;
    }

    if (voice === 'atari') {
      // Atari TIA / POKEY vibe: twin squares, slight detune + grit
      var egA = envGain(audio, now, 0.008, 0.1, dur);
      var o1 = audio.createOscillator();
      var o2 = audio.createOscillator();
      o1.type = 'square';
      o2.type = 'square';
      o1.frequency.setValueAtTime(freq, now);
      o2.frequency.setValueAtTime(freq * 1.007, now);
      // Soft bit of pitch drop like a POKEY scrape
      o1.frequency.exponentialRampToValueAtTime(freq * 0.985, now + dur);
      o2.frequency.exponentialRampToValueAtTime(freq * 0.992, now + dur);
      o1.connect(egA.node);
      o2.connect(egA.node);
      egA.node.connect(audio.destination);
      o1.start(now);
      o2.start(now);
      o1.stop(egA.stopAt);
      o2.stop(egA.stopAt);
      return;
    }

    if (voice === 'sid') {
      // Commodore 64 SID lead: saw through a closing lowpass + mild vibrato
      var oscS = audio.createOscillator();
      var filter = audio.createBiquadFilter();
      var egS = envGain(audio, now, 0.015, 0.13, dur * 1.15);
      oscS.type = 'sawtooth';
      oscS.frequency.setValueAtTime(freq, now);
      // Vibrato via detune (cents) — classic SID wobble
      var lfo = audio.createOscillator();
      var lfoGain = audio.createGain();
      lfo.frequency.setValueAtTime(5.5, now);
      lfoGain.gain.setValueAtTime(28, now);
      lfo.connect(lfoGain);
      lfoGain.connect(oscS.detune);
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(4, now);
      filter.frequency.setValueAtTime(Math.min(4200, freq * 8), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.2), now + dur);
      oscS.connect(filter);
      filter.connect(egS.node);
      egS.node.connect(audio.destination);
      oscS.start(now);
      lfo.start(now);
      oscS.stop(egS.stopAt);
      lfo.stop(egS.stopAt);
      return;
    }

    if (voice === 'nes') {
      // NES 2A03 pulse (~25% duty), short plucky envelope
      var oscN = audio.createOscillator();
      var egN = envGain(audio, now, 0.006, 0.12, dur * 0.75);
      oscN.setPeriodicWave(getPulseWave(audio, 0.25));
      oscN.frequency.setValueAtTime(freq, now);
      oscN.connect(egN.node);
      egN.node.connect(audio.destination);
      oscN.start(now);
      oscN.stop(egN.stopAt);
      return;
    }

    // bright (default) — current Casio saw
    playTone(freq, now, dur, 'sawtooth', 0.12);
  }

  var KEY_VOICES = [
    { id: 'bright', name: 'Bright' },
    { id: 'organ', name: 'Organ' },
    { id: 'strings', name: 'Strings' },
    { id: 'bass', name: 'Synth Bass' },
    { id: 'guitar', name: 'E. Guitar' },
    { id: 'brass', name: 'Brass' },
    { id: 'choir', name: 'Choir' },
    { id: 'atari', name: 'Atari' },
    { id: 'sid', name: 'SID' },
    { id: 'nes', name: 'NES' }
  ];
  var currentKeyVoice = 'bright';

  function setKeyVoice(id) {
    var found = KEY_VOICES.some(function (v) { return v.id === id; });
    currentKeyVoice = found ? id : 'bright';
    return currentKeyVoice;
  }

  function getKeyVoice() {
    return currentKeyVoice;
  }

  function listKeyVoices() {
    return KEY_VOICES.slice();
  }

  function playMotif(notes, vol, onNote) {
    const audio = getContext();
    if (!audio) return Promise.resolve();
    vol = vol || 0.14;
    const now = audio.currentTime;
    let t = 0;
    notes.forEach(function (n) {
      var dur = n.dur || 0.22;
      playTone(n.freq, now + t, dur, n.type || 'sawtooth', vol * (n.vol || 1));
      if (typeof onNote === 'function') {
        (function (freq, duration, delayMs) {
          setTimeout(function () {
            onNote({ freq: freq, dur: duration });
          }, delayMs);
        })(n.freq, dur, Math.round(t * 1000));
      }
      t += n.gap != null ? n.gap : 0.28;
    });
    return Promise.resolve();
  }

  function playIntroSting() {
    return playMotif([
      { freq: 110, dur: 0.35, gap: 0.45 },
      { freq: 110, dur: 0.35, gap: 0.5 },
      { freq: 82.41, dur: 0.7, vol: 1.2, gap: 0 },
      { freq: 55, dur: 0.7, type: 'square', vol: 0.5, gap: 0.7 }
    ], 0.18);
  }

  var MODE_TUNES = {
    horde: [
      { freq: 98, type: 'sawtooth' },
      { freq: 87, type: 'sawtooth' },
      { freq: 73, dur: 0.4, vol: 1.3, gap: 0.5 }
    ],
    zombie: [
      { freq: 98, type: 'sawtooth' },
      { freq: 87, type: 'sawtooth' },
      { freq: 73, dur: 0.4, vol: 1.3, gap: 0.5 }
    ],
    stickmanisland: [
      { freq: 196, type: 'triangle' },
      { freq: 247, type: 'triangle' },
      { freq: 294, dur: 0.35, gap: 0.45 }
    ],
    dronedrive: [
      { freq: 130, type: 'square' },
      { freq: 98, type: 'square' },
      { freq: 65, dur: 0.45, vol: 1.2, gap: 0.55 }
    ],
    jetside: [
      { freq: 330, type: 'sawtooth' },
      { freq: 392, type: 'sawtooth' },
      { freq: 523, dur: 0.25, gap: 0.35 }
    ],
    roflcopter: [
      { freq: 110, type: 'sawtooth' },
      { freq: 147, type: 'sawtooth' },
      { freq: 98, dur: 0.4, vol: 1.1, gap: 0.5 }
    ],
    stickinvaders: [
      { freq: 330, type: 'sawtooth' },
      { freq: 392, type: 'sawtooth' },
      { freq: 523, dur: 0.25, gap: 0.35 }
    ],
    platform: [
      { freq: 165, type: 'triangle' },
      { freq: 196, type: 'triangle' },
      { freq: 220, dur: 0.35, gap: 0.5 }
    ],
    sticktetris: [
      { freq: 262, type: 'triangle' },
      { freq: 330, type: 'triangle' },
      { freq: 392, dur: 0.3, gap: 0.4 }
    ],
    sniperrange: [
      { freq: 196, type: 'sawtooth' },
      { freq: 220, type: 'sawtooth' },
      { freq: 246, dur: 0.4, vol: 0.9, gap: 0.55 }
    ],
    shooters: [
      { freq: 147, type: 'square' },
      { freq: 175, type: 'square' },
      { freq: 220, dur: 0.3, gap: 0.4 }
    ],
    waves: [
      { freq: 165, type: 'triangle' },
      { freq: 196, type: 'triangle' },
      { freq: 220, dur: 0.35, gap: 0.5 }
    ],
    medkits: [
      { freq: 262, type: 'triangle' },
      { freq: 330, type: 'triangle' },
      { freq: 392, dur: 0.3, gap: 0.4 }
    ],
    variants: [
      { freq: 185, type: 'sawtooth' },
      { freq: 220, type: 'sawtooth' },
      { freq: 277, dur: 0.28, gap: 0.38 }
    ],
    leaderboard: [
      { freq: 220, type: 'square' },
      { freq: 277, type: 'square' },
      { freq: 330, dur: 0.35, vol: 0.9, gap: 0.45 }
    ],
    towerdefense: [
      { freq: 131, type: 'square' },
      { freq: 165, type: 'square' },
      { freq: 196, dur: 0.35, vol: 0.9, gap: 0.45 }
    ]
  };

  var DEFAULT_TUNE = [
    { freq: 220, type: 'triangle' },
    { freq: 277, type: 'triangle' },
    { freq: 330, dur: 0.3, gap: 0.4 }
  ];

  function playModeTune(modeId, options) {
    resume();
    options = options || {};
    // legacy ids share horde's tune
    if (modeId === 'shooters' || modeId === 'medkits' || modeId === 'variants' || modeId === 'leaderboard') modeId = 'horde';
    var tune = MODE_TUNES[modeId] || DEFAULT_TUNE;
    playMotif(tune, 0.12, options.onNote);
  }

  window.GameAudio = {
    resume: resume,
    playIntroSting: playIntroSting,
    playModeTune: playModeTune,
    playKeyNote: playKeyNote,
    setKeyVoice: setKeyVoice,
    getKeyVoice: getKeyVoice,
    listKeyVoices: listKeyVoices
  };
})();

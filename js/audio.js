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

  function playMotif(notes, vol) {
    const audio = getContext();
    if (!audio) return Promise.resolve();
    vol = vol || 0.14;
    const now = audio.currentTime;
    let t = 0;
    notes.forEach(function (n) {
      playTone(n.freq, now + t, n.dur || 0.22, n.type || 'sawtooth', vol * (n.vol || 1));
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
    zombie: [
      { freq: 98, type: 'sawtooth' },
      { freq: 87, type: 'sawtooth' },
      { freq: 73, dur: 0.4, vol: 1.3, gap: 0.5 }
    ],
    animatedxl: [
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
    ]
  };

  function playModeTune(modeId) {
    resume();
    var tune = MODE_TUNES[modeId];
    if (!tune) return;
    playMotif(tune, 0.12);
  }

  window.GameAudio = {
    resume: resume,
    playIntroSting: playIntroSting,
    playModeTune: playModeTune
  };
})();

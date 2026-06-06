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

  /** Classic dramatic "dundun-DUN" intro sting. */
  function playIntroSting() {
    const audio = getContext();
    if (!audio) return Promise.resolve();

    const now = audio.currentTime;
    const vol = 0.18;

    playTone(110, now + 0.0, 0.35, 'sawtooth', vol);
    playTone(110, now + 0.45, 0.35, 'sawtooth', vol);
    playTone(82.41, now + 0.95, 0.7, 'sawtooth', vol * 1.2);
    playTone(55, now + 0.95, 0.7, 'square', vol * 0.5);

    return new Promise(function (resolve) {
      setTimeout(resolve, 1800);
    });
  }

  window.GameAudio = {
    resume: resume,
    playIntroSting: playIntroSting
  };
})();

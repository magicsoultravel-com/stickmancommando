(function () {
  'use strict';

  // Chromatic range covering all motif freqs (55–523 Hz ≈ A1–C5) with room to play.
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var START_MIDI = 36; // C2
  var END_MIDI = 84;   // C6
  var VISIBLE_WHITE = 15; // ~2 octaves of white keys

  var panel = null;
  var keysEl = null;
  var rangeLabel = null;
  var open = false;
  var pauseFloat = false;
  var didInitialScroll = false;
  var whiteKeys = [];
  var allKeys = []; // { el, midi, freq, name, isBlack }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function midiToName(midi) {
    var name = NOTE_NAMES[midi % 12];
    var octave = Math.floor(midi / 12) - 1;
    return name + octave;
  }

  function isBlackMidi(midi) {
    var n = midi % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  }

  function ensureEls() {
    if (panel) return;
    panel = document.getElementById('keyboard-panel');
    keysEl = document.getElementById('keyboard-keys');
    rangeLabel = document.getElementById('keyboard-range-label');
  }

  function buildKeys() {
    ensureEls();
    if (!keysEl || keysEl.childNodes.length) return;

    whiteKeys = [];
    allKeys = [];

    for (var midi = START_MIDI; midi <= END_MIDI; midi++) {
      var black = isBlackMidi(midi);
      var name = midiToName(midi);
      var freq = midiToFreq(midi);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = black ? 'kb-black' : 'kb-white';
      btn.dataset.midi = String(midi);
      btn.dataset.freq = String(freq);
      btn.dataset.note = name;
      btn.setAttribute('aria-label', name);
      if (!black) {
        // Label white keys that are C's for orientation
        if (midi % 12 === 0) btn.textContent = name;
        whiteKeys.push(btn);
      }
      allKeys.push({ el: btn, midi: midi, freq: freq, name: name, isBlack: black });
      bindKey(btn);
    }

    // Append whites first so flex layout is correct, then overlay blacks
    whiteKeys.forEach(function (w) { keysEl.appendChild(w); });
    positionBlackKeys();
  }

  function positionBlackKeys() {
    // Black keys sit over the gap between white keys. Place them after layout.
    if (!keysEl || !whiteKeys.length || !open) return;
    var whiteWidth = whiteKeys[0].offsetWidth;
    if (!whiteWidth) {
      requestAnimationFrame(positionBlackKeys);
      return;
    }
    whiteWidth += 2; // include 1px margin each side
    var blackWidth = 34;

    allKeys.forEach(function (k) {
      if (k.isBlack && k.el.parentNode) k.el.parentNode.removeChild(k.el);
    });

    allKeys.forEach(function (k) {
      if (!k.isBlack) return;
      var whiteIndex = -1;
      for (var i = 0; i < whiteKeys.length; i++) {
        var wMidi = parseInt(whiteKeys[i].dataset.midi, 10);
        if (wMidi < k.midi) whiteIndex = i;
        else break;
      }
      if (whiteIndex < 0) return;
      var left = (whiteIndex + 1) * whiteWidth - blackWidth / 2;
      k.el.style.left = left + 'px';
      keysEl.appendChild(k.el);
    });
  }

  var drawing = false;
  var lastDrawEl = null;
  var arpPattern = 'off';
  var arpRateMs = 150;
  var arpTimer = null;
  var arpStep = 0;
  var arpRootMidi = null;

  var ARP_PATTERNS = {
    // Scale degrees → semitone offsets from the held root
    '135': [0, 4, 7],
    '1b35': [0, 3, 7],
    '157': [0, 7, 11],
    '158': [0, 7, 12],
    '1585': [0, 7, 12, 7],
    '1358': [0, 4, 7, 12],
    '1b358': [0, 3, 7, 12],
    'updown': [0, 4, 7, 12, 7, 4]
  };

  function getArpOffsets() {
    return ARP_PATTERNS[arpPattern] || null;
  }

  function arpEnabled() {
    return !!getArpOffsets();
  }

  function stopArp() {
    if (arpTimer) {
      clearInterval(arpTimer);
      arpTimer = null;
    }
    arpStep = 0;
    arpRootMidi = null;
  }

  function midiKeyEl(midi) {
    for (var i = 0; i < allKeys.length; i++) {
      if (allKeys[i].midi === midi) return allKeys[i].el;
    }
    return null;
  }

  function playArpStep() {
    var offsets = getArpOffsets();
    if (!offsets || arpRootMidi == null || !window.GameAudio) return;
    var midi = arpRootMidi + offsets[arpStep % offsets.length];
    arpStep += 1;
    // Keep sounding notes inside the keyboard range by octave-wrapping
    while (midi > END_MIDI) midi -= 12;
    while (midi < START_MIDI) midi += 12;
    var freq = midiToFreq(midi);
    var noteDur = Math.min(0.28, (arpRateMs / 1000) * 0.85);
    GameAudio.playKeyNote(freq, noteDur);
    flash(midiKeyEl(midi), noteDur);
  }

  function startArp(rootMidi) {
    stopArp();
    if (!arpEnabled() || rootMidi == null) return;
    arpRootMidi = rootMidi;
    arpStep = 0;
    if (window.GameAudio) GameAudio.resume();
    playArpStep();
    arpTimer = setInterval(playArpStep, arpRateMs);
  }

  function syncArpRateDisabled() {
    var rate = document.getElementById('keyboard-arp-rate');
    if (rate) rate.disabled = !arpEnabled();
  }

  function strikeEl(el) {
    if (!el || !el.dataset || !el.dataset.freq) return;
    if (el === lastDrawEl) return;
    lastDrawEl = el;
    var freq = parseFloat(el.dataset.freq);
    var midi = parseInt(el.dataset.midi, 10);
    if (arpEnabled()) {
      startArp(midi);
      return;
    }
    if (window.GameAudio) {
      GameAudio.resume();
      GameAudio.playKeyNote(freq);
    }
    flash(el, 0.22);
  }

  function keyFromPoint(x, y) {
    var stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (!el) continue;
      if (el.classList && (el.classList.contains('kb-white') || el.classList.contains('kb-black'))) {
        return el;
      }
    }
    return null;
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    var el = keyFromPoint(e.clientX, e.clientY);
    if (!el) return;
    e.preventDefault();
    drawing = true;
    lastDrawEl = null;
    if (keysEl.setPointerCapture) {
      try { keysEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    strikeEl(el);
  }

  function onPointerMove(e) {
    if (!drawing) return;
    e.preventDefault();
    strikeEl(keyFromPoint(e.clientX, e.clientY));
  }

  function onPointerUp(e) {
    if (!drawing) return;
    drawing = false;
    lastDrawEl = null;
    stopArp();
    if (keysEl.releasePointerCapture) {
      try { keysEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  }

  function bindKey(btn) {
    // Pointer handlers live on #keyboard-keys so drag-glide works across keys.
    btn.style.touchAction = 'none';
  }

  function flash(el, dur) {
    if (!el) return;
    el.classList.add('active');
    var ms = Math.max(80, Math.round((dur || 0.22) * 1000));
    setTimeout(function () {
      el.classList.remove('active');
    }, ms);
  }

  function closestKey(freq) {
    if (!freq || !allKeys.length) return null;
    var best = null;
    var bestRatio = Infinity;
    for (var i = 0; i < allKeys.length; i++) {
      var k = allKeys[i];
      var ratio = Math.abs(Math.log(k.freq / freq));
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = k;
      }
    }
    return best;
  }

  function scrollKeyIntoView(key) {
    if (!key || !keysEl) return;
    var el = key.isBlack
      ? // center on nearest white for scroll math
        (function () {
          for (var i = whiteKeys.length - 1; i >= 0; i--) {
            if (parseInt(whiteKeys[i].dataset.midi, 10) < key.midi) return whiteKeys[i];
          }
          return whiteKeys[0];
        })()
      : key.el;
    if (!el) return;
    var target = el.offsetLeft - (keysEl.clientWidth / 2) + (el.offsetWidth / 2);
    keysEl.scrollLeft = Math.max(0, target);
    updateRangeLabel();
  }

  function whiteSpanLabel() {
    if (!keysEl || !whiteKeys.length) return '';
    var scroll = keysEl.scrollLeft;
    var whiteWidth = whiteKeys[0].offsetWidth + 2;
    if (!whiteWidth) return '';
    var startIdx = Math.round(scroll / whiteWidth);
    startIdx = Math.max(0, Math.min(whiteKeys.length - 1, startIdx));
    var endIdx = Math.min(whiteKeys.length - 1, startIdx + VISIBLE_WHITE - 1);
    return whiteKeys[startIdx].dataset.note + '–' + whiteKeys[endIdx].dataset.note;
  }

  function updateRangeLabel() {
    if (!rangeLabel) return;
    rangeLabel.textContent = whiteSpanLabel() || 'C3–C5';
  }

  function scrollOctave(dir) {
    ensureEls();
    if (!keysEl || !whiteKeys.length) return;
    var whiteWidth = whiteKeys[0].offsetWidth + 2;
    // 7 white keys ≈ one octave
    keysEl.scrollBy({ left: dir * whiteWidth * 7, behavior: 'smooth' });
    setTimeout(updateRangeLabel, 220);
  }

  function syncToggleUi() {
    var menuBtn = document.getElementById('keyboard-toggle-btn');
    var pauseBtn = document.getElementById('pause-keyboard-btn');
    if (menuBtn) menuBtn.classList.toggle('on', open);
    if (pauseBtn) pauseBtn.classList.toggle('on', open);
  }

  function scrollToMidi(midi) {
    if (!keysEl || !whiteKeys.length) return;
    var target = null;
    for (var i = 0; i < whiteKeys.length; i++) {
      if (parseInt(whiteKeys[i].dataset.midi, 10) === midi) {
        target = whiteKeys[i];
        break;
      }
    }
    if (!target) return;
    keysEl.scrollLeft = target.offsetLeft;
    updateRangeLabel();
  }

  function applyVisibility() {
    ensureEls();
    if (!panel) return;
    if (open) {
      panel.hidden = false;
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.toggle('pause-float', pauseFloat);
      if (pauseFloat && panel.parentElement && panel.parentElement.id === 'overlay') {
        // Float above canvas during pause — move under #game-wrapper
        var wrapper = document.getElementById('game-wrapper');
        if (wrapper) wrapper.appendChild(panel);
      } else if (!pauseFloat && panel.parentElement && panel.parentElement.id !== 'overlay') {
        // Back inside overlay, above actions
        var actions = document.getElementById('overlay-actions');
        var overlay = document.getElementById('overlay');
        if (overlay && actions) overlay.insertBefore(panel, actions);
      }
      buildKeys();
      requestAnimationFrame(function () {
        positionBlackKeys();
        requestAnimationFrame(function () {
          if (!didInitialScroll) {
            scrollToMidi(48); // C3
            didInitialScroll = true;
          } else {
            updateRangeLabel();
          }
        });
      });
    } else {
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('pause-float');
    }
    syncToggleUi();
  }

  function show(opts) {
    opts = opts || {};
    open = true;
    pauseFloat = !!opts.pauseFloat;
    applyVisibility();
  }

  function hide() {
    open = false;
    pauseFloat = false;
    stopArp();
    drawing = false;
    lastDrawEl = null;
    applyVisibility();
  }

  function toggle(opts) {
    if (open) hide();
    else show(opts);
    return open;
  }

  function isOpen() {
    return open;
  }

  function setPauseFloat(enabled) {
    pauseFloat = !!enabled;
    if (open) applyVisibility();
  }

  function highlightDemoNote(freq, dur) {
    if (!open) return;
    buildKeys();
    var key = closestKey(freq);
    if (!key) return;
    scrollKeyIntoView(key);
    flash(key.el, dur || 0.22);
  }

  function wireSelect(el, onChange) {
    if (!el) return;
    el.addEventListener('change', onChange);
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    el.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function init() {
    ensureEls();
    // Keys are built lazily on first show so layout widths are real.
    var left = document.getElementById('keyboard-scroll-left');
    var right = document.getElementById('keyboard-scroll-right');
    var voiceSelect = document.getElementById('keyboard-voice');
    var arpSelect = document.getElementById('keyboard-arp');
    var rateSelect = document.getElementById('keyboard-arp-rate');
    if (left) left.addEventListener('click', function () { scrollOctave(-1); });
    if (right) right.addEventListener('click', function () { scrollOctave(1); });
    if (voiceSelect) {
      if (window.GameAudio && GameAudio.getKeyVoice) {
        voiceSelect.value = GameAudio.getKeyVoice();
      }
      wireSelect(voiceSelect, function () {
        if (window.GameAudio) {
          GameAudio.setKeyVoice(voiceSelect.value);
          GameAudio.resume();
          GameAudio.playKeyNote(261.63, 0.22);
        }
      });
    }
    if (arpSelect) {
      arpPattern = arpSelect.value || 'off';
      wireSelect(arpSelect, function () {
        arpPattern = arpSelect.value || 'off';
        syncArpRateDisabled();
        if (drawing && lastDrawEl && arpEnabled()) {
          startArp(parseInt(lastDrawEl.dataset.midi, 10));
        } else if (!arpEnabled()) {
          stopArp();
        }
      });
    }
    if (rateSelect) {
      arpRateMs = parseInt(rateSelect.value, 10) || 150;
      wireSelect(rateSelect, function () {
        arpRateMs = parseInt(rateSelect.value, 10) || 150;
        if (drawing && lastDrawEl && arpEnabled()) {
          startArp(parseInt(lastDrawEl.dataset.midi, 10));
        }
      });
    }
    syncArpRateDisabled();
    if (keysEl) {
      keysEl.addEventListener('scroll', function () {
        updateRangeLabel();
      });
      keysEl.addEventListener('pointerdown', onPointerDown);
      keysEl.addEventListener('pointermove', onPointerMove);
      keysEl.addEventListener('pointerup', onPointerUp);
      keysEl.addEventListener('pointercancel', onPointerUp);
      keysEl.addEventListener('lostpointercapture', onPointerUp);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GameKeyboard = {
    show: show,
    hide: hide,
    toggle: toggle,
    isOpen: isOpen,
    setPauseFloat: setPauseFloat,
    scrollOctave: scrollOctave,
    highlightDemoNote: highlightDemoNote
  };
})();

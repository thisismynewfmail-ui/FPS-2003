/* TEMPUS — audio. Everything is synthesized with WebAudio:
   per-realm vaporwave arrangements, a tick-tock that only exists while
   time flows, animalese speech for Minuette, and 2003-flavored SFX. */

var AUDIO = (function () {
  var ctx = null, master = null, musicBus = null, sfxBus = null, voiceBus = null, lp = null;
  var muted = false, started = false;
  var tickTimer = 0, tickHi = false;
  var vols = { master: 0.55, music: 0.5, voice: 0.7 };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = vols.master;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000;
    lp.connect(master); master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = vols.music; musicBus.connect(lp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0; sfxBus.connect(lp);
    voiceBus = ctx.createGain(); voiceBus.gain.value = vols.voice; voiceBus.connect(lp);
  }

  function resume() { init(); if (ctx.state === 'suspended') ctx.resume(); }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : vols.master;
    return muted;
  }

  function setVolumes(v) {
    if (v.master !== undefined) vols.master = v.master;
    if (v.music !== undefined) vols.music = v.music;
    if (v.voice !== undefined) vols.voice = v.voice;
    if (master && !muted) master.gain.value = vols.master;
    if (musicBus) musicBus.gain.value = vols.music;
    if (voiceBus) voiceBus.gain.value = vols.voice;
  }

  // ---------------------------------------------------------------
  // per-realm ambient arrangements
  //   plaza   — warm nostalgic pad, the original screensaver summer
  //   court   — darker, slower, celestial bells under the nebula
  //   terrace — brighter major-seventh daylight with a soft arpeggio
  // ---------------------------------------------------------------

  var padOsc = [], padFilter = null;
  var arpGain = null, bellGain = null;
  var arpTimer = 0, arpStep = 0, bellTimer = 4;
  var chordIdx = 0, chordTimer = 0;
  var zone = 'plaza';

  var ARRANGE = {
    plaza: {
      chords: [
        [220.00, 261.63, 329.63, 440.00],   // Am
        [174.61, 220.00, 261.63, 349.23],   // F
        [196.00, 261.63, 329.63, 392.00],   // C add9
        [196.00, 246.94, 293.66, 392.00]    // G
      ],
      chordLen: 8, filter: 900, padVol: 0.16, arp: 0, bell: 0
    },
    court: {
      chords: [
        [146.83, 174.61, 220.00, 293.66],   // Dm
        [116.54, 174.61, 233.08, 293.66],   // Bbmaj
        [130.81, 164.81, 196.00, 261.63],   // C/E
        [110.00, 164.81, 220.00, 261.63]    // Am
      ],
      chordLen: 11, filter: 470, padVol: 0.17, arp: 0, bell: 0.12
    },
    terrace: {
      chords: [
        [130.81, 196.00, 246.94, 329.63],   // Cmaj7
        [110.00, 164.81, 220.00, 261.63],   // Am7
        [87.31, 174.61, 220.00, 261.63],    // Fmaj7
        [98.00, 146.83, 196.00, 246.94]     // G6
      ],
      chordLen: 6, filter: 1500, padVol: 0.14, arp: 0.10, bell: 0
    }
  };

  function startAmbient() {
    if (started || !ctx) return;
    started = true;
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 900; padFilter.Q.value = 0.6;
    var padGain = ctx.createGain(); padGain.gain.value = 0.16;
    padFilter.connect(padGain); padGain.connect(musicBus);
    // filter breath
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 320;
    lfo.connect(lfoAmt); lfoAmt.connect(padFilter.frequency); lfo.start();

    for (var v = 0; v < 4; v++) {
      var pair = [];
      for (var d = 0; d < 2; d++) {
        var o = ctx.createOscillator();
        o.type = d === 0 ? 'triangle' : 'sawtooth';
        var og = ctx.createGain(); og.gain.value = d === 0 ? 0.5 : 0.12;
        o.detune.value = d === 0 ? -6 : 7;
        o.frequency.value = ARRANGE.plaza.chords[0][v];
        o.connect(og); og.connect(padFilter); o.start();
        pair.push(o);
      }
      padOsc.push(pair);
    }

    // layer buses (arp for the terrace, bells for the court)
    arpGain = ctx.createGain(); arpGain.gain.value = 0; arpGain.connect(musicBus);
    bellGain = ctx.createGain(); bellGain.gain.value = 0; bellGain.connect(musicBus);

    // faint tape hiss
    var hiss = ctx.createBufferSource();
    var hb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var hd = hb.getChannelData(0);
    for (var i = 0; i < hd.length; i++) hd[i] = (Math.random() * 2 - 1);
    hiss.buffer = hb; hiss.loop = true;
    var hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 5000;
    var hg = ctx.createGain(); hg.gain.value = 0.006;
    hiss.connect(hf); hf.connect(hg); hg.connect(musicBus); hiss.start();

    applyZone(true);
  }

  function setZoneMusic(z) {
    if (!ARRANGE[z] || z === zone) { zone = z in ARRANGE ? z : zone; return; }
    zone = z;
    chordIdx = 0; chordTimer = 0; arpStep = 0;
    if (started) applyZone(false);
  }

  function applyZone(hard) {
    var A = ARRANGE[zone], now = ctx.currentTime;
    for (var v = 0; v < 4; v++) for (var d = 0; d < 2; d++) {
      padOsc[v][d].frequency.setTargetAtTime(A.chords[0][v], now, hard ? 0.01 : 3.5);
    }
    padFilter.frequency.setTargetAtTime(A.filter, now, 4);
    arpGain.gain.setTargetAtTime(A.arp, now, 3);
    bellGain.gain.setTargetAtTime(A.bell, now, 3);
  }

  function update(dt, timeFlow, dilated) {
    if (!ctx || !started) return;
    var A = ARRANGE[zone];
    chordTimer += dt;
    if (chordTimer > A.chordLen) {
      chordTimer = 0;
      chordIdx = (chordIdx + 1) % A.chords.length;
      var now = ctx.currentTime;
      for (var v = 0; v < 4; v++) for (var d = 0; d < 2; d++) {
        padOsc[v][d].frequency.setTargetAtTime(A.chords[chordIdx][v], now, 2.5);
      }
    }

    // terrace arpeggio — a soft mall-fountain sparkle
    if (A.arp > 0) {
      arpTimer -= dt;
      if (arpTimer <= 0) {
        arpTimer = 0.24;
        var chord = A.chords[chordIdx];
        var note = chord[[0, 2, 1, 3, 2, 1][arpStep % 6]] * 4;
        arpStep++;
        pluck(note, 0.5, arpGain);
      }
    }
    // court bells — the celestial clock striking nothing in particular
    if (A.bell > 0) {
      bellTimer -= dt;
      if (bellTimer <= 0) {
        bellTimer = 5 + Math.random() * 6;
        var scale = [523.25, 587.33, 698.46, 783.99, 880.0];
        bell(scale[(Math.random() * scale.length) | 0], bellGain);
      }
    }

    // tempus shift darkens the whole mix
    var target = dilated ? 700 : 20000;
    lp.frequency.setTargetAtTime(target, ctx.currentTime, 0.15);

    // the tick-tock of the reawakening world (deeper in the court)
    if (timeFlow > 0.2) {
      tickTimer += dt * timeFlow;
      if (tickTimer >= 1.0) {
        tickTimer = 0; tickHi = !tickHi;
        var base = zone === 'court' ? 0.6 : 1;
        tick((tickHi ? 2100 : 1600) * base, 0.03 + timeFlow * 0.05);
      }
    }
  }

  function pluck(freq, vol, dest) {
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + 0.55);
  }

  function bell(freq, dest) {
    var t = ctx.currentTime;
    [1, 2.76, 5.4].forEach(function (h, i) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * h;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.5 / (i * 2 + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 - i * 0.5);
      o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + 2.5);
    });
  }

  // ---------------------------------------------------------------
  // animalese — Minuette's voice. One soft blip per revealed letter,
  // pitch drifting with the letter so words get little melodies.
  // ---------------------------------------------------------------

  function blipChar(ch, pitchBase) {
    if (!ctx) return;
    var c = ch.toLowerCase();
    if (!/[a-z0-9]/.test(c)) return;
    var idx = c.charCodeAt(0) - 97;
    if (idx < 0) idx = (c.charCodeAt(0) - 48) + 8;
    var base = pitchBase || 860;
    var f = base + ((idx * 37) % 260) + (Math.random() - 0.5) * 40;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.02;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    var g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(voiceBus);
    o.start(t); o.stop(t + 0.07); o2.start(t); o2.stop(t + 0.07);
  }

  // ---------------------------------------------------------------
  // sfx primitives
  // ---------------------------------------------------------------

  function tick(freq, vol) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.04);
  }

  function noiseBurst(dur, filterFreq, vol, type) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var src = ctx.createBufferSource(); src.buffer = b;
    var f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = filterFreq;
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
  }

  function blip(f0, f1, dur, vol, type) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------
  // named events
  // ---------------------------------------------------------------

  var api = {
    init: init, resume: resume, toggleMute: toggleMute, setVolumes: setVolumes,
    startAmbient: startAmbient, update: update, setZoneMusic: setZoneMusic,
    blipChar: blipChar, bell: bell, pluck: pluck,

    shoot: function () {
      noiseBurst(0.12, 2400, 0.5);
      blip(900, 120, 0.09, 0.35, 'square');
    },
    dryFire: function () { tick(700, 0.15); },
    reload: function () {
      blip(300, 500, 0.05, 0.2, 'square');
      setTimeout(function () { blip(500, 380, 0.05, 0.2, 'square'); }, 160);
      setTimeout(function () { blip(700, 900, 0.06, 0.25, 'square'); }, 340);
    },
    maskHit: function () {
      blip(1800 + Math.random() * 600, 300, 0.1, 0.3, 'triangle');
      noiseBurst(0.06, 5000, 0.12, 'highpass');
    },
    maskDie: function () {
      noiseBurst(0.5, 6000, 0.4, 'highpass');   // glass
      blip(1400, 200, 0.4, 0.2, 'sine');
    },
    orbFire: function () { blip(160, 700, 0.25, 0.18, 'sawtooth'); },
    hurt: function () {
      noiseBurst(0.18, 500, 0.5);
      blip(180, 60, 0.25, 0.4, 'sine');
    },
    pickupKey: function () {
      var seq = [523.25, 659.25, 783.99, 1046.5];
      seq.forEach(function (f, i) {
        setTimeout(function () { blip(f, f, 0.35, 0.22, 'triangle'); }, i * 110);
      });
    },
    pickupSand: function () { blip(600, 1200, 0.2, 0.18, 'sine'); },
    dilateOn: function () { blip(800, 90, 0.5, 0.2, 'sine'); },
    dilateOff: function () { blip(120, 800, 0.35, 0.18, 'sine'); },
    portal: function () {
      var seq = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
      seq.forEach(function (f, i) {
        setTimeout(function () { blip(f, f * 1.01, 1.2, 0.16, 'triangle'); }, i * 200);
      });
    },
    chime: function () { // clocks waking
      blip(880, 878, 0.9, 0.15, 'sine');
      setTimeout(function () { blip(659, 657, 1.1, 0.13, 'sine'); }, 350);
    },
    grandChime: function () { // the grandfather clock striking
      var seq = [659.25, 523.25, 587.33, 392.0];
      seq.forEach(function (f, i) {
        setTimeout(function () { bell(f); }, i * 550);
      });
    },
    dialHum: function () { blip(392, 396, 1.4, 0.08, 'sine'); },
    crtBlip: function () {
      blip(1200, 300, 0.12, 0.15, 'square');
      noiseBurst(0.08, 3000, 0.08, 'highpass');
    },
    sandFlip: function () {
      noiseBurst(0.6, 900, 0.25);
      blip(500, 700, 0.3, 0.12, 'sine');
    },
    uiOpen: function () { blip(600, 900, 0.12, 0.14, 'triangle'); },
    uiClose: function () { blip(900, 600, 0.12, 0.14, 'triangle'); },
    menuHover: function () { tick(1200, 0.06); },
    menuGo: function () { blip(440, 880, 0.2, 0.2, 'triangle'); }
  };
  return api;
})();

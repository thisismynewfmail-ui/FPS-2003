/* TEMPUS — audio. Everything is synthesized with WebAudio:
   a slow detuned vaporwave pad, a tick-tock that only exists while time
   flows, and 2003-flavored SFX. */

var AUDIO = (function () {
  var ctx = null, master = null, musicBus = null, sfxBus = null, lp = null;
  var muted = false, started = false;
  var tickTimer = 0, tickHi = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.55;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000;
    lp.connect(master); master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(lp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0; sfxBus.connect(lp);
  }

  function resume() { init(); if (ctx.state === 'suspended') ctx.resume(); }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.55;
    return muted;
  }

  // ---------- ambient pad ----------
  // Am — F — C — G, eight seconds a chord, detuned triangles through a
  // slowly breathing lowpass. The sound of a screensaver remembering summer.

  var padOsc = [];
  var chords = [
    [220.00, 261.63, 329.63, 440.00],       // Am
    [174.61, 220.00, 261.63, 349.23],       // F
    [196.00, 261.63, 329.63, 392.00],       // C  (Cadd9-ish voicing)
    [196.00, 246.94, 293.66, 392.00]        // G
  ];
  var chordIdx = 0, chordTimer = 0;

  function startAmbient() {
    if (started || !ctx) return;
    started = true;
    var padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 900; padFilter.Q.value = 0.6;
    var padGain = ctx.createGain(); padGain.gain.value = 0.16;
    padFilter.connect(padGain); padGain.connect(musicBus);
    // filter breath
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 420;
    lfo.connect(lfoAmt); lfoAmt.connect(padFilter.frequency); lfo.start();

    for (var v = 0; v < 4; v++) {
      var pair = [];
      for (var d = 0; d < 2; d++) {
        var o = ctx.createOscillator();
        o.type = d === 0 ? 'triangle' : 'sawtooth';
        var og = ctx.createGain(); og.gain.value = d === 0 ? 0.5 : 0.12;
        o.detune.value = d === 0 ? -6 : 7;
        o.frequency.value = chords[0][v];
        o.connect(og); og.connect(padFilter); o.start();
        pair.push(o);
      }
      padOsc.push(pair);
    }

    // faint tape hiss
    var hiss = ctx.createBufferSource();
    var hb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var hd = hb.getChannelData(0);
    for (var i = 0; i < hd.length; i++) hd[i] = (Math.random() * 2 - 1);
    hiss.buffer = hb; hiss.loop = true;
    var hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 5000;
    var hg = ctx.createGain(); hg.gain.value = 0.006;
    hiss.connect(hf); hf.connect(hg); hg.connect(musicBus); hiss.start();
  }

  function update(dt, timeFlow, dilated) {
    if (!ctx || !started) return;
    chordTimer += dt;
    if (chordTimer > 8) {
      chordTimer = 0;
      chordIdx = (chordIdx + 1) % chords.length;
      var now = ctx.currentTime;
      for (var v = 0; v < 4; v++) {
        for (var d = 0; d < 2; d++) {
          padOsc[v][d].frequency.setTargetAtTime(chords[chordIdx][v], now, 2.5);
        }
      }
    }
    // tempus shift darkens the whole mix
    var target = dilated ? 700 : 20000;
    lp.frequency.setTargetAtTime(target, ctx.currentTime, 0.15);

    // the tick-tock of the reawakening world
    if (timeFlow > 0.2) {
      tickTimer += dt * timeFlow;
      if (tickTimer >= 1.0) {
        tickTimer = 0; tickHi = !tickHi;
        tick(tickHi ? 2100 : 1600, 0.03 + timeFlow * 0.05);
      }
    }
  }

  // ---------- sfx primitives ----------

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

  // ---------- named events ----------

  var api = {
    init: init, resume: resume, toggleMute: toggleMute,
    startAmbient: startAmbient, update: update,

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
    menuHover: function () { tick(1200, 0.06); },
    menuGo: function () { blip(440, 880, 0.2, 0.2, 'triangle'); }
  };
  return api;
})();

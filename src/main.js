/* TEMPUS — Corridors of Eternity
   MERIDIAN SOFTWORKS ©2003 — beta 0.3, build 2003.07.14

   The Meridian Engine has seized. Somewhere outside the world the
   machinery of hours stands frozen at three minutes to midnight.
   You are the last WINDER. Recover the three Keys of the Hours —
   PAST, PRESENT, FUTURE — and wind the world again. The Custodians,
   reflections of every face that ever watched a clock, do not want
   time to resume. */

var GAME = (function () {

  var renderer, scene, camera, clock;
  var state = 'menu';           // menu | intro | play | dead | win | pause
  var worldData;
  var keysGot = 0;
  var timeScale = 1, tGlobal = 0;
  var playStart = 0;
  var lastZone = 'plaza';
  var winTriggered = false;

  var KEY_LINES = {
    present: ['KEY OF THE PRESENT', 'the pendulum remembers how to swing'],
    future:  ['KEY OF THE FUTURE', 'the stars resume their slow wheel'],
    past:    ['KEY OF THE PAST', 'the machine dreams of the sea again']
  };

  var INTRO_TEXT =
    'JULY 14, 2003\n\n' +
    'The MERIDIAN ENGINE has seized.\n' +
    'Somewhere outside the world, the machinery of hours\n' +
    'stands frozen at three minutes to midnight.\n\n' +
    'You are the last WINDER.\n' +
    'Recover the three KEYS OF THE HOURS — past, present, future —\n' +
    'climb the Meridian Stair, and wind the world again.\n\n' +
    'The CUSTODIANS — reflections of every face\n' +
    'that ever watched a clock — will try to stop you.\n\n' +
    'Do not step outside the pattern.';

  // ---------------------------------------------------------------

  function boot() {
    window.TEXTURES = TX.makeAll();

    var canvas = document.getElementById('game');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2600);
    scene.add(camera);

    resize();
    window.addEventListener('resize', resize);

    worldData = WORLD.build(scene, TEXTURES);
    ENEMIES.init(scene, TEXTURES);
    PLAYER.init(camera, scene);
    HUD.init();

    wireMenu();
    wireLock();

    document.addEventListener('keydown', function (e) {
      if (e.code === 'KeyM') {
        var m = AUDIO.toggleMute();
        HUD.message(m ? 'SOUND OFF' : 'SOUND ON', null, 1.2);
      }
    });

    clock = new THREE.Clock();
    requestAnimationFrame(loop);
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    // render soft and low like a 2003 demo disc, upscale with pixels intact
    var s = Math.min(0.72, 430 / h);
    renderer.setSize(Math.floor(w * s), Math.floor(h * s), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------
  // menu / intro flow
  // ---------------------------------------------------------------

  function wireMenu() {
    var mi = document.getElementById('mi-new');
    var resume = document.getElementById('mi-resume');
    [mi, resume].forEach(function (m) {
      m.addEventListener('mouseenter', function () { AUDIO.resume(); AUDIO.menuHover(); });
    });
    mi.addEventListener('click', function () {
      AUDIO.resume(); AUDIO.menuGo(); AUDIO.startAmbient();
      showIntro();
    });
    resume.addEventListener('click', function () {
      AUDIO.resume(); AUDIO.menuGo();
      enterPlay();
    });

    document.getElementById('intro').addEventListener('click', function () {
      if (state === 'intro') startNewGame();
    });
    document.getElementById('death').addEventListener('click', function () {
      if (state === 'dead') respawn();
    });
    document.getElementById('pause').addEventListener('click', function () {
      if (state === 'pause') enterPlay();
    });
    document.getElementById('win').addEventListener('click', function () {
      if (state === 'win') {
        document.getElementById('win').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('mi-resume').style.display = 'none';
        state = 'menu';
      }
    });
  }

  var introTimer = null;
  function showIntro() {
    state = 'intro';
    document.getElementById('menu').classList.add('hidden');
    var box = document.getElementById('intro');
    box.classList.remove('hidden');
    var target = document.getElementById('intro-text');
    target.textContent = '';
    var i = 0;
    clearInterval(introTimer);
    introTimer = setInterval(function () {
      i += 2;
      target.textContent = INTRO_TEXT.slice(0, i);
      if (i >= INTRO_TEXT.length) clearInterval(introTimer);
    }, 24);
  }

  function startNewGame() {
    clearInterval(introTimer);
    document.getElementById('intro').classList.add('hidden');
    keysGot = 0;
    winTriggered = false;
    HUD.resetKeys();
    ENEMIES.clearAll();
    PLAYER.reset(WORLD.ZONES.plaza.spawn);
    WORLD.setZone('plaza');
    lastZone = 'plaza';
    playStart = tGlobal;
    enterPlay();
    HUD.zoneTitle(WORLD.ZONES.plaza.title);
    HUD.message('FIND THE THREE KEYS OF THE HOURS', 'the clocks are waiting', 5);
  }

  function enterPlay() {
    state = 'play';
    ['menu', 'pause', 'death', 'win', 'intro'].forEach(function (id) {
      document.getElementById(id === 'death' ? 'death' : id).classList.add('hidden');
    });
    HUD.show(true);
    PLAYER.setEnabled(true);
    document.body.requestPointerLock =
      document.body.requestPointerLock || document.body.mozRequestPointerLock;
    document.body.requestPointerLock();
  }

  function wireLock() {
    document.addEventListener('pointerlockchange', function () {
      if (document.pointerLockElement === null && state === 'play') {
        state = 'pause';
        PLAYER.setEnabled(false);
        document.getElementById('pause').classList.remove('hidden');
        document.getElementById('mi-resume').style.display = 'block';
      }
    });
  }

  function onDeath() {
    state = 'dead';
    PLAYER.setEnabled(false);
    document.exitPointerLock();
    document.getElementById('death').classList.remove('hidden');
  }

  function respawn() {
    var z = WORLD.zoneAt(PLAYER.pos());
    document.getElementById('death').classList.add('hidden');
    ENEMIES.clearAll();
    PLAYER.reset(WORLD.ZONES[z].spawn);
    HUD.flashWhite(0.8);
    enterPlay();
  }

  function onWin() {
    winTriggered = true;
    state = 'win';
    PLAYER.setEnabled(false);
    document.exitPointerLock();
    AUDIO.portal();
    HUD.show(false);
    var mins = Math.floor((tGlobal - playStart) / 60);
    var secs = Math.floor((tGlobal - playStart) % 60);
    document.getElementById('win-body').innerHTML =
      'The stair takes your weight. The small Earth turns to meet you.<br>' +
      'Somewhere below, a pendulum finds its beat; sand falls; hands sweep.<br>' +
      'Three minutes to midnight becomes midnight, and midnight passes.<br><br>' +
      'custodians dispersed: ' + ENEMIES.kills +
      ' &nbsp;&middot;&nbsp; time to restart time: ' +
      mins + 'm ' + (secs < 10 ? '0' : '') + secs + 's';
    document.getElementById('win').classList.remove('hidden');
  }

  // ---------------------------------------------------------------
  // pickups / gates / portal
  // ---------------------------------------------------------------

  function checkInteractions(dt) {
    var p = PLAYER.pos();

    // keys
    worldData.keys.forEach(function (k) {
      if (k.taken) return;
      var dx = p.x - k.x, dy = (p.y + 1) - (k.y + 1.1), dz = p.z - k.z;
      if (dx * dx + dy * dy + dz * dz < 3.6) {
        k.taken = true;
        scene.remove(k.obj);
        keysGot++;
        HUD.giveKey(k.id);
        var line = KEY_LINES[k.id];
        HUD.message(line[0] + ' ACQUIRED', line[1], 4);
        AUDIO.pickupKey();
        setTimeout(AUDIO.chime, 900);
        WORLD.addTimeFlow();
        if (keysGot >= 3) {
          setTimeout(function () {
            HUD.message('THE MERIDIAN STAIR AWAKENS', 'climb to the waiting world', 6);
            AUDIO.portal();
            WORLD.portal.setActive(true);
          }, 1800);
        }
      }
    });

    // sand
    worldData.sands.forEach(function (s) {
      if (s.taken) {
        s.respawn -= dt;
        if (s.respawn <= 0) { s.taken = false; s.obj.visible = true; }
        return;
      }
      var dx = p.x - s.x, dz = p.z - s.z;
      if (dx * dx + dz * dz < 2.2 && Math.abs(p.y - s.y) < 2.2) {
        if (PLAYER.hp < 100) {
          s.taken = true; s.respawn = 40; s.obj.visible = false;
          PLAYER.heal(30);
          AUDIO.pickupSand();
          HUD.message('SAND OF HOURS', '+30 vitality', 1.6);
        }
      }
    });

    // gates
    worldData.gates.forEach(function (g) {
      var dx = p.x - g.x, dz = p.z - g.z;
      if (dx * dx + dz * dz < g.r * g.r) {
        HUD.flashWhite(0.9);
        PLAYER.teleport(g.dest[0], g.dest[1], g.dest[2], g.look);
        WORLD.setZone(g.to);
        lastZone = g.to;
        HUD.zoneTitle(WORLD.ZONES[g.to].title);
        HUD.message('', WORLD.ZONES[g.to].sub, 3);
      }
    });

    // walking between plaza and court
    var z = WORLD.zoneAt(p);
    if (z !== lastZone && z !== 'terrace' && lastZone !== 'terrace') {
      lastZone = z;
      HUD.zoneTitle(WORLD.ZONES[z].title);
      HUD.message('', WORLD.ZONES[z].sub, 3);
    }

    // the ascent
    if (keysGot >= 3 && !winTriggered) {
      var pp = WORLD.portalPos;
      var dx = p.x - pp.x, dz = p.z - pp.z;
      if (dx * dx + dz * dz < 6.5 && p.y > 3.2) onWin();
    }
  }

  // ---------------------------------------------------------------
  // loop
  // ---------------------------------------------------------------

  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    tGlobal += dt;

    // bullet-time easing
    var targetScale = (state === 'play' && PLAYER.dilated) ? 0.3 : 1;
    timeScale += (targetScale - timeScale) * Math.min(1, dt * 8);
    var wdt = dt * timeScale;

    if (state === 'play' || state === 'dead') {
      WORLD.update(tGlobal, wdt);
      ENEMIES.update(wdt, tGlobal, PLAYER.pos(), keysGot, state === 'play' && !PLAYER.dead);
    } else {
      // menus still breathe behind the letterbox
      WORLD.update(tGlobal, dt * 0.3);
    }

    if (state === 'play') {
      PLAYER.update(dt, tGlobal);
      checkInteractions(dt);
    }

    AUDIO.update(dt, WORLD.timeFlow, state === 'play' && PLAYER.dilated);
    HUD.update(dt);

    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------

  window.addEventListener('load', boot);

  return {
    onDeath: onDeath,
    get state() { return state; },
    get keysGot() { return keysGot; },
    get keysData() {
      return worldData.keys.map(function (k) {
        return { id: k.id, taken: k.taken, x: k.x, y: k.y, z: k.z };
      });
    }
  };
})();

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
  var state = 'menu';           // menu | intro | play | dead | win | pause | dialogue
  var worldData;
  var keysGot = 0;
  var timeScale = 1, tGlobal = 0;
  var playStart = 0;
  var lastZone = 'plaza';
  var winTriggered = false;
  var lastKills = 0, lastHp = 100, hurtChatterCd = 0;
  var clockChimeCd = 0, hourglassCd = 0;
  var npcBubbleEl, interactEl;
  var projV = new THREE.Vector3();
  var hostOk = false, pendingSave = null, autosaveT = 45;

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

    // Minuette wakes beside the floor dial, where the present pools
    NPC.build(scene);
    NPC.place(4.5, 0, 3.5, Math.PI);
    SETTINGS.init();
    DIALOGUE.init();
    npcBubbleEl = document.getElementById('npc-bubble');
    interactEl = document.getElementById('interact-prompt');

    wireMenu();
    wireLock();

    document.addEventListener('keydown', function (e) {
      if (e.code === 'KeyM') {
        var m = AUDIO.toggleMute();
        HUD.message(m ? 'SOUND OFF' : 'SOUND ON', null, 1.2);
      }
      if (e.code === 'KeyE') {
        if (state === 'play') tryInteract();
        else if (state === 'dialogue') DIALOGUE.close();
      }
      if (e.code === 'Backquote') {
        if (state === 'play' || state === 'dev') toggleDev();
      }
      if (e.code === 'Escape') {
        if (state === 'dialogue') DIALOGUE.close();
        else if (state === 'dev') toggleDev();
        else if (state === 'pause' && SETTINGS.isOpen()) SETTINGS.hide();
      }
    });

    wireDev();
    detectHost();

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
    document.getElementById('pi-resume').addEventListener('click', function () {
      if (state === 'pause') { SETTINGS.hide(); enterPlay(); }
    });
    document.getElementById('pi-settings').addEventListener('click', function () {
      if (state === 'pause') { AUDIO.menuGo(); SETTINGS.show(); }
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
    NPC.place(4.5, 0, 3.5, Math.PI);
    NPC.setMode('idle');
    lastKills = ENEMIES.kills; lastHp = 100;
    clockChimeCd = 0; hourglassCd = 0;
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
        SETTINGS.hide();
        document.getElementById('pause').classList.remove('hidden');
        document.getElementById('mi-resume').style.display = 'block';
      }
    });
    // if a re-lock was refused by the browser, a click brings it back
    document.getElementById('viewport').addEventListener('click', function () {
      if (state === 'play' && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    });
  }

  // ---------------------------------------------------------------
  // interactions — E on Minuette and the timepieces
  // ---------------------------------------------------------------

  function interactCandidate() {
    var p = PLAYER.pos();
    var list = [];
    var dN = NPC.pos.distanceTo(p);
    if (dN < 3.4) list.push({ d: dN, label: 'talk to <b>Minuette</b>', act: openDialogue });
    var dC = Math.hypot(p.x - (-6), p.z - (-8));
    if (dC < 3.6) {
      list.push({
        d: dC,
        label: clockChimeCd > 0 ? 'the clock is resting...' : 'wind the <b>grandfather clock</b>',
        act: function () {
          if (clockChimeCd > 0) return;
          clockChimeCd = 45;
          WORLD.props.clock.userData.chime();
          PLAYER.refillTempus(100);
          HUD.message('THE CLOCK LENDS YOU ITS MINUTES', 'tempus restored', 2.6);
          DIALOGUE.onEvent('idle', 'The Winder wound the grandfather clock and it chimed.');
        }
      });
    }
    var dH = Math.hypot(p.x - (-63), p.z - 0);
    if (dH < 3.8) {
      list.push({
        d: dH,
        label: hourglassCd > 0 ? 'the sand is still settling...' : 'turn the <b>great hourglass</b>',
        act: function () {
          if (hourglassCd > 0) return;
          if (WORLD.props.hourglass.userData.flip()) {
            hourglassCd = 25;
            PLAYER.heal(15);
            HUD.message('BORROWED SAND', '+15 vitality', 2.2);
            DIALOGUE.onEvent('idle', 'The Winder turned the great hourglass by hand.');
          }
        }
      });
    }
    if (!list.length) return null;
    list.sort(function (a, b) { return a.d - b.d; });
    return list[0];
  }

  function tryInteract() {
    var c = interactCandidate();
    if (c) c.act();
  }

  function openDialogue() {
    if (state !== 'play') return;
    state = 'dialogue';
    PLAYER.setEnabled(false);
    document.exitPointerLock();
    interactEl.classList.add('hidden');
    DIALOGUE.openMenu();
  }

  function closeDialogue() {
    if (state !== 'dialogue') return;
    enterPlay();
  }

  // ---------------------------------------------------------------
  // developer console (` / ~)
  // ---------------------------------------------------------------

  function devLog(s) {
    document.getElementById('dev-log').textContent = '> ' + s;
  }

  function toggleDev() {
    var el = document.getElementById('devconsole');
    if (state === 'play') {
      state = 'dev';
      PLAYER.setEnabled(false);
      document.exitPointerLock();
      el.classList.remove('hidden');
      devLog('console open. the engine is listening.');
    } else if (state === 'dev') {
      el.classList.add('hidden');
      enterPlay();
    }
  }

  function wireDev() {
    document.getElementById('dev-spawn').addEventListener('click', function () {
      ENEMIES.setSpawning(!ENEMIES.spawning);
      var sp = document.getElementById('dev-spawn-state');
      sp.textContent = ENEMIES.spawning ? 'ON' : 'OFF';
      sp.classList.toggle('off', !ENEMIES.spawning);
      devLog('custodian spawning ' + (ENEMIES.spawning ? 'enabled.' : 'disabled — the sky empties.'));
    });
    document.getElementById('dev-keys').addEventListener('click', function () {
      worldData.keys.forEach(function (k) {
        if (k.taken) return;
        k.taken = true;
        scene.remove(k.obj);
        keysGot++;
        HUD.giveKey(k.id);
        WORLD.addTimeFlow();
      });
      if (keysGot >= 3) WORLD.portal.setActive(true);
      devLog('all keys granted. timeflow ' + Math.round(WORLD.timeFlow * 100) + '%.');
    });
    document.getElementById('dev-heal').addEventListener('click', function () {
      PLAYER.heal(100); PLAYER.refillTempus(100);
      devLog('vitality and tempus restored.');
    });
    document.getElementById('dev-save').addEventListener('click', function () {
      saveGame('dev', function (ok, at) {
        devLog(ok ? 'world saved to host at ' + at + '.' : 'no host — run ./tempus.run to keep saves.');
      });
    });
  }

  // ---------------------------------------------------------------
  // savegames (via the tempus.run LAN host)
  // ---------------------------------------------------------------

  function detectHost() {
    fetch('/api/ping').then(function (r) { return r.json(); }).then(function (j) {
      hostOk = !!j.ok;
      return fetch('/api/load');
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.exists && j.save && j.save.v === 1) {
        pendingSave = j.save;
        var mi = document.getElementById('mi-load');
        mi.classList.remove('mi-dead');
        mi.textContent = 'CONTINUE — ' + (pendingSave.savedAt || 'saved world');
        mi.addEventListener('click', function () {
          AUDIO.resume(); AUDIO.menuGo(); AUDIO.startAmbient();
          document.getElementById('menu').classList.add('hidden');
          startFromSave();
        });
      }
    }).catch(function () { hostOk = false; });
  }

  function collectSave() {
    var p = PLAYER.pos();
    return {
      v: 1,
      keysTaken: worldData.keys.filter(function (k) { return k.taken; })
        .map(function (k) { return k.id; }),
      timeFlow: WORLD.timeFlow,
      zone: WORLD.zone,
      pos: [p.x, p.y, p.z],
      hp: PLAYER.hp, tempus: PLAYER.tempus,
      npc: {
        mode: NPC.mode,
        pos: [NPC.pos.x, NPC.pos.y, NPC.pos.z]
      },
      playTime: Math.round(tGlobal - playStart),
      kills: ENEMIES.kills
    };
  }

  function saveGame(reason, cb) {
    if (!hostOk) { if (cb) cb(false); return; }
    if (state !== 'play' && state !== 'dialogue' && state !== 'dev' && reason !== 'win') {
      if (cb) cb(false); return;
    }
    fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectSave())
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (cb) cb(true, j.savedAt);
    }).catch(function () { if (cb) cb(false); });
  }

  function startFromSave() {
    if (!pendingSave) return;
    var s = pendingSave;
    keysGot = 0;
    winTriggered = false;
    HUD.resetKeys();
    ENEMIES.clearAll();
    PLAYER.reset(WORLD.ZONES.plaza.spawn);
    lastKills = ENEMIES.kills;
    clockChimeCd = 0; hourglassCd = 0;

    (s.keysTaken || []).forEach(function (id) {
      worldData.keys.forEach(function (k) {
        if (k.id === id && !k.taken) {
          k.taken = true;
          scene.remove(k.obj);
          keysGot++;
          HUD.giveKey(k.id);
        }
      });
    });
    WORLD.setTimeFlow(typeof s.timeFlow === 'number' ? s.timeFlow : 0.12);
    if (keysGot >= 3) WORLD.portal.setActive(true);

    var zone = WORLD.ZONES[s.zone] ? s.zone : 'plaza';
    WORLD.setZone(zone);
    lastZone = zone;
    var pos = (s.pos && s.pos.length === 3) ? s.pos : WORLD.ZONES[zone].spawn;
    PLAYER.teleport(pos[0], pos[1] + 0.1, pos[2], 0);
    PLAYER.applySave(s);
    lastHp = PLAYER.hp;

    if (s.npc && s.npc.pos) NPC.place(s.npc.pos[0], s.npc.pos[1], s.npc.pos[2], 0);
    NPC.setMode(s.npc && s.npc.mode === 'follow' ? 'follow' :
                s.npc && s.npc.mode === 'wait' ? 'wait' : 'idle');

    playStart = tGlobal - (s.playTime || 0);
    enterPlay();
    HUD.zoneTitle(WORLD.ZONES[zone].title);
    HUD.message('THE WORLD REMEMBERS YOU', 'continued from the host\'s chronicle', 4);
    DIALOGUE.onEvent(null, 'The Winder returned after being away.');
  }

  function onDeath() {
    state = 'dead';
    PLAYER.setEnabled(false);
    if (DIALOGUE.isOpen) DIALOGUE.close();
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
    saveGame('win');
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
        DIALOGUE.onEvent('key', 'The Winder recovered the Key of the ' +
          k.id.charAt(0).toUpperCase() + k.id.slice(1) + '.');
        saveGame('key');
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
        DIALOGUE.onEvent(g.to, 'They passed through the gate to ' + WORLD.ZONES[g.to].title + '.');
        saveGame('gate');
      }
    });

    // walking between plaza and court
    var z = WORLD.zoneAt(p);
    if (z !== lastZone && z !== 'terrace' && lastZone !== 'terrace') {
      lastZone = z;
      AUDIO.setZoneMusic(z);
      HUD.zoneTitle(WORLD.ZONES[z].title);
      HUD.message('', WORLD.ZONES[z].sub, 3);
      DIALOGUE.onEvent(z, 'They walked into ' + WORLD.ZONES[z].title + '.');
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

    if (state === 'play' || state === 'dead' || state === 'dialogue') {
      WORLD.update(tGlobal, wdt);
      ENEMIES.update(wdt, tGlobal, PLAYER.pos(), keysGot, state === 'play' && !PLAYER.dead);
    } else {
      // menus still breathe behind the letterbox
      WORLD.update(tGlobal, dt * 0.3);
    }

    if (state === 'play') {
      PLAYER.update(dt, tGlobal);
      checkInteractions(dt);
      updateAmbient(dt);
    }

    // Minuette lives outside time — she keeps her own seconds
    if (state === 'play' || state === 'dialogue' || state === 'pause') {
      NPC.update(dt, tGlobal, PLAYER.pos());
      DIALOGUE.update(dt);
      positionBubble();
    }

    AUDIO.update(dt, WORLD.timeFlow, state === 'play' && PLAYER.dilated);
    HUD.update(dt);

    renderer.render(scene, camera);
  }

  // per-frame ambient systems: prompts, the dial's regard, event chatter
  function updateAmbient(dt) {
    var p = PLAYER.pos();

    clockChimeCd = Math.max(0, clockChimeCd - dt);
    hourglassCd = Math.max(0, hourglassCd - dt);
    hurtChatterCd = Math.max(0, hurtChatterCd - dt);

    // the host quietly chronicles the world
    autosaveT -= dt;
    if (autosaveT <= 0) { autosaveT = 45; saveGame('auto'); }

    // interact prompt
    var c = interactCandidate();
    if (c) {
      interactEl.innerHTML = '<b>E</b> &mdash; ' + c.label;
      interactEl.classList.remove('hidden');
    } else {
      interactEl.classList.add('hidden');
    }

    // the floor dial regards whoever stands upon it
    var dial = WORLD.props.dial;
    if (dial) {
      var dx = p.x - dial.position.x, dz = p.z - dial.position.z;
      if (dx * dx + dz * dz < Math.pow(dial.userData.radius * 0.95, 2)) {
        dial.userData.setAttract(Math.atan2(dx, -dz));
      } else {
        dial.userData.setAttract(null);
      }
    }

    // world events → her little remarks & memories
    if (ENEMIES.kills > lastKills) {
      lastKills = ENEMIES.kills;
      DIALOGUE.onEvent('kill', 'A custodian was shattered by the Winder.');
    }
    if (PLAYER.hp < lastHp - 4 && hurtChatterCd <= 0) {
      hurtChatterCd = 20;
      DIALOGUE.onEvent('hurt', 'The Winder was struck and hurt.');
    }
    lastHp = PLAYER.hp;
  }

  // project her voice bubble to the screen, over her head
  function positionBubble() {
    if (npcBubbleEl.classList.contains('hidden')) return;
    NPC.headWorldPos(projV);
    var dist = projV.distanceTo(camera.position);
    projV.project(camera);
    if (projV.z > 1 || dist > 30) { npcBubbleEl.style.opacity = 0; return; }
    npcBubbleEl.style.opacity = 1;
    npcBubbleEl.style.left = ((projV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    npcBubbleEl.style.top = ((-projV.y * 0.5 + 0.5) * window.innerHeight - 16) + 'px';
  }

  // ---------------------------------------------------------------

  window.addEventListener('load', boot);

  return {
    onDeath: onDeath, closeDialogue: closeDialogue, tryInteract: tryInteract,
    openDialogue: openDialogue,
    get state() { return state; },
    get keysGot() { return keysGot; },
    get keysData() {
      return worldData.keys.map(function (k) {
        return { id: k.id, taken: k.taken, x: k.x, y: k.y, z: k.z };
      });
    }
  };
})();

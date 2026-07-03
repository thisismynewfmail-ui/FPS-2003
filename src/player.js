/* TEMPUS — the last Winder.
   Pointer-lock FPS controller with 2003 platform physics, the PEARL
   sidearm (white marble and gold, a live watch-gear spinning on its
   slide), and the tempus shift — an hourglass of borrowed seconds. */

var PLAYER = (function () {

  var camera, scene;
  var enabled = false;

  // state
  var feet = new THREE.Vector3(0, 1, 12);
  var vel = new THREE.Vector3();
  var yaw = 0, pitch = 0;         // yaw 0 faces -z (north)
  var grounded = false;
  var hp = 100, maxHp = 100;
  var dead = false;

  // tempus
  var tempus = 100, dilated = false;

  // weapon
  var gun, gunGear, muzzle, flashSprite, flashLight;
  var mag = 12, MAG_SIZE = 12;
  var cooldown = 0, reloading = 0, recoil = 0;
  var bobT = 0;

  // input
  var keysDown = {};
  var mouseDown = false, rmbDown = false;

  var EYE = 1.62, RADIUS = 0.45;
  var WALK = 6.2, SPRINT = 9.2, JUMP = 7.6, GRAV = 21;

  var tracers = [];

  function init(cam, sceneRef) {
    camera = cam; scene = sceneRef;
    buildGun();

    document.addEventListener('keydown', function (e) {
      keysDown[e.code] = true;
      if (!enabled) return;
      if (e.code === 'KeyR') startReload();
    });
    document.addEventListener('keyup', function (e) { keysDown[e.code] = false; });

    document.addEventListener('mousemove', function (e) {
      if (!enabled || document.pointerLockElement === null) return;
      yaw -= e.movementX * 0.0021;
      pitch -= e.movementY * 0.0021;
      pitch = Math.max(-1.45, Math.min(1.45, pitch));
    });
    document.addEventListener('mousedown', function (e) {
      if (!enabled) return;
      if (e.button === 0) mouseDown = true;
      if (e.button === 2) rmbDown = true;
    });
    document.addEventListener('mouseup', function (e) {
      if (e.button === 0) mouseDown = false;
      if (e.button === 2) rmbDown = false;
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  // ---------------------------------------------------------------
  // the PEARL
  // ---------------------------------------------------------------

  function buildGun() {
    var M = PROPS.M();
    gun = new THREE.Group();

    var slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.42), M.whiteMarbleBright);
    slide.position.set(0, 0, -0.1);
    gun.add(slide);

    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 8), M.gold);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, -0.38);
    gun.add(barrel);

    var ringB = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 12), M.gold);
    ringB.position.set(0, 0.005, -0.3);
    gun.add(ringB);

    var grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.22, 0.1), M.wood);
    grip.position.set(0, -0.14, 0.05);
    grip.rotation.x = 0.28;
    gun.add(grip);

    var guard = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10, Math.PI), M.gold);
    guard.position.set(0, -0.075, -0.03);
    guard.rotation.z = Math.PI;
    gun.add(guard);

    // the living gear — proof the weapon still keeps its own time
    gunGear = new THREE.Group();
    var gr = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 5, 10), M.gold);
    gunGear.add(gr);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.012), M.gold);
      tooth.position.set(Math.cos(a) * 0.046, Math.sin(a) * 0.046, 0);
      tooth.rotation.z = a;
      gunGear.add(tooth);
    }
    gunGear.position.set(0.052, 0.01, -0.02);
    gunGear.rotation.y = Math.PI / 2;
    gun.add(gunGear);

    // muzzle anchor + flash
    muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.005, -0.5);
    gun.add(muzzle);

    flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TX.tex(TEXTURES.portal), color: 0xffdf90, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    flashSprite.scale.setScalar(0.5);
    muzzle.add(flashSprite);
    flashLight = new THREE.PointLight(0xffc060, 0, 8);
    muzzle.add(flashLight);

    gun.scale.setScalar(0.55);
    gun.position.set(0.23, -0.2, -0.42);
    camera.add(gun);
  }

  // ---------------------------------------------------------------
  // combat
  // ---------------------------------------------------------------

  var raycaster = new THREE.Raycaster();

  function tryShoot() {
    if (cooldown > 0 || reloading > 0) return;
    if (mag <= 0) { AUDIO.dryFire(); cooldown = 0.3; return; }
    mag--; cooldown = 0.17; recoil = 1;
    AUDIO.shoot();

    // flash
    flashSprite.material.opacity = 0.9;
    flashSprite.material.rotation = Math.random() * 6;
    flashLight.intensity = 2.2;

    // hitscan with a whisper of spread
    var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    dir.x += (Math.random() - 0.5) * 0.012;
    dir.y += (Math.random() - 0.5) * 0.012;
    dir.normalize();
    var origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    raycaster.set(origin, dir);
    raycaster.far = 160;

    var hit = ENEMIES.hitTest(raycaster);
    var end;
    if (hit && hit.enemy) {
      end = hit.point;
      ENEMIES.damage(hit.enemy, 10 + (Math.random() * 4 | 0), hit.point);
    } else {
      end = origin.clone().addScaledVector(dir, 90);
    }
    spawnTracer(end);
    HUD.setAmmo(mag);
    if (mag === 0) startReload();
  }

  function spawnTracer(end) {
    var from = new THREE.Vector3();
    muzzle.getWorldPosition(from);
    var geo = new THREE.BufferGeometry().setFromPoints([from, end]);
    var mat = new THREE.LineBasicMaterial({
      color: 0xffe0a0, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var line = new THREE.Line(geo, mat);
    scene.add(line);
    tracers.push({ line: line, life: 0.09 });
  }

  function startReload() {
    if (reloading > 0 || mag === MAG_SIZE) return;
    reloading = 1.25;
    AUDIO.reload();
  }

  function damage(dmg) {
    if (dead) return;
    hp = Math.max(0, hp - dmg);
    HUD.setHealth(hp);
    HUD.damageFlash();
    AUDIO.hurt();
    if (hp <= 0) { dead = true; if (window.GAME) GAME.onDeath(); }
  }

  function heal(amt) {
    hp = Math.min(maxHp, hp + amt);
    HUD.setHealth(hp);
  }

  // ---------------------------------------------------------------
  // per-frame
  // ---------------------------------------------------------------

  function update(dt, t) {
    // tempus shift bookkeeping happens even while airborne
    var wantDilate = rmbDown && enabled && !dead;
    if (!dilated && wantDilate && tempus > 15) { dilated = true; AUDIO.dilateOn(); }
    if (dilated && (!wantDilate || tempus <= 0)) { dilated = false; AUDIO.dilateOff(); }
    if (dilated) tempus = Math.max(0, tempus - dt * 26);
    else tempus = Math.min(100, tempus + dt * 9);
    HUD.setTempus(tempus, dilated);

    if (!enabled) return;

    // ----- movement -----
    var pdt = dilated ? dt * 0.8 : dt;   // the Winder moves through honeyed time
    var fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    var right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    var wish = new THREE.Vector3();
    if (keysDown['KeyW'] || keysDown['ArrowUp']) wish.add(fwd);
    if (keysDown['KeyS'] || keysDown['ArrowDown']) wish.sub(fwd);
    if (keysDown['KeyD'] || keysDown['ArrowRight']) wish.add(right);
    if (keysDown['KeyA'] || keysDown['ArrowLeft']) wish.sub(right);
    var moving = wish.lengthSq() > 0;
    if (moving) wish.normalize();
    var speed = (keysDown['ShiftLeft'] || keysDown['ShiftRight']) ? SPRINT : WALK;

    var accel = grounded ? 42 : 9;
    vel.x += (wish.x * speed - vel.x) * Math.min(1, accel * pdt / speed) * (moving || grounded ? 1 : 0);
    vel.z += (wish.z * speed - vel.z) * Math.min(1, accel * pdt / speed) * (moving || grounded ? 1 : 0);
    if (grounded && !moving) { vel.x *= Math.max(0, 1 - 12 * pdt); vel.z *= Math.max(0, 1 - 12 * pdt); }

    if (grounded && keysDown['Space']) { vel.y = JUMP; grounded = false; }
    if (!grounded) vel.y -= GRAV * pdt;

    feet.x += vel.x * pdt;
    feet.z += vel.z * pdt;
    feet.y += vel.y * pdt;

    WORLD.collide(feet, RADIUS);

    var gh = WORLD.groundHeight(feet.x, feet.z, feet.y);
    if (gh > -Infinity && feet.y <= gh + 0.02 && vel.y <= 0) {
      feet.y = gh; vel.y = 0; grounded = true;
    } else {
      grounded = false;
    }

    // fell out of the corridors
    if (feet.y < -70) {
      damage(30);
      if (!dead) {
        var z = WORLD.zoneAt(feet);
        var sp = WORLD.ZONES[z].spawn;
        teleport(sp[0], sp[1], sp[2], yaw);
        HUD.flashWhite(0.6);
        HUD.message('THE HOURS CAUGHT YOU', 'do not step outside the pattern', 2.4);
      }
    }

    // ----- camera -----
    bobT += (moving && grounded ? pdt * speed : 0);
    var bobY = Math.sin(bobT * 1.6) * 0.035;
    camera.position.set(feet.x, feet.y + EYE + bobY, feet.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch - recoil * 0.03);

    // ----- weapon -----
    cooldown = Math.max(0, cooldown - dt);
    recoil = Math.max(0, recoil - dt * 7);
    if (reloading > 0) {
      reloading -= dt;
      var rph = 1 - Math.max(0, reloading / 1.25);
      gun.position.y = -0.2 - Math.sin(rph * Math.PI) * 0.14;
      gun.rotation.z = Math.sin(rph * Math.PI) * 0.7;
      if (reloading <= 0) { mag = MAG_SIZE; HUD.setAmmo(mag); }
    } else {
      gun.rotation.z = 0;
      gun.position.y = -0.2 + Math.sin(bobT * 3.2) * 0.008;
      gun.position.x = 0.23 + Math.cos(bobT * 1.6) * 0.006;
    }
    gun.position.z = -0.42 + recoil * 0.06;
    gunGear.rotation.z += dt * (2 + WORLD.timeFlow * 6);

    flashSprite.material.opacity *= Math.pow(0.001, dt * 8);
    flashLight.intensity *= Math.pow(0.001, dt * 8);

    if (mouseDown) tryShoot();

    // tracers decay
    for (var i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.09);
      if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); }
    }
  }

  function teleport(x, y, z, newYaw) {
    feet.set(x, y, z);
    vel.set(0, 0, 0);
    if (newYaw !== undefined) yaw = newYaw;
    camera.position.set(feet.x, feet.y + EYE, feet.z);
  }

  function reset(spawn) {
    hp = maxHp; dead = false; tempus = 100; dilated = false;
    mag = MAG_SIZE; reloading = 0; cooldown = 0;
    teleport(spawn[0], spawn[1], spawn[2], 0);
    yaw = 0; pitch = 0;  // yaw 0 faces -z, up the north walkway
    HUD.setHealth(hp); HUD.setAmmo(mag);
  }

  return {
    init: init, update: update, reset: reset, teleport: teleport,
    damage: damage, heal: heal,
    pos: function () { return feet; },
    setEnabled: function (on) { enabled = on; mouseDown = false; rmbDown = false; },
    setYaw: function (v) { yaw = v; },
    get hp() { return hp; },
    get dead() { return dead; },
    get dilated() { return dilated; },
    get tempus() { return tempus; }
  };
})();

/* TEMPUS — the Custodians.
   "Every face that ever watched a clock." Chrome masks etched with
   circuitry, replicated down the sky in receding ranks (plate II).
   They exist outside time — the tempus shift slows them, the keys
   anger them. */

var ENEMIES = (function () {

  var scene, T;
  var list = [];        // active custodians
  var orbs = [];        // enemy projectiles
  var shards = [];      // death debris
  var maskMat, orbMat, orbGlowTex;
  var spawnTimer = 3, graceTimer = 14;
  var killCount = 0;

  function init(sceneRef, textures) {
    scene = sceneRef; T = textures;
    maskMat = new THREE.MeshPhongMaterial({
      map: TX.tex(T.circuit), shininess: 140, specular: 0xffffff,
      emissive: 0x0d1f1a
    });
    orbMat = new THREE.MeshBasicMaterial({ color: 0xff70d8 });
    orbGlowTex = TX.tex(T.portal);
  }

  // ---------------------------------------------------------------
  // mask construction
  // ---------------------------------------------------------------

  function buildMask(scale, elite) {
    var root = new THREE.Group();
    var face = new THREE.Group();        // lookAt points +z at the player
    root.add(face);

    var sph = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), maskMat);
    sph.rotation.y = -Math.PI / 2;       // painted features face +z
    sph.scale.set(0.78, 1.12, 0.55);
    sph.castShadow = true;
    face.add(sph);

    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 6), maskMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.08, 0.58);
    face.add(nose);

    var brow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 12, Math.PI), maskMat);
    brow.position.set(0, 0.30, 0.42);
    brow.rotation.x = 0.35;
    face.add(brow);

    var lipU = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 5, 10, Math.PI), maskMat);
    lipU.position.set(0, -0.52, 0.44);
    lipU.rotation.x = 0.5;
    face.add(lipU);

    if (elite) {
      // a coronet of small gears for the prime custodian
      for (var i = 0; i < 5; i++) {
        var a = (i / 5 - 0.5) * Math.PI * 0.9;
        var stud = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), maskMat);
        stud.position.set(Math.sin(a) * 0.75, 0.9 + Math.cos(a) * 0.25, 0.15);
        face.add(stud);
      }
    }

    root.scale.setScalar(scale);
    root.traverse(function (o) { if (o.isMesh) o.userData.enemyRoot = root; });
    return root;
  }

  // ---------------------------------------------------------------
  // spawning
  // ---------------------------------------------------------------

  function spawn(playerPos, elite) {
    var scale = elite ? 2.4 : (0.85 + Math.random() * 0.6);
    var mask = buildMask(scale, elite);
    var a = Math.random() * Math.PI * 2;
    var r = 38 + Math.random() * 16;
    mask.position.set(
      playerPos.x + Math.cos(a) * r,
      playerPos.y + 8 + Math.random() * 12,
      playerPos.z + Math.sin(a) * r
    );
    scene.add(mask);
    var e = {
      obj: mask, hp: elite ? 110 : 30, elite: !!elite,
      state: 'approach',
      vel: new THREE.Vector3(),
      bobPh: Math.random() * 9,
      fireT: 2 + Math.random() * 2.5,
      orbitDir: Math.random() < 0.5 ? 1 : -1,
      hurtT: 0, scale: scale
    };
    mask.userData.enemy = e;
    list.push(e);
    return e;
  }

  // ---------------------------------------------------------------
  // per-frame
  // ---------------------------------------------------------------

  function update(dt, t, playerPos, keysGot, playerAlive) {
    // spawn director
    if (graceTimer > 0) { graceTimer -= dt; }
    else if (playerAlive) {
      spawnTimer -= dt;
      var budget = 2 + keysGot * 2;
      if (spawnTimer <= 0 && list.length < budget) {
        spawnTimer = 5.5 - keysGot * 0.8 + Math.random() * 3;
        var elite = keysGot >= 2 && Math.random() < 0.22 && !list.some(function (e) { return e.elite; });
        spawn(playerPos, elite);
        if (Math.random() < 0.35 + keysGot * 0.15 && list.length < budget) spawn(playerPos, false);
      }
    }

    // custodians
    for (var i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      var p = e.obj.position;
      var toP = new THREE.Vector3().subVectors(playerPos, p);
      var dist = toP.length();
      toP.normalize();

      e.hurtT = Math.max(0, e.hurtT - dt);

      var hoverDist = e.elite ? 16 : 11 + e.scale * 3;
      var speed = e.elite ? 5.5 : 7;

      if (e.state === 'approach') {
        e.vel.lerp(toP.clone().multiplyScalar(speed), dt * 1.5);
        if (dist < hoverDist) e.state = 'hover';
      } else {
        // hold the ring: orbit slowly, keep altitude a little above the player
        var tangent = new THREE.Vector3(-toP.z, 0, toP.x).multiplyScalar(e.orbitDir * 2.4);
        var radial = toP.clone().multiplyScalar((dist - hoverDist) * 0.6);
        var lift = new THREE.Vector3(0, (playerPos.y + 2.5 + Math.sin(t + e.bobPh) * 1.2 - p.y) * 0.8, 0);
        e.vel.lerp(tangent.add(radial).add(lift), dt * 2);
        if (dist > hoverDist * 2.2) e.state = 'approach';
      }

      p.addScaledVector(e.vel, dt);
      // bob — they breathe like a pendulum
      p.y += Math.sin(t * 1.7 + e.bobPh) * dt * 0.6;

      // face the player
      e.obj.lookAt(playerPos.x, playerPos.y, playerPos.z);
      // flinch
      if (e.hurtT > 0) {
        e.obj.rotation.z += Math.sin(e.hurtT * 40) * 0.12;
      }

      // fire
      if (playerAlive && dist < 46) {
        e.fireT -= dt;
        if (e.fireT <= 0) {
          e.fireT = (e.elite ? 2.2 : 3.2) + Math.random() * 1.6;
          fireOrb(e, playerPos);
          if (e.elite) {
            fireOrb(e, playerPos, 0.18);
            fireOrb(e, playerPos, -0.18);
          }
        }
      }
    }

    // orbs
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i];
      o.life -= dt;
      o.mesh.position.addScaledVector(o.vel, dt);
      o.spr.position.copy(o.mesh.position);
      var d = o.mesh.position.distanceTo(playerPos);
      var hit = playerAlive && d < 1.1;
      if (hit || o.life <= 0) {
        scene.remove(o.mesh); scene.remove(o.spr);
        orbs.splice(i, 1);
        if (hit && window.PLAYER) PLAYER.damage(o.dmg);
        continue;
      }
      o.spr.material.rotation += dt * 4;
    }

    // shards
    for (var i = shards.length - 1; i >= 0; i--) {
      var s = shards[i];
      s.life -= dt;
      s.vel.y -= 12 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spin * dt; s.mesh.rotation.y += s.spin * 1.3 * dt;
      s.mesh.material.opacity = Math.max(0, s.life / s.life0);
      if (s.life <= 0) { scene.remove(s.mesh); shards.splice(i, 1); }
    }
  }

  function fireOrb(e, playerPos, yaw) {
    var from = e.obj.position.clone();
    from.y -= 0.3 * e.scale;
    var dir = new THREE.Vector3().subVectors(playerPos, from).normalize();
    if (yaw) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), orbMat);
    mesh.position.copy(from);
    scene.add(mesh);
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: orbGlowTex, color: 0xff70d8, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.scale.setScalar(1.6);
    spr.position.copy(from);
    scene.add(spr);
    orbs.push({ mesh: mesh, spr: spr, vel: dir.multiplyScalar(13), life: 6, dmg: e.elite ? 14 : 9 });
    AUDIO.orbFire();
  }

  // ---------------------------------------------------------------
  // taking hits
  // ---------------------------------------------------------------

  function collectMeshes() {
    var arr = [];
    for (var i = 0; i < list.length; i++) {
      list[i].obj.traverse(function (o) { if (o.isMesh) arr.push(o); });
    }
    return arr;
  }

  function hitTest(raycaster) {
    var meshes = collectMeshes();
    if (!meshes.length) return null;
    var hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    var h = hits[0];
    var root = h.object.userData.enemyRoot;
    return { enemy: root ? root.userData.enemy : null, point: h.point, dist: h.distance };
  }

  function damage(e, dmg, point) {
    if (!e) return;
    e.hp -= dmg;
    e.hurtT = 0.25;
    burst(point, 4, 0x9adfc8, 0.4);
    AUDIO.maskHit();
    if (e.hp <= 0) kill(e);
  }

  function kill(e) {
    var idx = list.indexOf(e);
    if (idx >= 0) list.splice(idx, 1);
    burst(e.obj.position, e.elite ? 34 : 16, 0x9adfc8, 1.1 * e.scale, true);
    scene.remove(e.obj);
    killCount++;
    AUDIO.maskDie();
  }

  // mirror-shard burst
  function burst(pos, count, color, size, mirror) {
    for (var i = 0; i < count; i++) {
      var geo = new THREE.TetrahedronGeometry(0.09 * size + Math.random() * 0.12 * size, 0);
      var mat = mirror
        ? new THREE.MeshPhongMaterial({
            color: color, shininess: 150, specular: 0xffffff,
            transparent: true, opacity: 1
          })
        : new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
      var m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      scene.add(m);
      var v = new THREE.Vector3(
        (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8);
      var life = 0.5 + Math.random() * 0.7;
      shards.push({ mesh: m, vel: v, life: life, life0: life, spin: (Math.random() - 0.5) * 12 });
    }
  }

  function clearAll() {
    list.forEach(function (e) { scene.remove(e.obj); });
    orbs.forEach(function (o) { scene.remove(o.mesh); scene.remove(o.spr); });
    shards.forEach(function (s) { scene.remove(s.mesh); });
    list = []; orbs = []; shards = [];
    graceTimer = 10; spawnTimer = 3;
  }

  return {
    init: init, update: update, hitTest: hitTest, damage: damage,
    burst: burst, clearAll: clearAll, spawn: spawn,
    get count() { return list.length; },
    get kills() { return killCount; }
  };
})();

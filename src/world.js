/* TEMPUS — world assembly.
   Three places, one meditation:
     PLAZA OF HOURS   — measured time. Grandfather clock, hourglass, the
                        great floor dial stopped at three-to-midnight,
                        checkered days receding under arches without end.
     ASCENSION COURT  — celestial time. Sun pillar and rune clock beneath
                        a torn nebula; a marble stair climbing to a small
                        waiting Earth; the winding keys abandoned there.
     VENUS TERRACE    — remembered time. A daylight that no longer exists,
                        kept running on a CRT in a gazebo by the sea of
                        clouds: antiquity preserved inside the machine. */

var WORLD = (function () {

  var scene, T;
  var spaceGroup, terraceGroup, P;   // P = current build parent
  var platforms = [], ramps = [], colliders = [];
  var keys = [], sands = [], gates = [];
  var propRefs = {};             // named interactive props for main.js
  var portal = null, portalPos = new THREE.Vector3();
  var stars, spaceSkyMesh, venusDome;
  var lights = {};
  var timeFlow = 0.12;

  var ZONES = {
    plaza:   { title: 'THE PLAZA OF HOURS',  sub: 'where the clocks stopped',       spawn: [0, 1.7, 12] },
    court:   { title: 'THE ASCENSION COURT', sub: 'sun and moon keep silent watch', spawn: [0, 1.7, -114] },
    terrace: { title: 'THE VENUS TERRACE',   sub: 'a daylight that no longer exists', spawn: [1000, 1.7, 27] }
  };

  function plat(x1, z1, x2, z2, y) { platforms.push({ x1: x1, z1: z1, x2: x2, z2: z2, y: y }); }
  function coll(x, z, r) { colliders.push({ x: x, z: z, r: r }); }

  // a floating slab whose top face sits at y=top
  function slab(x1, z1, x2, z2, top, mat, thick, noWalk) {
    var w = x2 - x1, d = z2 - z1;
    thick = thick || 1.4;
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), mat);
    m.position.set((x1 + x2) / 2, top - thick / 2, (z1 + z2) / 2);
    m.receiveShadow = true; m.castShadow = false;
    P.add(m);
    if (!noWalk) plat(x1, z1, x2, z2, top);
    return m;
  }

  function addColonnade(xz, count, spacing, width, colH) {
    var c = PROPS.colonnade(count, spacing, width, colH, PROPS.M().pinkMarble);
    c.position.set(xz.x, xz.y || 0, xz.z);
    if (xz.ry) c.rotation.y = xz.ry;
    P.add(c);
    // colliders for each column pair
    for (var i = 0; i < count; i++) {
      var lx = -width / 2, rx = width / 2, lz = -i * spacing;
      var p1 = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), xz.ry || 0);
      var p2 = new THREE.Vector3(rx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), xz.ry || 0);
      coll(xz.x + p1.x, xz.z + p1.z, 0.5);
      coll(xz.x + p2.x, xz.z + p2.z, 0.5);
    }
  }

  // ---------------------------------------------------------------

  function build(sceneRef, textures) {
    scene = sceneRef; T = textures;
    PROPS.init(T);
    var M = PROPS.M();

    // zone visibility groups — the terrace is another when, not another where;
    // only one is rendered at a time and gates cut between them
    spaceGroup = new THREE.Group();
    terraceGroup = new THREE.Group();
    terraceGroup.visible = false;
    scene.add(spaceGroup, terraceGroup);
    P = spaceGroup;

    // shared checker floor material with world-scale repeat via per-slab UV:
    // simplest 2003 trick — clone material per slab size
    function checkerMat(w, d) {
      var m = new THREE.MeshPhongMaterial({
        map: TX.tex(T.checkerFloor, w / 8, d / 8), shininess: 60, specular: 0x664444
      });
      return m;
    }
    function checkerSlab(x1, z1, x2, z2, top) {
      return slab(x1, z1, x2, z2, top, checkerMat(x2 - x1, z2 - z1));
    }

    P = spaceGroup;
    buildSpaceSky();
    buildPlaza(checkerSlab, M);
    buildCourt(checkerSlab, M);
    P = terraceGroup;
    buildTerrace(M);
    P = spaceGroup;

    buildLights();

    return {
      platforms: platforms, ramps: ramps, colliders: colliders,
      keys: keys, sands: sands, gates: gates,
      portalPos: portalPos, zones: ZONES
    };
  }

  // ---------------------------------------------------------------
  // skies
  // ---------------------------------------------------------------

  function buildSpaceSky() {
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x05030e, 0.0009);

    var skyMat = new THREE.MeshBasicMaterial({
      map: TX.tex(T.spaceSky), side: THREE.BackSide, fog: false, depthWrite: false
    });
    spaceSkyMesh = new THREE.Mesh(new THREE.SphereGeometry(820, 32, 20), skyMat);
    // nebula is painted at u=0.75 which lands due north (-z), over the court
    P.add(spaceSkyMesh);

    // wheeling stars — the oldest clock of all
    var starGeo = new THREE.BufferGeometry();
    var n = 1400, posArr = new Float32Array(n * 3);
    var rnd = TX.mulberry(2003);
    for (var i = 0; i < n; i++) {
      var th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1);
      var r = 650 + rnd() * 120;
      posArr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      posArr[i * 3 + 1] = Math.abs(r * Math.cos(ph)) - 60; // mostly above
      posArr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false,
      transparent: true, opacity: 0.85
    }));
    P.add(stars);

    // the colossal Earth behind the plaza (plate I)
    var be = PROPS.bigEarth(130);
    be.position.set(-210, 10, -290);
    P.add(be);

    // crescent moon over the court (plate III)
    var moon = PROPS.crescentMoon();
    moon.position.set(38, 62, -205);
    P.add(moon);
  }

  function buildTerraceSky() {
    var mat = new THREE.MeshBasicMaterial({
      map: TX.tex(T.venusSky), side: THREE.BackSide, fog: false, depthWrite: false
    });
    venusDome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), mat);
    venusDome.position.set(1000, 20, 0);
    P.add(venusDome);
  }

  // ---------------------------------------------------------------
  // zone I — Plaza of Hours
  // ---------------------------------------------------------------

  function buildPlaza(checkerSlab, M) {
    // main platform + four walkways
    checkerSlab(-22, -22, 22, 22, 0);
    checkerSlab(-4, -120, 4, -22, 0);    // north → court
    checkerSlab(22, -4, 88, 4, 0);       // east → gate to terrace
    checkerSlab(-70, -4, -22, 4, 0);     // west → hourglass overlook
    checkerSlab(-4, 22, 4, 42, 0);       // south stub

    // colonnades marching down the walkways — corridors of eternity
    addColonnade({ x: 0, z: -26, ry: 0 }, 16, 6, 9.4, 5.2);
    addColonnade({ x: 26, z: 0, ry: Math.PI / 2 }, 10, 6.2, 9.4, 5.2);
    addColonnade({ x: -26, z: 0, ry: -Math.PI / 2 }, 7, 6.2, 9.4, 5.2);
    addColonnade({ x: 0, z: 26, ry: Math.PI }, 3, 6.2, 9.4, 5.2);

    // grandfather clock, watching the dial
    var gc = PROPS.grandfatherClock();
    gc.position.set(-6, 0, -8); gc.rotation.y = 0.5;
    gc.scale.setScalar(1.35);
    P.add(gc); coll(-6, -8, 1.3);
    propRefs.clock = gc;

    // the great hourglass on its overlook
    var hg = PROPS.hourglassProp(2.4);
    hg.position.set(-63, 0, 0);
    P.add(hg); coll(-63, 0, 1.8);
    propRefs.hourglass = hg;
    // small shrine arches around it
    var ha = PROPS.arch(7, 6.4, M.pinkMarble);
    ha.position.set(-63, 0, -3.4); P.add(ha);
    var ha2 = PROPS.arch(7, 6.4, M.pinkMarble);
    ha2.position.set(-63, 0, 3.4); P.add(ha2);

    // floor dial, stopped at 11:57
    var fd = PROPS.floorDial(4.2);
    fd.position.set(8, 0, 7);
    P.add(fd);
    propRefs.dial = fd;

    // Key of the Present — beside the grandfather clock
    addKey('present', -10, 0, -14);

    // sand pickups
    addSand(-63, 0, -6);
    addSand(14, 0, -14);

    // floating gears — loose change of a broken engine
    for (var i = 0; i < 5; i++) {
      var gear = makeGear(1 + Math.random() * 1.5);
      gear.position.set(
        (Math.random() - 0.5) * 90,
        6 + Math.random() * 14,
        (Math.random() - 0.5) * 90
      );
      P.add(gear);
    }

    // gate to the terrace at the east walkway's end
    var gate = PROPS.gateArch(8, 7);
    gate.position.set(86, 0, 0);
    gate.rotation.y = Math.PI / 2;
    P.add(gate);
    gates.push({
      x: 86, z: 0, r: 3.2, to: 'terrace',
      dest: [1000, 1.7, 27], look: 0 // face north (toward gazebo)
    });

    // a broken column by the south stub
    var bc = PROPS.brokenColumn();
    bc.position.set(2.5, 0, 36); P.add(bc); coll(2.5, 36, 0.7);
  }

  function makeGear(s) {
    var g = new THREE.Group();
    var M = PROPS.M();
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 * s, 0.09 * s, 6, 18), M.gold);
    g.add(ring);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.16 * s, 0.1 * s), M.gold);
      tooth.position.set(Math.cos(a) * 0.62 * s, Math.sin(a) * 0.62 * s, 0);
      tooth.rotation.z = a;
      g.add(tooth);
      if (i % 2 === 0) {
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.06 * s, 0.05 * s), M.gold);
        spoke.rotation.z = a; g.add(spoke);
      }
    }
    var ph = Math.random() * 9, sp = (Math.random() - 0.5);
    PROPS.reg(function (t, dt, flow) {
      g.rotation.z += dt * sp * (0.1 + flow);
      g.position.y += Math.sin(t * 0.5 + ph) * dt * 0.3;
      g.rotation.y += dt * 0.07;
    });
    return g;
  }

  // ---------------------------------------------------------------
  // zone II — Ascension Court
  // ---------------------------------------------------------------

  function buildCourt(checkerSlab, M) {
    // plus-shaped platform
    checkerSlab(-15, -150, 15, -120, 0);            // central
    checkerSlab(-34, -140, -15, -130, 0);           // west arm
    checkerSlab(15, -140, 34, -130, 0);             // east arm

    // colonnades along west & east arms, receding into the dark
    addColonnade({ x: -17, z: -135, ry: -Math.PI / 2 }, 3, 6, 9.0, 5.0);
    addColonnade({ x: 17, z: -135, ry: Math.PI / 2 }, 3, 6, 9.0, 5.0);
    // and framing the entry from the south
    addColonnade({ x: 0, z: -122, ry: 0 }, 2, 6, 9.4, 5.2);

    // sun pillar (west) and rune clock (east)
    var sun = PROPS.sunStatue();
    sun.position.set(-26, 0, -135);
    sun.rotation.y = -Math.PI / 2;    // the sun regards the court
    P.add(sun); coll(-26, -135, 0.9);

    var rc = PROPS.runeClock();
    rc.position.set(26, 0, -135);
    rc.rotation.y = Math.PI / 2;      // and the rune clock faces it back
    P.add(rc); coll(26, -135, 0.9);

    // the meridian stair, ascending north to the waiting Earth
    var stair = PROPS.earthStair();
    stair.group.position.set(0, 0, -150);
    P.add(stair.group);
    portal = stair;
    portalPos.set(0, 4, -158);
    // walkable ramp + top platform
    ramps.push({ x1: -2.5, z1: -158.6, x2: 2.5, z2: -150, yAtZ2: 0, yAtZ1: 3.78 });
    plat(-1.7, -162.3, 1.7, -158.6, 3.78);

    // Key of the Future — cast down before the stair, as in the plate
    addKey('future', -8, 0, -126);

    addSand(11, 0, -146);
    addSand(-30, 0, -132);

    // the second stub column from plate III
    var bc = PROPS.brokenColumn();
    bc.position.set(10, 0, -128); P.add(bc); coll(10, -128, 0.7);
  }

  // ---------------------------------------------------------------
  // zone III — Venus Terrace
  // ---------------------------------------------------------------

  function buildTerrace(M) {
    buildTerraceSky();

    // endless pale marble ground
    var groundMat = new THREE.MeshPhongMaterial({
      map: TX.tex(T.whiteMarble, 90, 90), shininess: 70, specular: 0x887788
    });
    var ground = new THREE.Mesh(new THREE.CircleGeometry(400, 40), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(1000, 0, 0);
    ground.receiveShadow = true;
    P.add(ground);
    plat(650, -350, 1350, 350, 0);

    // distant mountain(s)
    var mMat = new THREE.MeshLambertMaterial({ color: 0xcfa8b8, fog: true });
    var mtn = new THREE.Mesh(new THREE.ConeGeometry(90, 95, 9), mMat);
    mtn.position.set(830, 30, -190);
    P.add(mtn);
    var mtn2 = new THREE.Mesh(new THREE.ConeGeometry(60, 55, 8), mMat);
    mtn2.position.set(1210, 12, -240);
    P.add(mtn2);

    // the gazebo shrine
    var gz = PROPS.gazebo();
    gz.position.set(1000, 0, 0);
    P.add(gz);
    var span = 7.5;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (cn) {
      coll(1000 + cn[0] * span / 2, cn[1] * span / 2, 0.7);
    });
    // plinth steps (walkable)
    plat(994, -6, 1006, 6, 0.6);
    plat(994.8, -5.2, 1005.2, 5.2, 1.1);

    // the machine that remembers
    var pc = PROPS.crtComputer();
    pc.position.set(1000, 1.1, -0.6);
    pc.rotation.y = 0;
    P.add(pc);
    coll(1000, -0.6, 1.6);

    // pink checkered runner, half unrolled toward the shrine
    var carpet = PROPS.carpetRoll(16, 3.4);
    carpet.position.set(1000, 0.02, 22);
    P.add(carpet);

    // palms leaning over the shrine
    var palmSpots = [
      [1008, -4, 7.5], [1010.5, 1.5, 6.2], [1007, 4.5, 5.4],
      [993, -6, 6.8], [1004, -8.5, 5.8], [996.5, 7.5, 4.9]
    ];
    palmSpots.forEach(function (p, i) {
      var palm = PROPS.palmTree(p[2], 100 + i * 17);
      palm.position.set(p[0], 0, p[1]);
      P.add(palm); coll(p[0], p[1], 0.4);
    });

    // potted plants & urns
    var pots = [[997.4, 6.4, 1.5], [1002.6, 6.4, 1.5], [994.5, -0.5, 1.2],
                [1005.5, -0.5, 1.2], [999, 8.6, 1.0], [1001.5, 8.6, 1.0],
                [995, 8.2, 1.3], [1005, 8.2, 1.3]];
    pots.forEach(function (p) {
      var pot = PROPS.pottedPlant(p[2]);
      pot.position.set(p[0], p[1] > 6 ? 0 : 0.6, p[1]);
      // pots on the ground unless near plinth
      if (Math.abs(p[0] - 1000) < 6 && Math.abs(p[1]) < 6) pot.position.y = 0.6;
      else pot.position.y = 0;
      pot.position.x = p[0]; pot.position.z = p[1];
      P.add(pot);
    });

    // Key of the Past — resting before the screen
    addKey('past', 1000, 1.35, 2.6);

    addSand(1010, 0, 12);

    // the way home
    var gate = PROPS.gateArch(8, 7);
    gate.position.set(1000, 0, 32);
    P.add(gate);
    gates.push({
      x: 1000, z: 32, r: 3.2, to: 'plaza',
      dest: [80, 1.7, 0], look: Math.PI / 2   // face west, back down the walkway
    });

    // the low remembered sun, glaring off the marble sea (plate IV)
    var sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TX.tex(T.portal), color: 0xfff2da, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    sunSpr.position.set(940, 42, 190);
    sunSpr.scale.set(150, 150, 1);
    P.add(sunSpr);
    var sunSpr2 = new THREE.Sprite(sunSpr.material.clone());
    sunSpr2.material.opacity = 0.35;
    sunSpr2.position.copy(sunSpr.position);
    sunSpr2.scale.set(420, 90, 1);
    P.add(sunSpr2);

    // drifting cloud billboards low over the marble sea
    var cloudMat = new THREE.SpriteMaterial({
      map: TX.tex(T.portal), color: 0xf4e4f2, transparent: true, opacity: 0.5,
      depthWrite: false
    });
    for (var i = 0; i < 14; i++) {
      var spr = new THREE.Sprite(cloudMat.clone());
      var a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 190;
      spr.position.set(1000 + Math.cos(a) * r, 8 + Math.random() * 40, Math.sin(a) * r);
      spr.scale.set(40 + Math.random() * 50, 10 + Math.random() * 12, 1);
      spr.material.opacity = 0.16 + Math.random() * 0.2;
      P.add(spr);
      (function (s, sp) {
        PROPS.reg(function (t, dt, flow) {
          s.position.x += dt * sp * (0.3 + flow);
          if (s.position.x > 1330) s.position.x = 670;
        });
      })(spr, 1 + Math.random() * 2);
    }
  }

  // ---------------------------------------------------------------
  // pickups
  // ---------------------------------------------------------------

  function addKey(id, x, y, z) {
    var k = PROPS.windingKey();
    k.position.set(x, y, z);
    scene.add(k);
    keys.push({ id: id, obj: k, x: x, y: y, z: z, taken: false });
  }

  function addSand(x, y, z) {
    var s = PROPS.sandPickup();
    s.position.set(x, y, z);
    scene.add(s);
    sands.push({ obj: s, x: x, y: y, z: z, taken: false, respawn: 0 });
  }

  // ---------------------------------------------------------------
  // lights
  // ---------------------------------------------------------------

  function buildLights() {
    // — space zones —
    lights.spaceAmbient = new THREE.AmbientLight(0x50466e, 0.9);
    scene.add(lights.spaceAmbient);

    lights.sun = new THREE.DirectionalLight(0xffe2b8, 1.15);
    lights.sun.position.set(-60, 38, 45);   // low warm light → long arch shadows
    lights.sun.castShadow = true;
    lights.sun.shadow.mapSize.set(2048, 2048);
    lights.sun.shadow.camera.left = -70; lights.sun.shadow.camera.right = 70;
    lights.sun.shadow.camera.top = 70; lights.sun.shadow.camera.bottom = -70;
    lights.sun.shadow.camera.near = 1; lights.sun.shadow.camera.far = 400;
    lights.sun.shadow.bias = -0.0006;
    scene.add(lights.sun);
    scene.add(lights.sun.target);

    // cool violet counter-light from the nebula
    lights.nebula = new THREE.DirectionalLight(0x8050c0, 0.25);
    lights.nebula.position.set(20, 30, -80);
    scene.add(lights.nebula);

    // — terrace —
    lights.hemi = new THREE.HemisphereLight(0xbfa8e8, 0xe8dce0, 0.75);
    lights.hemi.visible = false;
    scene.add(lights.hemi);

    lights.terraceSun = new THREE.DirectionalLight(0xfff0d8, 1.0);
    lights.terraceSun.position.set(940, 60, 80);
    lights.terraceSun.target.position.set(1000, 0, 0);
    lights.terraceSun.castShadow = true;
    lights.terraceSun.shadow.mapSize.set(2048, 2048);
    lights.terraceSun.shadow.camera.left = -50; lights.terraceSun.shadow.camera.right = 50;
    lights.terraceSun.shadow.camera.top = 50; lights.terraceSun.shadow.camera.bottom = -50;
    lights.terraceSun.shadow.camera.near = 1; lights.terraceSun.shadow.camera.far = 300;
    lights.terraceSun.shadow.bias = -0.0006;
    lights.terraceSun.visible = false;
    scene.add(lights.terraceSun);
    scene.add(lights.terraceSun.target);
  }

  var currentZone = 'plaza';

  function setZone(zone) {
    currentZone = zone;
    AUDIO.setZoneMusic(zone);
    var space = zone !== 'terrace';
    spaceGroup.visible = space;
    terraceGroup.visible = !space;
    lights.spaceAmbient.visible = space;
    lights.sun.visible = space;
    lights.nebula.visible = space;
    lights.hemi.visible = !space;
    lights.terraceSun.visible = !space;
    if (space) {
      scene.background = new THREE.Color(0x020208);
      scene.fog = new THREE.FogExp2(0x05030e, 0.0009);
    } else {
      scene.background = new THREE.Color(0xc3a4cc);
      scene.fog = new THREE.Fog(0xd8bcd8, 80, 380);
    }
  }

  function zoneAt(p) {
    if (p.x > 500) return 'terrace';
    if (p.z < -110) return 'court';
    return 'plaza';
  }

  // ---------------------------------------------------------------
  // ground & collision queries
  // ---------------------------------------------------------------

  var STEP_UP = 0.75;

  function groundHeight(x, z, y) {
    var best = -Infinity;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (x >= p.x1 && x <= p.x2 && z >= p.z1 && z <= p.z2) {
        if (p.y <= y + STEP_UP && p.y > best) best = p.y;
      }
    }
    for (var i = 0; i < ramps.length; i++) {
      var r = ramps[i];
      if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) {
        var t = (z - r.z2) / (r.z1 - r.z2);
        var ry = r.yAtZ2 + (r.yAtZ1 - r.yAtZ2) * t;
        if (ry <= y + STEP_UP + 0.4 && ry > best) best = ry;
      }
    }
    return best;
  }

  function collide(pos, radius) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var dx = pos.x - c.x, dz = pos.z - c.z;
      var d2 = dx * dx + dz * dz, min = c.r + radius;
      if (d2 < min * min && d2 > 1e-6) {
        var d = Math.sqrt(d2);
        pos.x = c.x + dx / d * min;
        pos.z = c.z + dz / d * min;
      }
    }
  }

  // ---------------------------------------------------------------

  function update(t, dt) {
    PROPS.updateAll(t, dt, timeFlow);
    if (stars) stars.rotation.z = 0; // keep axis fixed
    if (stars) stars.rotation.y += dt * (0.0015 + timeFlow * 0.006);
    // shadow camera follows the player between plaza & court
    if (lights.sun && lights.sun.visible && window.PLAYER) {
      var px = Math.round(PLAYER.pos().x / 8) * 8;
      var pz = Math.round(PLAYER.pos().z / 8) * 8;
      lights.sun.target.position.set(px, 0, pz);
      lights.sun.position.set(px - 60, 38, pz + 45);
    }
  }

  function addTimeFlow() {
    timeFlow = Math.min(1, timeFlow + 0.293);
    return timeFlow;
  }

  function setTimeFlow(v) {
    timeFlow = Math.max(0, Math.min(1, v));
  }

  return {
    build: build, update: update, setZone: setZone, zoneAt: zoneAt,
    groundHeight: groundHeight, collide: collide,
    addTimeFlow: addTimeFlow, setTimeFlow: setTimeFlow,
    get timeFlow() { return timeFlow; },
    get portal() { return portal; },
    get portalPos() { return portalPos; },
    get zone() { return currentZone; },
    get props() { return propRefs; },
    ZONES: ZONES
  };
})();

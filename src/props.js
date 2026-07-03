/* TEMPUS — props. Every timepiece and monument in the corridors.
   Builders return THREE.Groups and register animation hooks; all ambient
   motion is scaled by the world's timeFlow — the world literally wakes up
   as the Keys of the Hours are recovered. */

var PROPS = (function () {

  var M = {};        // shared materials
  var anims = [];    // { update(t, dt, flow) }
  var T;             // texture canvases

  function reg(fn) { anims.push(fn); }

  function updateAll(t, dt, flow) {
    for (var i = 0; i < anims.length; i++) anims[i](t, dt, flow);
  }

  function init(textures) {
    T = textures;
    M.checker = new THREE.MeshLambertMaterial({ map: TX.tex(T.checkerFloor, 1, 1) });
    M.redMarble = new THREE.MeshLambertMaterial({ map: TX.tex(T.redMarble, 1, 1) });
    M.grayMarble = new THREE.MeshLambertMaterial({ map: TX.tex(T.grayMarble, 1, 1) });
    M.pinkMarble = new THREE.MeshLambertMaterial({ map: TX.tex(T.pinkMarble, 1, 2) });
    M.whiteMarble = new THREE.MeshLambertMaterial({ map: TX.tex(T.whiteMarble, 1, 1) });
    M.whiteMarbleBright = new THREE.MeshPhongMaterial({
      map: TX.tex(T.whiteMarble, 1, 1), shininess: 30, specular: 0x555555
    });
    M.gold = new THREE.MeshPhongMaterial({
      map: TX.tex(T.gold, 1, 1), shininess: 90, specular: 0xffe0a0,
      emissive: 0x1a1000
    });
    M.wood = new THREE.MeshPhongMaterial({ map: TX.tex(T.wood, 1, 1), shininess: 40, specular: 0x442200 });
    M.stone = new THREE.MeshLambertMaterial({ map: TX.tex(T.stone, 1, 1) });
    M.darkMetal = new THREE.MeshPhongMaterial({ color: 0x22262c, shininess: 60, specular: 0x8899aa });
    M.beige = new THREE.MeshLambertMaterial({ color: 0xd8d0bc });
    M.beigeDark = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
    M.glass = new THREE.MeshPhongMaterial({
      color: 0xbfd8e8, transparent: true, opacity: 0.22, shininess: 120, specular: 0xffffff
    });
    M.sand = new THREE.MeshLambertMaterial({ color: 0xd8b060, emissive: 0x4a3410 });
    M.trunk = new THREE.MeshLambertMaterial({ map: TX.tex(T.wood, 1, 1), color: 0x8f6a48 });
    M.leafGreen = new THREE.MeshLambertMaterial({ color: 0x2f7030 });
  }

  function sh(mesh, cast, recv) {
    mesh.castShadow = cast !== false;
    mesh.receiveShadow = recv !== false;
    return mesh;
  }

  // ---------------------------------------------------------------
  // columns & arches — the corridors of eternity
  // ---------------------------------------------------------------

  function column(h, r, mat) {
    var g = new THREE.Group();
    var shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, 10), mat));
    shaft.position.y = h / 2;
    var base = sh(new THREE.Mesh(new THREE.BoxGeometry(r * 3, r * 0.9, r * 3), mat));
    base.position.y = r * 0.45;
    var cap = sh(new THREE.Mesh(new THREE.BoxGeometry(r * 2.6, r * 0.8, r * 2.6), mat));
    cap.position.y = h - r * 0.4;
    g.add(shaft, base, cap);
    return g;
  }

  // an arch pair spanning `width`, matching the thin round arches in the plates
  function arch(width, colH, mat) {
    var g = new THREE.Group();
    var r = 0.32;
    var cl = column(colH, r, mat); cl.position.x = -width / 2;
    var cr = column(colH, r, mat); cr.position.x = width / 2;
    var ring = sh(new THREE.Mesh(
      new THREE.TorusGeometry(width / 2, r * 0.85, 7, 16, Math.PI), mat));
    ring.position.y = colH - r * 0.4;
    g.add(cl, cr, ring);
    return g;
  }

  // a run of arches along the z axis (a colonnade walkway roof)
  function colonnade(count, spacing, width, colH, mat) {
    var g = new THREE.Group();
    for (var i = 0; i < count; i++) {
      var a = arch(width, colH, mat);
      a.position.z = -i * spacing;
      g.add(a);
    }
    return g;
  }

  // ---------------------------------------------------------------
  // the grandfather clock — measured time (plate I)
  // ---------------------------------------------------------------

  function grandfatherClock() {
    var g = new THREE.Group();

    var base = sh(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.9), M.wood));
    base.position.y = 0.25; g.add(base);

    var waist = sh(new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.62), M.wood));
    waist.position.y = 0.5 + 1.15; g.add(waist);

    // glass door showing the pendulum
    var door = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.9), M.glass);
    door.position.set(0, 1.7, 0.312); g.add(door);
    var doorFrame = sh(new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.05, 0.04), M.gold));
    doorFrame.position.set(0, 1.7, 0.30);
    // punch the middle visually by scaling a slim frame: use 4 strips instead
    doorFrame.visible = false;
    var strips = [
      [0, 2.66, 0.86, 0.06], [0, 0.78, 0.86, 0.06],
      [-0.4, 1.72, 0.06, 1.94], [0.4, 1.72, 0.06, 1.94]
    ];
    strips.forEach(function (s) {
      var m = sh(new THREE.Mesh(new THREE.BoxGeometry(s[2], s[3], 0.05), M.gold));
      m.position.set(s[0], s[1], 0.32); g.add(m);
    });

    // hood
    var hood = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 0.8), M.wood));
    hood.position.y = 2.8 + 0.65; g.add(hood);
    var crown = sh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 1.36, 14, 1, false, 0, Math.PI), M.wood));
    crown.rotation.z = Math.PI / 2;
    crown.rotation.x = 0;
    crown.position.y = 4.1;
    crown.scale.set(1, 1, 0.58);
    // orient half-cylinder to bulge upward
    crown.rotation.set(0, 0, Math.PI / 2);
    g.add(sh(crown));
    var finial = sh(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), M.gold));
    finial.position.y = 4.62; g.add(finial);

    // face
    var faceMat = new THREE.MeshLambertMaterial({ map: TX.tex(T.clockFace) });
    var face = new THREE.Mesh(new THREE.CircleGeometry(0.52, 24), faceMat);
    face.position.set(0, 3.45, 0.41); g.add(face);
    var bezel = sh(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 6, 24), M.gold));
    bezel.position.copy(face.position); g.add(bezel);

    // hands — frozen at 11:57, three minutes to the hour that never comes
    var hands = makeHands(g, new THREE.Vector3(0, 3.45, 0.43), 0.40, 0.28, 11 + 57 / 60);

    // pendulum
    var pend = new THREE.Group();
    pend.position.set(0, 2.7, 0.12);
    var rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), M.gold);
    rod.position.y = -0.75; pend.add(rod);
    var bob = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 16), M.gold);
    bob.rotation.x = Math.PI / 2; bob.position.y = -1.5; pend.add(bob);
    g.add(pend);

    // weights
    for (var i = -1; i <= 1; i += 2) {
      var w = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8), M.gold);
      w.position.set(i * 0.2, 1.5, 0.1); g.add(w);
    }

    var phase = Math.random() * 6;
    reg(function (t, dt, flow) {
      pend.rotation.z = Math.sin(t * 2.6 + phase) * 0.38 * flow;
      hands.advance(dt * flow);
    });
    return g;
  }

  // gold clock hands on a face; returns { advance(dtMinutesScale) }
  function makeHands(parent, pos, lenMin, lenHour, startHours) {
    var pivot = new THREE.Group(); pivot.position.copy(pos); parent.add(pivot);
    function hand(len, wid) {
      var hg = new THREE.Group();
      var m = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.015), M.gold);
      m.position.y = len / 2 - len * 0.12;
      hg.add(m); pivot.add(hg);
      return hg;
    }
    var minute = hand(lenMin, 0.028);
    var hour = hand(lenHour, 0.045);
    var hub = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), M.gold);
    pivot.add(hub);
    var timeH = startHours; // in hours
    function apply() {
      var mAng = (timeH % 1) * Math.PI * 2;
      var hAng = ((timeH / 12) % 1) * Math.PI * 2;
      minute.rotation.z = -mAng;
      hour.rotation.z = -hAng;
    }
    apply();
    return {
      advance: function (dt) {
        // one game-minute per real second at full flow: dreams run fast
        timeH += dt / 60;
        apply();
      }
    };
  }

  // ---------------------------------------------------------------
  // the hourglass — allotted time (plate I)
  // ---------------------------------------------------------------

  function hourglassProp(scale, noFlip) {
    var g = new THREE.Group();
    var inner = new THREE.Group(); // the part that flips
    g.add(inner);

    // wooden frame
    var top = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 12), M.wood));
    top.position.y = 1.52;
    var bot = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 12), M.wood));
    bot.position.y = 0.04;
    inner.add(top, bot);
    for (var i = 0; i < 3; i++) {
      var a = i / 3 * Math.PI * 2;
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.48, 6), M.wood);
      post.position.set(Math.cos(a) * 0.52, 0.78, Math.sin(a) * 0.52);
      inner.add(sh(post));
    }

    // glass bulbs (lathe) — a touch more present so they read against space
    var pts = [];
    var prof = [
      [0.06, 0.09], [0.30, 0.14], [0.42, 0.32], [0.44, 0.52], [0.34, 0.68],
      [0.06, 0.76], [0.06, 0.80], [0.34, 0.88], [0.44, 1.04], [0.42, 1.24],
      [0.30, 1.42], [0.06, 1.47]
    ];
    prof.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
    var glassMat = new THREE.MeshPhongMaterial({
      color: 0xcfe4f0, transparent: true, opacity: 0.34, shininess: 140,
      specular: 0xffffff, side: THREE.DoubleSide, depthWrite: false
    });
    var glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), glassMat);
    inner.add(glass);

    // sand: two cones + a stream
    var sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 12), M.sand);
    sandTop.rotation.x = Math.PI; // point down toward neck
    sandTop.position.y = 1.02;
    var sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 12), M.sand);
    sandBot.position.y = 0.24;
    var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 5), M.sand);
    stream.position.y = 0.78;
    inner.add(sandTop, sandBot, stream);

    g.scale.setScalar(scale || 1);

    var cyc = Math.random() * 30, flipT = -1;
    reg(function (t, dt, flow) {
      if (flipT >= 0) {                       // mid-flip
        flipT += dt * 1.6;
        var e = Math.min(1, flipT);
        inner.rotation.z = Math.PI * (1 - Math.cos(e * Math.PI)) / 2;
        if (e >= 1) { inner.rotation.z = 0; flipT = -1; cyc = 0; }
        return;
      }
      cyc += dt * flow;
      var f = Math.min(1, cyc / 45);          // 45s of sand at full flow
      sandTop.scale.setScalar(Math.max(0.02, 1 - f));
      sandTop.position.y = 0.86 + (1 - f) * 0.16;
      sandBot.scale.setScalar(Math.max(0.02, 0.2 + f * 0.8));
      stream.visible = flow > 0.05 && f < 1;
      if (f >= 1 && !noFlip && flow > 0.05) flipT = 0;
    });
    return g;
  }

  // ---------------------------------------------------------------
  // the floor dial — the great gold clock set into the plaza (plate I)
  // ---------------------------------------------------------------

  function floorDial(radius) {
    var g = new THREE.Group();
    var ringMat = new THREE.MeshPhongMaterial({
      map: TX.tex(T.dialRing), transparent: true, shininess: 100,
      specular: 0xfff0c0, emissive: 0x201400
    });
    var plate = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), ringMat);
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = 0.02;
    g.add(plate);

    // raised outer rim
    var rim = sh(new THREE.Mesh(new THREE.TorusGeometry(radius * 0.86, 0.09, 8, 48), M.gold), true, false);
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.05; g.add(rim);

    // hub
    var hub = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.16, 10), M.gold));
    hub.position.y = 0.08; g.add(hub);

    // hands lying flat, frozen at 11:57
    var pivot = new THREE.Group(); pivot.position.y = 0.07;
    pivot.rotation.x = -Math.PI / 2; g.add(pivot);
    function flatHand(len, wid) {
      var hg = new THREE.Group();
      var m = sh(new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.05), M.gold), true, false);
      m.position.y = len / 2 - len * 0.1;
      var tip = sh(new THREE.Mesh(new THREE.ConeGeometry(wid * 0.9, len * 0.12, 4), M.gold), true, false);
      tip.position.y = len * 0.96 - len * 0.1;
      hg.add(m, tip); pivot.add(hg);
      return hg;
    }
    var minute = flatHand(radius * 0.78, 0.10);
    var hour = flatHand(radius * 0.5, 0.14);
    var timeH = 11 + 57 / 60;
    function apply() {
      minute.rotation.z = -(timeH % 1) * Math.PI * 2;
      hour.rotation.z = -((timeH / 12) % 1) * Math.PI * 2;
    }
    apply();
    reg(function (t, dt, flow) { timeH += dt * flow / 60; apply(); });
    return g;
  }

  // ---------------------------------------------------------------
  // the sun pillar — celestial day (plate III, left)
  // ---------------------------------------------------------------

  function sunFaceCanvas() {
    var c = TX.canvas(128, 128), ctx = c.getContext('2d');
    ctx.drawImage(T.stone, 0, 0);
    ctx.strokeStyle = 'rgba(60,50,30,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    // serene closed eyes
    ctx.beginPath(); ctx.arc(46, 56, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(82, 56, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // brows
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(46, 52, 14, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(82, 52, 14, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    // nose
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(64, 58); ctx.lineTo(61, 76); ctx.lineTo(67, 78); ctx.stroke();
    // lips
    ctx.beginPath(); ctx.arc(64, 88, 10, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(64, 84, 12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    return c;
  }

  function sunStatue() {
    var g = new THREE.Group();
    var col = column(4.4, 0.42, M.whiteMarble);
    g.add(col);

    var head = new THREE.Group();
    head.position.y = 5.9;
    // disc
    var disc = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.3, 24), M.stone));
    disc.rotation.x = Math.PI / 2;
    head.add(disc);
    // face bulge
    var faceMat = new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(sunFaceCanvas()) });
    var face = sh(new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), faceMat));
    face.rotation.x = -Math.PI / 2;
    face.scale.set(1, 0.55, 1);
    face.position.z = 0.12;
    head.add(face);
    // rays: alternate straight spikes and wavy flames
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2;
      var long = i % 2 === 0;
      var ray = sh(new THREE.Mesh(
        new THREE.ConeGeometry(long ? 0.16 : 0.2, long ? 1.15 : 0.7, 5), M.stone));
      ray.position.set(Math.cos(a) * (1.15 + (long ? 0.55 : 0.33)),
                       Math.sin(a) * (1.15 + (long ? 0.55 : 0.33)), 0);
      ray.rotation.z = a - Math.PI / 2;
      if (!long) ray.rotation.x = 0.35; // flame lean
      head.add(ray);
    }
    g.add(head);

    reg(function (t, dt, flow) {
      head.rotation.y = Math.sin(t * 0.15) * 0.22 * flow; // the sun slowly regards the plaza
    });
    return g;
  }

  // ---------------------------------------------------------------
  // the rune clock & crescent moon — celestial night (plate III, right)
  // ---------------------------------------------------------------

  function runeClock() {
    var g = new THREE.Group();
    var col = column(4.6, 0.42, M.whiteMarble);
    col.rotation.z = -0.1;                    // subtly wrong, like the plate
    g.add(col);

    var head = new THREE.Group();
    head.position.set(0.45, 5.5, 0);
    head.rotation.z = -0.16;

    var faceMat = new THREE.MeshLambertMaterial({ map: TX.tex(T.runeFace) });
    var disc = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.18, 24), faceMat));
    disc.rotation.x = Math.PI / 2;
    head.add(disc);
    var face = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), faceMat);
    face.position.z = 0.10; head.add(face);
    var bezel = sh(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 6, 26), M.gold));
    bezel.position.z = 0.0; head.add(bezel);
    // zigzag teeth around the bezel
    for (var i = 0; i < 20; i++) {
      var a = i / 20 * Math.PI * 2;
      var tooth = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 4), M.gold);
      tooth.position.set(Math.cos(a) * 1.22, Math.sin(a) * 1.22, 0);
      tooth.rotation.z = a - Math.PI / 2;
      head.add(tooth);
    }

    // three hands moving at estranged rates — this clock counts something else
    var hands = [];
    [[0.85, 0.05], [0.62, 0.07], [0.45, 0.09]].forEach(function (hd, i) {
      var hg = new THREE.Group();
      var m = new THREE.Mesh(new THREE.BoxGeometry(hd[1], hd[0], 0.02), M.darkMetal);
      m.position.y = hd[0] / 2 - hd[0] * 0.15;
      var orn = new THREE.Mesh(new THREE.SphereGeometry(hd[1] * 1.1, 6, 6), M.gold);
      orn.position.y = hd[0] * 0.6;
      hg.add(m, orn);
      hg.position.z = 0.12 + i * 0.015;
      hg.rotation.z = [2.4, -1.1, 0.6][i];
      head.add(hg);
      hands.push(hg);
    });
    var hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), M.gold);
    hub.position.z = 0.16; head.add(hub);
    g.add(head);

    var rates = [0.31, -0.073, 0.013];
    reg(function (t, dt, flow) {
      for (var i = 0; i < 3; i++) hands[i].rotation.z -= rates[i] * dt * flow;
    });
    return g;
  }

  function crescentMoon() {
    // a flat disc painted as a crescent, hung in the northern sky
    var c = TX.canvas(256, 256), ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    // dark body, barely visible
    ctx.fillStyle = 'rgba(24,22,34,0.94)';
    ctx.beginPath(); ctx.arc(128, 128, 120, 0, 7); ctx.fill();
    // lit sliver
    ctx.save();
    ctx.beginPath(); ctx.arc(128, 128, 120, 0, 7); ctx.clip();
    ctx.fillStyle = '#cfd4e8';
    ctx.beginPath(); ctx.arc(88, 128, 122, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(24,22,34,1)';
    ctx.beginPath(); ctx.arc(58, 128, 128, 0, 7); ctx.fill();
    ctx.restore();
    var mat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat);
    reg(function (t, dt, flow) { m.rotation.z += dt * 0.01 * flow; });
    return m;
  }

  // ---------------------------------------------------------------
  // the meridian stair — Earth waiting at the top (plate III, center)
  // ---------------------------------------------------------------

  function earthStair(opts) {
    var g = new THREE.Group();
    var steps = 9, stepH = 0.42, stepD = 0.85, width = 5;
    for (var i = 0; i < steps; i++) {
      var s = sh(new THREE.Mesh(
        new THREE.BoxGeometry(width - i * 0.28, stepH, stepD), M.whiteMarbleBright));
      s.position.set(0, stepH / 2 + i * stepH, -i * stepD);
      g.add(s);
    }
    var topY = steps * stepH;
    var plat = sh(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 3.2), M.whiteMarbleBright));
    plat.position.set(0, topY - 0.2, -(steps - 1) * stepD - 1.8);
    g.add(plat);

    // the world, waiting — resting just above the top step
    var earthMat = new THREE.MeshPhongMaterial({ map: TX.tex(T.earth), shininess: 8 });
    var earth = new THREE.Mesh(new THREE.SphereGeometry(2.1, 28, 20), earthMat);
    var earthBaseY = topY + 1.85;
    earth.position.set(0, earthBaseY, -(steps - 1) * stepD - 1.8);
    g.add(earth);
    var cloudMat = new THREE.MeshLambertMaterial({
      map: TX.tex(T.earthClouds), transparent: true, depthWrite: false
    });
    var clouds = new THREE.Mesh(new THREE.SphereGeometry(2.16, 28, 20), cloudMat);
    clouds.position.copy(earth.position);
    g.add(clouds);

    // portal dressing, dormant until the keys return
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0xd0b0ff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.09, 8, 40), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, topY + 0.2, earth.position.z);
    g.add(ring);

    var beamMat = new THREE.MeshBasicMaterial({
      color: 0xbfa8ff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.9, 30, 20, 1, true), beamMat);
    beam.position.set(0, topY + 15, earth.position.z);
    g.add(beam);

    var light = new THREE.PointLight(0xb090ff, 0, 26);
    light.position.set(0, topY + 3, earth.position.z);
    g.add(light);

    var active = false;
    reg(function (t, dt, flow) {
      earth.rotation.y += dt * (0.05 + flow * 0.3);
      clouds.rotation.y += dt * (0.06 + flow * 0.36);
      if (active) {
        var pulse = 0.55 + Math.sin(t * 2.2) * 0.2;
        ringMat.opacity = pulse;
        beamMat.opacity = 0.14 + Math.sin(t * 1.7) * 0.05;
        light.intensity = 1.6 + Math.sin(t * 2.2) * 0.5;
        ring.rotation.z += dt * 0.6;
        earth.position.y = earthBaseY + 0.5 + Math.sin(t * 0.8) * 0.3;
        clouds.position.y = earth.position.y;
      }
    });

    return {
      group: g,
      setActive: function (on) { active = on; },
      earthPos: earth.position
    };
  }

  // the colossal background Earth of plate I
  function bigEarth(radius) {
    var g = new THREE.Group();
    var earthMat = new THREE.MeshPhongMaterial({ map: TX.tex(T.earth), shininess: 4, fog: false });
    var earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), earthMat);
    g.add(earth);
    var cloudMat = new THREE.MeshLambertMaterial({
      map: TX.tex(T.earthClouds), transparent: true, depthWrite: false, opacity: 0.9, fog: false
    });
    var clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.015, 40, 28), cloudMat);
    g.add(clouds);
    reg(function (t, dt, flow) {
      earth.rotation.y += dt * (0.002 + flow * 0.012);
      clouds.rotation.y += dt * (0.003 + flow * 0.015);
    });
    return g;
  }

  // ---------------------------------------------------------------
  // winding keys — the Keys of the Hours (plate III foreground)
  // ---------------------------------------------------------------

  function windingKey() {
    var g = new THREE.Group();
    var inner = new THREE.Group(); g.add(inner);

    // shaft
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), M.gold);
    shaft.rotation.z = Math.PI / 2; inner.add(shaft);
    // clover bow (three rings)
    for (var i = 0; i < 3; i++) {
      var a = i / 3 * Math.PI * 2 + Math.PI / 2;
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 14), M.gold);
      ring.position.set(-0.55 + Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0);
      inner.add(ring);
    }
    // bit
    var bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.05), M.gold);
    bit1.position.set(0.42, -0.13, 0); inner.add(bit1);
    var bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), M.gold);
    bit2.position.set(0.39, -0.05, 0); inner.add(bit2);

    var glow = new THREE.PointLight(0xffd780, 0.9, 7);
    g.add(glow);
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TX.tex(T.portal), color: 0xffe9a8, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.scale.setScalar(2.2);
    g.add(spr);

    var ph = Math.random() * 6;
    reg(function (t, dt) {
      // keys float outside time: they animate regardless of flow
      inner.rotation.y += dt * 1.4;
      inner.position.y = 1.1 + Math.sin(t * 1.8 + ph) * 0.22;
      spr.position.y = inner.position.y;
      glow.position.y = inner.position.y;
      spr.material.opacity = 0.25 + Math.sin(t * 3 + ph) * 0.12;
    });
    return g;
  }

  // a small hourglass of restoring sand (medkit)
  function sandPickup() {
    var g = new THREE.Group();
    var hg = hourglassProp(0.4, true);
    hg.position.y = 0.5;
    g.add(hg);
    var glow = new THREE.PointLight(0xffb060, 0.6, 5);
    glow.position.y = 1; g.add(glow);
    reg(function (t, dt) {
      hg.rotation.y += dt * 0.9;
      hg.position.y = 0.5 + Math.sin(t * 2.1) * 0.1;
    });
    return g;
  }

  // ---------------------------------------------------------------
  // Venus Terrace props (plate IV)
  // ---------------------------------------------------------------

  function gazebo() {
    var g = new THREE.Group();
    var span = 7.5, colH = 7.2;

    // plinth
    var plinth = sh(new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 12), M.whiteMarbleBright));
    plinth.position.y = 0.3; g.add(plinth);
    var plinth2 = sh(new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.5, 10.4), M.whiteMarbleBright));
    plinth2.position.y = 0.85; g.add(plinth2);

    // four fluted columns + capitals
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    corners.forEach(function (cn, idx) {
      var x = cn[0] * span / 2, z = cn[1] * span / 2;
      var shaft = sh(new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.5, colH, 18), M.whiteMarbleBright));
      shaft.position.set(x, 1.1 + colH / 2, z);
      g.add(shaft);
      var baseT = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.35, 14), M.whiteMarbleBright));
      baseT.position.set(x, 1.28, z); g.add(baseT);
      // corinthian-ish capital: flared cone + abacus
      var cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.44, 0.6, 14), M.whiteMarbleBright));
      cap.position.set(x, 1.1 + colH - 0.3, z); g.add(cap);
      var ab = sh(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 1.25), M.whiteMarbleBright));
      ab.position.set(x, 1.1 + colH + 0.11, z); g.add(ab);
      // ivy on two of the columns, spiraling up
      if (idx === 0 || idx === 2) ivyOnColumn(g, x, z, colH);
    });

    // entablature + flat roof slabs
    var ent = sh(new THREE.Mesh(new THREE.BoxGeometry(span + 2.4, 0.8, span + 2.4), M.whiteMarbleBright));
    ent.position.y = 1.1 + colH + 0.62; g.add(ent);
    var roof = sh(new THREE.Mesh(new THREE.BoxGeometry(span + 3.4, 0.35, span + 3.4), M.whiteMarbleBright));
    roof.position.y = 1.1 + colH + 1.2; g.add(roof);

    return g;
  }

  function ivyOnColumn(parent, x, z, colH) {
    var mat = new THREE.MeshLambertMaterial({
      map: TX.tex(T.ivy), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide
    });
    var leaves = new THREE.Group();
    for (var i = 0; i < 42; i++) {
      var t = i / 42;
      var a = t * Math.PI * 6 + x;                    // spiral
      var leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), mat);
      leaf.position.set(
        x + Math.cos(a) * 0.55,
        1.3 + t * (colH - 0.6),
        z + Math.sin(a) * 0.55
      );
      leaf.rotation.y = -a + Math.PI / 2;
      leaf.rotation.z = (Math.sin(i * 7.3) * 0.5);
      leaves.add(leaf);
    }
    parent.add(leaves);
  }

  function crtComputer() {
    var g = new THREE.Group();

    // low white cabinet the machine rests on
    var cab = sh(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.5), M.beige));
    cab.position.y = 0.55; g.add(cab);
    // drawer lines
    var lineMat = new THREE.MeshBasicMaterial({ color: 0x9a9284 });
    for (var i = 0; i < 2; i++) {
      var ln = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.02, 0.02), lineMat);
      ln.position.set(0, 0.35 + i * 0.4, 0.76); g.add(ln);
    }

    // CRT monitor
    var mon = sh(new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.5), M.beige));
    mon.position.y = 1.1 + 0.78; g.add(mon);
    var monBack = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.5), M.beigeDark));
    monBack.position.set(0, 1.1 + 0.78, -0.9); g.add(monBack);
    // screen — the Birth of Venus, eternally on
    var screenTex = TX.tex(T.venusPainting);
    var screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 1.12), screenMat);
    screen.position.set(0, 1.1 + 0.78, 0.755); g.add(screen);
    // moving scanline band
    var bandMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var band = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.1), bandMat);
    band.position.set(0, 1.1 + 0.78, 0.76); g.add(band);

    // keyboard
    var kb = sh(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.55), M.beige));
    kb.position.set(0, 1.1 + 0.05, 1.05);
    kb.rotation.x = 0.06;
    g.add(kb);
    var keysMat = new THREE.MeshLambertMaterial({ color: 0xc4bcac });
    for (var r = 0; r < 4; r++) for (var col2 = 0; col2 < 12; col2++) {
      var k = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.09), keysMat);
      k.position.set(-0.62 + col2 * 0.113, 1.1 + 0.105, 0.87 + r * 0.115);
      g.add(k);
    }

    // screen glow — antiquity radiating out of the machine
    var glow = new THREE.PointLight(0x9adfc8, 0.8, 9);
    glow.position.set(0, 2, 1.4); g.add(glow);

    reg(function (t, dt) {
      band.position.y = 1.1 + 0.78 + 0.52 - ((t * 0.35) % 1.04);
      screenMat.color.setScalar(0.92 + Math.sin(t * 31) * 0.04 + Math.sin(t * 7.7) * 0.04);
      glow.intensity = 0.7 + Math.sin(t * 13) * 0.08;
    });
    return g;
  }

  function palmTree(h, seed) {
    var g = new THREE.Group();
    var rnd = TX.mulberry(seed || (Math.random() * 1e9) | 0);
    var trunkMat = M.trunk;

    var segs = 6, lean = (rnd() - 0.5) * 0.5;
    var pos = new THREE.Vector3(0, 0, 0), dir = new THREE.Vector3(lean * 0.15, 1, (rnd() - 0.5) * 0.1).normalize();
    for (var i = 0; i < segs; i++) {
      var segLen = h / segs;
      var seg = sh(new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 - i * 0.012, 0.18 - i * 0.012, segLen * 1.15, 7), trunkMat));
      seg.position.copy(pos).addScaledVector(dir, segLen / 2);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(seg);
      pos.addScaledVector(dir, segLen);
      dir.x += lean * 0.06; dir.normalize();
    }

    var frondMat = new THREE.MeshLambertMaterial({
      map: TX.tex(T.frond), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide
    });
    var crown = new THREE.Group();
    crown.position.copy(pos);
    var fronds = [];
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * Math.PI * 2;
      var f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), frondMat);
      f.position.set(Math.cos(a) * 0.9, 0.45, Math.sin(a) * 0.9);
      f.rotation.y = -a + Math.PI / 2;
      f.rotation.x = -0.9 - rnd() * 0.4;
      crown.add(f);
      fronds.push(f);
    }
    // couple of drooping dead fronds
    for (var i = 0; i < 2; i++) {
      var a = rnd() * Math.PI * 2;
      var f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.0), frondMat);
      f.position.set(Math.cos(a) * 0.5, -0.2, Math.sin(a) * 0.5);
      f.rotation.y = -a + Math.PI / 2;
      f.rotation.x = -2.4;
      crown.add(f);
    }
    g.add(crown);

    var ph = rnd() * 6;
    reg(function (t, dt, flow) {
      crown.rotation.z = Math.sin(t * 0.7 + ph) * 0.05 * (0.3 + flow);
      crown.rotation.x = Math.cos(t * 0.53 + ph) * 0.04 * (0.3 + flow);
    });
    return g;
  }

  function pottedPlant(scale) {
    var g = new THREE.Group();
    // white urn
    var pts = [];
    [[0.22, 0], [0.3, 0.06], [0.2, 0.22], [0.24, 0.5], [0.34, 0.62], [0.3, 0.66]].forEach(function (p) {
      pts.push(new THREE.Vector2(p[0], p[1]));
    });
    var pot = sh(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), M.whiteMarbleBright));
    g.add(pot);
    // grass fan
    var bladeMat = M.leafGreen;
    for (var i = 0; i < 14; i++) {
      var blade = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.9), bladeMat);
      var a = Math.random() * Math.PI * 2;
      blade.position.set(Math.cos(a) * 0.08, 1.0, Math.sin(a) * 0.08);
      blade.rotation.z = (Math.random() - 0.5) * 0.9;
      blade.rotation.y = a;
      blade.material.side = THREE.DoubleSide;
      g.add(blade);
    }
    g.scale.setScalar(scale || 1);
    return g;
  }

  function carpetRoll(length, width) {
    var g = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({ map: TX.tex(T.carpet, width / 2, length / 2) });
    var flat = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
    flat.rotation.x = -Math.PI / 2;
    flat.position.set(0, 0.02, -length / 2);
    flat.receiveShadow = true;
    g.add(flat);
    // the unrolled end
    var rollMat = new THREE.MeshLambertMaterial({ map: TX.tex(T.carpet, 1, 1) });
    var roll = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, width, 12), rollMat));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.22, -length - 0.1);
    g.add(roll);
    return g;
  }

  function brokenColumn() {
    var g = new THREE.Group();
    var stub = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.2, 10), M.whiteMarble));
    stub.position.y = 0.6; g.add(stub);
    // jagged top: a squashed cone
    var jag = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.42, 0.5, 6), M.whiteMarble));
    jag.position.y = 1.4; jag.rotation.y = 0.4; g.add(jag);
    var chunk = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), M.whiteMarble));
    chunk.position.set(0.9, 0.24, 0.3); chunk.rotation.set(0.5, 1, 0.2); g.add(chunk);
    return g;
  }

  // gate arch with portal shimmer between zones
  function gateArch(width, colH) {
    var g = new THREE.Group();
    var a = arch(width, colH, M.pinkMarble);
    a.scale.setScalar(1.15);   // beefier than the walkway arches
    g.add(a);
    var shimMat = new THREE.MeshBasicMaterial({
      map: TX.tex(T.portal), color: 0xcaa8ff, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    var shim = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.95, colH * 1.05), shimMat);
    shim.position.y = colH / 2;
    g.add(shim);
    reg(function (t, dt) {
      shimMat.opacity = 0.35 + Math.sin(t * 1.3) * 0.15;
      shim.rotation.z = Math.sin(t * 0.4) * 0.06;
    });
    return g;
  }

  return {
    init: init, updateAll: updateAll, reg: reg, M: function () { return M; },
    column: column, arch: arch, colonnade: colonnade,
    grandfatherClock: grandfatherClock, hourglassProp: hourglassProp,
    floorDial: floorDial, sunStatue: sunStatue, runeClock: runeClock,
    crescentMoon: crescentMoon, earthStair: earthStair, bigEarth: bigEarth,
    windingKey: windingKey, sandPickup: sandPickup,
    gazebo: gazebo, crtComputer: crtComputer, palmTree: palmTree,
    pottedPlant: pottedPlant, carpetRoll: carpetRoll,
    brokenColumn: brokenColumn, gateArch: gateArch, sh: sh
  };
})();

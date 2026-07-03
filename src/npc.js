/* TEMPUS — Minuette, the Last Minute.
   A small porcelain-and-clockwork spirit: one of the three unspent
   minutes left standing before midnight when the Engine seized.
   Copper hair like the painting in the machine, a dress hemmed with
   the pattern of the days, a pocket-watch that no longer ticks, and
   a slow halo of hours she carries like a thought. */

var NPC = (function () {

  var scene, root, inner, head, headPivot, hair, armL, armR, halo, haloNums = [];
  var faceTex, faceCanvas;
  var mode = 'idle';          // idle | follow | wait
  var homePos = new THREE.Vector3();
  var vel = new THREE.Vector3();
  var blinkT = 2 + Math.random() * 3, blinkPhase = 0;
  var waveT = 0, waveCooldown = 0;
  var bobPh = Math.random() * 6;
  var facing = 0;
  var mats = {};

  var HOVER = 0.32;           // she floats a hand's width above the pattern

  // ---------------------------------------------------------------
  // face — painted porcelain, redrawn for blinks
  // ---------------------------------------------------------------

  function paintFace(closed) {
    var c = faceCanvas, ctx = c.getContext('2d');
    // porcelain
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#fdf3ee'); g.addColorStop(1, '#f7e3dc');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    // soft cheek blush
    ctx.fillStyle = 'rgba(240,150,160,0.4)';
    ctx.beginPath(); ctx.ellipse(198, 158, 22, 12, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(314, 158, 22, 12, 0, 0, 7); ctx.fill();
    // eyes — big, dark-amber, friendly (front of face ≈ u 0.5)
    if (closed) {
      ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(222, 126, 15, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(290, 126, 15, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(222, 126, 17, 21, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(290, 126, 17, 21, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a4222';
      ctx.beginPath(); ctx.ellipse(224, 129, 11, 15, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(288, 129, 11, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a180c';
      ctx.beginPath(); ctx.ellipse(224, 130, 6, 9, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(288, 130, 6, 9, 0, 0, 7); ctx.fill();
      // catchlights
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(227, 123, 3.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(291, 123, 3.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(220, 135, 1.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(284, 135, 1.8, 0, 7); ctx.fill();
    }
    // lashes / lids
    ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(222, 124, 18, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(290, 124, 18, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    // brows
    ctx.lineWidth = 3; ctx.strokeStyle = '#a4683c';
    ctx.beginPath(); ctx.arc(222, 118, 24, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(290, 118, 24, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
    // tiny nose
    ctx.strokeStyle = '#d8a894'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(256, 142); ctx.lineTo(253, 152); ctx.stroke();
    // small warm smile
    ctx.strokeStyle = '#b05a50'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(256, 164, 13, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // porcelain seam — a hairline crack of clockwork, barely there
    ctx.strokeStyle = 'rgba(160,120,110,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(322, 96); ctx.quadraticCurveTo(330, 130, 324, 168); ctx.stroke();
    if (faceTex) faceTex.needsUpdate = true;
  }

  // portrait for her dialogue panel
  function drawPortrait(canvas) {
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    // dreamy backdrop
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a1636'); bg.addColorStop(1, '#57284e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var i = 0; i < 18; i++) ctx.fillRect(Math.random() * W, Math.random() * H * 0.7, 1.5, 1.5);
    var cx = W / 2, cy = H * 0.56, s = W / 128;
    // halo
    ctx.strokeStyle = 'rgba(255,215,120,0.8)'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(cx, cy - 34 * s, 26 * s, 7 * s, 0, 0, 7); ctx.stroke();
    // hair back
    ctx.fillStyle = '#c07830';
    ctx.beginPath(); ctx.ellipse(cx, cy - 4 * s, 26 * s, 30 * s, 0, 0, 7); ctx.fill();
    // face
    ctx.fillStyle = '#fbeee8';
    ctx.beginPath(); ctx.ellipse(cx, cy + 2 * s, 20 * s, 22 * s, 0, 0, 7); ctx.fill();
    // bangs
    ctx.fillStyle = '#c07830';
    ctx.beginPath();
    ctx.moveTo(cx - 20 * s, cy - 2 * s);
    ctx.quadraticCurveTo(cx - 12 * s, cy - 26 * s, cx, cy - 20 * s);
    ctx.quadraticCurveTo(cx + 12 * s, cy - 26 * s, cx + 20 * s, cy - 2 * s);
    ctx.quadraticCurveTo(cx + 10 * s, cy - 12 * s, cx, cy - 10 * s);
    ctx.quadraticCurveTo(cx - 10 * s, cy - 12 * s, cx - 20 * s, cy - 2 * s);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 8 * s, cy + 4 * s, 4.6 * s, 5.6 * s, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8 * s, cy + 4 * s, 4.6 * s, 5.6 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4222';
    ctx.beginPath(); ctx.ellipse(cx - 7.6 * s, cy + 4.6 * s, 3 * s, 4 * s, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 7.6 * s, cy + 4.6 * s, 3 * s, 4 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 6.6 * s, cy + 3 * s, 1.1 * s, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8.6 * s, cy + 3 * s, 1.1 * s, 0, 7); ctx.fill();
    // blush + smile + nose
    ctx.fillStyle = 'rgba(240,150,160,0.45)';
    ctx.beginPath(); ctx.ellipse(cx - 13 * s, cy + 11 * s, 4 * s, 2.2 * s, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 13 * s, cy + 11 * s, 4 * s, 2.2 * s, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b05a50'; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + 12 * s, 4 * s, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // side strands
    ctx.strokeStyle = '#c07830'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(cx - 21 * s, cy - 2 * s); ctx.quadraticCurveTo(cx - 25 * s, cy + 14 * s, cx - 20 * s, cy + 26 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 21 * s, cy - 2 * s); ctx.quadraticCurveTo(cx + 25 * s, cy + 14 * s, cx + 20 * s, cy + 26 * s); ctx.stroke();
    // collar + pendant
    ctx.fillStyle = '#f6e9de';
    ctx.beginPath(); ctx.ellipse(cx, cy + 30 * s, 16 * s, 8 * s, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#e8b84a'; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.arc(cx, cy + 30 * s, 3.4 * s, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + 27 * s); ctx.lineTo(cx, cy + 30 * s); ctx.stroke();
  }

  // ---------------------------------------------------------------
  // model
  // ---------------------------------------------------------------

  function dressCanvas() {
    var c = TX.canvas(256, 256), ctx = c.getContext('2d');
    // cream porcelain cloth with faint vertical pleats
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#f3e6da'); g.addColorStop(0.75, '#ecdccc'); g.addColorStop(1, '#e6d2c0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(180,150,130,0.25)'; ctx.lineWidth = 2;
    for (var i = 0; i < 16; i++) {
      ctx.beginPath(); ctx.moveTo(i * 16 + 8, 40); ctx.lineTo(i * 16 + 8, 256); ctx.stroke();
    }
    // the hem of days — pink/black checker band, like the runner in the terrace
    for (var x = 0; x < 16; x++) for (var y = 0; y < 2; y++) {
      ctx.fillStyle = ((x + y) % 2 === 0) ? '#e050b8' : '#1c1420';
      ctx.fillRect(x * 16, 224 + y * 16, 16, 16);
    }
    // gold waist thread
    ctx.fillStyle = '#e8b84a'; ctx.fillRect(0, 60, 256, 5);
    return c;
  }

  function build(sceneRef) {
    scene = sceneRef;
    var M = PROPS.M();
    mats.porcelain = new THREE.MeshPhongMaterial({ color: 0xfbeee8, shininess: 60, specular: 0x886666 });
    mats.hair = new THREE.MeshPhongMaterial({ color: 0xc07830, shininess: 50, specular: 0xffd0a0 });
    mats.shoe = M.gold;

    root = new THREE.Group();
    inner = new THREE.Group();       // bobs up and down
    root.add(inner);

    // dress — a small bell of cloth
    var dressTex = new THREE.CanvasTexture(dressCanvas());
    var dressMat = new THREE.MeshLambertMaterial({ map: dressTex });
    var pts = [];
    [[0.02, 1.05], [0.13, 1.02], [0.15, 0.92], [0.13, 0.8], [0.17, 0.62],
     [0.26, 0.4], [0.34, 0.18], [0.36, 0.12]].forEach(function (p) {
      pts.push(new THREE.Vector2(p[0], p[1]));
    });
    var dress = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), dressMat);
    dress.castShadow = true;
    inner.add(dress);

    // little gold shoes peeking out
    for (var i = -1; i <= 1; i += 2) {
      var shoe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mats.shoe);
      shoe.scale.set(1, 0.7, 1.5);
      shoe.position.set(i * 0.08, 0.06, 0.05);
      inner.add(shoe);
    }

    // arms — porcelain, hands as beads
    armL = new THREE.Group(); armR = new THREE.Group();
    [armL, armR].forEach(function (arm, idx) {
      var side = idx === 0 ? -1 : 1;
      var a = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.34, 8), mats.porcelain);
      a.position.y = -0.17;
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mats.porcelain);
      hand.position.y = -0.36;
      arm.add(a, hand);
      arm.position.set(side * 0.17, 1.0, 0);
      arm.rotation.z = side * 0.25;
      inner.add(arm);
    });

    // head
    headPivot = new THREE.Group();
    headPivot.position.y = 1.18;
    inner.add(headPivot);
    head = new THREE.Group();
    headPivot.add(head);

    faceCanvas = TX.canvas(512, 256);
    faceTex = new THREE.CanvasTexture(faceCanvas);
    paintFace(false);
    var faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
    var skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 16), faceMat);
    skull.rotation.y = -Math.PI / 2;      // painted features face +z
    skull.scale.set(0.95, 1.06, 0.92);
    skull.castShadow = true;
    head.add(skull);

    // copper bob — crown, back-and-sides with an open face window,
    // and a straight fringe of bangs above her eyes (face looks +z;
    // the window is phi≈90° in sphere space)
    hair = new THREE.Group();
    var crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.268, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.34), mats.hair);
    crown.position.y = 0.03;
    hair.add(crown);
    var sides = new THREE.Mesh(
      new THREE.SphereGeometry(0.268, 20, 12, Math.PI * 0.72, Math.PI * 1.56,
        Math.PI * 0.30, Math.PI * 0.40), mats.hair);
    sides.position.y = 0.03;
    hair.add(sides);
    var bangs = new THREE.Mesh(
      new THREE.SphereGeometry(0.272, 16, 5, Math.PI * 0.36, Math.PI * 0.28,
        Math.PI * 0.24, Math.PI * 0.18), mats.hair);
    bangs.position.y = 0.03;
    hair.add(bangs);
    var back = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mats.hair);
    back.scale.set(0.9, 0.95, 0.72);
    back.position.set(0, -0.03, -0.12);
    hair.add(back);
    for (var i = -1; i <= 1; i += 2) {
      var strand = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.028, 0.34, 8), mats.hair);
      strand.position.set(i * 0.23, -0.12, 0.02);
      strand.rotation.z = i * 0.08;
      hair.add(strand);
    }
    // a tiny gear pinned in her hair
    var pin = new THREE.Group();
    var pinRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 5, 10), mats.shoe);
    pin.add(pinRing);
    for (var i = 0; i < 6; i++) {
      var a2 = i / 6 * Math.PI * 2;
      var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.014), mats.shoe);
      tooth.position.set(Math.cos(a2) * 0.055, Math.sin(a2) * 0.055, 0);
      tooth.rotation.z = a2;
      pin.add(tooth);
    }
    pin.position.set(0.17, 0.14, 0.14);
    pin.rotation.y = 0.5;
    hair.add(pin);
    head.add(hair);

    // pocket-watch pendant, stopped at 11:57 like everything she loves
    var pend = new THREE.Group();
    var pw = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), mats.shoe);
    pw.rotation.x = Math.PI / 2;
    pend.add(pw);
    var pwFace = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0xf6efdd }));
    pwFace.position.z = 0.012;
    pend.add(pwFace);
    pend.position.set(0, 0.98, 0.13);
    inner.add(pend);

    // the halo of hours — a slow ring of gold with four drifting numerals
    halo = new THREE.Group();
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd780, transparent: true, opacity: 0.75 }));
    ring.rotation.x = Math.PI / 2;
    halo.add(ring);
    ['XII', 'III', 'VI', 'IX'].forEach(function (n, i) {
      var nc = TX.canvas(64, 64), nctx = nc.getContext('2d');
      nctx.clearRect(0, 0, 64, 64);
      nctx.fillStyle = '#ffd780';
      nctx.font = 'bold 30px "Times New Roman", serif';
      nctx.textAlign = 'center'; nctx.textBaseline = 'middle';
      nctx.fillText(n, 32, 32);
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(nc), transparent: true, opacity: 0.9, depthWrite: false
      }));
      spr.scale.setScalar(0.16);
      var a3 = i / 4 * Math.PI * 2;
      spr.position.set(Math.cos(a3) * 0.36, 0, Math.sin(a3) * 0.36);
      halo.add(spr);
      haloNums.push(spr);
    });
    halo.position.y = 1.62;
    inner.add(halo);

    // a soft warm presence, held out in front so it lights her face
    // instead of burning through it
    var glow = new THREE.PointLight(0xffd9c0, 0.22, 4);
    glow.position.set(0, 1.3, 0.9);
    inner.add(glow);

    scene.add(root);
    return root;
  }

  // ---------------------------------------------------------------
  // behavior
  // ---------------------------------------------------------------

  function place(x, y, z, faceYaw) {
    root.position.set(x, y, z);
    homePos.set(x, y, z);
    facing = faceYaw || 0;
    root.rotation.y = facing;
  }

  function setMode(m) {
    mode = m;
    if (m === 'wait' || m === 'idle') homePos.copy(root.position);
    if (m === 'follow') wave();
  }

  function wave() {
    if (waveCooldown <= 0) { waveT = 1.6; waveCooldown = 14; }
  }

  function update(dt, t, playerPos) {
    if (!root) return;

    // --- locomotion ---
    var toPlayer = new THREE.Vector3().subVectors(playerPos, root.position);
    var flatDist = Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.z * toPlayer.z);

    if (mode === 'follow') {
      // drift to a spot just behind the Winder's shoulder
      var desired = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
      if (flatDist > 2.6) {
        var dir = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
        desired.x -= dir.x * 2.2; desired.z -= dir.z * 2.2;
        var speed = flatDist > 12 ? 9.5 : 6.5;
        vel.x += (desired.x - root.position.x) * dt * 3;
        vel.z += (desired.z - root.position.z) * dt * 3;
        var vl = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        if (vl > speed) { vel.x *= speed / vl; vel.z *= speed / vl; }
      } else {
        vel.x *= Math.max(0, 1 - 6 * dt); vel.z *= Math.max(0, 1 - 6 * dt);
      }
      root.position.x += vel.x * dt;
      root.position.z += vel.z * dt;
      // lost across a teleport — she folds through the space between seconds
      if (flatDist > 45) {
        root.position.set(playerPos.x - 1.5, playerPos.y, playerPos.z - 1.5);
        ENEMIES.burst(root.position.clone().setY(root.position.y + 1), 10, 0xffd9a0, 0.7);
      }
      // ground height: hover over walkable ground, glide over gaps
      var gh = WORLD.groundHeight(root.position.x, root.position.z, root.position.y + 1);
      var targetY = (gh > -Infinity) ? gh : playerPos.y;
      root.position.y += (targetY - root.position.y) * Math.min(1, dt * 5);
    } else {
      // waiting / idle: a gentle orbit of her spot, like a second hand at rest
      var wob = Math.sin(t * 0.23 + bobPh) * 0.4;
      var tx = homePos.x + Math.cos(t * 0.11 + bobPh) * wob;
      var tz = homePos.z + Math.sin(t * 0.13 + bobPh) * wob;
      root.position.x += (tx - root.position.x) * dt * 0.8;
      root.position.z += (tz - root.position.z) * dt * 0.8;
      var gh2 = WORLD.groundHeight(root.position.x, root.position.z, root.position.y + 1);
      if (gh2 > -Infinity) root.position.y += (gh2 - root.position.y) * Math.min(1, dt * 4);
    }

    // face the player when close, else face travel direction
    var targetYaw;
    if (flatDist < 9 || mode !== 'follow') {
      targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
    } else {
      targetYaw = Math.atan2(vel.x, vel.z);
    }
    var dy2 = targetYaw - facing;
    while (dy2 > Math.PI) dy2 -= Math.PI * 2;
    while (dy2 < -Math.PI) dy2 += Math.PI * 2;
    facing += dy2 * Math.min(1, dt * 5);
    root.rotation.y = facing;

    // --- idle life ---
    inner.position.y = HOVER + Math.sin(t * 1.6 + bobPh) * 0.06;
    halo.rotation.y += dt * 0.5;
    haloNums.forEach(function (s, i) {
      s.position.y = Math.sin(t * 1.2 + i * 1.57) * 0.03;
    });
    // head tracks the Winder with a small tilt of curiosity
    if (flatDist < 12) {
      var lookY = Math.atan2(toPlayer.x, toPlayer.z) - facing;
      while (lookY > Math.PI) lookY -= Math.PI * 2;
      while (lookY < -Math.PI) lookY += Math.PI * 2;
      lookY = Math.max(-0.7, Math.min(0.7, lookY));
      var lookX = Math.max(-0.4, Math.min(0.4,
        Math.atan2(playerPos.y + 1.4 - (root.position.y + inner.position.y + 1.18), Math.max(1, flatDist))));
      headPivot.rotation.y += (lookY - headPivot.rotation.y) * Math.min(1, dt * 4);
      headPivot.rotation.x += (-lookX - headPivot.rotation.x) * Math.min(1, dt * 4);
      head.rotation.z = Math.sin(t * 0.7 + bobPh) * 0.06;   // the curious tilt
    } else {
      headPivot.rotation.y *= Math.max(0, 1 - dt * 2);
      headPivot.rotation.x *= Math.max(0, 1 - dt * 2);
    }

    // blink
    blinkT -= dt;
    if (blinkT <= 0 && blinkPhase === 0) { paintFace(true); blinkPhase = 0.13; }
    if (blinkPhase > 0) {
      blinkPhase -= dt;
      if (blinkPhase <= 0) { paintFace(false); blinkPhase = 0; blinkT = 2.2 + Math.random() * 4; }
    }

    // wave hello
    waveCooldown = Math.max(0, waveCooldown - dt);
    if (mode !== 'follow' && flatDist < 5.5 && waveCooldown <= 0) { waveT = 1.6; waveCooldown = 22; }
    if (waveT > 0) {
      waveT -= dt;
      armR.rotation.z = 0.25 + Math.PI * 0.75 + Math.sin(waveT * 14) * 0.3;
    } else {
      armR.rotation.z += (0.25 - armR.rotation.z) * Math.min(1, dt * 5);
      armR.rotation.z = armR.rotation.z || 0.25;
    }
    armL.rotation.z = -0.25 - Math.sin(t * 1.6 + bobPh) * 0.04;
  }

  function headWorldPos(out) {
    out = out || new THREE.Vector3();
    out.set(0, 1.55, 0).add(inner.position).applyMatrix4(root.matrixWorld);
    return out;
  }

  return {
    build: build, place: place, update: update, setMode: setMode, wave: wave,
    drawPortrait: drawPortrait, headWorldPos: headWorldPos,
    get mode() { return mode; },
    get pos() { return root ? root.position : new THREE.Vector3(); }
  };
})();

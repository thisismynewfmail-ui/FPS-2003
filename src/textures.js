/* TEMPUS — procedural textures.
   Every surface in the game is synthesized here at boot so the build ships
   with zero image assets, the way a 2003 tech demo would bake its media. */

var TX = (function () {

  // ---------- deterministic rng / noise ----------

  function mulberry(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(seed) {
    var rnd = mulberry(seed), size = 64, g = new Float32Array(size * size);
    for (var i = 0; i < g.length; i++) g[i] = rnd();
    function at(x, y) {
      x = ((x % size) + size) % size; y = ((y % size) + size) % size;
      return g[(y | 0) * size + (x | 0)];
    }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }

  function fbm(noise, x, y, oct) {
    var v = 0, amp = 0.5, f = 1;
    for (var i = 0; i < oct; i++) { v += amp * noise(x * f, y * f); amp *= 0.5; f *= 2; }
    return v;
  }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function lerpC(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function tex(cnv, repX, repY, nearest) {
    var t = new THREE.CanvasTexture(cnv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repX) t.repeat.set(repX, repY || repX);
    if (nearest) { t.magFilter = THREE.NearestFilter; }
    t.anisotropy = 4;
    return t;
  }

  // ---------- marble ----------
  // classic sine-warped fbm veining; base/mid/vein are [r,g,b]

  function marbleCanvas(opt) {
    var size = opt.size || 256;
    var n = makeNoise(opt.seed || 1);
    var c = canvas(size, size), ctx = c.getContext('2d');
    var img = ctx.createImageData(size, size);
    var scale = opt.scale || 5;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size * scale, ny = y / size * scale;
        var turb = fbm(n, nx, ny, 5);
        // vein pattern
        var vein = Math.abs(Math.sin((nx + ny * 0.6) * 2.2 + turb * (opt.turb || 7)));
        vein = Math.pow(vein, opt.veinPow || 3.5);
        var cloud = fbm(n, nx * 0.7 + 40, ny * 0.7 + 40, 4);
        var col = lerpC(opt.base, opt.mid, cloud);
        col = lerpC(col, opt.vein, 1 - vein);
        // fine grain
        var g = (fbm(n, nx * 8, ny * 8, 2) - 0.5) * (opt.grain || 14);
        var idx = (y * size + x) * 4;
        img.data[idx] = Math.max(0, Math.min(255, col[0] + g));
        img.data[idx + 1] = Math.max(0, Math.min(255, col[1] + g));
        img.data[idx + 2] = Math.max(0, Math.min(255, col[2] + g));
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // ---------- specific materials ----------

  function makeAll() {
    var T = {};

    // — the two floor marbles from the reference plates —
    var redMarble = marbleCanvas({
      seed: 11, base: [128, 62, 48], mid: [96, 44, 40], vein: [200, 150, 130],
      scale: 4, turb: 8, veinPow: 3
    });
    var grayMarble = marbleCanvas({
      seed: 23, base: [190, 188, 186], mid: [140, 138, 142], vein: [235, 233, 230],
      scale: 4, turb: 7, veinPow: 2.6
    });
    var pinkMarble = marbleCanvas({
      seed: 37, base: [172, 118, 100], mid: [140, 96, 88], vein: [214, 178, 158],
      scale: 3, turb: 6, veinPow: 3
    });
    var whiteMarble = marbleCanvas({
      seed: 51, base: [225, 222, 216], mid: [196, 194, 196], vein: [246, 244, 240],
      scale: 3.5, turb: 6, veinPow: 2.4
    });

    // checkerboard floor: 2x2 alternation of the two marbles
    var chk = canvas(512, 512), cctx = chk.getContext('2d');
    cctx.drawImage(redMarble, 0, 0, 256, 256);
    cctx.drawImage(grayMarble, 256, 0, 256, 256);
    cctx.drawImage(grayMarble, 0, 256, 256, 256);
    cctx.drawImage(redMarble, 256, 256, 256, 256);
    // grout seams
    cctx.strokeStyle = 'rgba(30,20,18,0.55)'; cctx.lineWidth = 2;
    cctx.strokeRect(0, 0, 512, 512);
    cctx.beginPath(); cctx.moveTo(256, 0); cctx.lineTo(256, 512);
    cctx.moveTo(0, 256); cctx.lineTo(512, 256); cctx.stroke();
    T.checkerFloor = chk;

    // pink/black checker carpet (Venus terrace runner)
    var cpt = canvas(256, 256), pctx = cpt.getContext('2d');
    var pn = makeNoise(77);
    for (var y = 0; y < 2; y++) for (var x = 0; x < 2; x++) {
      pctx.fillStyle = ((x + y) % 2 === 0) ? '#e050b8' : '#141018';
      pctx.fillRect(x * 128, y * 128, 128, 128);
    }
    // cloth weave
    var wimg = pctx.getImageData(0, 0, 256, 256);
    for (var i = 0; i < wimg.data.length; i += 4) {
      var px = (i / 4) % 256, py = (i / 4 / 256) | 0;
      var w = ((px % 3 === 0) || (py % 3 === 0)) ? -14 : 0;
      w += (pn(px / 9, py / 9) - 0.5) * 22;
      wimg.data[i] += w; wimg.data[i + 1] += w; wimg.data[i + 2] += w;
    }
    pctx.putImageData(wimg, 0, 0);
    T.carpet = cpt;

    T.redMarble = redMarble;
    T.grayMarble = grayMarble;
    T.pinkMarble = pinkMarble;
    T.whiteMarble = whiteMarble;

    // — gold (sundial ring, keys, trims) —
    var gold = canvas(128, 128), gctx = gold.getContext('2d');
    var grad = gctx.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#8a5a10'); grad.addColorStop(.3, '#ffd76e');
    grad.addColorStop(.5, '#c99026'); grad.addColorStop(.7, '#ffe9a0');
    grad.addColorStop(1, '#7a4c0c');
    gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
    var gn = makeNoise(91);
    var gi = gctx.getImageData(0, 0, 128, 128);
    for (var i = 0; i < gi.data.length; i += 4) {
      var px = (i / 4) % 128, py = (i / 4 / 128) | 0;
      var v = (gn(px / 2, py / 40) - 0.5) * 26; // brushed streaks
      gi.data[i] += v; gi.data[i + 1] += v; gi.data[i + 2] += v * 0.6;
    }
    gctx.putImageData(gi, 0, 0);
    T.gold = gold;

    // — warm wood for the grandfather clock —
    var wood = canvas(128, 256), wctx = wood.getContext('2d');
    var wn = makeNoise(13);
    var wi = wctx.createImageData(128, 256);
    for (var y = 0; y < 256; y++) for (var x = 0; x < 128; x++) {
      var ring = Math.sin(x * 0.28 + fbm(wn, x / 22, y / 90, 4) * 9);
      var t2 = ring * 0.5 + 0.5;
      var col = lerpC([196, 120, 34], [120, 62, 14], t2);
      var idx = (y * 128 + x) * 4;
      wi.data[idx] = col[0]; wi.data[idx + 1] = col[1]; wi.data[idx + 2] = col[2]; wi.data[idx + 3] = 255;
    }
    wctx.putImageData(wi, 0, 0);
    T.wood = wood;

    // — sandstone for the sun statue —
    var stone = canvas(128, 128), sctx = stone.getContext('2d');
    var sn = makeNoise(29);
    var si = sctx.createImageData(128, 128);
    for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) {
      var v = fbm(sn, x / 14, y / 14, 4);
      var col = lerpC([150, 138, 96], [104, 96, 66], v);
      var idx = (y * 128 + x) * 4;
      si.data[idx] = col[0]; si.data[idx + 1] = col[1]; si.data[idx + 2] = col[2]; si.data[idx + 3] = 255;
    }
    sctx.putImageData(si, 0, 0);
    T.stone = stone;

    // ---------- planet earth ----------
    var e = canvas(512, 256), ectx = e.getContext('2d');
    var en = makeNoise(3), en2 = makeNoise(7);
    var ei = ectx.createImageData(512, 256);
    for (var y = 0; y < 256; y++) for (var x = 0; x < 512; x++) {
      var u = x / 512, v = y / 256;
      var lat = Math.abs(v - 0.5) * 2;
      // wrap noise around x so seam hides
      var wx = Math.cos(u * Math.PI * 2) * 2 + 4, wy = Math.sin(u * Math.PI * 2) * 2 + 4;
      var land = fbm(en, wx + v * 5, wy + v * 5, 5) + fbm(en2, u * 9, v * 5, 3) * 0.35;
      var col;
      if (land > 0.67) {
        var h = (land - 0.67) / 0.33;
        col = h > 0.5 ? lerpC([148, 126, 82], [196, 186, 158], (h - .5) * 2)
                      : lerpC([52, 96, 48], [148, 126, 82], h * 2);
      } else {
        var d = Math.pow(land / 0.67, 2);
        col = lerpC([6, 16, 58], [24, 74, 150], d);
      }
      if (lat > 0.82) { // ice caps
        var ice = (lat - 0.82) / 0.18;
        col = lerpC(col, [235, 240, 248], Math.min(1, ice * 2));
      }
      var idx = (y * 512 + x) * 4;
      ei.data[idx] = col[0]; ei.data[idx + 1] = col[1]; ei.data[idx + 2] = col[2]; ei.data[idx + 3] = 255;
    }
    ectx.putImageData(ei, 0, 0);
    T.earth = e;

    // cloud layer (alpha)
    var cl = canvas(512, 256), clctx = cl.getContext('2d');
    var cn = makeNoise(17);
    var ci = clctx.createImageData(512, 256);
    for (var y = 0; y < 256; y++) for (var x = 0; x < 512; x++) {
      var u = x / 512;
      var wx = Math.cos(u * Math.PI * 2) * 4 + 9, wy = Math.sin(u * Math.PI * 2) * 4 + 9;
      var cv = fbm(cn, wx + y / 16, wy + y / 30, 5);
      cv = Math.max(0, (cv - 0.50)) * 3.6;
      var idx = (y * 256 * 2 + x) * 4;
      ci.data[idx] = 255; ci.data[idx + 1] = 255; ci.data[idx + 2] = 255;
      ci.data[idx + 3] = Math.min(255, cv * 255);
    }
    clctx.putImageData(ci, 0, 0);
    T.earthClouds = cl;

    // ---------- deep-space sky with the northern nebula ----------
    var sky = canvas(1024, 512), skctx = sky.getContext('2d');
    skctx.fillStyle = '#020208'; skctx.fillRect(0, 0, 1024, 512);
    var nn = makeNoise(43), nn2 = makeNoise(59);
    var ski = skctx.getImageData(0, 0, 1024, 512);
    for (var y = 0; y < 512; y++) for (var x = 0; x < 1024; x++) {
      var u = x / 1024, v = y / 512;
      // nebula lives around u≈0.75 (north), upper sky
      var du = Math.min(Math.abs(u - 0.75), Math.abs(u - 0.75 + 1), Math.abs(u - 0.75 - 1));
      var mask = Math.max(0, 1 - du * 4.5) * Math.max(0, 1 - Math.abs(v - 0.32) * 2.6);
      if (mask > 0.01) {
        var n1 = fbm(nn, u * 14, v * 14, 5);
        var n2 = fbm(nn2, u * 22 + 9, v * 22, 4);
        var mag = Math.pow(Math.max(0, n1 - 0.36) * mask * 3.4, 1.3);
        var grn = Math.pow(Math.max(0, n2 - 0.46) * mask * 2.6, 1.5);
        var idx = (y * 1024 + x) * 4;
        ski.data[idx] = Math.min(255, ski.data[idx] + mag * 230 + grn * 40);
        ski.data[idx + 1] = Math.min(255, ski.data[idx + 1] + mag * 30 + grn * 190);
        ski.data[idx + 2] = Math.min(255, ski.data[idx + 2] + mag * 240 + grn * 120);
      }
    }
    skctx.putImageData(ski, 0, 0);
    // stars
    var srnd = mulberry(101);
    for (var i = 0; i < 900; i++) {
      var sx = srnd() * 1024, sy = srnd() * 512, sz = srnd();
      skctx.fillStyle = 'rgba(255,255,255,' + (0.3 + sz * 0.7) + ')';
      var ss = sz > 0.94 ? 2 : 1;
      skctx.fillRect(sx, sy, ss, ss);
    }
    T.spaceSky = sky;

    // ---------- venus terrace sky: lavender day, painted clouds ----------
    var vs = canvas(1024, 512), vctx = vs.getContext('2d');
    var vgrad = vctx.createLinearGradient(0, 0, 0, 512);
    vgrad.addColorStop(0, '#3a3080');
    vgrad.addColorStop(0.42, '#7a6ac0');
    vgrad.addColorStop(0.72, '#c79ad0');
    vgrad.addColorStop(1, '#e8c8d8');
    vctx.fillStyle = vgrad; vctx.fillRect(0, 0, 1024, 512);
    // cloud blobs, pink-lit from below
    var crnd = mulberry(303);
    for (var i = 0; i < 90; i++) {
      var cx = crnd() * 1024, cy = 60 + crnd() * 300, cr = 18 + crnd() * 46;
      var cg = vctx.createRadialGradient(cx, cy, 2, cx, cy, cr);
      var bright = 0.5 + crnd() * 0.4;
      cg.addColorStop(0, 'rgba(255,246,252,' + bright + ')');
      cg.addColorStop(0.6, 'rgba(240,214,238,' + bright * 0.5 + ')');
      cg.addColorStop(1, 'rgba(240,214,238,0)');
      vctx.fillStyle = cg;
      vctx.beginPath(); vctx.ellipse(cx, cy, cr * 1.8, cr * 0.62, 0, 0, 7); vctx.fill();
    }
    T.venusSky = vs;

    // ---------- circuit chrome for the Custodian masks ----------
    var cc = canvas(512, 512), ccx = cc.getContext('2d');
    var mgrad = ccx.createLinearGradient(0, 0, 0, 512);
    mgrad.addColorStop(0, '#cfeadf');
    mgrad.addColorStop(0.35, '#8fc4ae');
    mgrad.addColorStop(0.65, '#5f9a84');
    mgrad.addColorStop(1, '#3d6e5c');
    ccx.fillStyle = mgrad; ccx.fillRect(0, 0, 512, 512);
    // circuit traces
    var trnd = mulberry(505);
    ccx.strokeStyle = 'rgba(30,60,80,0.55)'; ccx.lineWidth = 2;
    for (var i = 0; i < 130; i++) {
      var tx = trnd() * 512, ty = trnd() * 512;
      ccx.beginPath(); ccx.moveTo(tx, ty);
      var steps = 2 + (trnd() * 4 | 0);
      for (var s = 0; s < steps; s++) {
        if (trnd() < 0.5) tx += (trnd() - 0.5) * 90; else ty += (trnd() - 0.5) * 90;
        ccx.lineTo(tx, ty);
      }
      ccx.stroke();
      // solder pad
      ccx.fillStyle = trnd() < 0.5 ? 'rgba(200,240,255,0.7)' : 'rgba(120,60,140,0.6)';
      ccx.fillRect(tx - 3, ty - 3, 6, 6);
    }
    // chip blocks
    for (var i = 0; i < 26; i++) {
      var bx = trnd() * 480, by = trnd() * 480;
      ccx.fillStyle = 'rgba(40,70,90,0.5)';
      ccx.fillRect(bx, by, 14 + trnd() * 26, 10 + trnd() * 18);
      ccx.strokeStyle = 'rgba(210,255,240,0.5)'; ccx.lineWidth = 1;
      ccx.strokeRect(bx, by, 14, 10);
    }
    // face features aligned to sphere UV (front of face ≈ u 0.5)
    // hollow eye sockets — empty, like the plate
    ccx.fillStyle = 'rgba(3,8,7,0.98)';
    ccx.beginPath(); ccx.ellipse(213, 208, 34, 21, -0.14, 0, 7); ccx.fill();
    ccx.beginPath(); ccx.ellipse(299, 208, 34, 21, 0.14, 0, 7); ccx.fill();
    // inner glint at socket rim
    ccx.strokeStyle = 'rgba(220,255,240,0.55)'; ccx.lineWidth = 3;
    ccx.beginPath(); ccx.ellipse(213, 208, 34, 21, -0.14, 0, 7); ccx.stroke();
    ccx.beginPath(); ccx.ellipse(299, 208, 34, 21, 0.14, 0, 7); ccx.stroke();
    // brow shading
    ccx.fillStyle = 'rgba(20,40,36,0.5)';
    ccx.beginPath(); ccx.ellipse(256, 180, 96, 18, 0, 0, 7); ccx.fill();
    // nose shadow
    ccx.fillStyle = 'rgba(16,32,28,0.5)';
    ccx.beginPath(); ccx.ellipse(256, 258, 14, 26, 0, 0, 7); ccx.fill();
    // parted mouth
    ccx.fillStyle = 'rgba(4,10,8,0.95)';
    ccx.beginPath(); ccx.ellipse(256, 320, 36, 10, 0, 0, 7); ccx.fill();
    ccx.fillStyle = 'rgba(190,230,215,0.55)';
    ccx.beginPath(); ccx.ellipse(256, 305, 40, 6, 0, 0, 7); ccx.fill();
    ccx.fillStyle = 'rgba(120,180,160,0.5)';
    ccx.beginPath(); ccx.ellipse(256, 336, 34, 6, 0, 0, 7); ccx.fill();
    T.circuit = cc;

    // ---------- clock faces ----------
    // grandfather clock face: parchment, roman numerals
    T.clockFace = clockFaceCanvas('#f2e6c8', '#3a2a10', true, 0);
    // rune clock: bone-white, strange glyphs
    T.runeFace = clockFaceCanvas('#efe9dc', '#4a3a20', false, 909);

    // floor sundial ring: gold with roman numerals (transparent center)
    var fd = canvas(512, 512), fctx = fd.getContext('2d');
    fctx.clearRect(0, 0, 512, 512);
    fctx.strokeStyle = '#c99026'; fctx.lineWidth = 44;
    fctx.beginPath(); fctx.arc(256, 256, 220, 0, 7); fctx.stroke();
    fctx.strokeStyle = '#8a5a10'; fctx.lineWidth = 4;
    fctx.beginPath(); fctx.arc(256, 256, 242, 0, 7); fctx.stroke();
    fctx.beginPath(); fctx.arc(256, 256, 198, 0, 7); fctx.stroke();
    var romans = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    fctx.fillStyle = '#5a3c08';
    fctx.font = 'bold 34px "Times New Roman", serif';
    fctx.textAlign = 'center'; fctx.textBaseline = 'middle';
    for (var i = 0; i < 12; i++) {
      var ang = i / 12 * Math.PI * 2 - Math.PI / 2;
      var rx = 256 + Math.cos(ang) * 220, ry = 256 + Math.sin(ang) * 220;
      fctx.save(); fctx.translate(rx, ry); fctx.rotate(ang + Math.PI / 2);
      fctx.fillText(romans[i], 0, 0); fctx.restore();
    }
    T.dialRing = fd;

    // ---------- the Venus painting (for the CRT) ----------
    T.venusPainting = venusCanvas();

    // ---------- foliage ----------
    T.frond = frondCanvas();
    T.ivy = ivyCanvas();

    // ---------- portal shimmer ----------
    var po = canvas(256, 256), poctx = po.getContext('2d');
    var pg = poctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    pg.addColorStop(0, 'rgba(255,255,255,0.95)');
    pg.addColorStop(0.35, 'rgba(190,150,255,0.75)');
    pg.addColorStop(0.75, 'rgba(90,60,200,0.35)');
    pg.addColorStop(1, 'rgba(40,20,120,0)');
    poctx.fillStyle = pg; poctx.fillRect(0, 0, 256, 256);
    T.portal = po;

    return T;
  }

  function clockFaceCanvas(bg, fg, roman, seed) {
    var c = canvas(256, 256), ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
    ctx.strokeStyle = fg; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(128, 128, 122, 0, 7); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(128, 128, 100, 0, 7); ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (roman) {
      var romans = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      ctx.font = 'bold 22px "Times New Roman", serif';
      for (var i = 0; i < 12; i++) {
        var ang = i / 12 * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(romans[i], 128 + Math.cos(ang) * 84, 128 + Math.sin(ang) * 84);
      }
    } else {
      // runic glyphs — angular strokes, a clock that counts something else
      var rnd = mulberry(seed || 1);
      ctx.strokeStyle = fg; ctx.lineWidth = 3; ctx.lineCap = 'square';
      for (var i = 0; i < 12; i++) {
        var ang = i / 12 * Math.PI * 2 - Math.PI / 2;
        var gx = 128 + Math.cos(ang) * 86, gy = 128 + Math.sin(ang) * 86;
        ctx.save(); ctx.translate(gx, gy);
        var strokes = 2 + (rnd() * 3 | 0);
        ctx.beginPath();
        var px = -6 + rnd() * 4, py = -9;
        ctx.moveTo(px, py);
        for (var s = 0; s < strokes; s++) {
          px += (rnd() - 0.3) * 12; py += rnd() * 9;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    // minute ticks
    ctx.strokeStyle = fg; ctx.lineWidth = 2;
    for (var i = 0; i < 60; i++) {
      var ang = i / 60 * Math.PI * 2;
      var r1 = (i % 5 === 0) ? 108 : 114;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(ang) * r1, 128 + Math.sin(ang) * r1);
      ctx.lineTo(128 + Math.cos(ang) * 119, 128 + Math.sin(ang) * 119);
      ctx.stroke();
    }
    return c;
  }

  // Simplified Birth of Venus — teal sea, scallop shell, figure with
  // wind-blown copper hair. Painted loose; it reads through CRT glass.
  function venusCanvas() {
    var c = canvas(256, 300), ctx = c.getContext('2d');
    // sky
    var sk = ctx.createLinearGradient(0, 0, 0, 180);
    sk.addColorStop(0, '#bcd3d8'); sk.addColorStop(1, '#dbe8da');
    ctx.fillStyle = sk; ctx.fillRect(0, 0, 256, 180);
    // sea
    var sea = ctx.createLinearGradient(0, 150, 0, 300);
    sea.addColorStop(0, '#5f9186'); sea.addColorStop(1, '#37635c');
    ctx.fillStyle = sea; ctx.fillRect(0, 150, 256, 150);
    // little waves
    ctx.strokeStyle = 'rgba(230,240,235,0.55)'; ctx.lineWidth = 2;
    for (var i = 0; i < 26; i++) {
      var wy = 160 + Math.random() * 130, wx = Math.random() * 236;
      ctx.beginPath(); ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 8, wy - 3, wx + 18, wy);
      ctx.stroke();
    }
    // scallop shell
    ctx.fillStyle = '#e8ddc4';
    ctx.beginPath(); ctx.ellipse(128, 262, 74, 26, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#b7a67e'; ctx.lineWidth = 2;
    for (var i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(128, 268);
      ctx.lineTo(128 + i * 22, 240); ctx.stroke();
    }
    // figure
    ctx.fillStyle = '#f2ddc9'; // skin
    // legs / body
    ctx.beginPath(); ctx.ellipse(128, 205, 13, 46, 0, 0, 7); ctx.fill();
    // chest/shoulders
    ctx.beginPath(); ctx.ellipse(128, 152, 17, 22, 0, 0, 7); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(128, 118, 13, 0, 7); ctx.fill();
    // arms (one across, one down)
    ctx.strokeStyle = '#f2ddc9'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(116, 150); ctx.quadraticCurveTo(110, 175, 124, 190); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(140, 150); ctx.quadraticCurveTo(152, 168, 142, 186); ctx.stroke();
    // copper hair, wind-blown to the right, hand-length
    ctx.strokeStyle = '#c07830'; ctx.lineWidth = 7;
    for (var i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(124 + i, 108);
      ctx.bezierCurveTo(150 + i * 4, 120 + i * 6, 165 + i * 5, 160 + i * 9, 148 + i * 3, 208 + i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#c07830';
    ctx.beginPath(); ctx.ellipse(128, 110, 15, 10, 0, Math.PI, 0); ctx.fill();
    // face hint
    ctx.fillStyle = '#9c6b4e';
    ctx.fillRect(123, 117, 2, 2); ctx.fillRect(131, 117, 2, 2);
    // drifting roses (Botticelli's falling flowers)
    for (var i = 0; i < 9; i++) {
      var rx2 = 20 + Math.random() * 80, ry2 = 40 + Math.random() * 140;
      if (Math.random() < 0.5) rx2 = 190 + Math.random() * 50;
      ctx.fillStyle = '#e8a8b8';
      ctx.beginPath(); ctx.arc(rx2, ry2, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#f5d2da';
      ctx.beginPath(); ctx.arc(rx2 - 1, ry2 - 1, 2, 0, 7); ctx.fill();
    }
    return c;
  }

  function frondCanvas() {
    var c = canvas(128, 256), ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);
    ctx.strokeStyle = '#2e6b2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(64, 250); ctx.lineTo(64, 10); ctx.stroke();
    for (var i = 0; i < 22; i++) {
      var t = i / 22;
      var y = 240 - t * 225;
      var len = 52 * (1 - Math.abs(t - 0.45) * 1.3);
      var g = ctx.createLinearGradient(64 - len, y, 64 + len, y);
      g.addColorStop(0, '#1e5220'); g.addColorStop(.5, '#3f8f38'); g.addColorStop(1, '#1e5220');
      ctx.strokeStyle = g; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(64, y);
      ctx.quadraticCurveTo(64 - len * 0.6, y - 4, 64 - len, y + 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(64, y);
      ctx.quadraticCurveTo(64 + len * 0.6, y - 4, 64 + len, y + 14); ctx.stroke();
    }
    return c;
  }

  function ivyCanvas() {
    var c = canvas(64, 64), ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#2f7030';
    // heart-ish ivy leaf
    ctx.beginPath();
    ctx.moveTo(32, 60);
    ctx.bezierCurveTo(2, 40, 6, 8, 32, 16);
    ctx.bezierCurveTo(58, 8, 62, 40, 32, 60);
    ctx.fill();
    ctx.strokeStyle = '#1c4a1e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, 58); ctx.lineTo(32, 18); ctx.stroke();
    return c;
  }

  return { makeAll: makeAll, tex: tex, canvas: canvas, mulberry: mulberry, makeNoise: makeNoise, fbm: fbm };
})();

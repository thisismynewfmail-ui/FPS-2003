/* TEMPUS — HUD. Amber 2003 readouts, the hourglass meter, and the
   letterboxed voice of the corridors. */

var HUD = (function () {

  var el = {};
  var msgTimer = 0, subTimer = 0, zoneTimer = 0;
  var dmgOpacity = 0, whiteOpacity = 0, whiteFadeSpeed = 1;

  function $(id) { return document.getElementById(id); }

  function init() {
    el.hud = $('hud');
    el.health = $('health-num');
    el.ammo = $('ammo-num');
    el.hgTop = $('hg-top-sand');
    el.hgBot = $('hg-bot-sand');
    el.tint = $('tempus-tint');
    el.dmg = $('damage-flash');
    el.white = $('white-fade');
    el.msg = $('message');
    el.sub = $('submessage');
    el.zone = $('zone-title');
    el.keys = {
      past: $('key-past'),
      present: $('key-present'),
      future: $('key-future')
    };
  }

  function show(on) { el.hud.classList.toggle('hidden', !on); }

  function setHealth(hp) {
    el.health.textContent = Math.ceil(hp);
    el.health.classList.toggle('low', hp <= 30);
  }

  function setAmmo(n) { el.ammo.textContent = n; }

  function setTempus(v, dilated) {
    el.hgTop.style.height = v + '%';
    el.hgBot.style.height = (100 - v) + '%';
    el.tint.style.opacity = dilated ? 1 : 0;
  }

  function giveKey(id) {
    if (el.keys[id]) el.keys[id].classList.add('got');
  }

  function resetKeys() {
    for (var k in el.keys) el.keys[k].classList.remove('got');
  }

  function message(text, sub, secs) {
    el.msg.textContent = text;
    el.msg.style.opacity = 1;
    msgTimer = secs || 3;
    if (sub !== undefined && sub !== null) {
      el.sub.textContent = sub;
      el.sub.style.opacity = 1;
      subTimer = (secs || 3) + 0.5;
    }
  }

  function zoneTitle(text) {
    el.zone.textContent = text;
    el.zone.style.opacity = 1;
    zoneTimer = 3.4;
  }

  function damageFlash() { dmgOpacity = 0.85; }

  function flashWhite(dur) {
    whiteOpacity = 1; whiteFadeSpeed = 1 / (dur || 0.5);
  }

  function update(dt) {
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) el.msg.style.opacity = 0; }
    if (subTimer > 0) { subTimer -= dt; if (subTimer <= 0) el.sub.style.opacity = 0; }
    if (zoneTimer > 0) { zoneTimer -= dt; if (zoneTimer <= 0) el.zone.style.opacity = 0; }
    if (dmgOpacity > 0) {
      dmgOpacity = Math.max(0, dmgOpacity - dt * 1.8);
      el.dmg.style.opacity = dmgOpacity;
    }
    if (whiteOpacity > 0) {
      whiteOpacity = Math.max(0, whiteOpacity - dt * whiteFadeSpeed);
      el.white.style.opacity = whiteOpacity;
    }
  }

  return {
    init: init, show: show,
    setHealth: setHealth, setAmmo: setAmmo, setTempus: setTempus,
    giveKey: giveKey, resetKeys: resetKeys,
    message: message, zoneTitle: zoneTitle,
    damageFlash: damageFlash, flashWhite: flashWhite,
    update: update
  };
})();

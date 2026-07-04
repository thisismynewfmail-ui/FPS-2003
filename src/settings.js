/* TEMPUS — settings. The pause menu's back room: the voice endpoint
   (any OpenAI-compatible server, e.g. LM Studio), full sampling
   controls, template mode, volumes, and Minuette's memory. Persisted
   to localStorage. */

var SETTINGS = (function () {

  var LS = 'tempus.settings';

  var DEFAULTS = {
    endpoint: 'http://10.0.0.136:5000/v1',
    apiKey: '',
    model: '',
    template: 'chat',            // 'chat' (server Jinja) | 'chatml' (Qwen ChatML by hand)
    temperature: 0.8,
    top_p: 0.95,
    top_k: 40,
    min_p: 0.05,
    repeat_penalty: 1.1,
    presence_penalty: 0,
    frequency_penalty: 0,
    max_tokens: 160,
    memoryCount: 12,             // how many date-stamped memories she recalls per reply
    ambientAI: false,
    volMaster: 0.55,
    volMusic: 0.5,
    volVoice: 0.7
  };

  var cur = {};

  function load() {
    cur = Object.assign({}, DEFAULTS);
    try {
      var s = JSON.parse(localStorage.getItem(LS) || '{}');
      for (var k in DEFAULTS) if (s[k] !== undefined) cur[k] = s[k];
    } catch (e) {}
    applyVolumes();
    // if a LAN host is serving us, its shared settings win (so every
    // machine on the network shares one endpoint/sampling config)
    fetch('/api/settings').then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.exists && j.settings) {
        for (var k in DEFAULTS) if (j.settings[k] !== undefined) cur[k] = j.settings[k];
        applyVolumes();
        try { localStorage.setItem(LS, JSON.stringify(cur)); } catch (e) {}
        if (typeof toUI === 'function') toUI();
      }
    }).catch(function () {});
  }

  function save() {
    try { localStorage.setItem(LS, JSON.stringify(cur)); } catch (e) {}
    // mirror to the LAN host so saved settings persist across browsers
    fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: cur })
    }).catch(function () {});
  }

  function applyVolumes() {
    AUDIO.setVolumes({ master: cur.volMaster, music: cur.volMusic, voice: cur.volVoice });
  }

  function get() { return cur; }

  // ---------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  var FIELDS = [
    ['set-endpoint', 'endpoint', 'str'],
    ['set-apikey', 'apiKey', 'str'],
    ['set-model', 'model', 'str'],
    ['set-template', 'template', 'str'],
    ['set-temp', 'temperature', 'num'],
    ['set-topp', 'top_p', 'num'],
    ['set-topk', 'top_k', 'int'],
    ['set-minp', 'min_p', 'num'],
    ['set-repeat', 'repeat_penalty', 'num'],
    ['set-presence', 'presence_penalty', 'num'],
    ['set-frequency', 'frequency_penalty', 'num'],
    ['set-maxtok', 'max_tokens', 'int'],
    ['set-memcount', 'memoryCount', 'int'],
    ['set-ambient', 'ambientAI', 'bool'],
    ['set-vol-master', 'volMaster', 'num'],
    ['set-vol-music', 'volMusic', 'num'],
    ['set-vol-voice', 'volVoice', 'num']
  ];

  function toUI() {
    FIELDS.forEach(function (f) {
      var el = $(f[0]);
      if (!el) return;
      if (f[2] === 'bool') el.checked = !!cur[f[1]];
      else el.value = cur[f[1]];
    });
    refreshMemCount();
  }

  function fromUI() {
    FIELDS.forEach(function (f) {
      var el = $(f[0]);
      if (!el) return;
      if (f[2] === 'bool') cur[f[1]] = el.checked;
      else if (f[2] === 'num') { var v = parseFloat(el.value); if (!isNaN(v)) cur[f[1]] = v; }
      else if (f[2] === 'int') { var vi = parseInt(el.value, 10); if (!isNaN(vi)) cur[f[1]] = vi; }
      else cur[f[1]] = el.value.trim();
    });
  }

  function status(msg, ok) {
    var el = $('set-status');
    el.textContent = msg;
    el.className = ok === true ? 'ok' : ok === false ? 'err' : '';
  }

  function refreshMemCount() {
    var n = (window.DIALOGUE ? DIALOGUE.memories.length : 0);
    $('set-mem-count').textContent = n + ' memories kept';
  }

  function testApi() {
    fromUI();
    status('reaching into the wires...', null);
    var url = cur.endpoint.replace(/\/+$/, '') + '/models';
    var headers = {};
    if (cur.apiKey) headers['Authorization'] = 'Bearer ' + cur.apiKey;
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 6000);
    fetch(url, { headers: headers, signal: ctrl.signal })
      .then(function (r) {
        clearTimeout(to);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        var models = (j.data || []).map(function (m) { return m.id; });
        var dl = $('set-model-list');
        dl.innerHTML = '';
        models.forEach(function (m) {
          var o = document.createElement('option');
          o.value = m; dl.appendChild(o);
        });
        if (!cur.model && models.length) { cur.model = models[0]; $('set-model').value = models[0]; }
        status('connected — ' + models.length + ' model(s): ' + (models.slice(0, 3).join(', ') || 'none'), true);
      })
      .catch(function (e) {
        status('unreachable (' + e.message + ') — check the address and enable CORS on the server', false);
      });
  }

  function testChat() {
    fromUI(); save();
    status('asking Minuette to say hello through the wires...', null);
    DIALOGUE.llmRequest([
      { role: 'system', content: 'You are Minuette, a friendly clockwork spirit. Reply with one short greeting.' },
      { role: 'user', content: 'Say hello.' }
    ], { max_tokens: 40 }).then(function (t) {
      status(t ? ('she says: "' + t.slice(0, 120) + '"') : 'empty reply — is a model loaded?', !!t);
    }).catch(function (e) {
      status('no answer (' + e.message + ')', false);
    });
  }

  function init() {
    load();
    toUI();

    $('set-apply').addEventListener('click', function () {
      fromUI(); save(); applyVolumes();
      status('applied & saved', true);
      AUDIO.menuGo();
    });
    $('set-test').addEventListener('click', testApi);
    $('set-testchat').addEventListener('click', testChat);
    $('set-defaults').addEventListener('click', function () {
      cur = Object.assign({}, DEFAULTS);
      toUI(); save(); applyVolumes();
      status('defaults restored', true);
    });
    $('set-clearmem').addEventListener('click', function () {
      DIALOGUE.clearMemory();
      refreshMemCount();
      status('her memories drift away like sand...', true);
    });
    $('set-close').addEventListener('click', function () { hide(); });

    // volume sliders apply live
    ['set-vol-master', 'set-vol-music', 'set-vol-voice'].forEach(function (id) {
      $(id).addEventListener('input', function () { fromUI(); applyVolumes(); });
    });

    // keep keys out of the game while typing
    $('settings-panel').addEventListener('keydown', function (e) { e.stopPropagation(); });
  }

  function show() {
    toUI();
    $('settings-panel').classList.remove('hidden');
    $('pause-menu-items').classList.add('hidden');
    status('', null);
  }

  function hide() {
    $('settings-panel').classList.add('hidden');
    $('pause-menu-items').classList.remove('hidden');
  }

  function isOpen() { return !$('settings-panel').classList.contains('hidden'); }

  return { init: init, get: get, show: show, hide: hide, isOpen: isOpen, save: save };
})();

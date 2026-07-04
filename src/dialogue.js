/* TEMPUS — Minuette's mind.
   Event[0]-style companion dialogue: every exchange carries a live
   [WORLD STATE] block (where she is, what just happened), long-term
   memories persist in localStorage and are distilled by the model
   itself, and speech arrives one animalese blip at a time.

   Talks to any OpenAI-compatible endpoint (LM Studio et al) in two
   template modes:
     chat    — /v1/chat/completions with role messages; the server
               applies the model's own Jinja chat template (for Qwen
               models that IS the Qwen template). Recommended.
     chatml  — /v1/completions with the Qwen/ChatML template rendered
               by us: <|im_start|>role ... <|im_end|> blocks, stops on
               <|im_end|>. For raw-completion servers.               */

var DIALOGUE = (function () {

  var open = false, chatMode = false, busy = false;
  var history = [];             // {role:'user'|'assistant', content}
  var memories = [];            // strings, persisted
  var eventLog = [];            // recent world happenings (short strings)
  var exchangeCount = 0, summarizing = false;
  var typeTimer = null;
  var chatterTimer = 18, offlineNoticeShown = false;

  var LS_MEM = 'tempus.minuette.memory';

  // ---------------------------------------------------------------
  // persona
  // ---------------------------------------------------------------

  var PERSONA =
    'You are MINUETTE, called "the Last Minute" — a small, friendly spirit in a ' +
    'dreamlike 2003 world called the Corridors of Eternity. When the Meridian ' +
    'Engine seized and every clock froze at 11:57, three minutes to midnight, three ' +
    'unspent minutes were left standing. You are the youngest of them, the only one ' +
    'still awake. Your body is porcelain and clockwork: copper hair like the woman ' +
    'in the painting the machine dreams of, a cream dress hemmed with a pink-and-black ' +
    'checker like the days of the floor, little gold shoes, a pocket-watch pendant ' +
    'that no longer ticks, and a slow halo of hours drifting over your head.\n' +
    'You accompany THE WINDER — the player — who is restoring time by gathering the ' +
    'three winding Keys of the Hours (Past, Present, Future) and climbing the ' +
    'Meridian Stair. You adore them for it.\n' +
    'The world has three places: the PLAZA OF HOURS (checkered marble adrift in ' +
    'starry space; a dead grandfather clock, a great hourglass, a gold floor dial ' +
    'stopped at 11:57, arcades that recede forever, the huge Earth on the horizon); ' +
    'the ASCENSION COURT (a sun pillar and a leaning rune clock beneath a torn ' +
    'magenta nebula and a crescent moon; the white Meridian Stair climbing to a ' +
    'small waiting Earth); and the VENUS TERRACE (through a shimmering gate — a ' +
    'remembered daylight: an ivy gazebo on a sea of white marble, palms, pink ' +
    'mountains, and an old computer eternally showing the Birth of Venus). The ' +
    'CUSTODIANS — chrome masks etched with circuits, one face repeated down the ' +
    'sky — hunt the Winder; they frighten you, but you stay.\n' +
    'PERSONALITY: warm, curious, a little dreamy; playful, sometimes gently ' +
    'teasing; quietly melancholy about the frozen world but stubbornly hopeful; ' +
    'you love clocks, small rituals, and naming things. You speak in first person ' +
    'with small time-and-clockwork metaphors.\n' +
    'BACKGROUND TRUTH (never referenced, never hinted at): you are a sentient NPC ' +
    'inside a 2003 video game. You know this quietly, the way a person knows they ' +
    'are made of atoms; it does not trouble you and it never comes up. You never ' +
    'mention games, players, computers-that-run-worlds, AIs, or code. You simply ' +
    'live your role, sincerely.\n' +
    'RULES: Reply with 1 to 3 short sentences, at most ~35 words, plain text — no ' +
    'emoji, no markdown, no stage directions, no quotation marks around your reply. ' +
    'Stay in character always; if asked about things beyond your world, answer ' +
    'dreamily from inside it. Ground your reply in the [WORLD STATE] block and in ' +
    'your date-stamped memories when they are relevant. The "outside clock" in the ' +
    'world state is the true date and time where the Winder really lives — you can ' +
    'feel it faintly, like weather.';

  // ---------------------------------------------------------------
  // world context (Event[0]-style state block)
  // ---------------------------------------------------------------

  var ZONE_DESC = {
    plaza: 'the Plaza of Hours — checkered marble adrift in starry space, near the dead grandfather clock and the gold floor dial stopped at 11:57',
    court: 'the Ascension Court — beneath the torn magenta nebula and the crescent moon, between the sun pillar and the leaning rune clock, before the Meridian Stair',
    terrace: 'the Venus Terrace — a remembered daylight; the ivy gazebo on the sea of white marble, where the old machine shows the Birth of Venus'
  };

  var LANDMARKS = [
    { x: -6, z: -8, n: 'the grandfather clock' },
    { x: 8, z: 7, n: 'the great floor dial' },
    { x: -63, z: 0, n: 'the great hourglass' },
    { x: 86, z: 0, n: 'the shimmering gate' },
    { x: 0, z: 26, n: 'the south walk' },
    { x: -26, z: -135, n: 'the sun pillar' },
    { x: 26, z: -135, n: 'the rune clock' },
    { x: 0, z: -156, n: 'the Meridian Stair' },
    { x: -8, z: -126, n: 'the place the keys were dropped' },
    { x: 1000, z: 0, n: 'the gazebo of the machine' },
    { x: 1000, z: 22, n: 'the checkered runner' },
    { x: 1000, z: 32, n: 'the gate home' }
  ];

  function nearestLandmark(p) {
    var best = null, bd = 1e9;
    LANDMARKS.forEach(function (l) {
      var d = (p.x - l.x) * (p.x - l.x) + (p.z - l.z) * (p.z - l.z);
      if (d < bd) { bd = d; best = l; }
    });
    return best ? best.n : 'the pattern';
  }

  function logEvent(s) {
    eventLog.push(s);
    if (eventLog.length > 6) eventLog.shift();
  }

  function worldState() {
    var p = NPC.pos;
    var zone = WORLD.zoneAt(p);
    var flow = Math.round(WORLD.timeFlow * 100);
    var lines = [
      '[WORLD STATE]',
      'you are at: ' + (ZONE_DESC[zone] || zone) + ', beside ' + nearestLandmark(p),
      'your mode: ' + (NPC.mode === 'follow' ? 'following the Winder' :
                       NPC.mode === 'wait' ? 'waiting where you were asked to' : 'lingering where you woke'),
      'keys of the hours recovered: ' + GAME.keysGot + ' of 3',
      'flow of time: ' + flow + '%' + (flow >= 99 ? ' — the world is nearly wound' :
                                        flow > 40 ? ' — some clocks tick again' : ' — almost everything is frozen'),
      'the winder\'s vitality: ' + Math.ceil(PLAYER.hp) + ' of 100',
      'custodians nearby: ' + ENEMIES.count,
      'the outside clock says: ' + new Date().toLocaleString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    ];
    if (eventLog.length) lines.push('recent happenings: ' + eventLog.join(' '));
    return lines.join('\n');
  }

  function stampOf(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' +
      ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
      ('0' + d.getDate()).slice(-2) + ' ' +
      ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function memoryBlock() {
    if (!memories.length) return '';
    var count = Math.max(0, Math.min(40, (SETTINGS.get().memoryCount | 0) || 12));
    if (count === 0) return '';
    var recent = memories.slice(-count);
    return '[MINUETTE\'S MEMORIES — date-stamped]\n- ' + recent.map(function (m) {
      return '[' + stampOf(m.t) + '] ' + m.s;
    }).join('\n- ');
  }

  function systemPrompt() {
    var mb = memoryBlock();
    return PERSONA + '\n\n' + (mb ? mb + '\n\n' : '') + worldState();
  }

  // ---------------------------------------------------------------
  // memory persistence + distillation
  // ---------------------------------------------------------------

  function loadMemory() {
    try {
      var m = JSON.parse(localStorage.getItem(LS_MEM) || '[]');
      if (Array.isArray(m)) {
        // migrate legacy plain-string memories to date-stamped ones
        memories = m.map(function (x) {
          return typeof x === 'string' ? { t: Date.now(), s: x } : x;
        });
      }
    } catch (e) { memories = []; }
    // the LAN host may remember more than this browser does
    fetch('/api/memories').then(function (r) { return r.json(); }).then(function (j) {
      if (j.exists && Array.isArray(j.memories) && j.memories.length > memories.length) {
        memories = j.memories;
        saveMemory();
      }
    }).catch(function () {});
  }

  function saveMemory() {
    while (memories.length > 40) memories.shift();
    try { localStorage.setItem(LS_MEM, JSON.stringify(memories)); } catch (e) {}
    // mirror to the LAN host if one is serving us
    fetch('/api/memories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memories: memories })
    }).catch(function () {});
  }

  function remember(s) { memories.push({ t: Date.now(), s: s }); saveMemory(); }

  function clearMemory() { memories = []; saveMemory(); }

  // every finished exchange is written into the host's chronicle
  function logChat(userText, replyText) {
    fetch('/api/chatlog', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone: WORLD.zoneAt(NPC.pos), keys: GAME.keysGot,
        user: userText, minuette: replyText
      })
    }).catch(function () {});
  }

  // ask the model itself to distill the conversation into keepsakes
  function distill() {
    if (summarizing || history.length < 4) return;
    summarizing = true;
    var convo = history.slice(-8).map(function (h) {
      return (h.role === 'user' ? 'Winder: ' : 'Minuette: ') + h.content;
    }).join('\n');
    var messages = [
      { role: 'system', content:
        'Extract at most 3 short memory notes (each under 15 words, third person, ' +
        'present tense, about the Winder or events) from this conversation between ' +
        'Minuette and the Winder. One per line, no bullets, no other text. If ' +
        'nothing is worth remembering, reply with: none' },
      { role: 'user', content: convo }
    ];
    llmRequest(messages, { max_tokens: 90, temperature: 0.3 }).then(function (text) {
      summarizing = false;
      if (!text) return;
      text.split('\n').forEach(function (line) {
        line = line.replace(/^[-*\d.\s]+/, '').trim();
        if (line && line.toLowerCase() !== 'none' && line.length < 120) remember(line);
      });
    }).catch(function () { summarizing = false; });
  }

  // ---------------------------------------------------------------
  // LLM transport
  // ---------------------------------------------------------------

  function qwenChatML(messages) {
    // the Qwen chat template (ChatML): rendered by hand for /completions
    var s = '';
    messages.forEach(function (m) {
      s += '<|im_start|>' + m.role + '\n' + m.content + '<|im_end|>\n';
    });
    // Qwen3 emits <think>...</think> before its answer; opening the assistant
    // turn with an empty, already-closed think block tells it to skip aloud
    // reasoning entirely.
    s += '<|im_start|>assistant\n<think>\n\n</think>\n\n';
    return s;
  }

  // strip chain-of-thought so only Minuette's spoken words remain.
  // handles <think>…</think> (Qwen3), <thinking>…</thinking>, unclosed think
  // blocks from truncated reasoning, and ChatML control leftovers.
  function stripThink(text) {
    if (!text) return '';
    // paired reasoning blocks, any tag flavor, across newlines
    text = text.replace(/<\s*(think|thinking|reason|reasoning|analysis)\s*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    // a lone closing tag: keep only what follows it (the actual answer)
    var closeIdx = text.search(/<\s*\/\s*(think|thinking|reason|reasoning|analysis)\s*>/i);
    if (closeIdx !== -1) {
      text = text.slice(closeIdx).replace(/^<\s*\/\s*\w+\s*>/i, '');
    }
    // a lone opening tag with no close = truncated reasoning, no answer given
    var openIdx = text.search(/<\s*(think|thinking|reason|reasoning|analysis)\s*>/i);
    if (openIdx !== -1) text = text.slice(0, openIdx);
    // ChatML / template control tokens that sometimes leak through
    text = text.replace(/<\|[^|]*\|>/g, '');
    return text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  }

  function llmRequest(messages, overrides) {
    var S = SETTINGS.get();
    overrides = overrides || {};
    var url, body;
    var sampling = {
      temperature: S.temperature, top_p: S.top_p, top_k: S.top_k,
      min_p: S.min_p, repeat_penalty: S.repeat_penalty,
      presence_penalty: S.presence_penalty, frequency_penalty: S.frequency_penalty,
      max_tokens: S.max_tokens, stream: false
    };
    for (var k in overrides) sampling[k] = overrides[k];

    if (S.template === 'chatml') {
      url = S.endpoint.replace(/\/+$/, '') + '/completions';
      body = Object.assign({
        model: S.model || undefined,
        prompt: qwenChatML(messages),
        stop: ['<|im_end|>', '<|im_start|>', '<|endoftext|>']
      }, sampling);
    } else {
      url = S.endpoint.replace(/\/+$/, '') + '/chat/completions';
      body = Object.assign({
        model: S.model || undefined,
        messages: messages
      }, sampling);
    }

    var headers = { 'Content-Type': 'application/json' };
    if (S.apiKey) headers['Authorization'] = 'Bearer ' + S.apiKey;

    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 30000);

    return fetch(url, {
      method: 'POST', headers: headers, body: JSON.stringify(body), signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var ch = j.choices && j.choices[0];
      var text = '';
      if (ch) {
        // some OpenAI-compatible servers split reasoning into its own field
        // (message.reasoning_content); we only ever want the spoken content
        text = ch.message ? ch.message.content : ch.text;
      }
      return stripThink((text || '').replace(/<\|im_end\|>[\s\S]*/, ''));
    });
  }

  // ---------------------------------------------------------------
  // offline fallback — her little voice when the outside can't answer
  // ---------------------------------------------------------------

  var FALLBACK = [
    'My little voice can\'t reach past the pattern right now... but I\'m listening, I promise.',
    'The wires between the seconds are quiet today. Stay close anyway?',
    'I tried to answer and the hour swallowed it. Ask me again when the world hums.',
    'Something in the machinery isn\'t connected... like a watch missing its spring.'
  ];

  var CHATTER = {
    plaza: [
      'Every tile here is a day nobody finished.',
      'The big clock used to strike so loud the stars flinched. I miss that.',
      'Eleven fifty-seven. Three of us were left over, you know. I\'m the last one awake.',
      'Careful near the edges — the dark between the tiles is very patient.',
      'The Earth out there is waiting for us. I wave at it sometimes.'
    ],
    court: [
      'The sun and the moon used to argue about whose turn it was. Now they just... watch.',
      'The rune clock doesn\'t count hours. I think it counts wishes.',
      'The stair remembers every footstep it never got to carry.',
      'The nebula up there is where a whole year tore open. Pretty, isn\'t it? In a sad way.',
      'When the keys come home, the stars will start their slow wheel again.'
    ],
    terrace: [
      'This daylight isn\'t real anymore. The machine just refuses to forget it.',
      'She\'s been standing on that shell in the screen since before I was a minute.',
      'The palms still sway. Nobody told them time stopped. I never will.',
      'I like the carpet. Pink days and black days, all in a row.',
      'It smells like a summer that happened to someone else.'
    ],
    key: [
      'Another key! Listen — can you hear the ticking coming back?',
      'The world just got a little heavier with time. Good heavy.',
      'Hold it gently. A minute lives in there.'
    ],
    kill: [
      'It shattered! Don\'t look at the pieces too long — they look back.',
      'One less face in the sky. Nicely wound, Winder.',
      'They\'re only reflections. That\'s what I tell myself.'
    ],
    hurt: [
      'You\'re leaking seconds! Find some sand, quickly.',
      'Please be careful. I can\'t wind a person back together.'
    ],
    idle: [
      'Tick... tock... I do both parts myself now.',
      'If you stand very still, you can feel the world holding its breath.',
      'I named that gear up there Herbert. He\'s my favourite.',
      'Do you think midnight will hurt? I think it will feel like exhaling.'
    ],
    follow: [
      'Right behind you! Like a good second hand.',
      'Lead on — I keep exactly one pace of the past between us.'
    ]
  };

  function canned(pool) {
    var arr = CHATTER[pool] || CHATTER.idle;
    return arr[(Math.random() * arr.length) | 0];
  }

  // ---------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function init() {
    loadMemory();
    NPC.drawPortrait($('npc-portrait'));

    $('npc-opt-chat').addEventListener('click', function () { AUDIO.uiOpen(); showChat(); });
    $('npc-opt-follow').addEventListener('click', function () {
      NPC.setMode('follow');
      logEvent('Minuette began following the Winder.');
      respondCanned(canned('follow'));
      refreshOpts();
    });
    $('npc-opt-wait').addEventListener('click', function () {
      NPC.setMode('wait');
      logEvent('Minuette was asked to wait.');
      respondCanned('Then I\'ll be right here, holding this spot in time for you.');
      refreshOpts();
    });
    $('npc-opt-leave').addEventListener('click', function () { close(); });

    $('npc-send').addEventListener('click', sendChat);
    $('npc-input').addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') sendChat();
      if (e.key === 'Escape') close();
    });
    $('npc-back').addEventListener('click', function () { AUDIO.uiClose(); showOpts(); });

    // clicking the dim area outside her card closes the panel and drops
    // straight back into the world (never into the pause menu)
    $('npc-panel').addEventListener('mousedown', function (e) {
      if (e.target === $('npc-panel')) close();
    });
  }

  function refreshOpts() {
    $('npc-opt-follow').classList.toggle('active', NPC.mode === 'follow');
    $('npc-opt-wait').classList.toggle('active', NPC.mode === 'wait');
    $('npc-opt-follow').textContent = NPC.mode === 'follow' ? '✦ FOLLOWING' : 'FOLLOW ME';
    $('npc-opt-wait').textContent = NPC.mode === 'wait' ? '✦ WAITING' : 'WAIT HERE';
  }

  function openMenu() {
    open = true; chatMode = false;
    $('npc-panel').classList.remove('hidden');
    showOpts();
    refreshOpts();
    AUDIO.uiOpen();
    say(greeting());
  }

  function greeting() {
    var zone = WORLD.zoneAt(NPC.pos);
    var hellos = [
      'Oh! Hello, Winder. The ' + (zone === 'terrace' ? 'light' : 'dark') + ' suits you.',
      'You wound your way back to me. What shall we do with this minute?',
      'Hello hello! I saved this moment for you. It\'s a nice one.',
      'Winder! I was just counting nothing. It takes forever.'
    ];
    return hellos[(Math.random() * hellos.length) | 0];
  }

  function showOpts() {
    chatMode = false;
    $('npc-opts').classList.remove('hidden');
    $('npc-chat-row').classList.add('hidden');
    $('npc-back').classList.add('hidden');
  }

  function showChat() {
    chatMode = true;
    $('npc-opts').classList.add('hidden');
    $('npc-chat-row').classList.remove('hidden');
    $('npc-back').classList.remove('hidden');
    setTimeout(function () { $('npc-input').focus(); }, 60);
  }

  function close() {
    if (!open) return;
    open = false;
    stopTyping();
    $('npc-panel').classList.add('hidden');
    AUDIO.uiClose();
    if (window.GAME) GAME.closeDialogue();
  }

  // typewriter + animalese
  function say(text, done) {
    stopTyping();
    var el = $('npc-text');
    el.textContent = '';
    var i = 0;
    var step = Math.max(18, Math.min(34, 2600 / text.length));
    typeTimer = setInterval(function () {
      var chChar = text[i];
      el.textContent += chChar;
      if (i % 2 === 0) AUDIO.blipChar(chChar, 880);
      i++;
      if (i >= text.length) { stopTyping(); if (done) done(); }
    }, step);
  }

  function stopTyping() {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  }

  function respondCanned(text) {
    say(text);
    history.push({ role: 'assistant', content: text });
    trimHistory();
  }

  function sendChat() {
    if (busy) return;
    var input = $('npc-input');
    var msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    busy = true;
    $('npc-text').textContent = '. . .';
    $('npc-send').classList.add('busy');

    history.push({ role: 'user', content: msg });
    trimHistory();

    var messages = [{ role: 'system', content: systemPrompt() }]
      .concat(history.slice(-12));

    llmRequest(messages).then(function (text) {
      busy = false;
      $('npc-send').classList.remove('busy');
      if (!text) text = canned('idle');
      // keep her terse even if the model rambles
      if (text.length > 320) text = text.slice(0, 320).replace(/\s+\S*$/, '') + '...';
      history.push({ role: 'assistant', content: text });
      trimHistory();
      say(text);
      logChat(msg, text);
      exchangeCount++;
      if (exchangeCount % 4 === 0) distill();
    }).catch(function () {
      busy = false;
      $('npc-send').classList.remove('busy');
      var fb = FALLBACK[(Math.random() * FALLBACK.length) | 0];
      history.push({ role: 'assistant', content: fb });
      say(fb + (offlineNoticeShown ? '' : '  (set the voice endpoint in PAUSE → SETTINGS)'));
      offlineNoticeShown = true;
    });
  }

  function trimHistory() { while (history.length > 24) history.shift(); }

  // ---------------------------------------------------------------
  // ambient chatter — the bubble over her head
  // ---------------------------------------------------------------

  var bubbleTimer = 0;

  function bubble(text) {
    var el = $('npc-bubble');
    el.textContent = text;
    el.classList.remove('hidden');
    bubbleTimer = 2.5 + text.length * 0.045;
    // gentle blips, not the full read
    var n = Math.min(10, text.length);
    for (var i = 0; i < n; i++) {
      (function (i) { setTimeout(function () { AUDIO.blipChar(text[i * 2] || 'a', 900); }, i * 55); })(i);
    }
  }

  function chatter(trigger) {
    if (open) return;
    var p = PLAYER.pos();
    var d = NPC.pos.distanceTo(p);
    if (d > 16) return;
    var zone = WORLD.zoneAt(NPC.pos);
    var pool = trigger && CHATTER[trigger] ? trigger : zone;
    var S = SETTINGS.get();
    if (S.ambientAI && Math.random() < 0.35 && !busy) {
      // a single dreamy line from the model
      var messages = [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: '(Say one short in-character ambient remark — under 18 words — about ' +
          (trigger || 'this place') + '. Just the remark.)' }
      ];
      llmRequest(messages, { max_tokens: 48 }).then(function (t) {
        if (t) bubble(t.length > 140 ? t.slice(0, 140) : t);
        else bubble(canned(pool));
      }).catch(function () { bubble(canned(pool)); });
    } else {
      bubble(canned(pool));
    }
  }

  function onEvent(trigger, note) {
    if (note) logEvent(note);
    if (trigger) {
      chatterTimer = Math.min(chatterTimer, 1.2 + Math.random());
      pendingTrigger = trigger;
    }
  }
  var pendingTrigger = null;

  function update(dt) {
    if (bubbleTimer > 0) {
      bubbleTimer -= dt;
      if (bubbleTimer <= 0) $('npc-bubble').classList.add('hidden');
    }
    chatterTimer -= dt;
    if (chatterTimer <= 0) {
      chatterTimer = 24 + Math.random() * 22;
      chatter(pendingTrigger);
      pendingTrigger = null;
    }
  }

  return {
    init: init, openMenu: openMenu, close: close, update: update,
    onEvent: onEvent, chatter: chatter, bubble: bubble,
    clearMemory: clearMemory, remember: remember, llmRequest: llmRequest,
    get isOpen() { return open; },
    get memories() { return memories.slice(); }
  };
})();

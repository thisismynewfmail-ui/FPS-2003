# TEMPUS — Corridors of Eternity

**MERIDIAN SOFTWORKS ©2003 · ETERNITY ENGINE™ · beta 0.3 — build 2003.07.14 — NOT FOR RESALE**

A first-person shooter in the style of a vaporware 2003 tech demo — checkered
marble platforms adrift in space, colonnades receding to infinity, and every
clock in the world stopped at three minutes to midnight.

> The MERIDIAN ENGINE has seized. Somewhere outside the world, the machinery
> of hours stands frozen. You are the last WINDER. Recover the three Keys of
> the Hours — past, present, future — climb the Meridian Stair, and wind the
> world again. The Custodians — reflections of every face that ever watched
> a clock — will try to stop you.

## Playing

The best way — host it on your LAN (port 6969) with save support:

```
./tempus.run
# local : http://localhost:6969
# LAN   : http://<your-ip>:6969   ← share this
```

The host chronicles everything into `./saves/`: the world state
(`savegame.json`, giving you a CONTINUE option in the main menu), every
conversation with Minuette (`chatlog.jsonl`), and her long-term memories
(`memories.json`). Only the Python 3 standard library is required.

Or just open `index.html` in any modern browser (no build step, no
network needed) — everything works except host-side saving.

| Input | Action |
| --- | --- |
| **W A S D** | move |
| **Mouse** | aim |
| **LMB** | fire the PEARL |
| **RMB (hold)** | TEMPUS SHIFT — spend the hourglass to slow time |
| **E** | talk to Minuette / wind the clock / turn the hourglass |
| **R** | reload |
| **Space** | jump |
| **Shift** | sprint |
| **M** | toggle sound |
| **Esc** | pause (settings live here) |
| **` / ~** | developer console (toggle custodian spawning, grant keys, save) |

## The corridors

Everything in the world is a meditation on time, and everything animated is
driven by a single `timeFlow` value that rises as keys are recovered — the
world literally wakes up around you:

- **The Plaza of Hours** — measured time. A grandfather clock with a dead
  pendulum, a great hourglass whose sand hangs mid-fall, a gold floor dial
  stopped at 11:57, checkered days tiling off into space beneath arches
  without end. The colossal Earth waits on the horizon.
- **The Ascension Court** — celestial time. A sun pillar and a leaning rune
  clock keep silent watch beneath a torn magenta nebula and a crescent moon.
  A white marble stair climbs to a small Earth: the Meridian Stair, the way
  home once the keys are found.
- **The Venus Terrace** — remembered time. Through a shimmering gate, a
  daylight that no longer exists: a gazebo of ivy-wound columns on a sea of
  white marble, palms, a pink-and-black checkered runner, and a CRT machine
  eternally displaying the Birth of Venus — antiquity preserved inside 2003.
- **The Custodians** — chrome masks etched with circuitry, one face
  replicated down the sky. They exist outside time; the tempus shift slows
  them, the PEARL disperses them into mirror shards.

Collect the three winding keys (each one restarts more of the world's
clockwork — pendulums swing, sand falls, hands sweep, the stars resume their
wheel), then climb the stair to the waiting Earth.

The timepieces themselves are alive: the floor dial swings its hands to
point at whoever stands upon it (for these three minutes, you *are* the
present); the grandfather clock can be wound (E) to lend you its minutes
(full tempus); the great hourglass can be turned by hand (E) for borrowed
sand (vitality); the sun pillar slowly turns its stone face to watch you;
and the rune clock's hands race when you come close, taking your measure.

## Minuette — the Last Minute

When time froze at 11:57, three unspent minutes were left standing.
Minuette is the youngest, and the only one still awake — a porcelain
clockwork spirit with copper hair, a dress hemmed with the pattern of the
days, a stopped pocket-watch pendant, and a halo of hours. She waits by
the floor dial. Walk up and press **E**:

- **TALK WITH HER** — free chat, answered by a local LLM (see below), with
  Event[0]-style grounding: every reply carries a live world-state block
  (where she is, your vitality, keys recovered, recent happenings, the real
  outside date and time) plus her **date-stamped long-term memories**,
  which she distills herself from your conversations and which persist in
  localStorage and on the LAN host.
- **FOLLOW ME / WAIT HERE** — she glides behind you through the corridors
  (and folds through the space between seconds if you gate away without her).
- She waves, blinks, watches you, and offers idle and contextual chatter
  (speech-bubbled, in Animal-Crossing-style animalese with its own volume
  slider). She speaks strictly in character.

### Her voice — local LLM setup

PAUSE (Esc) → **SETTINGS**: point the game at any OpenAI-compatible
endpoint (LM Studio, etc. — enable CORS on the server):

- endpoint (default `http://10.0.0.136:5000/v1`), API key, model
  (auto-listed by TEST API)
- template mode: **chat** (`/chat/completions`; the server renders the
  model's own Jinja chat template — for Qwen models that *is* the Qwen
  template) or **chatml** (`/completions` with the Qwen ChatML template
  rendered client-side, stopping on `<|im_end|>`)
- full sampling: temperature, top_p, top_k, min_p, repeat_penalty,
  presence/frequency penalties, max_tokens
- memory recall (how many date-stamped memories she's given per reply),
  FORGET MEMORIES, TEST API / TEST CHAT / APPLY & SAVE, volume sliders
  (master / music / her voice)

Without a reachable endpoint she still talks — a smaller, canned version
of herself — and every system degrades gracefully.

## Realms & music

Each realm has its own synthesized arrangement that crossfades as you
travel: the Plaza's warm nostalgic pad, the Court's darker drone with
distant celestial bells, and the Terrace's brighter major-seventh daylight
with a soft arpeggio. The tick-tock only exists while time flows.

## Tech

- Single-page Three.js (r128, vendored in `lib/`) with **zero binary
  assets** — every texture (veined marbles, the checkerboard, Earth, the
  nebula sky, circuit-etched chrome, the Venus painting) is procedurally
  synthesized on a canvas at boot, the way a 2003 demo disc would bake its
  media.
- All audio is synthesized WebAudio: a detuned vaporwave pad, a tick-tock
  that only exists while time flows, and period-correct SFX.
- Renders at reduced resolution with pixelated upscaling, scanline and
  vignette overlays, Gouraud-era materials, and long directional shadows.
- 2003-style systems: hitscan pistol with tracers and muzzle flash,
  Max-Payne-vintage bullet time on an hourglass meter, wave-directed flying
  enemies, platform physics with walkable rects and ramp stairs.

```
index.html          shell + HUD/menu/NPC/settings/dev-console DOM
css/style.css       2003 amber HUD, CRT overlays, menus, Minuette's rose UI
lib/three.min.js    Three.js r128 (vendored)
src/textures.js     procedural texture factory
src/audio.js        WebAudio synth (per-realm music, animalese, SFX)
src/props.js        clocks, hourglass, dial, statues, gazebo, CRT, palms, keys
src/world.js        zone assembly, skies, platforms, lights, timeFlow
src/enemies.js      the Custodians: spawning, orbs, shatter debris
src/npc.js          Minuette: procedural model, behaviors, portrait
src/dialogue.js     her mind: LLM client, memories, chatter, dialogue UI
src/settings.js     endpoint/sampling/volume settings (persisted)
src/player.js       pointer-lock controller, PEARL viewmodel, tempus shift
src/hud.js          HUD readouts and messages
src/main.js         boot, renderer, game states, interactions, saves, dev console
tempus.run          executable LAN host (port 6969), python3 stdlib only
server/app.py       static hosting + /api/save /api/load /api/chatlog /api/memories
server/storage.py   saves/savegame.json, chatlog.jsonl, memories.json
```

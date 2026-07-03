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

Open `index.html` in any modern browser (no build step, no network needed),
or serve the folder:

```
python3 -m http.server 8000
# → http://localhost:8000
```

| Input | Action |
| --- | --- |
| **W A S D** | move |
| **Mouse** | aim |
| **LMB** | fire the PEARL |
| **RMB (hold)** | TEMPUS SHIFT — spend the hourglass to slow time |
| **R** | reload |
| **Space** | jump |
| **Shift** | sprint |
| **M** | toggle sound |
| **Esc** | pause |

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
index.html          shell + HUD/menu DOM
css/style.css       2003 amber HUD, CRT overlays, menus
lib/three.min.js    Three.js r128 (vendored)
src/textures.js     procedural texture factory
src/audio.js        WebAudio synth (music + SFX)
src/props.js        clocks, hourglass, dial, statues, gazebo, CRT, palms, keys
src/world.js        zone assembly, skies, platforms, lights, timeFlow
src/enemies.js      the Custodians: spawning, orbs, shatter debris
src/player.js       pointer-lock controller, PEARL viewmodel, tempus shift
src/hud.js          HUD readouts and messages
src/main.js         boot, renderer, game states, pickups, win/death
```

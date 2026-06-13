# Strudelcraft — Project Direction Ideas

Four concrete, buildable directions to take this project from "solid drum sequencer" to
something genuinely exciting. Each idea lives on a different frontier — pick one, or layer
them together.

---

## Idea 1 — Walk the Music: 3D Voxel World

> *Paste a Strudel pattern. Watch it become terrain. Walk through it.*

### The Hook

The original PRD vision — a Minecraft-like 3D world where every drum hit is a block, every
cycle is a chunk, and the camera flies forward with musical time — is already half-designed
and half-coded. `voxelMapper.js`, `world.js`, `scene.js`, and `poly.js` are all sitting in
the repo waiting to be wired together.

This is the most visually striking thing the project could become. A shareable URL that
unfolds into a walkable music video. No one else has built this.

### Why It's Exciting

- Rhythm becomes **landscape**. A four-on-the-floor kick is a stone road stretching to the
  horizon. A syncopated snare is a canyon. A hi-hat grid is a forest.
- The 3D view is a **debugger for music** — you can see polyrhythm, density, silence, and
  swing as physical shapes before you hear them.
- It's immediately sharable. "Here is my pattern" becomes "here is a world I made."

### What Needs Building

1. **Wire the existing pieces.** `voxelMapper.js` already converts events to `{x, y, z}`
   voxel positions. `world.js` and `scene.js` have a Three.js scaffold. The missing link is
   a bootstrap that calls `buildStrudelEventsFromSource`, pipes events into `eventsToVoxels`,
   and hands the result to the chunk renderer.

2. **Instrument → material mapping.** Each drum lane gets a distinct block type: kick = heavy
   stone, snare = wood planks, hi-hat = glass, crash = fire. Brightness encodes velocity.
   This is one lookup table.

3. **Auto-run camera.** Implement the "forward motion" camera described in the PRD — the
   camera moves along the +X axis at a speed derived from BPM. The world scrolls past like
   a music video. Add WASD for free-roam mode as a toggle.

4. **New entry point.** Create `voxel.html` as a sibling to `index.html`. Keep the drum
   sequencer as-is; the 3D view is a second tab, not a replacement.

5. **Chunk streaming.** Generate one cycle's worth of voxels at a time using
   `queryArc(cycle, cycle + 1)` and destroy chunks behind the camera. The PRD has all the
   details; it mainly needs execution.

### Experience

You load the page, paste a Strudel URL or hit "Visualize" from the sequencer, and within
two seconds a block world appears. The camera glides forward. You can hit `F` to drop into
free-roam and fly around the structure from any angle.

---

## Idea 2 — Beat Mutation Engine

> *Your pattern is a seed. Watch it evolve.*

### The Hook

The sequencer is a great scratch pad, but once you've clicked in a groove you're stuck with
it unless you edit manually. The Beat Mutation Engine turns every pattern into the *starting
point* of an infinite generative process — it applies musically-aware transformations and
lets you hear and see the pattern evolve in real time.

### Why It's Exciting

- It's a **creativity multiplier**. You sketch a basic kick-snare chassis and the engine
  generates 20 musical variations in seconds. You pick the ones you like and keep mutating.
- It teaches music theory by doing. You hear what a Euclidean rhythm sounds like on the hi-hat
  before you know what to call it.
- The evolution tree is a visual artifact — a branching diagram of every groove you've
  generated this session, exportable as a Strudel chain.

### What Needs Building

1. **Mutation functions** — pure transformations on the existing `pattern` data structure (all
   pure functions, same shape as `randomizePattern` and `clonePattern`):
   - `euclidean(pattern, rowKey, hits, steps)` — distribute `hits` hits evenly across `steps`
     steps using Bjorklund's algorithm (classic `[3,8]` hi-hat patterns, etc.)
   - `rotate(pattern, rowKey, offset)` — shift a lane's steps left/right by N positions
   - `mirror(pattern, rowKey)` — reverse the step array for a retrogression
   - `double(pattern, rowKey)` — compress a lane into the first 8 steps and repeat it
   - `thin(pattern, rowKey, probability)` — randomly silence active steps by a density factor
   - `swingjitter(pattern, rowKey)` — quantize even-numbered hits to 8ths + 2/3 for a swing feel

2. **Mutation UI panel** — a new collapsible section in the control panel. Each row of the
   sequencer gets a small "mutate" button that pops a mini menu of the above transformations.
   A top-level "Evolve All" button picks random applicable mutations per lane.

3. **Variation gallery** — below the grid, a horizontal strip of 6–8 mini-grids shows
   variations generated from the current pattern (different mutation seeds). Click any
   mini-grid to load it. Discard the rest.

4. **Evolution tree** — a lightweight DOM-drawn tree (SVG or Canvas) that shows the mutation
   lineage: each node is a clickable mini-grid, branches show which mutation was applied.
   Stash the tree in `localStorage` so it survives refresh.

5. **Genre DNA presets** — mutation profiles that bias toward genre-specific rhythmic
   conventions. "Afrobeat" profile leans on rotation and euclidean patterns on the bell lane;
   "Jungle" profile doubles hi-hats and thins kicks; "Techno" profile enforces four-on-the-floor
   while mutating everything else. These are just named collections of weighted mutation picks.

### Experience

You load the "Pressure" preset, hit "Evolve All", and get a panel of 8 variations — each one
subtly different, all still recognizably related to the original. You click the one you like
best, load it, hit "Evolve All" again. In ten clicks you've found something you never would
have programmed manually. Copy it to Strudel and keep going.

---

## Idea 3 — Rhythm Duel: Learn Grooves by Ear

> *The Amen break is playing. You have 30 seconds. Recreate it.*

### The Hook

Every serious drummer learns by transcription — you listen to a groove and figure out what
the drummer played. Rhythm Duel brings that practice to the browser as a game. Famous
breakbeats and drum patterns play through the synth, you try to recreate them on the
sequencer grid, and the app scores how close you got.

### Why It's Exciting

- It turns passive listening into active learning. You stop hearing "a drum track" and start
  hearing "a kick on 1 and 3, snare ghosting into step 6…"
- The scoring is honest — it shows you *which* steps you got wrong with color overlays, not
  just a percentage. You can see where your ear failed and try again.
- It's endlessly replayable. A library of 20 iconic grooves (think: Think, Funky Drummer,
  Apache, Clyde Stubblefield's Cold Sweat) gives months of content that requires zero
  backend.

### What Needs Building

1. **Groove library** — a JSON array of named target patterns (same shape as the existing
   `PRESETS` object in `sequencerModel.js`). Include BPM, name, and a `hint` string
   (e.g., "James Brown, 1969. Count the ghost notes."). Start with 10 grooves.

2. **Duel mode entry** — a new "Duel" button in the control panel. Clicking it starts a
   session: picks a random groove from the library, starts playback of the *target* pattern
   (hidden), and gives the user a blank (or faintly ghost-lit) grid to fill in.

3. **Ghost overlay rendering** — modify `tr808Ui.js` to accept an optional `ghostPattern`
   alongside the live pattern. Ghost steps render as 20%-opacity amber outlines on top of
   the inactive grid cells. The ghost is invisible at the start of a duel and revealed after
   the user submits.

4. **Scoring function** — `scorePatterns(target, attempt, rows)` — for each lane and each
   step, compare the two patterns and assign a per-lane accuracy percentage. A hit on the
   correct step = +1, a false positive = -0.5, a miss = -1. Return overall accuracy and a
   diff pattern marking each step as correct / missed / false positive.

5. **Results screen** — after scoring, reveal the target pattern as a ghost overlay
   color-coded by correctness (green = nailed it, red = wrong, amber = close but off by one
   step). Show lane-by-lane accuracy bars. Offer "Try Again" and "Next Groove" buttons. 

6. **Shareable challenge URLs** — encode the target groove key and the user's attempt into
   the URL hash so a score can be shared. `?duel=amen&score=87` is enough to reconstruct the
   result page on load.

### Experience

You click "Duel". A groove plays — something familiar but unnamed. You listen twice, then
start clicking steps. Submit. The ghost overlay appears: your kick is perfect, your snare is
shifted one step late everywhere, and you completely missed the rimshot. Score: 71%. You
laugh, hit Try Again, and nail it on the third attempt.

---

## Idea 4 — Live Music Video: Audiovisual Canvas Mode

> *Your beat, rendered as a full-screen light show — in real time, in the browser.*

### The Hook

The punchcard view in `punchcard.html` already draws drum events to a canvas. The drum synth
in `drumSynth.js` already produces real Web Audio output. The missing ingredient is an
`AnalyserNode` wired between the synth and the speakers — that one node unlocks waveform
data, frequency spectrum data, and per-instrument trigger callbacks, all of which feed a
full-screen audiovisual canvas that reacts to the beat as it plays.

This is the "screensaver mode" for Strudelcraft. When you're done programming, you go
full-screen and watch the music.

### Why It's Exciting

- It's the most visually demonstrable thing the project can do. Screenshots don't capture it;
  you have to see it live. That makes it perfect for sharing as video.
- It requires zero new audio work — it's entirely a visual layer on top of what already plays.
- The `MediaRecorder` API can capture the canvas + audio into a `.webm` file directly in the
  browser. One "Record" button turns a Strudelcraft session into a music video you can
  upload.

### What Needs Building

1. **AnalyserNode tap** — in `DrumSynth`, insert an `AnalyserNode` into the signal chain
   between the master gain and `context.destination`. Expose `getByteFrequencyData()` and
   `getByteTimeDomainData()` as methods. This is a 5-line change to `drumSynth.js`.

2. **Per-instrument trigger bus** — add a lightweight `EventTarget` or callback registry to
   `DrumSynth` so the visualizer knows *which instrument* just fired, not just that audio
   happened. The sequencer already calls `synth.trigger(rowKey)` on each step, so a simple
   `onTrigger(rowKey, time)` hook is all that's needed.

3. **Visualizer canvas module** (`src/visualizer.js`) — a self-contained module that takes an
   `AnalyserNode`, a trigger callback stream, and a `<canvas>` element and runs a
   `requestAnimationFrame` draw loop. Start with three layered effects:
   - **Waveform ring** — the raw time-domain waveform plotted on a circle, pulsing outward on
     kick hits.
   - **Frequency halo** — a radial frequency spectrum bar chart (like a vinyl record with
     glowing grooves) around the ring.
   - **Instrument sparks** — on each trigger, spawn N colored particles from the center,
     colored by instrument (kick = deep orange, snare = white, hi-hat = cyan). Particles fly
     outward and fade over ~400 ms.

4. **Fullscreen mode** — a "Visualize" button in the control panel that hides the sequencer
   UI, expands the canvas to fill the viewport, and enters the browser's Fullscreen API.
   Pressing `Escape` returns to the sequencer. The pattern keeps playing throughout the
   transition.

5. **MediaRecorder export** — a "Record" button that starts `new MediaRecorder(stream)` on a
   `canvas.captureStream(60)` combined with the Web Audio `context.createMediaStreamDestination()`
   output. The result is an `.webm` video that captures both visuals and audio. A "Stop & Save"
   button triggers the download. No server required.

6. **Pattern-reactive color themes** — the visualizer reads the active pattern and derives a
   palette: a pattern heavy on kicks and crashes shifts toward deep reds and golds; a hi-hat-
   dominated pattern shifts toward cool blues. This means two patterns will always *look*
   different even before a note plays.

### Experience

You finish building a groove. You click "Visualize". The sequencer fades out, replaced by a
pulsing ring of light. Every kick sends a shockwave through the circle. Hi-hats scatter sparks
across the screen like a tesla coil. You click "Record", let the loop run twice, stop. A
`strudelcraft-groove.webm` downloads to your machine, ready to post.

---

## Which One First?

| Idea | Effort | Novelty | Shareability |
|------|--------|---------|--------------|
| 3D Voxel World | High | ★★★★★ | ★★★★★ |
| Beat Mutation Engine | Medium | ★★★★ | ★★★ |
| Rhythm Duel | Medium | ★★★★ | ★★★★ |
| Live Music Video | Low–Medium | ★★★★ | ★★★★★ |

**Recommended starting point: Live Music Video** — it reuses the most existing code, ships
fast, and produces a visually dramatic result immediately. The `AnalyserNode` tap and particle
system can be built in a weekend. It makes every existing preset and imported Strudel pattern
more impressive without changing any of the core sequencer logic.

**Then: 3D Voxel World** — because it is the original vision and the codebase already has
`voxelMapper.js`, `world.js`, and `scene.js` waiting. It is the hardest to build but the most
singular thing this project could become.

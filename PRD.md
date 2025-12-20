
# Strudelcraft
**A spatial renderer for live-coded music**

---

## Overview

**Strudelcraft** is a browser-based visualization and exploration tool that renders **Strudel** music patterns as a **Minecraft-like 3D voxel world**. Instead of embedding a music editor or REPL, Strudelcraft treats Strudel code as **input state**, passed via URL, and focuses entirely on **rendering musical structure in space**.

The result is a playable, explorable world where rhythm, pitch, and instrumentation become terrain.

> Paste a Strudel URL. Walk the music.

---

## Goals

- Render Strudel patterns as a 3D voxel world
- Require **no embedded Strudel REPL**
- Support Strudel share URLs and hash URLs
- Run fully client-side (GitHub Pages compatible)
- Be visually legible, playful, and musically grounded
- Serve as a creative coding portfolio piece and foundation for future experiments

---

## Non-Goals (v1)

- Editing Strudel code in-app
- Audio synthesis or playback fidelity
- Multiplayer or networking
- Persistence or world saving
- Full Minecraft feature parity
- Fetching or bundling external Strudel sample banks (e.g., `samples('github:eddyflux/crate')` from community songs)

---

## User Experience

### Primary Flow

1. User creates a pattern in Strudel (`https://strudel.cc`)
2. User copies the URL (short ID or hash)
3. User pastes it into:

```

[https://danmaps.github.io/strudelcraft](https://danmaps.github.io/strudelcraft)?<id_or_hash>

```

4. Strudelcraft:
- Loads the Strudel code
- Evaluates it headlessly
- Converts musical events into voxels
- Renders an explorable 3D world

No editor. No iframe. No configuration required.

---

## URL Contract

Strudelcraft accepts Strudel programs via URL parameters:

| Format | Example | Notes |
|------|--------|------|
| Short share ID | `?xwWRfuCE8TAR` | Database-backed, not permanent |
| Hash URL | `?#c2V0Y3BzKDEp...` | Fully deterministic, preferred |
| Future | `?code=` | Reserved for explicit raw input |

Internally, all formats are normalized to **plain Strudel code text**.

---

## Core Concepts

### Musical → Spatial Mapping

| Musical Concept | World Representation |
|----------------|---------------------|
| Cycle | Chunk (fixed-width segment) |
| Time (within cycle) | X axis |
| Pitch (note number) | Y axis (height) |
| Instrument / sample | Z axis (lane) |
| Event duration | Block length |
| Velocity / gain | Color intensity |
| Silence | Empty space |

---

### Drum Kit Canonical Mapping

Strudelcraft uses kit-accurate sample names:

| Sample | Instrument |
|------|-----------|
| `bd` | Bass drum |
| `sd` | Snare drum |
| `rim` | Rimshot |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `lt` | Low tom |
| `mt` | Middle tom |
| `ht` | High tom |
| `rd` | Ride cymbal |
| `cr` | Crash cymbal |

These map naturally to spatial positions resembling a real drum kit layout.

---

## Architecture

### High-Level Flow



`URL → Strudel Code → Event Stream → Voxel Buffer → Three.js Renderer`


### Key Principles

- **Renderer-only**: Strudelcraft does not own editing or audio
- **Deterministic**: Same URL produces same world
- **Chunked time**: Worlds are generated per musical cycle
- **Forward motion**: Camera moves with musical time

---

## Technical Stack

### Rendering Engine

- **Three.js**
- Minecraft-style voxel geometry
- Chunk-based world generation

### Starting Point

The initial 3D world implementation will be based on:

👉 https://github.com/maciekChmura/minecraft-gemini3

This repository provides:

- A Three.js Minecraft-style voxel world
- Chunk logic
- Camera + controls
- Performance-conscious rendering

Strudelcraft will adapt this codebase to:

- Replace terrain generation with music-driven voxel placement
- Introduce time-based chunk streaming
- Customize materials and colors per instrument

### Strudel Runtime Surface Area

- Adopt the official `@strudel.cycles/*` packages highlighted in the Loophole Letters article:
  - `core` for pattern/query primitives (`sequence`, `stack`, `queryArc`)
  - `mini` / `eval` for parsing URL-provided strings and executing them headlessly
  - `tone`, `midi`, `webaudio`, `osc` kept optional yet architected-in so visuals can stay in sync with whichever playback target the user enables later.
- Evaluate integrating [`@strudel/web`](https://codeberg.org/uzu/strudel/src/branch/main/packages/web#strudel-web) so the browser can execute real Strudel code without extra bundling. `initStrudel()` exposes the full API (e.g., `evaluate`, `note`, `stack`), letting us defer to the official runtime instead of reimplementing mini-notation or let-binding semantics.
- Embed a **thin adapter** replicating the REPL's Read → Evaluate → Play → Loop cadence. Visualization consumes the “Evaluate” output (events) and leaves Play/Loop open for future synchronized audio.
- Scheduler parity: adopt the worker-based Web Audio scheduling trick from the article to ensure camera motion and block streaming remain deterministic with Strudel’s timing.

---

## Strudel Integration

### Evaluation Strategy

- Use Strudel runtime without UI
- Evaluate patterns headlessly
- Query events using `queryArc(start, end)`
- Ignore audio playback for v1

Conceptual interface:

```js
const pattern = evalStrudel(code)
const events = pattern.queryArc(cycle, cycle + 1)
````

Each event becomes one or more blocks.

### Pattern Semantics To 3D

Insights from the [Loophole Letters “Introducing Strudel” article](https://loophole-letters.vercel.app/strudel) drive our mapping strategy:

- **Pattern factories** such as `sequence` (serial time slicing) and `stack` (simultaneous voices) translate into **lanes and stacks**. Sequential expressions advance along +X, while bracketed `[sd hh]` style chords create parallel columns along the +Z instrument axis.
- **Pattern modifiers** like `.fast(n)` / `.slow(n)` change temporal density. We will visualize these by compressing or stretching block lengths so rhythmic acceleration is visible even when pitch is ignored.
- **Mini-notation & syntax sugar** support compact expressions (`s("bd [sd hh] bd sd")`). Our parser roadmap mirrors Strudel’s: expand nested brackets, convert rests (`.`) into intentional gaps, and surface per-step metadata so every visual block carries `start`, `end`, `instrument`, and `velocity`.
- **Evolving patterns & signals** (e.g., LFOs, additive modifiers) can emit extra attributes. Even before audio playback, we will attach these values to color, emissive strength, or vertical jitter to preview modulation.

### Scheduling & Playback Considerations

- Strudel schedules events via Tone.js, MIDI, OSC, or bare Web Audio workers. For visualization we only need deterministic event order, but our architecture anticipates **future synchronization with Tone/Web Audio** so camera motion can lock to the same scheduler that drives sound.
- A lightweight **worker-based cycle clock** (similar to Strudel’s Web Audio scheduler) will push `cycleStart`/`cycleEnd` to the renderer. This ensures worlds scroll even when patterns evolve live.
- Support both **headless evaluation** (query spans for a precomputed world) and **streaming evaluation** (request `queryArc(current, current+1)` each clock tick) so we can eventually scrub or “play” the world while coding.

### Implementation Roadmap

1. **Parser parity**: Implement a minimal Strudel-compatible tokenizer (quotes, bracket groups, rests, `.fast/.slow`) so browser-only runs can approximate REPL output without bundling the entire runtime.
2. **Event normalization**: Convert every event to `{cycle, start, end, instrument, velocity, modifierContext}`. Rely on Strudel’s semantics where possible; fall back to safe defaults (e.g., cycle = floor(time)).
3. **3D emitters**:
   - `sequence` → contiguous block ribbons marching along X.
   - `stack` or bracket groups → Z-separated “lanes” sharing the same X index so simultaneous hits read as chords.
   - `add/sub` or `signals` → apply offsets to Y (height) or block size to differentiate transformed material.
4. **Live editing hook**: Mirror the article’s REPL flow (Read → Evaluate → Play → Loop) by re-evaluating a pattern whenever the URL hash changes, hot-swapping chunks without full-scene reloads.

---

## Controls

### v1 Controls

- WASD / Arrow keys: Move
- Mouse: Look
- Space: Jump
- Auto-run camera mode enabled by default

### Flying Mode

- Toggle into flight to float freely through dense structures
- Space: Ascend
- Shift: Descend
- WASD: Maintain lateral movement as in ground mode

### Camera Modes

- **Auto-run**: Camera moves forward with musical time
- **Free roam** (stretch): Player movement scrubs time

---

## Visual Design

### Block Styling

| Instrument Type | Visual Style              |
| --------------- | ------------------------- |
| Drums           | Solid, grounded materials |
| Bass            | Dark, heavy blocks        |
| Synths          | Glass or emissive blocks  |
| High percussion | Thin, elevated blocks     |

Color is functional, not decorative. Legibility matters.

### Rhythm-First Visual Grammar

- **Cycles as chunks**: Following Strudel’s `querySpan` mental model, each queried cycle becomes an 8–16 block-long “runway.” Alternating tints per cycle make `.fast/.slow` regions obvious when they no longer align to the default grid.
- **Stack awareness**: Bracketed patterns or `stack()` outputs render as **braided ribbons** instead of simple towers—color-coded slices share the same X coordinate but split along Z so simultaneous hits are easy to read.
- **Modifiers as overlays**: Use subtle glyphs/decals to denote `.add` / `.sub` manipulations or signals. E.g., translucent halo for events touched by `.slow`, pulse animation for `.fast`, ensuring coders perceive transformations even without audio.
- **Velocity & gain**: Rather than adding new axes, brightness/emissive intensity will reflect event velocity; darker blocks read as soft hits.
- **Pattern factories in space**: `sequence` = paths, `stack` = braids, `mini` expansions = micro-blocks between major beats. Documenting these rules in-engine keeps Strudel coders grounded in familiar terminology.
- **Symbol overlays**: Inspired by Strudel’s 2D piano-roll view, each voxel can project a tiny billboard showing the token (`bd`, `a`, `eb`, etc.). Labels fade with distance to avoid clutter but provide up-close confirmation of the underlying mini-notation.

---

## Performance Considerations

- Fixed chunk size per cycle
- Destroy chunks behind the camera
- Limit vertical build height
- No physics simulation beyond basic collision

---

## Success Criteria (v1)

- A Strudel URL reliably produces a world
- The world visibly reflects rhythm and structure
- Users can navigate smoothly
- No iframe or embedded REPL required
- Runs on GitHub Pages with *no* backend

---

## Future Enhancements (Out of Scope for v1)

- Audio effects synchronized to visuals (play button!)
- Embedded Strudel editor toggle
- In-game block based Strudel editor
- Audio-reactive effects
- Multiplayer jam sessions?
- Minecraft schematic export
- Recording runs as *music videos*
- Puzzle or “challenge” modes

---

## Why This Project Matters

Strudelcraft is:

- A debugger for music
- A teaching tool for rhythm
- A creative coding artifact
- A spatial metaphor for time-based systems

It merges:

- Music
- Geometry
- Systems thinking
- Play

And it does so in a way that is hard to fake, hard to copy, and easy to share.

---

## Status

**Phase:** Design complete, implementation pending
**Next Step:** Fork `minecraft-gemini3` and replace terrain generation with Strudel-driven voxel placement

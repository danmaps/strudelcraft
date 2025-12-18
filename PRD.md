
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

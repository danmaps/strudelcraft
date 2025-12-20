# Strudelcraft

**Walk through your music.** Strudelcraft renders Strudel patterns as a Minecraft-like voxel world that can be explored in the browser. Paste any Strudel URL and the project turns rhythm, pitch, and instrumentation into a spatial landscape you can fly through.

---

## Why Strudelcraft?

- **Spatial debugger for music** - see cycles, density, and instrumentation at a glance.
- **Zero-config** - runs entirely client-side and accepts Strudel share URLs or hash URLs.
- **Deterministic worlds** - the same input always produces the same terrain.
- **Creative coding portfolio piece** - showcases the intersection of music theory, geometry, and systems thinking.

---

## How It Works

```
URL -> Strudel code -> Event stream -> Voxel buffer -> Three.js renderer
```

1. A Strudel share URL or hash is provided via query string.
2. The Strudel runtime evaluates the code headlessly and exposes events with `queryArc(start, end)`.
3. Events are mapped to voxel chunks (X = time, Y = pitch, Z = instrument lane).
4. A Three.js scene renders those voxels using chunk streaming to keep performance smooth.
5. As the project matures, [`@strudel/web`](https://codeberg.org/uzu/strudel/src/branch/main/packages/web#strudel-web) can execute the actual Strudel code in-browser so the visualization mirrors the REPL’s behavior without reinventing parsing logic.

---

## URL Contract

| Format | Example | Notes |
| ------ | ------- | ----- |
| Short ID | `?xwWRfuCE8TAR` | Backed by Strudel's share service (not permanent). |
| Hash URL | `?#c2V0Y3BzKDEp...` | Preferred - encodes the full program deterministically. |
| `?code=` (future) | Plain text | Reserved for direct code injection. |

All formats are normalized to raw Strudel text internally.

---

## Controls

### Core Movement

- `WASD` / Arrow keys - move
- Mouse - look
- `Space` - jump
- Auto-run camera mode is enabled by default for musical-time scrubbing

### Flying Mode

- Toggle flight to float through dense arrangements
- `Space` - ascend
- `Shift` - descend
- `WASD` - keeps the same lateral feel as ground mode

### Camera Modes

- **Auto-run** - camera advances with musical time.
- **Free roam** (stretch goal) - movement scrubs time manually.

---

## Visual Language

| Musical Concept | Spatial Representation |
| --------------- | ---------------------- |
| Cycle | Chunk (fixed width) |
| Time inside a cycle | X axis |
| Pitch | Y axis (height) |
| Instrument / sample | Z axis (lanes) |
| Duration | Block length |
| Velocity | Color intensity |

Drums use grounded, solid blocks; bass leans dark and heavy; synths adopt glassy or emissive materials; high percussion uses thinner elevated blocks. Color remains functional for legibility.

---

## Performance & Architecture Notes

- Chunk-based world generation keeps memory bounded.
- Only chunks around the camera stay active; older segments are destroyed as you move.
- Build height is capped to maintain clarity and render speed.
- No heavy physics simulations - basic collision only.

---

## Status & Roadmap

**Phase**: PRD complete, implementation pending.

**Initial deliverables**
- Accept Strudel URLs and render deterministic voxel worlds.
- Provide smooth navigation and a default auto-run camera.
- Ship as a static site (GitHub Pages-ready).

**Future ideas (out of scope for v1)**

1. Embedded Strudel editor toggle or block-based editor.
2. Audio-reactive visual effects and synchronized playback.
3. Multiplayer jam sessions or puzzle modes.
4. Export worlds as Minecraft schematics or record runs as music videos.

---

## Contributing

Implementation work is about to begin. If you want to help prototype the renderer, experiment with Strudel event parsing, or iterate on the UX, open an issue or start a discussion describing the idea and how it maps to the PRD above.

---

## License

TBD - will be specified when the implementation repo is published.

# Strudelcraft

Strudelcraft is now a **2D drum sequencer**.

The old voxel-world idea is intentionally out of the critical path. This version keeps the project small: import Strudel drum patterns, edit a 16-step grid, audition sounds in-browser, and export the pattern back to Strudel when you want to keep going.

## First 5 Minutes (Quickstart)

Option A (simple): open `index.html` in a browser and paste a Strudel URL.

Option B (recommended): serve locally so browser security policies don’t get in the way.

```bash
# from the repo root
python -m http.server 8000
# then open
# http://localhost:8000
```

Tests:

```bash
npm test
```

---

## Scope

- 10 drum lanes in a single 16-step grid
- Lightweight browser playback with synthesized drum voices
- Strudel import from raw code, hash URLs, and full `strudel.tidalcycles.org` links
- Strudel export from the current grid
- Local persistence so sketches survive a refresh

## Why Narrow It?

The 3D Minecraft-style direction is still a possible future, but it is no longer the day-to-day product target. The goal is to make the repo pleasant to change again by focusing on one tight loop:

`idea -> click steps -> hear groove -> export Strudel`

## Running It

Open [`index.html`](/c:/Users/danny/dev/strudelcraft/index.html) in a modern browser.

No build step is required.

## Testing

```bash
npm test
```

That currently verifies:

- Strudel parsing and heuristic event generation
- Sequencer grid import/export behavior

## Project Notes

- The older Three.js and voxel-mapping files are still in the repo as reference material.
- The app entrypoint now lives in [`src/main.js`](/c:/Users/danny/dev/strudelcraft/src/main.js).
- Grid/state helpers live in [`src/sequencerModel.js`](/c:/Users/danny/dev/strudelcraft/src/sequencerModel.js).

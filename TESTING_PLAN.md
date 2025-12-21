# Testing Plan

Strudelcraft mixes Strudel pattern parsing, voxel mapping, and Three.js rendering. The goal of this plan is to keep verification deterministic while still covering the most failure-prone data flows.

---

## How to Run

```bash
# Core suite (deterministic data plumbing checks)
npm test

# Optional artifact regeneration for inspection
npm run test:artifacts
```

Direct invocation alternative: `node tests/strudel-loop.test.mjs`. The `test:artifacts` script already supplies `--update-artifacts`, but extra flags can be appended via `npm run test:artifacts -- <flag>`.

---

## Scope, Priorities, and Non-Goals

### Priorities
- **P0**: Source resolution, heuristic parsing, voxel mapping, and token/note parsing (the data plumbing used on every load).
- **P1**: Runtime guard rails that ensure evaluation errors fall back cleanly.
- **P2**: Artifact helpers and optional diagnostics (JSON dumps, diff tooling).

### Non-goals
- Validating Three.js material fidelity or camera movement in unit tests.
- Proving the correctness of the upstream Strudel runtime implementation.
- Golden-image comparisons of full frames or GPU state.

---

## Test Surface Framing

- **Unit tests**: pure helpers (token parsing, fraction math, note-to-MIDI conversion).
- **Integration tests**: stitched flows such as pattern string -> events -> voxels.
- **Smoke tests**: ensure high-level modules (e.g., scene bootstrap) at least import without throwing when DOM globals are stubbed.

---

## Proposed Unit Tests (with examples)

1. **Strudel Source Resolution (Unit)**
   - Example success: querying `?code=%24%3A%20note(%22c4%22)` should produce `{ type: 'code', payload: '$: note("c4")' }`.
   - Example hash: `?#YzQ%3D` decodes to `c4`; expect `{ type: 'hash', payload: 'YzQ%3D' }` and `decodeHashPayload` returning `'c4'`.
   - Failure: garbage hash `?#!!!` logs an error and returns description `hash decode failed - see console` while keeping `events: []`.

2. **Heuristic Pattern Parsing (Integration)**
   - Success case: `$: note("c4 e4 g4 c5")` with `disableRuntime: true, cycles: 1` should emit four events with `time` of `0, 0.25, 0.5, 0.75` and labels `c4..c5` (mirrors `tests/strudel-loop.test.mjs`).
   - Scale degrees: `$: n("0 2 4").scale("d:maj")` should yield MIDI pitches `[62, 66, 69]` and instrument `n`.
   - Modifiers: `$: note("c4 g4").fast(2)` halves duration (0.25 -> 0.125). `.slow(3)` stretches to 0.375.
   - Failure patterns: malformed strings such as `$: note("c4 e4` (missing quote) or unsupported modifiers `.reverse()` must raise warnings and return `{ events: [] }` rather than throw; unknown tokens should be skipped with a log entry.

3. **Token / Note Parsing (Unit)**
   - `parseNote('F#3')` => `54`; `parseNote('bb5')` => `70`.
   - `parseToken('[c4 e4]')` => `['c4', 'e4']`; `parseToken('hat!3')` => `['hat','hat','hat']`.
   - `interpretToken('sd', 'sound')` => `{ instrument: 'sd', pitch: null, label: 'sd' }`.
   - `normalizeMiniPattern('c4 [e4 g4] *2')` expands to `['c4','[e4 g4]','[e4 g4]']`.

4. **Voxel Mapping (Integration + Contract)**
   - Input event `{ cycle: 0, time: 0.25, pitch: 64, instrument: 'note', patternLane: 0 }` should map to `x = -14`, `y = 11`, `z = 24` (per current `MUSIC_MAPPING`).
   - Percussion example: event with `instrument: 'bd'` lands at `z = INSTRUMENT_LANES.bd * laneSpacing = -8` and ignores `patternLane`.
   - Edge case: event with `pitch: 120` still produces finite `y` (no NaN) and respects `baseHeight`.

5. **Runtime Guard Rails (Integration)**
   - Mock `ensureStrudelRuntime` so `evaluate` throws; expect `buildStrudelEventsFromSource` to log `[strudelcraft] Runtime evaluation failed` and still return heuristic events for the same code.
   - When runtime returns a pattern whose `queryArc` respects `cycles: 2`, ensure only two cycles are queried.

6. **Artifact Verification (P2, optional integration)**
   - Command `npm run test:artifacts -- --update-artifacts` should regenerate `tests/artifacts/strudel-loop.json` plus future fixtures and assert that JSON matches the expected schema:
     - `sample` string, `description`, counts, arrays of `{ cycle, time, ... }` and `{ x, y, z, ... }`.

---

## Contract Tests

- `eventsToVoxels` never produces overlapping voxels for events sharing the same `{ cycle, time, instrument }` tuple; duplicates must be merged or warned about.
- All `y` values stay within `[MUSIC_MAPPING.baseHeight - 8, MUSIC_MAPPING.baseHeight + 64]` (tunable guardrail).
- `z` aligns to either `INSTRUMENT_LANES` or `patternLane` derived offsets; no fractional `z`.
- Instrument labels propagate unchanged from events so UI overlays remain accurate.

---

## Stretch Tests

- **Chunking Logic (Integration)**
  - Generate 3 * chunkLength cycles and assert that chunk `n` ends exactly at time `n * chunkLength`. No gap between chunk `n` last event end and chunk `n+1` first event start; no overlapping timestamps.
- **Scene Glue (Smoke)**
  - With jsdom-like stubs for `document` and `window`, import `src/main.js` and assert no thrown errors. Should at least verify event listeners attach.
- **Performance Budgets (Contract)**
  - Feed `eventsToVoxels` with 10,000 synthetic events and assert processing completes within 50 ms on reference hardware (Node 20 on M1/M2). Flag if runtime exceeds 75 ms to catch regressions.

---

## Tooling Notes

- Current harness: `npm test` runs `node tests/strudel-loop.test.mjs`; expand to `node --test` once multiple suites exist.
- Use inline assertions via `assert/strict`; prefer deterministic helpers over jest-style globals.
- Artifact helpers should honor `process.argv` flags (e.g., `--update-artifacts`) to avoid noisy writes during automation.

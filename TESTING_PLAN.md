# Testing Plan

Strudelcraft mixes Strudel pattern parsing, voxel mapping, and Three.js rendering. The primary goal of this plan is to identify small, deterministic test surfaces that exercise the data pipelines without requiring a browser or Strudel's runtime service. The plan favors headless Node-based tests that can run in CI.

---

## Guiding Principles

- **Deterministic inputs**: Prefer explicit code snippets or event objects over live URL fetching so tests remain stable.
- **Golden artifacts**: Where visualization logic is involved, serialize events + voxel buffers to JSON and diff the result instead of inspecting canvases.
- **Runtime isolation**: Stub or disable the Strudel runtime whenever possible so heuristic parsing remains testable offline.
- **Incremental coverage**: Start with core data transforms (patterns -> events -> voxels) before attempting scene-level assertions.

---

## Proposed Unit Tests

1. **Strudel Source Resolution**
   - Given sample query strings (`?code=`, `?#hash`, raw share IDs), `getStrudelSourceFromUrl` returns the expected `{ type, payload }` objects.
   - `decodeHashPayload` gracefully handles invalid base64 and logs errors without throwing.

2. **Heuristic Pattern Parsing**
   - `buildStrudelEventsFromSource` with `disableRuntime: true` should emit events for representative snippets:
     - Basic melodic loop (`$: note("c4 e4 g4 c5")`) -- already covered in `tests/strudel-loop.test.mjs`.
     - Number-based degrees with `.scale()` modifier (`$: n("0 2 4").scale("d:maj")`) to confirm `degreeToMidi` math.
     - Rhythmic modifiers like `.fast(2)` / `.slow(3)` to ensure duration/time calculations hold.
   - Error cases: missing `$:` blocks should log warnings and return empty events.

3. **Token/Note Parsing**
   - Direct tests for `parseNote`, `parseToken`, and `interpretToken` (edge cases: sharps/flats, repeats `foo!3`, nested `[c4 e4]`).
   - Snapshot-style assertions on `normalizeMiniPattern` to confirm repeats and parallel blocks expand correctly.

4. **Voxel Mapping**
   - `eventsToVoxels` should correctly map cycles, lanes, and pitch offsets using deterministic events:
     - Percussion events with custom instruments hit the configured `INSTRUMENT_LANES` values.
     - Unknown instruments fall back to `patternLane` offsets.
     - Pitch extremes clamp/offset properly relative to `MUSIC_MAPPING.pitchBase`.

5. **Runtime Guard Rails**
   - When the runtime throws, `buildStrudelEventsFromSource` must fall back to heuristic parsing instead of propagating errors.
   - `tryRuntimeEvaluation` respects the `cycles` option when querying arcs.

6. **Artifact Verification**
   - Wrap JSON artifact generation helpers so each test can opt in to writing files when `CI` is false; unit tests should default to in-memory assertions but offer `--update-artifacts` for manual inspection.

---

## Stretch Tests

- **Chunking Logic**: Simulate larger event arrays to ensure chunk streaming boundaries (`MUSIC_MAPPING.chunkLength`) stay consistent.
- **Scene Glue**: Lightweight smoke test that imports `src/main.js` in Node with DOM stubs to ensure module wiring does not throw.
- **Performance Budgets**: Benchmark `eventsToVoxels` against a large synthetic set to guard against accidental O(n^2) regressions.

---

## Tooling Notes

- Use plain Node + `assert/strict` for zero-dependency tests.
- Consider adding `npm test` scripts (e.g., `node --test` or `vitest`) once more suites exist.
- Document how to run artifacts-based tests inside `tests/README.md` (future work).

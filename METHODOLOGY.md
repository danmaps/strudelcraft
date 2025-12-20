# Strudelcraft Visualization Methodology

Notes on how we turn Strudel code (Tidal-inspired patterns) into a 3D world. The model now favors running the actual Strudel runtime (`@strudel/web`) in-browser and only falls back to heuristics when evaluation fails.

---

## 1. Input Surface Area

- **Sources**: URL hash/share IDs, `?code=` params, inline patterns while prototyping.
- **Expected payload**: Real Strudel snippets copied from the REPL—`let` bindings, `$:` outputs, combo stacks, modifiers, etc.
- **Approach**:
  1. Load `@strudel/web`, call `initStrudel()`, and ensure we have access to `strudel.evaluate`.
  2. Parse every `let` declaration and `$:` block out of the text.
  3. Execute them with `evaluate()` so we receive actual `Pattern` objects.
  4. If anything throws (syntax errors, missing runtime, etc.), log the issue and fall back to the heuristic mini-notation parser.

---

## 2. Pattern Expansion Hierarchy

1. **Runtime evaluation (preferred)**  
   - Evaluate `let` bindings by running `globalThis.identifier = (...)` within Strudel scope.  
   - Evaluate each `$:` expression, retrieve the `pattern`, and query it via `pattern.queryArc(cycle, cycle + 1)` to get real `hap` data (start time, duration, velocity, context).
2. **Heuristic fallback**  
   - Expand stacks/mini-notation manually (as documented previously).  
   - Handle `.fast/.slow` scalars, log any modifiers we can’t emulate, and highlight missing lanes.

---

## 3. Rendering Rules

- **Lane assignment**
  - Canonical drum names → drum lanes.
  - `note` or runtime values with `midinote` → pitched lanes (Y height = MIDI).
  - `stack` members → offset lanes using `patternLaneBase`.
- **Time & space**
  - `cycle`, `time`, `duration` → convert to X positions using `blocksPerCycle`.
  - `.fast`/`.slow` or runtime durations adjust block length.
- **Symbol overlays**
  - Every voxel carries `label` for billboard overlays when the camera is close.

---

## 4. Handling `let` Bindings

Example:

```strudel
let anchor = sound("bd ~ ~ ~").bank("RolandTR909")
let snare = sound("sd*3").bank("RolandTR909")
let bass  = sound("bd*4").bank("RolandTR909")

$: stack(anchor, snare.gain(0.7), bass.gain(0.6))
```

### Runtime-first plan
1. Evaluate each `let` via `evaluate('globalThis.anchor = sound("bd ~ ~ ~").bank(...)')`.
2. Evaluate the `$:` stack expression; Strudel supplies a `Pattern`.
3. Query that pattern for events and annotate them with the lane index.

### Fallback plan
1. Store `let` text in a map.
2. Inline identifiers before running the mini-notation parser.
3. Apply modifiers (e.g., `.gain`) where possible and log anything we can’t interpret.

---

## 5. Diagnostics

- Log runtime steps: number of `let`s, number of `$:` blocks, and any evaluation errors.
- When falling back, log which pattern blocks were parsed plus warnings about unsupported constructs.
- If all parsing fails, render the default beat and display a HUD warning so users know why visuals don’t match their code.

---

## 6. Iteration Path

1. Capture more metadata from runtime haps (context locations, custom controls) and feed those into voxel styling.
2. Surface runtime errors directly in the UI (not just console).
3. Replace the regex parser with a lightweight AST if we need finer control pre-evaluation.
4. Build UI toggles for block labels, lane highlighting, and other diagnostic overlays.

---

**Reminder**: Visual clarity beats silent failure. Always prefer logging and graceful fallbacks to silently rendering misleading worlds.

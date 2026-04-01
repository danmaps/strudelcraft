# Issue: Strudelcraft Mode - TR-808 Inspired Drum Sequencer Gameplay

## Problem
The current Strudelcraft interaction is technically functional, but it does not yet communicate a strong drum-machine identity in gameplay. Players can place blocks, but the UI and interaction model are not explicit enough to quickly understand:

- which lane maps to which drum voice
- where they are in the loop
- how edits affect rhythm in real time

## Goal
Ship a **TR-808-inspired gameplay mode** where players build beats with blocks while a visual sequencer panel clearly mirrors a classic 16-step drum machine workflow.

This is not a literal clone. It should be a readable homage: orange/gray paneling, step buttons, transport LEDs, and fixed drum lanes.

## Player Outcome
Within 30 seconds, a new player should be able to:

1. Identify kick, snare, and hats.
2. See a 16-step loop and current playhead.
3. Place/remove blocks and immediately understand the pattern shape.

## Scope
### In Scope
- Add an in-game TR-808-inspired sequencer HUD.
- Display 16-step transport with a moving playhead.
- Display fixed drum lanes (BD, SD, LT, MT, HT, RS, CH, OH, CY, RD).
- Light active steps from Strudel-derived events.
- Preserve existing movement/build controls.

### Out of Scope (for this issue)
- Exact 808 hardware behavior modeling.
- Full sound engine rewrite.
- Song mode, pattern chaining, save/load.

## Gameplay + UI Requirements
### Sequencer Panel
- Render a top-of-screen panel that looks like hardware, not a debug table.
- Include:
  - branded header ("Strudelcraft Rhythm Composer")
  - pattern status display
  - 16-step transport numbers + LEDs
  - drum lanes with per-step buttons

### Visual Behavior
- Every lane cell can be:
  - `inactive` (off)
  - `active` (contains an event)
  - `current` (playhead position)
  - `hit-current` (active + current)
- Quarter-note boundaries should be visually stronger (steps 4, 8, 12, 16).

### Event Mapping
- Map Strudel events to a 16-step loop using `cycle + time`.
- Normalize aliases:
  - `hh -> CH`
  - `cp/clap/rs -> RS`
  - `cy -> CY`
  - `kick -> BD`, `sn/snare -> SD`
- Ignore unsupported instruments for now (or add later as extension lanes).

## Technical Plan
1. Create a dedicated UI module (`src/tr808Ui.js`) that:
   - builds DOM for the sequencer panel
   - exposes `setPatternDescription(description)`
   - exposes `setEvents(events)`
   - exposes `update(deltaSeconds)` for transport animation
2. Wire module into `src/main.js`:
   - initialize once at startup
   - push parsed Strudel events into UI
   - call `update()` in the game loop
3. Style panel in `index.html` with a TR-808-inspired palette and component language.
4. Keep responsive behavior for smaller viewports.

## Acceptance Criteria
- Sequencer panel is visible during gameplay on desktop and mobile widths.
- Playhead advances continuously across 16 steps.
- At least BD/SD/CH lanes reflect current parsed events.
- Status display shows parsed pattern summary.
- No regressions in movement, building, or block highlighting.

## Test Plan
1. Launch app with default pattern and verify visible active steps for drum lanes.
2. Load a pattern containing `bd`, `sd`, `hh`, `oh`, and `cr`; verify lane mapping.
3. Confirm playhead loops every 16 steps.
4. Resize browser to mobile width and confirm panel remains legible.
5. Confirm crosshair, instructions, and block placement still function.

## Follow-ups
- Add accent lane and per-step velocity LEDs.
- Sync transport timing directly to runtime audio clock.
- Let player edits write back into a live Strudel pattern.

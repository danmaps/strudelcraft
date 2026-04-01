import assert from 'node:assert/strict';

import {
    PRESETS,
    ROWS,
    STEP_COUNT,
    countActiveSteps,
    createEmptyPattern,
    eventsToPattern,
    normalizeInstrument,
    normalizeStepIndex,
    patternToStrudel,
    togglePatternStep,
} from '../src/sequencerModel.js';

function main() {
    const imported = eventsToPattern([
        { cycle: 0, time: 0, instrument: 'bd' },
        { cycle: 0, time: 0.25, instrument: 'hh' },
        { cycle: 0, time: 0.5, instrument: 'snare' },
        { cycle: 0, time: 0.75, instrument: 'oh' },
        { cycle: 1, time: 0, instrument: 'kick' },
    ]);

    assert.equal(imported.bd[0], true, 'kick aliases land on the BD row');
    assert.equal(imported.ch[4], true, 'hh lands on the closed hat row');
    assert.equal(imported.sd[8], true, 'snare aliases land on the SD row');
    assert.equal(imported.oh[12], true, 'open hat lands on the OH row');
    assert.equal(countActiveSteps(imported), 4, 'same-step duplicates collapse into one grid cell');

    const toggled = togglePatternStep(createEmptyPattern(), 'bd', 3);
    assert.equal(toggled.bd[3], true, 'togglePatternStep activates the chosen step');
    assert.equal(countActiveSteps(toggled), 1, 'togglePatternStep affects one cell');

    const exported = patternToStrudel(imported);
    assert.match(exported, /\$: s\("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~"\)/, 'BD export preserves row spacing');
    assert.match(exported, /\$: s\("~ ~ ~ ~ ch ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~"\)/, 'CH export uses lane token names');
    assert.equal(patternToStrudel(createEmptyPattern()), '$: silence', 'empty patterns export to silence');

    assert.equal(normalizeInstrument('ride'), 'rd', 'instrument aliases normalize ride cymbals');
    assert.equal(normalizeStepIndex(1, 0, STEP_COUNT), 0, 'step indices wrap across cycles');

    Object.entries(PRESETS).forEach(([presetKey, preset]) => {
        const activeRows = ROWS.filter((row) => preset.pattern[row.key]?.some(Boolean));
        assert.ok(typeof preset.description === 'string' && preset.description.length > 20, `${presetKey} includes a descriptive summary`);
        assert.ok(activeRows.length >= 6, `${presetKey} uses at least six lanes`);
        assert.ok(countActiveSteps(preset.pattern) >= 16, `${presetKey} demonstrates a dense enough rhythmic idea`);
    });
}

main();

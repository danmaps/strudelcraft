import assert from 'node:assert/strict';

import { buildPunchcardModel } from '../src/punchcardModel.js';

function main() {
    const model = buildPunchcardModel([
        { cycle: 0, time: 0, duration: 0.25, instrument: 'bd', velocity: 0.8 },
        { cycle: 0, time: 0.5, duration: 0.125, instrument: 'hh', velocity: 0.5 },
        { cycle: 1, time: 0.25, duration: 0.5, instrument: 'bd', velocity: 1 },
    ], { cycles: 2 });

    assert.equal(model.cycles, 2, 'punchcard cycles respect the larger of fallback cycles and event end');
    assert.equal(model.lanes.length, 2, 'events are grouped into lanes by instrument');
    assert.equal(model.lanes[0].key, 'bd', 'lane ordering is stable and alphabetical');
    assert.equal(model.lanes[0].marks.length, 2, 'multiple events can coexist in one lane');
    assert.equal(model.maxVelocity, 1, 'maxVelocity reflects the highest event velocity');
    assert.equal(model.lanes[1].marks[0].start, 0.5, 'event timing is preserved for rendering');
}

main();

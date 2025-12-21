import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import { buildStrudelEventsFromSource } from '../src/strudel.js';
import { eventsToVoxels } from '../src/voxelMapper.js';

const UPDATE_ARTIFACTS = process.argv.includes('--update-artifacts');
const ARTIFACT_DIR = path.resolve('tests', 'artifacts');

const TEST_CASES = [
    {
        name: 'note-loop',
        sample: '$: note("c4 e4 g4 c5")',
        artifact: 'strudel-loop.json',
        expect({ events, voxels }) {
            assert.equal(events.length, 4, 'note-loop emits four melodic events');
            assert.deepEqual(
                events.map((event) => Number(event.time)),
                [0, 0.25, 0.5, 0.75],
                'note-loop times follow quarter steps',
            );
            assert.deepEqual(
                events.map((event) => event.pitch),
                [60, 64, 67, 72],
                'note-loop pitches match C major triad + octave',
            );
            assert.equal(voxels.length, events.length, 'one voxel per note-loop event');
        },
    },
    {
        name: 'degree-scale',
        sample: '$: n("0 2 4").scale("d:major")',
        artifact: 'strudel-degree.json',
        expect({ events }) {
            assert.equal(events.length, 3, 'degree-scale emits three events');
            assert.ok(events.every((event) => event.instrument === 'n'), 'degree-scale uses n instrument');
            assert.deepEqual(
                events.map((event) => event.pitch),
                [62, 66, 69],
                'degree-scale converts to D major triad',
            );
            approxSeries(
                events.map((event) => event.time),
                [0, 1 / 3, 2 / 3],
                'degree-scale timings spread evenly across cycle',
            );
            approxSeries(
                events.map((event) => event.duration),
                [1 / 3, 1 / 3, 1 / 3],
                'degree-scale durations share cycle evenly',
            );
        },
    },
    {
        name: 'stacked-chord',
        sample: '$: note("[c4 e4] g4")',
        artifact: 'strudel-stack.json',
        expect({ events }) {
            assert.equal(events.length, 3, 'stacked-chord emits three events (two stacked, one trailing)');
            const firstTwoTimes = events.slice(0, 2).map((event) => event.time);
            firstTwoTimes.forEach((time) => approxEqual(time, 0, 'stacked-chord first pair share time'));
            approxEqual(events[2].time, 0.5, 'stacked-chord trailing note offsets by half cycle');
            assert.deepEqual(
                events.map((event) => event.duration),
                [0.5, 0.5, 0.5],
                'stacked-chord keeps half-cycle durations',
            );
        },
    },
    {
        name: 'percussion-loop',
        sample: '$: s("bd hh sd hh")',
        artifact: 'strudel-percussion.json',
        expect({ events, voxels }) {
            assert.equal(events.length, 4, 'percussion-loop emits four hits');
            assert.deepEqual(
                events.map((event) => event.instrument),
                ['bd', 'hh', 'sd', 'hh'],
                'percussion-loop preserves instrument order',
            );
            const expectedZ = [-8, 0, -4, 0];
            assert.deepEqual(
                voxels.map((voxel) => voxel.z),
                expectedZ,
                'percussion-loop voxels snap to drum lanes',
            );
        },
    },
];

async function runTestCase(testCase) {
    console.log(`[strudel test] running ${testCase.name}`);
    const source = { type: 'code', payload: testCase.sample };
    const { description, events } = await buildStrudelEventsFromSource(source, {
        cycles: testCase.cycles ?? 1,
        // disableRuntime: true,
    });

    assert.ok(events.length > 0, `${testCase.name} should emit at least one event`);
    const voxels = eventsToVoxels(events);
    testCase.expect({ events, voxels, description });

    if (UPDATE_ARTIFACTS && testCase.artifact) {
        await fs.mkdir(ARTIFACT_DIR, { recursive: true });
        const artifactPath = path.join(ARTIFACT_DIR, testCase.artifact);
        const payload = {
            sample: testCase.sample,
            description,
            eventCount: events.length,
            voxelCount: voxels.length,
            events,
            voxels,
        };
        await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`[strudel test] wrote ${artifactPath}`);
    }
}

function approxEqual(actual, expected, message, epsilon = 1e-6) {
    const delta = Math.abs(actual - expected);
    assert.ok(delta < epsilon, `${message} (expected ~${expected}, got ${actual})`);
}

function approxSeries(actual, expected, message, epsilon = 1e-6) {
    assert.equal(actual.length, expected.length, `${message}: length mismatch`);
    actual.forEach((value, idx) => {
        approxEqual(value, expected[idx], `${message} (index ${idx})`, epsilon);
    });
}

async function main() {
    for (const testCase of TEST_CASES) {
        await runTestCase(testCase);
    }
    console.log(`[strudel test] completed ${TEST_CASES.length} cases.`);
    if (!UPDATE_ARTIFACTS) {
        console.log('[strudel test] skipping artifact writes (use --update-artifacts to refresh JSON).');
    }
}

main().catch((error) => {
    console.error('[strudel test] failed:', error);
    process.exit(1);
});

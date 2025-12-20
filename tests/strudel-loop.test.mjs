import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import { buildStrudelEventsFromSource } from '../src/strudel.js';
import { eventsToVoxels } from '../src/voxelMapper.js';

const SAMPLE_CODE = '$: note("c4 e4 g4 c5")';

async function main() {
    const source = { type: 'code', payload: SAMPLE_CODE };
    const { description, events } = await buildStrudelEventsFromSource(source, {
        cycles: 1,
        disableRuntime: true,
    });

    assert.ok(events.length > 0, 'Expected Strudel heuristic to emit events.');

    const voxels = eventsToVoxels(events);
    assert.equal(
        voxels.length,
        events.length,
        'Voxel conversion should create one voxel per event for melodic notes.',
    );

    const artifactDir = path.resolve('tests', 'artifacts');
    await fs.mkdir(artifactDir, { recursive: true });
    const artifactPath = path.join(artifactDir, 'strudel-loop.json');

    const payload = {
        sample: SAMPLE_CODE,
        description,
        eventCount: events.length,
        voxelCount: voxels.length,
        events,
        voxels,
    };

    await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[strudel test] wrote ${artifactPath}`);
    console.log(`[strudel test] events -> voxels: ${events.length} -> ${voxels.length}`);
}

main().catch((error) => {
    console.error('[strudel test] failed:', error);
    process.exit(1);
});

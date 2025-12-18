import { INSTRUMENT_LANES, MUSIC_MAPPING } from './constants.js';

export function eventsToVoxels(events = []) {
    const voxels = [];
    const centerOffset = MUSIC_MAPPING.timeBlocksPerCycle * 2;
    events.forEach((event) => {
        const xPosition = Math.floor(event.cycle * MUSIC_MAPPING.timeBlocksPerCycle + (event.time || 0) * MUSIC_MAPPING.timeBlocksPerCycle);
        const x = xPosition - centerOffset;
        const instrument = event.instrument ?? 'default';
        const defaultLane = MUSIC_MAPPING.patternLaneBase + (event.patternLane ?? 0);
        const laneIndex = INSTRUMENT_LANES[instrument] ?? defaultLane;
        const z = Math.round(laneIndex * MUSIC_MAPPING.laneSpacing);
        const baseHeight = MUSIC_MAPPING.baseHeight;
        const pitchOffset = (event.pitch || MUSIC_MAPPING.pitchBase) - MUSIC_MAPPING.pitchBase;
        const y = Math.round(baseHeight + pitchOffset * 0.25);

        voxels.push({
            x,
            y,
            z,
            instrument,
            label: event.label,
        });
    });
    return voxels;
}

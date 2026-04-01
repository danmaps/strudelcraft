function laneKeyForEvent(event, fallbackIndex) {
    if (event.instrument && typeof event.instrument === 'string') {
        return event.instrument;
    }
    if (event.label && typeof event.label === 'string') {
        return event.label;
    }
    if (Number.isInteger(event.patternLane)) {
        return `lane-${event.patternLane + 1}`;
    }
    return `lane-${fallbackIndex + 1}`;
}

export function buildPunchcardModel(events = [], options = {}) {
    const fallbackCycles = Number(options.cycles) > 0 ? Number(options.cycles) : 4;
    const laneMap = new Map();
    let maxEnd = fallbackCycles;

    events.forEach((event, index) => {
        const start = Number(event.cycle || 0) + Number(event.time || 0);
        const duration = Math.max(Number(event.duration || 0), 0.0001);
        const end = start + duration;
        maxEnd = Math.max(maxEnd, end);

        const laneKey = laneKeyForEvent(event, index);
        if (!laneMap.has(laneKey)) {
            laneMap.set(laneKey, {
                key: laneKey,
                label: laneKey.toUpperCase(),
                marks: [],
            });
        }

        laneMap.get(laneKey).marks.push({
            start,
            end,
            duration,
            velocity: Number.isFinite(event.velocity) ? event.velocity : 1,
            label: event.label ?? laneKey,
            instrument: event.instrument ?? laneKey,
        });
    });

    const lanes = [...laneMap.values()]
        .map((lane) => ({
            ...lane,
            marks: lane.marks.sort((left, right) => left.start - right.start),
        }))
        .sort((left, right) => left.key.localeCompare(right.key));

    return {
        cycles: Math.max(1, Math.ceil(maxEnd)),
        totalSpan: Math.max(maxEnd, 1),
        lanes,
        maxVelocity: Math.max(1, ...events.map((event) => Number(event.velocity) || 1)),
    };
}

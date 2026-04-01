export const STEP_COUNT = 16;

export const ROWS = [
    { key: 'bd', label: 'BD', density: 0.28 },
    { key: 'sd', label: 'SD', density: 0.18 },
    { key: 'lt', label: 'LT', density: 0.12 },
    { key: 'mt', label: 'MT', density: 0.12 },
    { key: 'ht', label: 'HT', density: 0.12 },
    { key: 'rim', label: 'RS', density: 0.1 },
    { key: 'ch', label: 'CH', density: 0.42 },
    { key: 'oh', label: 'OH', density: 0.16 },
    { key: 'cr', label: 'CY', density: 0.08 },
    { key: 'rd', label: 'RD', density: 0.1 },
];

export const DEFAULT_BPM = 120;

export const PRESETS = {
    warehouse: {
        name: 'Warehouse',
        description: 'Warehouse chassis with syncopated kicks, rim chatter, and a ride counter-grid.',
        bpm: 126,
        pattern: buildPattern({
            bd: [0, 3, 4, 8, 10, 11, 14],
            sd: [4, 12],
            lt: [7],
            mt: [15],
            rim: [6, 13],
            ch: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
            oh: [7, 15],
            rd: [2, 6, 10, 14],
        }),
    },
    electro: {
        name: 'Electro',
        description: 'Broken electro spine with rim answers, tom runoff, and alternating cymbal weight.',
        bpm: 118,
        pattern: buildPattern({
            bd: [0, 5, 7, 8, 11, 13],
            sd: [4, 12],
            lt: [10],
            ht: [14],
            rim: [3, 6, 10, 15],
            ch: [0, 2, 5, 6, 8, 10, 11, 13, 14],
            oh: [7],
            cr: [0],
            rd: [4, 12],
        }),
    },
    broken: {
        name: 'Broken',
        description: 'Broken-beat sketch with staggered snares, tom conversation, and upper-lane motion.',
        bpm: 132,
        pattern: buildPattern({
            bd: [0, 3, 6, 8, 10, 14],
            sd: [5, 12],
            lt: [2, 11],
            mt: [7, 13],
            ht: [15],
            rim: [9],
            ch: [0, 2, 4, 6, 9, 10, 13, 14],
            oh: [3, 11],
            cr: [0],
            rd: [5, 7, 12, 15],
        }),
    },
    pressure: {
        name: 'Pressure',
        description: 'Club-pressure loop with kick clusters, tom fills, and cymbal layers pushing against the bar.',
        bpm: 138,
        pattern: buildPattern({
            bd: [0, 1, 4, 7, 8, 10, 11, 14],
            sd: [4, 12],
            lt: [6, 15],
            mt: [3, 13],
            ht: [9],
            rim: [5, 11],
            ch: [0, 2, 3, 5, 6, 8, 9, 10, 12, 13, 14],
            oh: [7, 15],
            cr: [0, 8],
            rd: [1, 4, 7, 10, 13],
        }),
    },
    afterhours: {
        name: 'Afterhours',
        description: 'Half-time head-nod with ghosted rim placement, tom bridges, and long-form cymbal accents.',
        bpm: 112,
        pattern: buildPattern({
            bd: [0, 5, 8, 11, 14],
            sd: [4, 12],
            lt: [10],
            mt: [6, 15],
            ht: [13],
            rim: [3, 7, 11],
            ch: [0, 2, 4, 6, 8, 10, 12, 14],
            oh: [5, 15],
            cr: [0],
            rd: [2, 6, 10, 14],
        }),
    },
};

const INSTRUMENT_ALIASES = {
    bd: 'bd',
    kick: 'bd',
    sd: 'sd',
    sn: 'sd',
    snare: 'sd',
    lt: 'lt',
    lowtom: 'lt',
    mt: 'mt',
    midtom: 'mt',
    ht: 'ht',
    hitom: 'ht',
    rim: 'rim',
    cp: 'rim',
    clap: 'rim',
    rs: 'rim',
    hh: 'ch',
    ch: 'ch',
    hc: 'ch',
    oh: 'oh',
    ho: 'oh',
    cr: 'cr',
    cy: 'cr',
    cym: 'cr',
    rd: 'rd',
    ride: 'rd',
};

export function createEmptyPattern(stepCount = STEP_COUNT) {
    return Object.fromEntries(ROWS.map((row) => [row.key, Array(stepCount).fill(false)]));
}

export function clonePattern(pattern) {
    return Object.fromEntries(ROWS.map((row) => [row.key, [...(pattern?.[row.key] ?? Array(STEP_COUNT).fill(false))]]));
}

export function normalizeInstrument(value) {
    if (!value || typeof value !== 'string') return null;
    const base = value.split(':')[0].toLowerCase().trim();
    return INSTRUMENT_ALIASES[base] ?? null;
}

export function normalizeStepIndex(cycle = 0, time = 0, stepCount = STEP_COUNT) {
    const absolute = Number(cycle) + Number(time || 0);
    const step = Math.floor(absolute * stepCount);
    return ((step % stepCount) + stepCount) % stepCount;
}

export function eventsToPattern(events = [], stepCount = STEP_COUNT) {
    const pattern = createEmptyPattern(stepCount);
    events.forEach((event) => {
        const rowKey = normalizeInstrument(event.instrument);
        if (!rowKey || !pattern[rowKey]) return;
        pattern[rowKey][normalizeStepIndex(event.cycle, event.time, stepCount)] = true;
    });
    return pattern;
}

export function togglePatternStep(pattern, rowKey, stepIndex) {
    const next = clonePattern(pattern);
    if (!next[rowKey] || stepIndex < 0 || stepIndex >= next[rowKey].length) {
        return next;
    }
    next[rowKey][stepIndex] = !next[rowKey][stepIndex];
    return next;
}

export function clearPattern(pattern) {
    const next = clonePattern(pattern);
    ROWS.forEach((row) => {
        next[row.key].fill(false);
    });
    return next;
}

export function randomizePattern(stepCount = STEP_COUNT) {
    const pattern = createEmptyPattern(stepCount);
    ROWS.forEach((row) => {
        for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
            const bias = stepIndex % 4 === 0 ? 0.14 : stepIndex % 2 === 0 ? 0.04 : 0;
            pattern[row.key][stepIndex] = Math.random() < row.density + bias;
        }
    });
    pattern.sd[4] = true;
    pattern.sd[12] = true;
    pattern.bd[0] = true;
    return pattern;
}

export function patternToStrudel(pattern) {
    const activeRows = ROWS.filter((row) => pattern?.[row.key]?.some(Boolean));
    if (!activeRows.length) {
        return '$: silence';
    }
    return activeRows
        .map((row) => `$: s("${patternToTokenString(pattern, row.key)}")`)
        .join('\n');
}

export function patternToTokenString(pattern, rowKey) {
    const steps = pattern?.[rowKey] ?? [];
    return steps.map((isActive) => (isActive ? rowKey : '~')).join(' ');
}

export function countActiveSteps(pattern) {
    return ROWS.reduce((total, row) => total + (pattern?.[row.key] ?? []).filter(Boolean).length, 0);
}

function buildPattern(activeStepsByRow) {
    const pattern = createEmptyPattern();
    Object.entries(activeStepsByRow).forEach(([rowKey, steps]) => {
        steps.forEach((stepIndex) => {
            if (pattern[rowKey]?.[stepIndex] !== undefined) {
                pattern[rowKey][stepIndex] = true;
            }
        });
    });
    return pattern;
}

export const SKY_COLOR = 0x87ceeb;

export const WORLD_DIMENSIONS = {
    size: 40,
    terrainThickness: 3,
};

export const PLAYER = {
    height: 1.8,
    width: 0.6,
    halfWidth: 0.3,
};

export const FLIGHT = {
    acceleration: 80,
    horizontalAcceleration: 100,
    verticalSpeed: 10,
};

export const PHYSICS = {
    gravity: 30,
    damping: 10,
};

export const MUSIC_MAPPING = {
    timeBlocksPerCycle: 8,
    chunkLength: 8,
    pitchBase: 36,
    laneSpacing: 2,
    baseHeight: 4,
    patternLaneBase: 12,
};

export const INSTRUMENT_LANES = {
    bd: -4,
    sd: -2,
    rim: -1,
    hh: 0,
    oh: 1,
    lt: 2,
    mt: 3,
    ht: 4,
    rd: 5,
    cr: 6,
};

export const INSTRUMENT_COLORS = {
    bd: 0x8b4513,
    sd: 0xc0c0c0,
    rim: 0xd1a26d,
    hh: 0xf2d16b,
    oh: 0xf4f1c9,
    lt: 0x9c6f56,
    mt: 0xa98274,
    ht: 0xc79f8f,
    rd: 0x66b3ff,
    cr: 0xffd966,
    note: 0x88c0ff,
    n: 0xffa94d,
    sound: 0xb0bec5,
    default: 0xffffff,
};

export const UI = {
    flightStatusId: 'flight-status',
    strudelStatusId: 'strudel-status',
};

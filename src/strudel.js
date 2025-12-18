const DEFAULT_SOURCE = '$: s("bd [sd hh] bd sd").fast(1)';
const DEFAULT_STATUS = 'default pattern';
const DEFAULT_CYCLES = 6;
const DEFAULT_NOTE_OCTAVE = 4;

const NOTE_TO_SEMITONE = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11,
};

const SCALE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
};

export function getStrudelSourceFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
        return {
            type: 'code',
            payload: decodeURIComponent(params.get('code')).trim(),
        };
    }

    const rawQuery = window.location.search.replace('?', '').trim();
    if (rawQuery && rawQuery !== '') {
        if (rawQuery.startsWith('#')) {
            return { type: 'hash', payload: rawQuery.slice(1) };
        }
        return { type: 'shareId', payload: rawQuery };
    }

    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const trimmed = hash.slice(1).trim();
        if (!trimmed) return null;
        if (/^https?:\/\//i.test(trimmed)) {
            try {
                const nestedUrl = new URL(trimmed);
                if (nestedUrl.hash && nestedUrl.hash.length > 1) {
                    return {
                        type: 'hash',
                        payload: nestedUrl.hash.slice(1),
                        sourceUrl: trimmed,
                    };
                }
            } catch (error) {
                console.error('[strudelcraft] Failed to parse nested Strudel URL from hash:', error);
            }
        }
        return { type: 'hash', payload: trimmed };
    }
    return null;
}

export function buildStrudelEventsFromSource(source, options = {}) {
    const { code, description } = resolveStrudelCode(source);
    const blocks = extractPatternBlocks(code);
    if (blocks.length > 0) {
        console.log('[strudelcraft] Parsed pattern blocks:', blocks.map((block, idx) => ({
            lane: idx,
            patternType: block.patternType,
            body: block.body,
            modifiers: block.modifiers.trim(),
        })));
    } else {
        console.warn('[strudelcraft] No pattern blocks were parsed from input. Falling back to default.');
    }
    const events = blocks.flatMap((block, idx) => generateEventsFromBlock(block, idx, options));
    const lanes = blocks.length || 1;
    const status = `${description} (${lanes} lane${lanes === 1 ? '' : 's'})`;
    return { code, description: status, events };
}

function resolveStrudelCode(source) {
    if (!source) {
        return { code: DEFAULT_SOURCE, description: DEFAULT_STATUS };
    }

    if (source.type === 'code') {
        return {
            code: source.payload,
            description: describe('inline', source.payload),
        };
    }

    if (source.type === 'hash') {
        const decoded = decodeHashPayload(source.payload);
        if (decoded) {
            return {
                code: decoded,
                description: describe('hash', decoded),
            };
        }
        return {
            code: DEFAULT_SOURCE,
            description: 'hash decode failed - fallback pattern',
        };
    }

    return {
        code: DEFAULT_SOURCE,
        description: `share ID (${source.payload}) not supported offline`,
    };
}

function describe(prefix, code) {
    const compact = code.replace(/\s+/g, ' ').trim();
    const snippet = compact.length > 48 ? `${compact.slice(0, 48)}…` : compact;
    return `${prefix}: ${snippet}`;
}

function decodeHashPayload(payload = '') {
    const sanitized = payload.replace(/\s/g, '');
    try {
        if (typeof window !== 'undefined' && typeof window.atob === 'function') {
            return window.atob(decodeURIComponent(sanitized)).trim();
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(decodeURIComponent(sanitized), 'base64').toString('utf8').trim();
        }
    } catch (error) {
        console.error('[strudelcraft] Failed to decode Strudel hash payload', error);
    }
    return null;
}

function extractPatternBlocks(code) {
    const trimmed = code.trim();
    const blocks = [];
    const blockRegex = /\$:\s*([\s\S]*?)(?=(?:\n\s*\$:)|$)/g;
    let match;
    while ((match = blockRegex.exec(trimmed))) {
        const blockText = match[1].trim();
        const patternMatch = blockText.match(/(note|sound|s|n)\s*\(\s*(['"`])([\s\S]+?)\2\s*\)/i);
        if (!patternMatch) {
            continue;
        }
        const patternType = patternMatch[1].toLowerCase();
        const body = patternMatch[3];
        const modifiers = blockText.slice(patternMatch.index + patternMatch[0].length);
        blocks.push({ patternType, body, modifiers });
    }

    if (!blocks.length) {
        const singleMatch = trimmed.match(/(note|sound|s|n)\s*\(\s*(['"`])([\s\S]+?)\2\s*\)(.*)$/i);
        if (singleMatch) {
            blocks.push({
                patternType: singleMatch[1].toLowerCase(),
                body: singleMatch[3],
                modifiers: singleMatch[4] ?? '',
            });
        } else {
            blocks.push({
                patternType: 's',
                body: 'bd [sd hh] bd sd',
                modifiers: '',
            });
        }
    }
    return blocks;
}

function generateEventsFromBlock(block, laneIndex, options = {}) {
    const parsed = parseStrudelPattern(block);
    const cycles = options.cycles ?? DEFAULT_CYCLES;
    const steps = parsed.steps.length ? parsed.steps : [[]];
    const rate = Math.max(parsed.rate, 0.0001);
    const slotsPerCycle = Math.max(1, Math.round(steps.length * rate));
    const stepDuration = 1 / slotsPerCycle;
    const events = [];

    for (let cycleIndex = 0; cycleIndex < cycles; cycleIndex += 1) {
        for (let slot = 0; slot < slotsPerCycle; slot += 1) {
            const patternStep = steps[slot % steps.length];
            const time = slot * stepDuration;
            if (!patternStep || patternStep.length === 0) continue;

            patternStep.forEach((token) => {
                const interpreted = interpretToken(token, block.patternType, parsed.scale);
                if (!interpreted) return;
                events.push({
                    cycle: cycleIndex,
                    time,
                    duration: stepDuration,
                    velocity: 1,
                    pitch: interpreted.pitch ?? 60,
                    instrument: interpreted.instrument,
                    label: interpreted.label,
                    patternLane: laneIndex,
                });
            });
        }
    }
    return events;
}

function parseStrudelPattern(block) {
    const body = normalizeMiniPattern(block.body);
    const steps = tokenizePattern(body);
    const fast = extractModifierValue(block.modifiers, 'fast', 1);
    const slow = extractModifierValue(block.modifiers, 'slow', 1);
    const rate = fast / slow;
    const scale = parseScaleModifier(block.modifiers);
    return { steps, rate: Number.isFinite(rate) ? rate : 1, scale };
}

function extractModifierValue(modifiers = '', name, fallback) {
    const match = modifiers.match(new RegExp(`\\.${name}\\(([^)]+)\\)`));
    if (!match) return fallback;
    const value = parseFloat(match[1]);
    return Number.isFinite(value) ? value : fallback;
}

function parseScaleModifier(modifiers = '') {
    const match = modifiers.match(/\.scale\(\s*['"`]([^"'`]+)['"`]\s*\)/i);
    if (!match) return null;
    const [rootPart, modePart] = match[1].split(':');
    const mode = (modePart || 'major').toLowerCase();
    const rootMidi = parseNote(rootPart?.trim()) ?? 60;
    const intervals = SCALE_INTERVALS[mode] ?? SCALE_INTERVALS.minor;
    return { rootMidi, intervals };
}

function normalizeMiniPattern(body = '') {
    let normalized = body.replace(/\s+/g, ' ').replace(/,/g, ' ').trim();
    normalized = normalized.replace(/[<>]/g, ' ');
    normalized = normalized.replace(/@[\w.]+/g, '');
    normalized = normalized.replace(/(\[[^\]]+\]|[^\s]+)\*(\d+)/g, (_, value, count) => {
        return Array.from({ length: parseInt(count, 10) }, () => value).join(' ');
    });
    return normalized;
}

function tokenizePattern(patternBody = '') {
    const matches = patternBody.match(/\[[^\]]*?\]|[^\s]+/g) || [];
    return matches.map((token) => parseToken(token));
}

function parseToken(token) {
    const trimmed = token.trim();
    if (!trimmed || trimmed === '.' || trimmed === '~') {
        return [];
    }

    const repeatMatch = trimmed.match(/^(.*)!(\d+)$/);
    if (repeatMatch) {
        const value = repeatMatch[1].trim();
        const repeat = parseInt(repeatMatch[2], 10);
        return Array.from({ length: repeat }, () => value);
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return trimmed
            .slice(1, -1)
            .split(/\s+/)
            .map((part) => part.trim())
            .filter(Boolean);
    }
    return [trimmed];
}

function interpretToken(token, patternType, scaleContext) {
    const trimmed = token.trim();
    if (!trimmed) return null;

    if (patternType === 'note') {
        const midi = parseNote(trimmed);
        return {
            instrument: 'note',
            pitch: midi ?? 60,
            label: trimmed,
        };
    }

    if (patternType === 'n') {
        const degree = parseFloat(trimmed);
        if (!Number.isFinite(degree)) {
            return null;
        }
        const pitch = degreeToMidi(degree, scaleContext);
        return {
            instrument: 'n',
            pitch,
            label: trimmed,
        };
    }

    if (patternType === 'sound' || patternType === 's') {
        return {
            instrument: trimmed,
            pitch: null,
            label: trimmed,
        };
    }

    return {
        instrument: trimmed,
        pitch: null,
        label: trimmed,
    };
}

function parseNote(token = '') {
    const match = token.match(/^([a-gA-G])([#b]?)(-?\d+)?$/);
    if (!match) return null;
    const [, letterRaw, accidentalRaw, octaveRaw] = match;
    const letter = letterRaw.toLowerCase();
    if (!(letter in NOTE_TO_SEMITONE)) return null;

    let semitone = NOTE_TO_SEMITONE[letter];
    if (accidentalRaw === '#') semitone += 1;
    if (accidentalRaw === 'b') semitone -= 1;

    const octave = octaveRaw !== undefined ? parseInt(octaveRaw, 10) : DEFAULT_NOTE_OCTAVE;
    const midi = semitone + (octave + 1) * 12;
    return midi;
}

function degreeToMidi(degree, scaleContext) {
    if (!scaleContext) {
        return 60 + degree;
    }
    const intervals = scaleContext.intervals;
    const steps = intervals.length;
    const floored = Math.floor(degree);
    const fractional = degree - floored;
    const octaveOffset = Math.floor(floored / steps);
    const index = ((floored % steps) + steps) % steps;
    const semitone = intervals[index] + octaveOffset * 12;
    const base = scaleContext.rootMidi + semitone;
    if (fractional === 0) return base;
    const nextIndex = ((index + 1) % steps);
    const nextInterval = intervals[nextIndex] + (index + 1 >= steps ? 12 : 0) + octaveOffset * 12;
    return base + fractional * (nextInterval - intervals[index]);
}

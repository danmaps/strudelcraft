import { DrumSynth } from './drumSynth.js';
import { buildStrudelEventsFromSource, getStrudelSourceFromUrl, parseStrudelSourceInput } from './strudel.js';
import {
    DEFAULT_BPM,
    PRESETS,
    ROWS,
    STEP_COUNT,
    clonePattern,
    createEmptyPattern,
    eventsToPattern,
    patternToStrudel,
    randomizePattern,
    togglePatternStep,
} from './sequencerModel.js';
import { IMPORT_EXAMPLES } from './strudelExamples.js';
import { createTr808Ui } from './tr808Ui.js';

const STORAGE_KEY = 'strudelcraft:sequencer-state';

const synth = new DrumSynth();
const ui = createTr808Ui({
    importExamples: IMPORT_EXAMPLES,
    onToggleStep: handleToggleStep,
    onStart: handleStart,
    onStop: handleStop,
    onClear: handleClear,
    onRandomize: handleRandomize,
    onImport: handleImport,
    onImportExampleSelect: handleImportExampleSelect,
    onCopy: handleCopy,
    onPresetChange: handlePresetChange,
    onBpmChange: handleBpmChange,
});

let pattern = createEmptyPattern();
let bpm = DEFAULT_BPM;
let isPlaying = false;
let currentStep = -1;
let elapsedSeconds = 0;
let lastFrameAt = performance.now();

bootstrap();
requestAnimationFrame(tick);

async function bootstrap() {
    const source = getStrudelSourceFromUrl();
    if (source) {
        await importSource(source, 'Imported pattern from the current URL.');
        return;
    }

    const restored = loadPersistedState();
    if (restored) {
        pattern = restored.pattern;
        bpm = restored.bpm;
        syncUi({
            description: 'restored local pattern',
            status: 'Recovered your last grid from local storage.',
            sourceInput: patternToStrudel(pattern),
            presetKey: '',
            importExampleKey: '',
        });
        return;
    }

    const defaultPresetKey = 'pressure';
    const defaultPreset = PRESETS[defaultPresetKey];
    pattern = clonePattern(defaultPreset.pattern);
    bpm = defaultPreset.bpm;
    syncUi({
        description: defaultPreset.description ?? `${defaultPreset.name} preset`,
        status: `Loaded the ${defaultPreset.name.toLowerCase()} preset. Click steps to reshape it.`,
        sourceInput: patternToStrudel(pattern),
        presetKey: defaultPresetKey,
        importExampleKey: '',
    });
}

function syncUi({ description, status, sourceInput, presetKey, importExampleKey }) {
    ui.setPattern(pattern);
    ui.setBpm(bpm);
    ui.setPatternDescription(description);
    ui.setStatus(status);
    ui.setSourceInput(sourceInput ?? patternToStrudel(pattern));
    ui.setPresetValue(presetKey ?? '');
    ui.setImportExampleValue(importExampleKey ?? '');
    persistState();
}

async function importSource(source, successStatus) {
    try {
        const { description, code, events } = await buildStrudelEventsFromSource(source, {
            cycles: 1,
        });
        pattern = eventsToPattern(events, STEP_COUNT);
        syncUi({
            description,
            status: successStatus,
            sourceInput: code || '',
            presetKey: '',
            importExampleKey: findMatchingImportExampleKey(code || ''),
        });
    } catch (error) {
        console.error('[strudelcraft] Failed to import source', error);
        ui.setStatus('Import failed. Check the console for parser details.');
    }
}

async function handleImport(text) {
    const source = parseStrudelSourceInput(text);
    if (!source) {
        ui.setStatus('Nothing to import yet. Paste Strudel code or a Strudel URL.');
        return;
    }
    await importSource(source, 'Imported drum hits into the 16-step grid.');
}

function handleImportExampleSelect(exampleKey) {
    const example = IMPORT_EXAMPLES.find((entry) => entry.key === exampleKey);
    if (!example) {
        ui.setStatus('Choose an example to load it into the import box.');
        return;
    }
    ui.setSourceInput(example.code);
    ui.setStatus(example.status);
}

async function handleStart() {
    await synth.resume();
    elapsedSeconds = 0;
    currentStep = -1;
    isPlaying = true;
    ui.setPlaying(true);
    ui.setCurrentStep(-1);
    ui.setStatus(`Playing at ${bpm} BPM.`);
}

function handleStop() {
    isPlaying = false;
    elapsedSeconds = 0;
    currentStep = -1;
    ui.setPlaying(false);
    ui.setCurrentStep(-1);
    ui.setStatus('Transport stopped.');
}

async function handleToggleStep(rowKey, stepIndex) {
    pattern = togglePatternStep(pattern, rowKey, stepIndex);
    ui.setPattern(pattern);
    ui.setPresetValue('');
    ui.setImportExampleValue('');
    ui.setStatus(`Toggled ${rowKey.toUpperCase()} on step ${stepIndex + 1}.`);
    persistState();

    try {
        await synth.resume();
        synth.trigger(rowKey, 0.72);
    } catch (error) {
        console.error('[strudelcraft] Failed to preview step', error);
    }
}

function handleClear() {
    pattern = createEmptyPattern();
    handleStop();
    ui.setPattern(pattern);
    ui.setPresetValue('');
    ui.setImportExampleValue('');
    ui.setPatternDescription('manual grid');
    ui.setSourceInput(patternToStrudel(pattern));
    ui.setStatus('Cleared every lane.');
    persistState();
}

function handleRandomize() {
    pattern = randomizePattern();
    ui.setPattern(pattern);
    ui.setPresetValue('');
    ui.setImportExampleValue('');
    ui.setPatternDescription('randomized grid');
    ui.setSourceInput(patternToStrudel(pattern));
    ui.setStatus('Generated a fresh sketch pattern.');
    persistState();
}

function handlePresetChange(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    pattern = clonePattern(preset.pattern);
    bpm = preset.bpm;
    handleStop();
    syncUi({
        description: preset.description ?? `${preset.name} preset`,
        status: `Loaded the ${preset.name.toLowerCase()} preset.`,
        sourceInput: patternToStrudel(pattern),
        presetKey,
        importExampleKey: '',
    });
}

function handleBpmChange(nextBpm) {
    bpm = clamp(Math.round(nextBpm), 60, 180);
    ui.setBpm(bpm);
    ui.setStatus(`Tempo set to ${bpm} BPM.`);
    persistState();
}

async function handleCopy(text) {
    try {
        if (!navigator.clipboard?.writeText) {
            throw new Error('Clipboard API unavailable');
        }
        await navigator.clipboard.writeText(text);
        ui.flashCopied();
        ui.setStatus('Copied generated Strudel to the clipboard.');
    } catch (error) {
        console.error('[strudelcraft] Clipboard write failed', error);
        ui.setStatus('Clipboard copy failed in this browser context.');
    }
}

function tick(now) {
    const deltaSeconds = Math.max(0, (now - lastFrameAt) / 1000);
    lastFrameAt = now;

    if (isPlaying) {
        elapsedSeconds += deltaSeconds;
        const stepDuration = 60 / bpm / 4;
        const nextStep = Math.floor(elapsedSeconds / stepDuration) % STEP_COUNT;
        if (nextStep !== currentStep) {
            currentStep = nextStep;
            ui.setCurrentStep(currentStep);
            triggerCurrentStep(currentStep);
        }
    }

    requestAnimationFrame(tick);
}

function triggerCurrentStep(stepIndex) {
    ROWS.forEach((row) => {
        if (pattern[row.key]?.[stepIndex]) {
            synth.trigger(row.key);
        }
    });
}

function persistState() {
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                bpm,
                pattern,
            }),
        );
    } catch (error) {
        console.warn('[strudelcraft] Failed to persist local sequencer state', error);
    }
}

function loadPersistedState() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const restoredPattern = createEmptyPattern();
        ROWS.forEach((row) => {
            const sourceSteps = parsed.pattern?.[row.key];
            if (!Array.isArray(sourceSteps)) return;
            for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex += 1) {
                restoredPattern[row.key][stepIndex] = Boolean(sourceSteps[stepIndex]);
            }
        });
        return {
            bpm: clamp(Number(parsed.bpm) || DEFAULT_BPM, 60, 180),
            pattern: restoredPattern,
        };
    } catch (error) {
        console.warn('[strudelcraft] Failed to restore local sequencer state', error);
        return null;
    }
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function findMatchingImportExampleKey(code) {
    const normalizedCode = code.trim();
    const match = IMPORT_EXAMPLES.find((example) => example.code === normalizedCode);
    return match?.key ?? '';
}

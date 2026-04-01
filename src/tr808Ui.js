import { DEFAULT_BPM, PRESETS, ROWS, STEP_COUNT, countActiveSteps, patternToStrudel } from './sequencerModel.js';

export class Tr808Ui {
    constructor({
        onToggleStep,
        onStart,
        onStop,
        onClear,
        onRandomize,
        onImport,
        onCopy,
        onPresetChange,
        onBpmChange,
    } = {}) {
        this.handlers = {
            onToggleStep,
            onStart,
            onStop,
            onClear,
            onRandomize,
            onImport,
            onCopy,
            onPresetChange,
            onBpmChange,
        };

        this.stepButtons = new Map();
        this.transportButtons = [];
        this.root = this.#build();
        document.body.appendChild(this.root);
    }

    setPattern(pattern) {
        ROWS.forEach((row) => {
            const buttons = this.stepButtons.get(row.key) ?? [];
            const steps = pattern?.[row.key] ?? [];
            buttons.forEach((button, stepIndex) => {
                button.classList.toggle('is-active', Boolean(steps[stepIndex]));
            });
        });
        this.setGeneratedCode(patternToStrudel(pattern));
        this.setSummary(`${countActiveSteps(pattern)} active hits`);
    }

    setCurrentStep(stepIndex) {
        this.transportButtons.forEach((button, index) => {
            button.classList.toggle('is-current', index === stepIndex);
        });
        this.stepButtons.forEach((buttons) => {
            buttons.forEach((button, index) => {
                button.classList.toggle('is-current', index === stepIndex);
                button.classList.toggle('is-hit-current', index === stepIndex && button.classList.contains('is-active'));
            });
        });
    }

    setPlaying(isPlaying) {
        this.root.dataset.playing = isPlaying ? 'true' : 'false';
    }

    setStatus(text) {
        const status = this.root.querySelector('[data-role="status"]');
        if (status) {
            status.textContent = text;
        }
    }

    setSummary(text) {
        const summary = this.root.querySelector('[data-role="summary"]');
        if (summary) {
            summary.textContent = text;
        }
    }

    setPatternDescription(text) {
        const label = this.root.querySelector('[data-role="pattern-description"]');
        if (label) {
            label.textContent = text || 'No imported pattern';
        }
    }

    setGeneratedCode(text) {
        const output = this.root.querySelector('[data-role="generated-code"]');
        if (output) {
            output.value = text;
        }
    }

    setSourceInput(text) {
        const input = this.root.querySelector('[data-role="source-input"]');
        if (input) {
            input.value = text;
        }
    }

    setBpm(bpm) {
        const input = this.root.querySelector('[data-role="bpm"]');
        if (input) {
            input.value = `${bpm}`;
        }
    }

    setPresetValue(presetKey) {
        const select = this.root.querySelector('[data-role="preset"]');
        if (select) {
            select.value = presetKey;
        }
    }

    flashCopied() {
        const button = this.root.querySelector('[data-role="copy"]');
        if (!button) return;
        const previous = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => {
            button.textContent = previous;
        }, 900);
    }

    #build() {
        const root = document.createElement('main');
        root.id = 'sequencer-app';
        root.innerHTML = `
            <section class="control-panel">
                <div class="transport-buttons">
                    <button type="button" data-action="start" class="primary">Start</button>
                    <button type="button" data-action="stop">Stop</button>
                    <button type="button" data-action="randomize">Randomize</button>
                    <button type="button" data-action="clear">Clear</button>
                    <button type="button" data-role="copy">Copy Strudel</button>
                </div>
                <label class="field">
                    <span>BPM</span>
                    <input type="number" min="60" max="180" step="1" value="${DEFAULT_BPM}" data-role="bpm" />
                </label>
                <label class="field">
                    <span>Preset</span>
                    <select data-role="preset">
                        <option value="">Custom</option>
                        ${Object.entries(PRESETS)
                            .map(([key, preset]) => `<option value="${key}">${preset.name}</option>`)
                            .join('')}
                    </select>
                </label>
                <div class="field field-summary">
                    <span>Grid</span>
                    <strong data-role="summary">0 active hits</strong>
                </div>
                <div class="field field-wide">
                    <span>Pattern</span>
                    <strong data-role="pattern-description">Loading...</strong>
                </div>
                <div class="field field-status">
                    <span>Status</span>
                    <strong data-role="status">Booting sequencer...</strong>
                </div>
            </section>
            <section class="sequencer-panel">
                <div class="transport-row">
                    <div class="corner-label">Step</div>
                    <div class="transport-grid" data-role="transport-grid"></div>
                </div>
                <div class="lane-grid" data-role="lane-grid"></div>
            </section>
            <section class="source-panel">
                <div class="source-card">
                    <div class="source-header">
                        <h2>Import Strudel</h2>
                        <button type="button" data-action="import">Import</button>
                    </div>
                    <textarea data-role="source-input" spellcheck="false" placeholder="Paste Strudel code, a hash URL, or a strudel.tidalcycles.org link."></textarea>
                </div>
                <div class="source-card">
                    <div class="source-header">
                        <h2>Generated Strudel</h2>
                    </div>
                    <textarea data-role="generated-code" spellcheck="false" readonly></textarea>
                </div>
            </section>
        `;

        const transportGrid = root.querySelector('[data-role="transport-grid"]');
        for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex += 1) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'transport-step';
            button.textContent = `${stepIndex + 1}`;
            transportGrid.appendChild(button);
            this.transportButtons.push(button);
        }

        const laneGrid = root.querySelector('[data-role="lane-grid"]');
        ROWS.forEach((row) => {
            const label = document.createElement('div');
            label.className = 'lane-label';
            label.textContent = row.label;
            laneGrid.appendChild(label);

            const stepsWrap = document.createElement('div');
            stepsWrap.className = 'lane-steps';
            const stepButtons = [];

            for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex += 1) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'step-button';
                button.dataset.row = row.key;
                button.dataset.step = `${stepIndex}`;
                button.setAttribute('aria-label', `${row.label} step ${stepIndex + 1}`);
                stepsWrap.appendChild(button);
                stepButtons.push(button);
            }

            laneGrid.appendChild(stepsWrap);
            this.stepButtons.set(row.key, stepButtons);
        });

        root.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const stepButton = target.closest('.step-button');
            if (stepButton instanceof HTMLButtonElement) {
                const rowKey = stepButton.dataset.row;
                const stepIndex = Number(stepButton.dataset.step);
                if (rowKey && Number.isInteger(stepIndex)) {
                    this.handlers.onToggleStep?.(rowKey, stepIndex);
                }
                return;
            }

            const actionTarget = target.closest('[data-action]');
            if (!(actionTarget instanceof HTMLButtonElement)) return;
            const action = actionTarget.dataset.action;
            if (action === 'start') this.handlers.onStart?.();
            if (action === 'stop') this.handlers.onStop?.();
            if (action === 'clear') this.handlers.onClear?.();
            if (action === 'randomize') this.handlers.onRandomize?.();
            if (action === 'import') {
                const input = root.querySelector('[data-role="source-input"]');
                if (input instanceof HTMLTextAreaElement) {
                    this.handlers.onImport?.(input.value);
                }
            }
        });

        const copyButton = root.querySelector('[data-role="copy"]');
        copyButton?.addEventListener('click', () => {
            const output = root.querySelector('[data-role="generated-code"]');
            if (output instanceof HTMLTextAreaElement) {
                this.handlers.onCopy?.(output.value);
            }
        });

        const bpmInput = root.querySelector('[data-role="bpm"]');
        bpmInput?.addEventListener('change', (event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) {
                this.handlers.onBpmChange?.(value);
            }
        });

        const presetSelect = root.querySelector('[data-role="preset"]');
        presetSelect?.addEventListener('change', (event) => {
            this.handlers.onPresetChange?.(event.target.value);
        });

        return root;
    }
}

export function createTr808Ui(options) {
    return new Tr808Ui(options);
}

import { buildPunchcardModel } from './punchcardModel.js';
import { PUNCHCARD_EXAMPLES } from './strudelExamples.js';
import { buildStrudelEventsFromSource, parseRuntimeProgram } from './strudel.js';
import { ensureStrudelRuntime } from './strudelRuntime.js';

globalThis.__strudelInitOptions = {
    prebake: () => globalThis.samples?.('github:tidalcycles/dirt-samples'),
};

const DEFAULT_CODE = PUNCHCARD_EXAMPLES[0].code;
const DEFAULT_CYCLES = 4;

const editor = document.querySelector('[data-role="editor"]');
const exampleSelect = document.querySelector('[data-role="example"]');
const renderButton = document.querySelector('[data-action="render"]');
const playButton = document.querySelector('[data-action="play"]');
const stopButton = document.querySelector('[data-action="stop"]');
const statusEl = document.querySelector('[data-role="status"]');
const statsEl = document.querySelector('[data-role="stats"]');
const canvas = document.querySelector('[data-role="punchcard"]');
const emptyEl = document.querySelector('[data-role="empty"]');

let currentModel = buildPunchcardModel([], { cycles: DEFAULT_CYCLES });
let renderTimer = 0;

bootstrap();

function bootstrap() {
    exampleSelect.innerHTML = PUNCHCARD_EXAMPLES.map((example) => `<option value="${example.key}">${example.label}</option>`).join('');
    editor.value = DEFAULT_CODE;
    exampleSelect.value = PUNCHCARD_EXAMPLES[0].key;

    renderButton.addEventListener('click', () => {
        renderEditorCode('Rendered editor code into the punchcard.');
    });

    playButton.addEventListener('click', async () => {
        await playEditorCode();
    });

    stopButton.addEventListener('click', async () => {
        await hushRuntime();
    });

    exampleSelect.addEventListener('change', () => {
        const example = PUNCHCARD_EXAMPLES.find((entry) => entry.key === exampleSelect.value);
        if (!example) return;
        editor.value = example.code;
        renderEditorCode(example.status);
    });

    editor.addEventListener('input', () => {
        clearTimeout(renderTimer);
        renderTimer = window.setTimeout(() => {
            renderEditorCode('Updated the punchcard from your editor.');
        }, 260);
    });

    editor.addEventListener('keydown', async (event) => {
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            await playEditorCode();
            return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            renderEditorCode('Rendered editor code into the punchcard.');
            return;
        }
    });

    const resizeObserver = new ResizeObserver(() => drawPunchcard(currentModel));
    resizeObserver.observe(canvas);

    renderEditorCode('Loaded the default punchcard example.');
}

async function renderEditorCode(successStatus) {
    const code = editor.value.trim();
    if (!code) {
        setStatus('Paste Strudel code to render the punchcard.');
        statsEl.textContent = 'No code yet.';
        currentModel = buildPunchcardModel([], { cycles: DEFAULT_CYCLES });
        drawPunchcard(currentModel);
        return;
    }

    setStatus('Rendering punchcard...');
    try {
        const result = await buildStrudelEventsFromSource({ type: 'code', payload: code }, { cycles: DEFAULT_CYCLES });
        currentModel = buildPunchcardModel(result.events, { cycles: DEFAULT_CYCLES });
        drawPunchcard(currentModel);
        setStatus(successStatus);
        statsEl.textContent = `${result.events.length} events, ${currentModel.lanes.length} lanes, ${currentModel.cycles} cycles. ${result.description}`;
        emptyEl.hidden = result.events.length > 0;
        syncExampleSelection(code);
    } catch (error) {
        console.error('[strudelcraft] Punchcard render failed', error);
        setStatus('Render failed. Check the console for parser details.');
        statsEl.textContent = error.message;
        currentModel = buildPunchcardModel([], { cycles: DEFAULT_CYCLES });
        drawPunchcard(currentModel);
        emptyEl.hidden = false;
    }
}

async function playEditorCode() {
    const code = editor.value.trim();
    if (!code) {
        setStatus('Paste Strudel code before pressing Play.');
        return;
    }

    setStatus('Starting Strudel playback...');
    try {
        const runtime = await ensureStrudelRuntime();
        if (typeof runtime.hush === 'function') {
            runtime.hush();
        }

        const program = parseRuntimeProgram(code);
        if (!program.patternBlocks.length) {
            await runtime.evaluate(`${code}.play()`);
        } else {
            for (const statement of program.statements) {
                if (statement.type === 'setup') {
                    await runtime.evaluate(statement.code);
                    continue;
                }
                if (statement.type === 'let') {
                    await runtime.evaluate(`globalThis.${statement.name} = (${statement.expression.trim()})`);
                    continue;
                }
                await runtime.evaluate(`${statement.expression}.play()`);
            }
        }

        setStatus('Playing through the Strudel runtime. Use Stop to hush.');
    } catch (error) {
        console.error('[strudelcraft] Playback failed', error);
        setStatus('Playback failed. Check the console for runtime details.');
    }
}

async function hushRuntime() {
    try {
        const runtime = await ensureStrudelRuntime();
        if (typeof runtime.hush === 'function') {
            runtime.hush();
        }
        setStatus('Playback stopped.');
    } catch (error) {
        console.error('[strudelcraft] Hush failed', error);
        setStatus('Stop failed. Check the console for runtime details.');
    }
}

function syncExampleSelection(code) {
    const match = PUNCHCARD_EXAMPLES.find((example) => example.code.trim() === code.trim());
    exampleSelect.value = match?.key ?? '';
}

function setStatus(text) {
    statusEl.textContent = text;
}

function drawPunchcard(model) {
    const context = canvas.getContext('2d');
    const width = Math.max(canvas.clientWidth, 600);
    const rowHeight = 42;
    const chartTop = 42;
    const chartBottom = 36;
    const chartLeft = 110;
    const chartRight = 20;
    const laneCount = Math.max(model.lanes.length, 1);
    const height = chartTop + laneCount * rowHeight + chartBottom;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.height = `${height}px`;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#0f1215';
    context.fillRect(0, 0, width, height);

    const timelineWidth = width - chartLeft - chartRight;
    const totalSpan = Math.max(model.totalSpan, 1);
    const cycleWidth = timelineWidth / totalSpan;

    drawGrid(context, {
        width,
        height,
        chartLeft,
        chartTop,
        chartRight,
        chartBottom,
        rowHeight,
        laneCount,
        totalSpan,
        cycleWidth,
    });

    model.lanes.forEach((lane, laneIndex) => {
        const y = chartTop + laneIndex * rowHeight;
        context.fillStyle = '#98a2ad';
        context.font = '600 12px Consolas, Monaco, monospace';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        context.fillText(lane.label, chartLeft - 14, y + rowHeight * 0.5);

        lane.marks.forEach((mark) => {
            const x = chartLeft + (mark.start / totalSpan) * timelineWidth;
            const markWidth = Math.max(6, ((mark.end - mark.start) / totalSpan) * timelineWidth);
            const markHeight = 18 + Math.max(0, Math.min(1, mark.velocity / model.maxVelocity)) * 10;
            const markY = y + (rowHeight - markHeight) * 0.5;
            const intensity = Math.max(0.28, Math.min(1, mark.velocity / model.maxVelocity));
            context.fillStyle = `rgba(255, 167, 75, ${0.24 + intensity * 0.58})`;
            roundRect(context, x, markY, markWidth, markHeight, 8);
            context.fill();
        });
    });

    if (!model.lanes.length) {
        context.fillStyle = '#8b949f';
        context.font = '500 14px Consolas, Monaco, monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('No events to draw yet.', width / 2, height / 2);
    }
}

function drawGrid(context, layout) {
    const { width, chartLeft, chartTop, chartRight, rowHeight, laneCount, totalSpan, cycleWidth } = layout;
    const chartHeight = laneCount * rowHeight;
    const timelineWidth = width - chartLeft - chartRight;

    context.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    context.lineWidth = 1;

    for (let cycle = 0; cycle <= totalSpan; cycle += 1) {
        const x = chartLeft + cycle * cycleWidth;
        context.beginPath();
        context.moveTo(x, chartTop - 8);
        context.lineTo(x, chartTop + chartHeight);
        context.stroke();

        if (cycle < totalSpan) {
            context.fillStyle = '#c2a778';
            context.font = '600 11px Consolas, Monaco, monospace';
            context.textAlign = 'left';
            context.textBaseline = 'bottom';
            context.fillText(`C${cycle + 1}`, x + 6, chartTop - 12);
        }
    }

    context.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    for (let subdivision = 0; subdivision < totalSpan * 4; subdivision += 1) {
        const x = chartLeft + (subdivision / (totalSpan * 4)) * timelineWidth;
        context.beginPath();
        context.moveTo(x, chartTop);
        context.lineTo(x, chartTop + chartHeight);
        context.stroke();
    }

    for (let row = 0; row <= laneCount; row += 1) {
        const y = chartTop + row * rowHeight;
        context.beginPath();
        context.moveTo(chartLeft, y);
        context.lineTo(width - chartRight, y);
        context.stroke();
    }
}

function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}

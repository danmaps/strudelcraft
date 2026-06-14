const INSTRUMENT_COLORS = {
    bd: '255, 120, 52',
    sd: '255, 236, 220',
    lt: '255, 180, 130',
    mt: '255, 152, 105',
    ht: '255, 130, 82',
    rim: '255, 215, 155',
    ch: '124, 230, 255',
    oh: '95, 214, 255',
    cr: '255, 226, 110',
    rd: '255, 193, 130',
};
const ANALYSER_FFT_SIZE = 1024;
const MIN_SPARK_TTL_SECONDS = 0.3;
const SPARK_TTL_VARIATION_SECONDS = 0.24;

export function createLiveVisualizer({ canvas, synth, getPattern }) {
    if (!(canvas instanceof HTMLCanvasElement)) {
        return { resize() {}, render() {} };
    }

    const context = canvas.getContext('2d');
    const frequencyData = new Uint8Array(512);
    const waveformData = new Uint8Array(512);
    const sparks = [];
    let analyser = null;
    let lastRenderAt = performance.now();

    synth.onTrigger(({ rowKey }) => {
        for (let index = 0; index < 10; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 240;
            sparks.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                ttl: MIN_SPARK_TTL_SECONDS + Math.random() * SPARK_TTL_VARIATION_SECONDS,
                life: 0,
                color: INSTRUMENT_COLORS[rowKey] ?? '255, 170, 110',
            });
        }
    });

    window.addEventListener('resize', resize);
    resize();

    function resize() {
        const ratio = Math.max(1, window.devicePixelRatio || 1);
        const width = Math.max(640, canvas.clientWidth);
        const height = Math.max(320, canvas.clientHeight);
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function render(now = performance.now()) {
        const deltaSeconds = Math.max(0.001, (now - lastRenderAt) / 1000);
        lastRenderAt = now;

        if (!analyser) {
            try {
                analyser = synth.getAnalyserNode();
            } catch (error) {
                console.warn('[strudelcraft] Visualizer analyser unavailable', error);
                return;
            }
        }
        if (!analyser) {
            return;
        }

        if (analyser.fftSize !== ANALYSER_FFT_SIZE) {
            analyser.fftSize = ANALYSER_FFT_SIZE;
        }
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(waveformData);

        const width = canvas.width / Math.max(1, window.devicePixelRatio || 1);
        const height = canvas.height / Math.max(1, window.devicePixelRatio || 1);
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const energy = average(frequencyData) / 255;
        const palette = derivePalette(getPattern?.());

        context.clearRect(0, 0, width, height);
        const background = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.62);
        background.addColorStop(0, `rgba(${palette.warm}, ${0.22 + energy * 0.28})`);
        background.addColorStop(1, `rgba(${palette.cool}, 0.05)`);
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);

        drawFrequencyHalo(context, frequencyData, centerX, centerY, width, height, palette, energy);
        drawWaveRing(context, waveformData, centerX, centerY, width, height, palette);
        drawSparks(context, sparks, deltaSeconds, centerX, centerY);
    }

    return {
        resize,
        render,
    };
}

function drawFrequencyHalo(context, frequencyData, centerX, centerY, width, height, palette, energy) {
    const baseRadius = Math.min(width, height) * 0.2;
    const ringRadius = baseRadius + Math.min(width, height) * 0.14;
    const bars = Math.min(120, frequencyData.length);
    const barStep = (Math.PI * 2) / bars;

    for (let index = 0; index < bars; index += 1) {
        const magnitude = frequencyData[index] / 255;
        const barLength = 10 + magnitude * (height * 0.16);
        const angle = index * barStep;
        const innerX = centerX + Math.cos(angle) * ringRadius;
        const innerY = centerY + Math.sin(angle) * ringRadius;
        const outerX = centerX + Math.cos(angle) * (ringRadius + barLength);
        const outerY = centerY + Math.sin(angle) * (ringRadius + barLength);
        context.strokeStyle = `rgba(${palette.cool}, ${0.1 + magnitude * 0.75})`;
        context.lineWidth = 1.2 + magnitude * 2.4;
        context.beginPath();
        context.moveTo(innerX, innerY);
        context.lineTo(outerX, outerY);
        context.stroke();
    }

    context.strokeStyle = `rgba(${palette.warm}, ${0.35 + energy * 0.4})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    context.stroke();
}

function drawWaveRing(context, waveformData, centerX, centerY, width, height, palette) {
    const points = Math.min(220, waveformData.length);
    const radius = Math.min(width, height) * 0.2;
    const amplitude = Math.min(width, height) * 0.075;
    context.beginPath();

    for (let index = 0; index <= points; index += 1) {
        const sample = waveformData[index % points] / 255;
        const centered = sample - 0.5;
        const angle = (index / points) * Math.PI * 2;
        const radial = radius + centered * amplitude;
        const x = centerX + Math.cos(angle) * radial;
        const y = centerY + Math.sin(angle) * radial;
        if (index === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }

    context.closePath();
    context.strokeStyle = `rgba(${palette.warm}, 0.85)`;
    context.lineWidth = 2.2;
    context.stroke();
}

function drawSparks(context, sparks, deltaSeconds, centerX, centerY) {
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        spark.life += deltaSeconds;
        if (spark.life >= spark.ttl) {
            sparks.splice(index, 1);
            continue;
        }
        spark.x += spark.vx * deltaSeconds;
        spark.y += spark.vy * deltaSeconds;
        spark.vx *= 0.96;
        spark.vy *= 0.96;
        const alpha = 1 - spark.life / spark.ttl;
        context.fillStyle = `rgba(${spark.color}, ${Math.max(0, alpha)})`;
        context.beginPath();
        context.arc(centerX + spark.x, centerY + spark.y, 1.2 + alpha * 3.6, 0, Math.PI * 2);
        context.fill();
    }
}

function derivePalette(pattern) {
    const base = { warm: '255, 154, 82', cool: '98, 198, 255' };
    if (!pattern || typeof pattern !== 'object') {
        return base;
    }

    const warmKeys = ['bd', 'sd', 'lt', 'mt', 'ht', 'rim', 'cr'];
    const coolKeys = ['ch', 'oh', 'rd'];
    const warmHits = countHits(pattern, warmKeys);
    const coolHits = countHits(pattern, coolKeys);
    const total = Math.max(1, warmHits + coolHits);
    const mix = coolHits / total;

    return {
        warm: blend([255, 130, 72], [255, 220, 110], mix * 0.6),
        cool: blend([78, 176, 255], [125, 235, 255], 0.35 + mix * 0.65),
    };
}

function countHits(pattern, keys) {
    return keys.reduce((sum, key) => {
        const steps = pattern[key];
        if (!Array.isArray(steps)) return sum;
        return sum + steps.reduce((rowSum, isActive) => rowSum + (isActive ? 1 : 0), 0);
    }, 0);
}

function blend(from, to, t) {
    const mix = Math.max(0, Math.min(1, t));
    const r = Math.round(from[0] + (to[0] - from[0]) * mix);
    const g = Math.round(from[1] + (to[1] - from[1]) * mix);
    const b = Math.round(from[2] + (to[2] - from[2]) * mix);
    return `${r}, ${g}, ${b}`;
}

function average(values) {
    if (!values.length) return 0;
    let total = 0;
    for (let index = 0; index < values.length; index += 1) {
        total += values[index];
    }
    return total / values.length;
}

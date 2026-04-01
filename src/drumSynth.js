const NOISE_LENGTH_SECONDS = 1;

export class DrumSynth {
    constructor() {
        this.context = null;
        this.noiseBuffer = null;
    }

    async resume() {
        const context = this.#getContext();
        if (context.state === 'suspended') {
            await context.resume();
        }
        return context;
    }

    trigger(rowKey, velocity = 0.9) {
        const context = this.#getContext();
        const time = context.currentTime + 0.01;

        switch (rowKey) {
            case 'bd':
                this.#kick(time, velocity);
                break;
            case 'sd':
                this.#snare(time, velocity);
                break;
            case 'lt':
                this.#tom(time, 140, 0.2, velocity);
                break;
            case 'mt':
                this.#tom(time, 180, 0.18, velocity);
                break;
            case 'ht':
                this.#tom(time, 240, 0.14, velocity);
                break;
            case 'rim':
                this.#rim(time, velocity);
                break;
            case 'ch':
                this.#hat(time, 0.05, 9000, velocity);
                break;
            case 'oh':
                this.#hat(time, 0.18, 7000, velocity * 0.9);
                break;
            case 'cr':
                this.#hat(time, 0.42, 5200, velocity * 0.85);
                break;
            case 'rd':
                this.#hat(time, 0.3, 3800, velocity * 0.8);
                break;
            default:
                break;
        }
    }

    #getContext() {
        if (this.context) return this.context;
        const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!AudioContextCtor) {
            throw new Error('Web Audio API is unavailable in this browser.');
        }
        this.context = new AudioContextCtor();
        this.noiseBuffer = this.#createNoiseBuffer(this.context);
        return this.context;
    }

    #kick(time, velocity) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(148, time);
        oscillator.frequency.exponentialRampToValueAtTime(44, time + 0.18);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(velocity, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);

        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.3);
    }

    #snare(time, velocity) {
        this.#noiseBurst({
            time,
            duration: 0.16,
            gainAmount: velocity * 0.55,
            filterType: 'bandpass',
            frequency: 1800,
            q: 0.8,
        });

        const tone = this.context.createOscillator();
        const gain = this.context.createGain();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(196, time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(velocity * 0.28, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        tone.connect(gain);
        gain.connect(this.context.destination);
        tone.start(time);
        tone.stop(time + 0.13);
    }

    #tom(time, startFrequency, duration, velocity) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(startFrequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(70, startFrequency * 0.65), time + duration);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(velocity * 0.5, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(time);
        oscillator.stop(time + duration + 0.02);
    }

    #rim(time, velocity) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(820, time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(velocity * 0.22, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.06);
    }

    #hat(time, duration, frequency, velocity) {
        this.#noiseBurst({
            time,
            duration,
            gainAmount: velocity * 0.35,
            filterType: 'highpass',
            frequency,
            q: 0.7,
        });
    }

    #noiseBurst({ time, duration, gainAmount, filterType, frequency, q }) {
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(frequency, time);
        filter.Q.setValueAtTime(q, time);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(gainAmount, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);
        source.start(time);
        source.stop(time + duration + 0.02);
    }

    #createNoiseBuffer(context) {
        const frameCount = context.sampleRate * NOISE_LENGTH_SECONDS;
        const buffer = context.createBuffer(1, frameCount, context.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i += 1) {
            channel[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
}

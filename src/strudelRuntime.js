const STRUDEL_WEB_URL = 'https://unpkg.com/@strudel/web@1.0.3';

let runtimePromise = null;

export function ensureStrudelRuntime() {
    if (runtimePromise) {
        return runtimePromise;
    }
    runtimePromise = loadStrudelScript()
        .then(() => {
            if (typeof globalThis.initStrudel !== 'function') {
                throw new Error('Strudel runtime not found after loading @strudel/web.');
            }
            const initResult = globalThis.initStrudel();
            return Promise.resolve(initResult).then(() => {
                const evaluateFn = globalThis.evaluate ?? globalThis.strudel?.evaluate;
                const hushFn = globalThis.hush ?? globalThis.strudel?.hush;
                if (typeof evaluateFn !== 'function') {
                    throw new Error('Strudel evaluate() function unavailable after init.');
                }
                return {
                    evaluate: evaluateFn,
                    hush: hushFn,
                };
            });
        })
        .catch((error) => {
            console.error('[strudelcraft] Failed to load @strudel/web runtime', error);
            throw error;
        });
    return runtimePromise;
}

function loadStrudelScript() {
    if (globalThis.__strudelWebLoaded) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-strudel-web]');
        if (existing) {
            if (globalThis.__strudelWebLoaded) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => {
                globalThis.__strudelWebLoaded = true;
                resolve();
            });
            existing.addEventListener('error', (err) => reject(err));
            return;
        }

        const script = document.createElement('script');
        script.src = STRUDEL_WEB_URL;
        script.async = true;
        script.dataset.strudelWeb = 'true';
        script.onload = () => {
            globalThis.__strudelWebLoaded = true;
            resolve();
        };
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

// Loads the Rust/WebAssembly simulation core (built by scripts/build-engine.sh).
// Both builds are embedded in the worker bundle, so no extra files are fetched
// (this also works when the page is opened from file://).

const engineMt = require('./wasm/engine-mt.wasm'); // multi-threaded: shared memory + atomics
const engineSt = require('./wasm/engine-st.wasm'); // single-threaded

function bytesFromDataUrl(url) {
    const bin = atob(url.slice(url.indexOf(',') + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

// Shared memory needs SharedArrayBuffer, which browsers only enable on
// cross-origin isolated pages (see dist/coi-serviceworker.js).
function sharedMemoryAvailable() {
    if (typeof SharedArrayBuffer === 'undefined') return false;
    if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) return false;
    try {
        new WebAssembly.Memory({initial: 1, maximum: 1, shared: true});
        return true;
    } catch (e) {
        return false;
    }
}

async function instantiate(url, shared) {
    const module = await WebAssembly.compile(bytesFromDataUrl(url));
    let memory = null;
    // 2 GiB of address space; fall back to less on devices that refuse it
    for (const maximum of [32768, 16384, 4096]) {
        try {
            memory = new WebAssembly.Memory({initial: 32, maximum, shared});
            break;
        } catch (e) {
            memory = null;
        }
    }
    if (!memory) throw new Error('could not allocate WebAssembly memory');
    const instance = await WebAssembly.instantiate(module, {env: {memory}});
    return {module, memory, instance, shared};
}

async function loadEngine() {
    if (sharedMemoryAvailable()) {
        try {
            return await instantiate(engineMt, true);
        } catch (e) {
            console.warn('Multi-threaded engine unavailable, using the single-threaded build.', e);
        }
    }
    return instantiate(engineSt, false);
}

module.exports = loadEngine;

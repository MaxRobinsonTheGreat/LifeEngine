// Loads the Rust/WebAssembly engine in Node (tests and benchmarks), optionally
// with helper threads (worker_threads) sharing the module's memory.
const fs = require('fs');
const path = require('path');
const WasmWorld = require('../src/Sim/WasmWorld');

const dir = path.join(__dirname, '..', 'src', 'Sim', 'wasm');

module.exports = function load({ threads = 1, shared = false } = {}) {
    const useShared = shared || threads > 1;
    const bytes = fs.readFileSync(path.join(dir, useShared ? 'engine-mt.wasm' : 'engine-st.wasm'));
    const module = new WebAssembly.Module(bytes);
    const memory = new WebAssembly.Memory({ initial: 32, maximum: 32768, shared: useShared });
    const instance = new WebAssembly.Instance(module, { env: { memory } });
    const helpers = [];
    return {
        module, memory, instance, helpers,
        world(cols, rows) {
            const w = new WasmWorld(instance, memory, cols, rows, 5);
            if (threads > 1) startHelpers(module, memory, instance, threads, helpers);
            return w;
        },
    };
};

function startHelpers(module, memory, instance, threads, helpers) {
    const { Worker } = require('worker_threads');
    const ex = instance.exports;
    for (let tid = 1; tid < threads; tid++) {
        const stack = ex.eng_alloc_stack(1 << 20);
        const tls = ex.eng_alloc(ex.__tls_size.value, ex.__tls_align.value);
        const w = new Worker(path.join(__dirname, 'wasm-helper.js'), { workerData: { module, memory, tid, stack, tls } });
        w.unref();
        helpers.push(w);
    }
    // wait (synchronously) until every helper is parked in eng_helper_main
    const flag = new Int32Array(new SharedArrayBuffer(4));
    const deadline = Date.now() + 10000;
    while (ex.eng_registered_helpers() < threads - 1) {
        if (Date.now() > deadline) throw new Error('helper threads did not start');
        Atomics.wait(flag, 0, 0, 5);
    }
    ex.eng_set_threads(threads);
}

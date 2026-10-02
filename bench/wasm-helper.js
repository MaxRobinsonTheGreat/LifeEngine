// Helper thread for the multi-threaded engine in Node.
const { workerData } = require('worker_threads');
const { memory, tid, stack, tls } = workerData;
const instance = new WebAssembly.Instance(workerData.module, { env: { memory } });
instance.exports.__stack_pointer.value = stack;
instance.exports.__wasm_init_tls(tls);
instance.exports.eng_helper_main(tid);

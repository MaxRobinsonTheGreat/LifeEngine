// The worker bundle (built first by webpack.config.js) is embedded as a string
// and started from a Blob URL, so no separate worker file has to be served.
const source = require('../../build/sim.worker.js');

function createWorker() {
    const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
    return new Worker(url);
}

// Fallback when no worker can be started: run the same worker code on this
// thread against a stand-in for the worker's `self`.
function runOnThisThread(onmessage) {
    const fakeSelf = {
        __lifeEngineMainThread: true,
        onmessage: null,
        postMessage: (msg) => setTimeout(() => onmessage(msg), 0),
    };
    new Function('self', source)(fakeSelf);
    return (msg) => setTimeout(() => fakeSelf.onmessage({data: msg}), 0);
}

module.exports = { createWorker, runOnThisThread };

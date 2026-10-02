// Main-thread side of the simulation. Talks to SimHost in a Web Worker, or runs
// the same worker code on this thread if a worker can't be created (e.g. a
// content security policy forbids blob: workers). The message API is identical.

const { createWorker, runOnThisThread } = require('./createWorker');

class SimClient {
    constructor() {
        this.handlers = {};
        this.pending = new Map();
        this.next_req = 1;
        this.in_worker = false;
        try {
            this.worker = createWorker();
            this.worker.onmessage = (e) => this.dispatch(e.data);
            this.worker.onerror = (e) => {
                // A worker that fails to load reports here before ever replying.
                if (!this.worker_alive) {
                    console.warn('Simulation worker failed to start, running on the main thread instead.', e.message || e);
                    e.preventDefault && e.preventDefault();
                    this.useLocalHost();
                }
            };
            this.in_worker = true;
            this.worker_alive = false;
        } catch (e) {
            console.warn('Web Workers unavailable, running the simulation on the main thread.', e);
            this.useLocalHost();
        }
    }

    useLocalHost() {
        const queued = this.sent_log || [];
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.in_worker = false;
        this.host = runOnThisThread((msg) => this.dispatch(msg));
        this.sent_log = null;
        for (const msg of queued)
            this.host(msg);
    }

    dispatch(msg) {
        if (this.in_worker && !this.worker_alive) {
            this.worker_alive = true;
            this.sent_log = null;
        }
        if (msg.type === 'reply') {
            const p = this.pending.get(msg.req);
            if (p) {
                this.pending.delete(msg.req);
                if (msg.error) p.reject(new Error(msg.error));
                else p.resolve(msg);
            }
            return;
        }
        const handler = this.handlers[msg.type];
        if (handler) handler(msg);
    }

    on(type, handler) {
        this.handlers[type] = handler;
    }

    send(msg, transfer) {
        if (this.worker) {
            // keep a log until the worker answers once, so we can replay on fallback
            if (!this.worker_alive) {
                this.sent_log = this.sent_log || [];
                this.sent_log.push(msg);
            }
            this.worker.postMessage(msg, transfer || []);
        }
        else {
            this.host(msg);
        }
    }

    request(msg) {
        const req = this.next_req++;
        return new Promise((resolve, reject) => {
            this.pending.set(req, {resolve, reject});
            this.send({...msg, req});
        });
    }
}

module.exports = SimClient;

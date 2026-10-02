// Owns the simulation (the Rust/WebAssembly engine via WasmWorld) and its run
// loop. Runs inside a Web Worker (sim.worker.js), or on the main thread as a
// fallback when workers are unavailable. All communication is by plain messages.

const WasmWorld = require('./WasmWorld');
const loadEngine = require('./loadEngine');
const Hyperparams = require('../Hyperparameters');
const WorldConfig = require('../WorldConfig');
const FossilRecord = require('../Stats/FossilRecord');

const MAX_FPS = 1000; // target fps at or above this means "as fast as possible"

// Yield to the event loop without the 4ms clamp of nested setTimeout(0).
function makeYield() {
    if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        let callback = null;
        channel.port1.onmessage = () => { const cb = callback; callback = null; cb(); };
        return (cb) => { callback = cb; channel.port2.postMessage(0); };
    }
    return (cb) => setTimeout(cb, 0);
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Source of a helper thread: instantiates the engine on the shared memory, sets
// up its own stack and thread-local storage, then waits for work forever.
const HELPER_SOURCE = `
self.onmessage = async (e) => {
    const {module, memory, tid, stack, tls} = e.data;
    const instance = await WebAssembly.instantiate(module, {env: {memory}});
    instance.exports.__stack_pointer.value = stack;
    instance.exports.__wasm_init_tls(tls);
    self.postMessage('started');
    instance.exports.eng_helper_main(tid);
};`;

const MAX_THREADS = 16;

function hardwareThreads() {
    return (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 1;
}

function createHost(post, options={}) {
    // ms of simulation per slice before checking messages again
    const budget = options.budget || 12;
    const yieldNow = makeYield();
    let world = null;
    let running = false;
    let fps = 60;
    let loop_id = 0; // invalidates stale loops after start/stop
    let tick_debt = 0;
    let last_time = 0;
    let ticks_in_window = 0;
    let window_start = now();
    let tps = 0;
    let engine = null;
    let helpers = [];
    let helpers_started = 0;
    let ready = false;
    let failed = false;
    const queue = [];

    function tick() {
        try {
            world.update();
        } catch (e) {
            // a panic inside the engine; its state can't be trusted afterwards
            stop();
            failed = true;
            const message = world.panicMessage() || String(e && e.message || e);
            console.error('Simulation engine crashed:', message);
            post({type: 'fatal', error: message + ' (please reload the page)'});
            return;
        }
        ticks_in_window++;
    }

    function runLoop(id) {
        if (!running || id !== loop_id)
            return;
        const start = now();
        if (fps >= MAX_FPS) {
            const deadline = start + budget;
            do {
                tick();
            } while (running && now() < deadline);
            yieldNow(() => runLoop(id));
        }
        else {
            tick_debt += (start - last_time) * fps / 1000;
            last_time = start;
            // never try to catch up more than ~100ms of backlog
            if (tick_debt > fps / 10 + 1) tick_debt = fps / 10 + 1;
            const deadline = start + budget;
            while (tick_debt >= 1 && running && now() < deadline) {
                tick();
                tick_debt -= 1;
            }
            const wait = Math.max(1, (1 - tick_debt) * 1000 / fps);
            setTimeout(() => runLoop(id), wait);
        }
    }

    function start(new_fps) {
        fps = Math.max(1, new_fps);
        running = true;
        loop_id++;
        tick_debt = 1; // run a tick right away
        last_time = now();
        runLoop(loop_id);
    }

    function stop() {
        running = false;
        loop_id++;
    }

    function measureTps() {
        const t = now();
        if (t - window_start >= 500) {
            tps = running ? ticks_in_window * 1000 / (t - window_start) : 0;
            ticks_in_window = 0;
            window_start = t;
        }
        return tps;
    }

    function record() {
        return {
            tick_record: FossilRecord.tick_record,
            pop_counts: FossilRecord.pop_counts,
            species_counts: FossilRecord.species_counts,
            av_mut_rates: FossilRecord.av_mut_rates,
            av_cells: FossilRecord.av_cells,
            av_cell_counts: FossilRecord.av_cell_counts,
        };
    }

    function sizeInfo() {
        return {cols: world.cols, rows: world.rows, cell_size: world.cell_size};
    }

    // threads to use: WorldConfig.threads (0 = auto: one per core, leaving a
    // core for the page), limited to what this page can do
    function wantedThreads() {
        if (!engine || !engine.shared || WorldConfig.engine_mode === 'exact') return 1;
        const requested = parseInt(WorldConfig.threads) || 0;
        const auto = Math.max(1, hardwareThreads() - 1);
        return Math.max(1, Math.min(MAX_THREADS, requested > 0 ? requested : auto));
    }

    function applyEngineSettings() {
        if (!world) return;
        world.setFast(WorldConfig.engine_mode !== 'exact');
        const wanted = wantedThreads();
        if (wanted - 1 > helpers.length)
            startHelpers(wanted - 1);
        // only helpers that are already waiting can be used (eng_set_threads clamps)
        engine.instance.exports.eng_set_threads(wanted);
    }

    function startHelpers(count) {
        if (typeof Worker === 'undefined') return;
        const ex = engine.instance.exports;
        let url;
        try {
            url = URL.createObjectURL(new Blob([HELPER_SOURCE], {type: 'text/javascript'}));
        } catch (e) {
            return;
        }
        while (helpers.length < count) {
            const tid = helpers.length + 1;
            let worker;
            try {
                worker = new Worker(url);
            } catch (e) {
                console.warn('Could not start simulation helper threads', e);
                return;
            }
            const stack = ex.eng_alloc_stack(1 << 20);
            const tls = ex.eng_alloc(ex.__tls_size.value, ex.__tls_align.value);
            worker.onmessage = () => {
                helpers_started++;
                waitForHelpers();
            };
            worker.onerror = (e) => console.warn('Simulation helper thread failed', e.message || e);
            worker.postMessage({module: engine.module, memory: engine.memory, tid, stack, tls});
            helpers.push(worker);
        }
    }

    // a helper reports 'started' just before it parks itself in the engine;
    // re-apply the thread count once it has registered
    function waitForHelpers() {
        const ex = engine.instance.exports;
        if (ex.eng_registered_helpers() >= helpers_started)
            ex.eng_set_threads(wantedThreads());
        else
            setTimeout(waitForHelpers, 5);
    }

    function engineInfo() {
        const ex = engine.instance.exports;
        return {
            mode: WorldConfig.engine_mode === 'exact' ? 'exact' : 'fast',
            threads: WorldConfig.engine_mode === 'exact' ? 1 : Math.min(wantedThreads(), ex.eng_registered_helpers() + 1),
            shared: engine.shared,
            cores: hardwareThreads(),
        };
    }

    const handlers = {
        async init(msg) {
            Object.assign(Hyperparams, msg.hyper);
            Object.assign(WorldConfig, msg.config);
            engine = await loadEngine();
            world = new WasmWorld(engine.instance, engine.memory, msg.cols, msg.rows, msg.cell_size);
            world.onExtinct = () => {
                stop();
                post({type: 'extinct'});
            };
            applyEngineSettings();
            world.OriginOfLife();
        },
        hyper(msg) {
            Object.assign(Hyperparams, msg.values);
            world.syncParams();
        },
        config(msg) {
            Object.assign(WorldConfig, msg.values);
            world.syncParams();
            applyEngineSettings();
        },
        start(msg) { if (!failed) start(msg.fps); },
        stop() { stop(); },
        frame(msg) {
            const reply = {type: 'frame', grid: null, highlight: null, record: null, ...sizeInfo()};
            const transfer = [];
            if (msg.grid) {
                reply.grid = world.snapshot();
                transfer.push(reply.grid.buffer);
            }
            if (msg.mouse)
                reply.highlight = world.highlightCells(msg.mouse[0], msg.mouse[1]);
            if (msg.record)
                reply.record = record();
            reply.stats = world.stats();
            reply.stats.tps = measureTps();
            reply.stats.engine = engineInfo();
            post(reply, transfer);
        },
        reset(msg) {
            world.syncParams();
            world.reset(msg.life);
        },
        resize(msg) { world.resize(msg.cols, msg.rows, msg.cell_size); },
        brush(msg) { world.dropCellType(msg.c, msg.r, msg.size, msg.state, msg.kill, msg.ignore); },
        kill(msg) { world.killNear(msg.c, msg.r, msg.size); },
        walls(msg) {
            world.clearWalls();
            world.placeWalls(msg.cells);
        },
        clearWalls() { world.clearWalls(); },
        drop(msg) {
            for (const d of msg.orgs)
                world.dropOrganism(d.raw, d.c, d.r);
        },
        rename(msg) {
            const species = FossilRecord.extant_species[msg.old];
            if (species)
                FossilRecord.changeSpeciesName(species, msg.name);
        },
        select(msg) {
            const slot = world.findNearOrganism(msg.c, msg.r, msg.size);
            return {org: slot === null ? null : world.serializeSlot(slot)};
        },
        save() {
            return {json: JSON.stringify(world.serialize())};
        },
        load(msg) {
            const env = typeof msg.world === 'string' ? JSON.parse(msg.world) : msg.world;
            world.loadRaw(env);
            return sizeInfo();
        },
    };

    function dispatch(msg) {
        const handler = handlers[msg.type];
        if (!handler) {
            console.warn('Unknown simulation message', msg.type);
            return;
        }
        let result;
        try {
            result = handler(msg);
        } catch (e) {
            console.error(e);
            if (msg.req !== undefined)
                post({type: 'reply', req: msg.req, error: String(e && e.message || e)});
            return;
        }
        if (msg.req !== undefined)
            post({type: 'reply', req: msg.req, ...(result || {})});
    }

    // Messages that arrive while the engine is still loading wait in a queue.
    return function handle(msg) {
        if (msg.type === 'init') {
            handlers.init(msg).then(() => {
                ready = true;
                while (queue.length) dispatch(queue.shift());
            }, (e) => {
                console.error('Failed to start the simulation engine', e);
                post({type: 'fatal', error: String(e && e.message || e)});
            });
            return;
        }
        if (!ready) {
            queue.push(msg);
            return;
        }
        dispatch(msg);
    };
}

module.exports = createHost;

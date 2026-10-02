// Headless harness: runs the real simulation code in Node with a stubbed DOM.
// Usage: node bench/headless.js [--engine wasm|wasm-fast|object] [--threads N] [--ticks N] [--cols C] [--rows R]
//            [--seed S] [--world path.json] [--org path.json] [--render] [--classic] [--insta-kill] [--food-drop P]
// --engine wasm (default) is the Rust/WebAssembly engine in exact mode, wasm-fast its
// fast (tiled, multi-threaded) mode; object is the original implementation, kept as
// the reference for bench/compare.js.
// Prints timing plus a deterministic state hash (same seed => same hash) so
// optimizations can be checked for behavioral equivalence.

const args = process.argv.slice(2);
const opt = (name, def) => {
    const i = args.indexOf('--' + name);
    return i >= 0 ? args[i + 1] : def;
};
const TICKS = parseInt(opt('ticks', '3000'));
const COLS = parseInt(opt('cols', '200'));
const ROWS = parseInt(opt('rows', '150'));
const SEED = parseInt(opt('seed', '1'));
const WORLD = opt('world', null);
const ORG = opt('org', null);
const RENDER = args.includes('--render');
const CLASSIC = args.includes('--classic'); // only the original six cell types
const ENGINE = opt('engine', 'wasm');

// deterministic PRNG (mulberry32) replacing Math.random
let s = SEED >>> 0;
Math.random = function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const stubs = require('./stubs')({ cols: COLS, rows: ROWS });

const FossilRecord = require('../src/Stats/FossilRecord');
const WorldConfig = require('../src/WorldConfig');
const Hyperparams = require('../src/Hyperparameters');
const CellStates = require('../src/Organism/Cell/CellStates');
const fs = require('fs');

WorldConfig.headless = !RENDER;
Hyperparams.extendedCellTypes = !CLASSIC;
if (args.includes('--insta-kill')) Hyperparams.instaKill = true;
Hyperparams.foodDropProb = parseFloat(opt('food-drop', '0'));

let env, step, cellNames, orgSummary;
if (ENGINE === 'object') {
    const WorldEnvironment = require('./reference/ObjectWorldEnvironment');
    const Organism = require('../src/Organism/Organism');
    env = new WorldEnvironment(5);
    if (WORLD) {
        env.loadRaw(JSON.parse(fs.readFileSync(WORLD, 'utf8')));
    } else if (ORG) {
        env.reset(false, false);
        const raw = JSON.parse(fs.readFileSync(ORG, 'utf8'));
        const center = env.grid_map.getCenter();
        const org = new Organism(center[0], center[1], env);
        org.loadRaw(raw);
        org.c = center[0]; org.r = center[1];
        org.living = true; org.lifetime = 0; org.damage = 0; org.food_collected = 0;
        env.addOrganism(org);
        FossilRecord.addSpecies(org, null);
    } else {
        env.OriginOfLife();
    }
    step = () => { env.update(); env.render(); };
    cellNames = function* () { for (const col of env.grid_map.grid) for (const cell of col) yield cell.state.name; };
    orgSummary = (o) => [o.c, o.r, o.rotation, o.anatomy.cells.length, o.lifetime, o.food_collected, o.damage, o.direction, o.mutability, o.move_range];
} else {
    // Rust/WebAssembly core. --engine wasm (exact) or wasm-fast; --threads N for fast mode
    const engine = require('./wasm-node')({ threads: parseInt(opt('threads', '1')), shared: ENGINE === 'wasm-fast' });
    env = engine.world(COLS, ROWS);
    env.ex.eng_seed(SEED >>> 0);
    env.ex.eng_seed_threads((SEED * 7919) >>> 0);
    if (ENGINE === 'wasm-fast') env.setFast(true);
    env.syncParams();
    if (WORLD) {
        env.loadRaw(JSON.parse(fs.readFileSync(WORLD, 'utf8')));
    } else if (ORG) {
        env.reset(false);
        const raw = JSON.parse(fs.readFileSync(ORG, 'utf8'));
        const center = env.getCenter();
        const genome = env.genomeFromRaw(raw.anatomy.cells);
        const slot = env.spawn(genome, {c: center[0], r: center[1], lifetime: 0, food_collected: 0, living: true,
            direction: raw.direction, rotation: raw.rotation, can_rotate: raw.can_rotate, move_count: raw.move_count,
            move_range: raw.move_range, ignore_brain_for: raw.ignore_brain_for, mutability: raw.mutability, damage: 0, species: 0},
            env.brainFromRaw(raw.brain), false);
        // FossilRecord.addSpecies after placing, drawing the name from the engine's generator
        env.ex.eng_org_counts(slot);
        const Species = require('../src/Stats/Species');
        const s = new Species({countByName: () => ({})}, null, env.total_ticks);
        s.name = env.ex.eng_rand().toString(36).substr(2, 10);
        FossilRecord.extant_species[s.name] = s;
        env.ex.eng_set_org_species(slot, env.speciesId(s));
    } else {
        env.OriginOfLife();
    }
    step = RENDER ? () => { env.update(); env.snapshot(); } : () => env.update();
    cellNames = function* () { const st = env.gridStates(); for (let i = 0; i < st.length; i++) yield CellStates.all[st[i]].name; };
    const summaries = () => { const v = env.orgSummaries(); const out = []; for (let i = 0; i < v.length; i += 10) out.push(Array.from(v.subarray(i, i + 10))); return out; };
    env.organismsForHash = summaries;
    orgSummary = (o) => o;
}

let peak = 0;
const t0 = process.hrtime.bigint();
for (let i = 0; i < TICKS; i++) {
    step();
    if (env.organisms.length > peak) peak = env.organisms.length;
}
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

// FNV-1a hash of grid state + organism positions
let h = 0x811c9dc5;
const mix = (v) => { h ^= v & 0xff; h = Math.imul(h, 0x01000193) >>> 0; };
const names = CellStates.all.map(s => s.name);
for (const name of cellNames()) mix(names.indexOf(name));
for (const o of (env.organismsForHash ? env.organismsForHash() : env.organisms)) for (const v of orgSummary(o)) { mix(v); mix(v >> 8); }
mix(FossilRecord.numExtantSpecies());

console.log(JSON.stringify({
    engine: ENGINE, ticks: TICKS, seed: SEED,
    ms: Math.round(ms), ticks_per_sec: Math.round(TICKS / ms * 1000),
    organisms: env.organisms.length, peak, resets: env.reset_count,
    species: FossilRecord.numExtantSpecies(), hash: h.toString(16),
}));

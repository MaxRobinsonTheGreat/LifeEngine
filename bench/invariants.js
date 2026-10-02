// Consistency test for the engine's fast (tiled / multi-threaded) mode, whose
// results differ run to run and so can't be compared to the reference by hash.
// Every few ticks it checks that the grid, organism list, species populations
// and counters agree. Also round-trips a save through load in each mode.
// Usage: node bench/invariants.js [--threads N]
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const THREADS = parseInt((args[args.indexOf('--threads') + 1]) || '1') || 1;

const scenarios = [
    { name: 'default start', ticks: 4000 },
    { name: 'battleground', world: 'battleground', ticks: 500 },
    { name: 'battleground + its controls', world: 'battleground', ticks: 1500, useWorldControls: true },
    { name: 'food chain', world: 'food_chain', ticks: 2500 },
    { name: 'zoo', world: 'zoo', ticks: 2000 },
    { name: 'insta-kill + food drop', ticks: 3000, hyper: { instaKill: true, foodDropProb: 2 } },
    { name: 'big grid', ticks: 3000, cols: 500, rows: 300 },
    // organisms die of old age before reproducing: the world resets over and over
    // everything killed between ticks, as the kill tool can do
    { name: 'killed by hand', ticks: 300, killAllAt: 100, minResets: 1 },
    { name: 'repeated extinction', ticks: 2000, hyper: { lifespanMultiplier: 2, foodProdProb: 0 }, minResets: 100, maxResets: 600 },
];

function runScenario(sc, fast, threads) {
    // fresh module per scenario (FossilRecord and Hyperparams are module singletons)
    for (const k of Object.keys(require.cache)) if (!k.includes('node_modules') && k !== __filename) delete require.cache[k];
    const Hyperparams = require('../src/Hyperparameters');
    const FossilRecord = require('../src/Stats/FossilRecord');
    Hyperparams.setDefaults();
    Object.assign(Hyperparams, sc.hyper || {});
    const engine = require('./wasm-node')({ threads, shared: fast });
    const env = engine.world(sc.cols || 200, sc.rows || 150);
    env.setFast(fast);
    env.syncParams();
    if (sc.world) {
        const world = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'dist/assets/worlds', sc.world + '.json'), 'utf8'));
        if (sc.useWorldControls) {
            Hyperparams.loadJsonObj(world.controls);
            env.syncParams();
        }
        env.loadRaw(world);
    }
    else env.OriginOfLife();
    const problems = [];
    let max_overlaps = null;
    const check = (tick) => {
        const code = env.ex.eng_check_invariants();
        if (code !== 0) problems.push(`tick ${tick}: engine invariant ${code}`);
        const overlaps = env.ex.eng_overlaps();
        if (max_overlaps === null) max_overlaps = overlaps; // present in the loaded world
        else if (overlaps > max_overlaps) problems.push(`tick ${tick}: overlapping body cells grew to ${overlaps}`);
        let pop = 0, negative = 0;
        for (const s of Object.values(FossilRecord.extant_species)) { pop += s.population; if (s.population < 0) negative++; }
        const living = env.ex.eng_living_count();
        if (pop !== living) problems.push(`tick ${tick}: species populations ${pop} != living organisms ${living}`);
        if (negative) problems.push(`tick ${tick}: ${negative} species with negative population`);
    };
    check(0);
    const t0 = process.hrtime.bigint();
    for (let t = 1; t <= sc.ticks; t++) {
        if (sc.killAllAt === t) env.killNear(0, 0, 1000);
        try {
            env.update();
        } catch (e) {
            problems.push(`tick ${t}: engine crashed: ${env.panicMessage() || e.message}`);
            break;
        }
        if (t % 50 === 0) check(t);
        if (problems.length > 3) break;
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (sc.minResets && env.ex.eng_reset_count() < sc.minResets)
        problems.push(`only ${env.ex.eng_reset_count()} automatic resets (expected at least ${sc.minResets})`);
    if (sc.maxResets && env.ex.eng_reset_count() > sc.maxResets)
        problems.push(`${env.ex.eng_reset_count()} automatic resets: the world is resetting every tick`);
    // save -> load round trip must reproduce the same organisms
    const saved = env.serialize();
    const json = JSON.stringify(saved);
    env.loadRaw(JSON.parse(json));
    const again = env.serialize();
    // birth_distance is recomputed from the cells on load (as in the original format)
    const strip = (orgs) => JSON.stringify(orgs.map(o => ({...o, anatomy: {...o.anatomy, birth_distance: 0}})));
    if (strip(again.organisms) !== strip(saved.organisms)) problems.push('save/load round trip changed organisms');
    if (again.grid.food.length !== saved.grid.food.length || again.grid.walls.length !== saved.grid.walls.length) problems.push('save/load round trip changed the grid');
    max_overlaps = null;
    check('after load');
    for (const w of engine.helpers) w.terminate();
    return { ms, orgs: env.ex.eng_org_count(), problems };
}

let failed = 0;
for (const sc of scenarios) {
    for (const [label, fast, threads] of [['exact', false, 1], ['fast', true, THREADS]]) {
        const r = runScenario(sc, fast, threads);
        const ok = r.problems.length === 0;
        if (!ok) failed++;
        console.log(`${ok ? 'OK  ' : 'FAIL'} ${sc.name.padEnd(24)} ${label.padEnd(5)} threads ${String(threads).padEnd(2)} ` +
                    `${String(sc.ticks).padStart(5)} ticks ${String(Math.round(sc.ticks / r.ms * 1000)).padStart(6)} ticks/s  orgs ${r.orgs}` +
                    (ok ? '' : '\n     ' + r.problems.slice(0, 4).join('\n     ')));
    }
}
if (failed) { console.log(`${failed} run(s) failed`); process.exit(1); }
console.log('all runs consistent');

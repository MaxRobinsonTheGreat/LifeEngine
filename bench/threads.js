// Throughput of exact mode vs fast mode with 1..N threads, each starting from
// the same saved world state.
// Usage: node bench/threads.js [--world path.json] [--grow N] [--ticks N] [--max-threads N]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };

if (process.env.BENCH_CHILD) {
    // one measurement in a fresh process
    const { file, fast, threads, ticks } = JSON.parse(process.env.BENCH_CHILD);
    const engine = require('./wasm-node')({ threads, shared: fast });
    const world = JSON.parse(fs.readFileSync(file, 'utf8'));
    const env = engine.world(world.grid.cols, world.grid.rows);
    env.setFast(fast);
    env.syncParams();
    env.loadRaw(world);
    for (let i = 0; i < 20; i++) env.update(); // warm up
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < ticks; i++) env.update();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(JSON.stringify({ tps: ticks / ms * 1000, orgs: env.ex.eng_org_count() }));
    process.exit(0);
}

const ticks = parseInt(opt('ticks', '200'));
const maxThreads = parseInt(opt('max-threads', String(os.availableParallelism ? os.availableParallelism() : os.cpus().length)));
let file = opt('world', null);
const grow = parseInt(opt('grow', '0'));
if (!file || grow) {
    // grow a world in exact mode and save it as the common starting point
    const engine = require('./wasm-node')({});
    const cols = parseInt(opt('cols', '600')), rows = parseInt(opt('rows', '400'));
    const env = engine.world(cols, rows);
    env.syncParams();
    if (file) env.loadRaw(JSON.parse(fs.readFileSync(file, 'utf8'))); else env.OriginOfLife();
    for (let i = 0; i < (grow || 3000); i++) env.update();
    file = path.join(os.tmpdir(), 'life-bench-world.json');
    fs.writeFileSync(file, JSON.stringify(env.serialize()));
}
const run = (fast, threads) => JSON.parse(execFileSync('node', [__filename], {
    env: { ...process.env, BENCH_CHILD: JSON.stringify({ file, fast, threads, ticks }) }, encoding: 'utf8' }).trim().split('\n').pop());
const base = run(false, 1);
console.log(`exact            ${base.tps.toFixed(0).padStart(7)} ticks/s  (${base.orgs} organisms at end)`);
for (let t = 1; t <= maxThreads; t *= 2) {
    const r = run(true, t);
    console.log(`fast ${String(t).padStart(2)} thread${t > 1 ? 's' : ' '}  ${r.tps.toFixed(0).padStart(7)} ticks/s  ${(r.tps / base.tps).toFixed(2)}x  (${r.orgs} organisms at end)`);
}

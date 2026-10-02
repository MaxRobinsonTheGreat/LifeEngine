// Equivalence + speed test: runs the original object-based simulation and the
// Rust/WebAssembly engine (exact mode) on the same seed and checks they end in
// the same state.
// Usage: node bench/compare.js   (exit code 1 on any mismatch)
const { execFileSync } = require('child_process');
const path = require('path');

const cases = [
    ['--ticks', '3000'],
    ['--ticks', '3000', '--classic'],
    ['--ticks', '4000', '--seed', '7', '--cols', '300', '--rows', '200'],
    ['--ticks', '400', '--world', 'dist/assets/worlds/battleground.json'],
    ['--ticks', '2000', '--world', 'dist/assets/worlds/colony.json'],
    ['--ticks', '2000', '--world', 'dist/assets/worlds/zoo.json'],
    ['--ticks', '2000', '--world', 'dist/assets/worlds/food_chain.json'],
    ['--ticks', '1500', '--world', 'dist/assets/worlds/huggers.json'],
    ['--ticks', '3000', '--org', 'dist/assets/organisms/shark.json'],
    ['--ticks', '3000', '--seed', '5', '--insta-kill', '--food-drop', '2'],
];
const root = path.join(__dirname, '..');
const ENGINE = process.env.ENGINE || 'wasm'; // engine checked against the original object-based one
const run = (engine, args) => JSON.parse(execFileSync('node', [path.join(__dirname, 'headless.js'), '--engine', engine, ...args],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }).trim().split('\n').pop());

let failed = 0;
for (const args of cases) {
    const a = run('object', args), b = run(ENGINE, args);
    const ok = a.hash === b.hash && a.organisms === b.organisms;
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${args.join(' ').padEnd(62)} hash ${a.hash}/${b.hash} orgs ${a.organisms}/${b.organisms}  ` +
                `ticks/s ${a.ticks_per_sec} -> ${b.ticks_per_sec} (${(b.ticks_per_sec / a.ticks_per_sec).toFixed(2)}x)`);
}
if (failed) {
    console.log(`${failed} case(s) differ`);
    process.exit(1);
}
console.log('all cases identical');

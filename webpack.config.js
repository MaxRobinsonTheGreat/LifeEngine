const path = require('path');
const webpack = require("webpack");

// Two builds. The simulation worker is bundled first, then embedded into
// dist/js/bundle.js as a string and started from a Blob URL. That keeps the
// game a single script and lets the worker start even when index.html is opened
// from file:// (where browsers refuse to load worker scripts by path).
const worker = {
    name: 'worker',
    target: 'webworker',
    entry: './src/Sim/sim.worker.js',
    performance: { hints: false }, // large because the engine is embedded
    output: {
        filename: 'sim.worker.js',
        path: path.resolve(__dirname, 'build/'),
    },
    module: {
        rules: [
            // the Rust/WebAssembly engine builds, embedded as data URLs
            { test: /\.wasm$/, type: 'asset/inline' },
        ],
    },
};

const main = {
    name: 'main',
    dependencies: ['worker'],
    entry: './src/index.js',
    performance: { hints: false },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/js/'),
    },
    module: {
        rules: [
            { test: /build[\\/]sim\.worker\.js$/, type: 'asset/source' },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
        })
    ]
};

module.exports = [worker, main];

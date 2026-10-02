#!/usr/bin/env bash
# Builds the Rust simulation core into two WebAssembly modules:
#   src/Sim/wasm/engine-mt.wasm  multi-threaded (shared memory + atomics)
#   src/Sim/wasm/engine-st.wasm  single-threaded (used when SharedArrayBuffer is unavailable)
# Requires: rustup toolchain "nightly" with rust-src and the wasm32-unknown-unknown target:
#   rustup toolchain install nightly --component rust-src --target wasm32-unknown-unknown
# The built .wasm files are committed, so `npm run build` does not need Rust.
set -euo pipefail
cd "$(dirname "$0")/../engine"
OUT=../src/Sim/wasm
mkdir -p "$OUT"
MEM="-C link-arg=--import-memory -C link-arg=--max-memory=2147483648"

RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+mutable-globals $MEM -C link-arg=--shared-memory \
  -C link-arg=--export=__stack_pointer -C link-arg=--export=__wasm_init_tls \
  -C link-arg=--export=__tls_size -C link-arg=--export=__tls_align" \
  cargo +nightly build --release --target wasm32-unknown-unknown -Z build-std=std,panic_abort --target-dir target/mt
cp target/mt/wasm32-unknown-unknown/release/life_engine.wasm "$OUT/engine-mt.wasm"

RUSTFLAGS="$MEM" cargo +nightly build --release --target wasm32-unknown-unknown --target-dir target/st
cp target/st/wasm32-unknown-unknown/release/life_engine.wasm "$OUT/engine-st.wasm"

ls -l "$OUT"

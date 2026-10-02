//! The Life Engine simulation core, compiled to WebAssembly.
//!
//! JS drives it through the `eng_*` functions below. Bulk data goes through a
//! scratch buffer in linear memory (`eng_scratch`), and simulation events
//! (species births/extinctions, resets) are read back from `eng_events`.
//!
//! Two builds are produced from this source (see scripts/build-engine.sh):
//! a multi-threaded one using shared memory and atomics, and a plain one.

#![cfg_attr(target_feature = "atomics", feature(stdarch_wasm_atomic_wait))]
#![allow(static_mut_refs, clippy::missing_safety_doc)]

mod consts;
mod fast;
mod genome;
mod rng;
mod threads;
mod world;

use consts::*;
use genome::{CellRec, Genome};
use rng::Rng;
use world::{Event, Org, World};

static mut WORLD: Option<World> = None;
/// Message of the last panic (the module aborts after a panic; JS reads this to report it).
static mut PANIC_MESSAGE: String = String::new();
static mut SCRATCH: Vec<u8> = Vec::new();
static mut EVENT_OUT: Vec<f64> = Vec::new();
static mut HIGHLIGHT: Vec<i32> = Vec::new();

#[inline(always)]
fn world() -> &'static mut World {
    unsafe { WORLD.as_mut().expect("engine not initialized") }
}

fn scratch_f64(n: usize) -> &'static [f64] {
    unsafe { core::slice::from_raw_parts(SCRATCH.as_ptr() as *const f64, n) }
}

fn scratch_i32(n: usize) -> &'static [i32] {
    unsafe { core::slice::from_raw_parts(SCRATCH.as_ptr() as *const i32, n) }
}

fn scratch_f64_mut(n: usize) -> &'static mut [f64] {
    unsafe {
        ensure_scratch(n * 8);
        core::slice::from_raw_parts_mut(SCRATCH.as_mut_ptr() as *mut f64, n)
    }
}

unsafe fn ensure_scratch(bytes: usize) {
    if SCRATCH.len() < bytes {
        // keep 8-byte alignment for f64 views
        let mut v: Vec<u64> = vec![0; bytes.div_ceil(8)];
        let ptr = v.as_mut_ptr() as *mut u8;
        let len = v.len() * 8;
        let cap = v.capacity() * 8;
        core::mem::forget(v);
        SCRATCH = Vec::from_raw_parts(ptr, len, cap);
    }
}

// ---------------- setup ----------------

/// Returns NUM_STATES so JS can check its cell-state table matches.
#[no_mangle]
pub extern "C" fn eng_init(cols: i32, rows: i32) -> i32 {
    std::panic::set_hook(Box::new(|info| unsafe {
        PANIC_MESSAGE = info.to_string();
    }));
    unsafe {
        WORLD = Some(World::new(cols, rows));
        fast::invalidate();
        ensure_scratch(1 << 16);
    }
    NUM_STATES as i32
}

#[no_mangle]
pub extern "C" fn eng_panic_message_ptr() -> *const u8 {
    unsafe { PANIC_MESSAGE.as_ptr() }
}

#[no_mangle]
pub extern "C" fn eng_panic_message_len() -> u32 {
    unsafe { PANIC_MESSAGE.len() as u32 }
}

/// Pointer to a scratch buffer of at least `bytes` bytes (reallocates if needed).
#[no_mangle]
pub extern "C" fn eng_scratch(bytes: u32) -> *mut u8 {
    unsafe {
        ensure_scratch(bytes as usize);
        SCRATCH.as_mut_ptr()
    }
}

#[no_mangle]
pub extern "C" fn eng_resize(cols: i32, rows: i32) {
    fast::invalidate();
    world().resize(cols, rows);
}

#[no_mangle]
pub extern "C" fn eng_cols() -> i32 {
    world().cols
}

#[no_mangle]
pub extern "C" fn eng_rows() -> i32 {
    world().rows
}

#[no_mangle]
pub extern "C" fn eng_seed(seed: u32) {
    world().rng = Rng::new(seed);
}

#[no_mangle]
pub extern "C" fn eng_rand() -> f64 {
    world().rng.next()
}

/// Reads the evolution controls from scratch (22 f64, see `Params`).
#[no_mangle]
pub extern "C" fn eng_set_params() {
    let v = scratch_f64(22);
    let p = &mut world().p;
    p.lifespan_multiplier = v[0];
    p.food_prod_prob = v[1];
    p.use_global_mutability = v[2] != 0.0;
    p.global_mutability = v[3];
    p.add_prob = v[4];
    p.change_prob = v[5];
    p.remove_prob = v[6];
    p.rotation_enabled = v[7] != 0.0;
    p.food_blocks_reproduction = v[8] != 0.0;
    p.movers_can_produce = v[9] != 0.0;
    p.insta_kill = v[10] != 0.0;
    p.look_range = v[11];
    p.see_through_self = v[12] != 0.0;
    p.food_drop_prob = v[13];
    p.extra_mover_food_cost = v[14];
    p.max_organisms = v[15];
    p.extended_cell_types = v[16] != 0.0;
    p.heal_prob = v[17];
    p.leaf_prob = v[18];
    p.auto_reset = v[19] != 0.0;
    p.auto_pause = v[20] != 0.0;
    p.clear_walls_on_reset = v[21] != 0.0;
}

/// Neighbor offsets from scratch as i32 pairs. kind: 0 killable, 1 edible, 2 growable.
#[no_mangle]
pub extern "C" fn eng_set_neighbors(kind: i32, count: i32) {
    let v = scratch_i32((count * 2) as usize);
    let list: Vec<(i32, i32)> = v.chunks_exact(2).map(|p| (p[0], p[1])).collect();
    let p = &mut world().p;
    match kind {
        0 => p.killable = list,
        1 => p.edible = list,
        _ => p.growable = list,
    }
}

/// 0 = exact (reproducible, single-threaded), 1 = fast (tiled, multi-threaded)
#[no_mangle]
pub extern "C" fn eng_set_fast(fast: i32) {
    fast::invalidate();
    world().fast = fast != 0;
}

// ---------------- simulation ----------------

/// Runs one tick. Events produced are available through `eng_events`.
#[no_mangle]
pub extern "C" fn eng_tick() {
    let w = world();
    // Fast mode only pays off with several threads and a big population; for
    // small worlds the plain single-threaded tick is quicker.
    if w.fast && threads::threads() > 1 && w.list.len() >= fast::PARALLEL_MIN_ORGS {
        fast::tick_fast(w);
    } else {
        fast::invalidate();
        w.tick_exact();
    }
}

/// Copies pending events to an f64 array (20 values each) and returns its
/// pointer; the count is returned by `eng_event_count`. Clears the queue.
#[no_mangle]
pub extern "C" fn eng_events() -> *const f64 {
    let w = world();
    unsafe {
        EVENT_OUT.clear();
        for e in w.events.iter() {
            EVENT_OUT.push(e.kind as f64);
            EVENT_OUT.push(e.a as f64);
            EVENT_OUT.push(e.b as f64);
            EVENT_OUT.push(e.tick as f64);
            EVENT_OUT.push(e.f);
            for c in e.counts.iter() {
                EVENT_OUT.push(*c as f64);
            }
        }
        LAST_EVENT_COUNT = w.events.len() as u32;
        w.events.clear();
        EVENT_OUT.as_ptr()
    }
}

static mut LAST_EVENT_COUNT: u32 = 0;

#[no_mangle]
pub extern "C" fn eng_event_count() -> u32 {
    unsafe { LAST_EVENT_COUNT }
}

#[no_mangle]
pub extern "C" fn eng_pending_events() -> u32 {
    world().events.len() as u32
}

static mut OVERLAPS: u32 = 0;

#[no_mangle]
pub extern "C" fn eng_check_invariants() -> i32 {
    unsafe { world().check_invariants(&mut OVERLAPS) }
}

#[no_mangle]
pub extern "C" fn eng_living_count() -> u32 {
    world().living_count()
}

/// Body cells covered by another organism, from the last eng_check_invariants.
#[no_mangle]
pub extern "C" fn eng_overlaps() -> u32 {
    unsafe { OVERLAPS }
}

#[no_mangle]
pub extern "C" fn eng_remove_dead() {
    fast::invalidate();
    world().remove_dead();
}

#[no_mangle]
pub extern "C" fn eng_reset(life: i32) {
    fast::invalidate();
    world().reset(life != 0);
}

#[no_mangle]
pub extern "C" fn eng_origin_of_life() {
    fast::invalidate();
    world().origin_of_life();
}

#[no_mangle]
pub extern "C" fn eng_new_species_id() -> u32 {
    world().new_species_id()
}

// ---------------- stats ----------------

#[no_mangle]
pub extern "C" fn eng_org_count() -> u32 {
    world().list.len() as u32
}

#[no_mangle]
pub extern "C" fn eng_total_ticks() -> i32 {
    world().total_ticks
}

#[no_mangle]
pub extern "C" fn eng_total_mutability() -> f64 {
    world().total_mutability
}

#[no_mangle]
pub extern "C" fn eng_average_mutability() -> f64 {
    world().average_mutability()
}

#[no_mangle]
pub extern "C" fn eng_largest() -> i32 {
    world().largest
}

#[no_mangle]
pub extern "C" fn eng_reset_count() -> i32 {
    world().reset_count
}

/// Restore counters when loading a world.
#[no_mangle]
pub extern "C" fn eng_set_counters(total_ticks: i32, total_mutability: f64, largest: i32, reset_count: i32) {
    let w = world();
    w.total_ticks = total_ticks;
    w.total_mutability = total_mutability;
    w.largest = largest;
    w.reset_count = reset_count;
}

// ---------------- grid ----------------

#[no_mangle]
pub extern "C" fn eng_state_ptr() -> *const u8 {
    world().state.as_ptr()
}

/// Builds the render snapshot and returns its pointer (cols*rows bytes).
#[no_mangle]
pub extern "C" fn eng_snapshot() -> *const u8 {
    let w = world();
    w.snapshot();
    w.render.as_ptr()
}

#[no_mangle]
pub extern "C" fn eng_set_cell(c: i32, r: i32, state: i32) {
    world().change_cell(c, r, state as u8, 0, 0);
}

/// Sets a cell's state directly (no wall bookkeeping); used when loading.
#[no_mangle]
pub extern "C" fn eng_raw_set_state(c: i32, r: i32, state: i32) {
    let w = world();
    let idx = w.index_of(c, r);
    if idx != -1 {
        w.state[idx as usize] = state as u8;
    }
}

#[no_mangle]
pub extern "C" fn eng_track_wall(c: i32, r: i32) {
    let w = world();
    let idx = w.index_of(c, r);
    if idx != -1 {
        w.walls.push(idx as u32);
    }
}

#[no_mangle]
pub extern "C" fn eng_clear_walls() {
    fast::invalidate();
    world().clear_walls();
}

/// Walls at `count` (c, r) pairs from scratch, killing organisms in the way.
#[no_mangle]
pub extern "C" fn eng_place_walls(count: i32) {
    fast::invalidate();
    let cells = scratch_i32((count * 2) as usize).to_vec();
    world().place_walls(&cells);
}

#[no_mangle]
pub extern "C" fn eng_brush(c: i32, r: i32, size: i32, state: i32, kill: i32, ignore: i32) {
    fast::invalidate();
    world().drop_cell_type(c, r, size, state as u8, kill != 0, ignore);
}

#[no_mangle]
pub extern "C" fn eng_kill_near(c: i32, r: i32, size: i32) {
    fast::invalidate();
    world().kill_near(c, r, size);
}

/// slot + 1 of the organism nearest (c, r) within the brush, 0 if none
#[no_mangle]
pub extern "C" fn eng_find_near(c: i32, r: i32, size: i32) -> u32 {
    world().find_near(c, r, size)
}

/// Writes the highlighted cells as i32 pairs; returns a pointer, count via eng_highlight_count.
#[no_mangle]
pub extern "C" fn eng_highlight(c: i32, r: i32) -> *const i32 {
    unsafe {
        world().highlight(c, r, &mut HIGHLIGHT);
        HIGHLIGHT.as_ptr()
    }
}

#[no_mangle]
pub extern "C" fn eng_highlight_count() -> u32 {
    unsafe { (HIGHLIGHT.len() / 2) as u32 }
}

// ---------------- organisms ----------------

/// Creates a genome from `count` cells in scratch as i32 quads (type, col, row, dir).
#[no_mangle]
pub extern "C" fn eng_genome_new(count: i32) -> *mut Genome {
    let v = scratch_i32((count * 4) as usize);
    let cells: Vec<CellRec> = v
        .chunks_exact(4)
        .map(|q| CellRec { t: q[0] as u8, col: q[1], row: q[2], dir: q[3] as u8 })
        .collect();
    Genome::create(&cells)
}

/// Adds an organism with the given genome (takes over the caller's reference).
/// Fields come from scratch as f64 (see ORG_FIELDS in WasmWorld.js), followed by
/// NUM_STATES brain decisions. With `check_clear`, fails (returns -1 and frees
/// the genome) if the body doesn't fit. Returns the slot.
#[no_mangle]
pub extern "C" fn eng_spawn(genome: *mut Genome, check_clear: i32) -> i32 {
    let w = world();
    let v = scratch_f64(14 + NUM_STATES).to_vec();
    let mut org = Org::new(genome, w.p.rotation_enabled);
    org.c = v[0] as i32;
    org.r = v[1] as i32;
    org.lifetime = v[2] as i32;
    org.food = v[3];
    org.living = v[4] != 0.0;
    org.direction = v[5] as u8 & 3;
    org.rotation = v[6] as u8 & 3;
    org.can_rotate = v[7] != 0.0;
    org.move_count = v[8] as i32;
    org.move_range = v[9] as i32;
    org.ignore_brain_for = v[10] as i32;
    org.mutability = v[11] as i32;
    org.damage = core::sync::atomic::AtomicI32::new(v[12] as i32);
    org.species = v[13] as u32;
    for k in 0..NUM_STATES {
        org.brain[k] = v[14 + k] as u8;
    }
    if check_clear != 0 {
        let g = unsafe { &*genome };
        if g.n == 0 || !w.is_clear(g, 0, org.c, org.r, org.rotation) {
            Genome::release(genome);
            return -1;
        }
    }
    fast::invalidate();
    w.add_organism(org) as i32
}

#[no_mangle]
pub extern "C" fn eng_org_slot(i: u32) -> u32 {
    world().list[i as usize]
}

/// Writes an organism's fields to scratch (same layout as eng_spawn plus
/// birth_distance and genome flags) and returns the cell count.
#[no_mangle]
pub extern "C" fn eng_org_read(slot: u32) -> i32 {
    let w = world();
    let o = &w.orgs[slot as usize];
    let g = o.g();
    let n = g.n;
    let out = scratch_f64_mut(14 + NUM_STATES + 8 + n * 4);
    out[0] = o.c as f64;
    out[1] = o.r as f64;
    out[2] = o.lifetime as f64;
    out[3] = o.food;
    out[4] = if o.living { 1.0 } else { 0.0 };
    out[5] = o.direction as f64;
    out[6] = o.rotation as f64;
    out[7] = if o.can_rotate { 1.0 } else { 0.0 };
    out[8] = o.move_count as f64;
    out[9] = o.move_range as f64;
    out[10] = o.ignore_brain_for as f64;
    out[11] = o.mutability as f64;
    out[12] = o.damage.load(core::sync::atomic::Ordering::Relaxed) as f64;
    out[13] = o.species as f64;
    for k in 0..NUM_STATES {
        out[14 + k] = o.brain[k] as f64;
    }
    let b = 14 + NUM_STATES;
    out[b] = o.birth_distance as f64;
    out[b + 1] = g.is_producer as i32 as f64;
    out[b + 2] = g.is_mover as i32 as f64;
    out[b + 3] = g.has_eyes as i32 as f64;
    out[b + 4] = g.has_camo as i32 as f64;
    out[b + 5] = g.has_booster as i32 as f64;
    out[b + 6] = g.has_poison as i32 as f64;
    out[b + 7] = n as f64;
    let cb = b + 8;
    for i in 0..n {
        out[cb + 4 * i] = g.types[i] as f64;
        out[cb + 4 * i + 1] = g.cols[i] as f64;
        out[cb + 4 * i + 2] = g.rows[i] as f64;
        out[cb + 4 * i + 3] = g.dirs[i] as f64;
    }
    n as i32
}

#[no_mangle]
pub extern "C" fn eng_org_species(slot: u32) -> u32 {
    world().orgs[slot as usize].species
}

#[no_mangle]
pub extern "C" fn eng_set_org_species(slot: u32, species: u32) {
    world().orgs[slot as usize].species = species;
}

/// Cell counts of an organism's genome by state (scratch, NUM_STATES f64).
#[no_mangle]
pub extern "C" fn eng_org_counts(slot: u32) {
    let counts = world().orgs[slot as usize].g().counts();
    let out = scratch_f64_mut(NUM_STATES);
    for k in 0..NUM_STATES {
        out[k] = counts[k] as f64;
    }
}

/// Organism cell-count statistics for hashing/tests: fills scratch with
/// (c, r, rotation, n, lifetime, food, damage, direction, mutability, move_range) per organism.
#[no_mangle]
pub extern "C" fn eng_org_summaries() -> u32 {
    let w = world();
    let count = w.list.len();
    let out = scratch_f64_mut(count * 10);
    for (i, &slot) in w.list.iter().enumerate() {
        let o = &w.orgs[slot as usize];
        let rec = [o.c as f64, o.r as f64, o.rotation as f64, o.n as f64, o.lifetime as f64, o.food,
                   o.damage.load(core::sync::atomic::Ordering::Relaxed) as f64, o.direction as f64,
                   o.mutability as f64, o.move_range as f64];
        out[i * 10..i * 10 + 10].copy_from_slice(&rec);
    }
    count as u32
}

// ---------------- threads ----------------

#[no_mangle]
pub extern "C" fn eng_threads_supported() -> i32 {
    threads::SUPPORTED as i32
}

/// Allocates a stack for a helper thread; returns the stack top.
#[no_mangle]
pub extern "C" fn eng_alloc_stack(size: u32) -> u32 {
    let v: Vec<u64> = vec![0; (size as usize).div_ceil(8)];
    let top = v.as_ptr() as u32 + (v.len() * 8) as u32;
    core::mem::forget(v);
    top & !15
}

/// Allocates zeroed memory (e.g. a helper thread's TLS block).
#[no_mangle]
pub extern "C" fn eng_alloc(size: u32, align: u32) -> u32 {
    let layout = std::alloc::Layout::from_size_align(size.max(1) as usize, align.max(1) as usize).unwrap();
    unsafe { std::alloc::alloc_zeroed(layout) as u32 }
}

/// Number of threads (including the caller of eng_tick) used by fast mode.
#[no_mangle]
pub extern "C" fn eng_set_threads(n: u32) {
    threads::set_threads(n);
}

/// Entry point of a helper thread; never returns while the engine runs.
#[no_mangle]
pub extern "C" fn eng_helper_main(tid: u32) {
    threads::helper_main(tid);
}

#[no_mangle]
pub extern "C" fn eng_registered_helpers() -> i32 {
    threads::registered_helpers()
}

/// Seeds the per-thread random generators used by fast mode.
#[no_mangle]
pub extern "C" fn eng_seed_threads(seed: u32) {
    fast::seed_threads(seed);
}

#[allow(dead_code)]
fn _unused(_: Event) {}

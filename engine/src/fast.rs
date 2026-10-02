//! Fast mode: the same rules as exact mode, scheduled for parallel execution.
//!
//! The grid is cut into TILE x TILE tiles colored in a 2x2 checkerboard. Each
//! tick runs four phases, one per color; in a phase, all tiles of that color
//! are processed in parallel (tiles are claimed from a shared counter). An
//! organism belongs to the tile containing its center and can only touch cells
//! within `reach` of its center, so as long as reach <= MARGIN, organisms in
//! different tiles of the same color never touch the same cells. Organisms
//! with a larger reach run afterwards on one thread.
//!
//! Differences from exact mode (results are not reproducible run to run):
//! - organisms update tile by tile instead of in birth order
//! - an organism killed by another organism dies at the end of the tick
//!   (it stops acting immediately, its body becomes food at the end)
//! - producers and leaves roll once per organism for how many of them fire
//!   (binomial), instead of once per cell; the odds are identical
//! - each thread has its own random number generator

use crate::consts::*;
use crate::genome::Genome;
use crate::rng::Rng;
use crate::threads;
use crate::world::*;
use core::sync::atomic::{AtomicI32, AtomicU32, Ordering};

pub const TILE: i32 = 32;
pub const MARGIN: i32 = 15; // must be < (TILE + 1) / 2
const _: () = assert!(2 * MARGIN < TILE + 1);
pub const MAX_THREADS: usize = 64;
/// Below this many organisms the plain single-threaded tick is faster
/// (fast mode falls back to it; see eng_tick).
pub const PARALLEL_MIN_ORGS: usize = 2500;

// Each thread's state on its own cache lines: the RNG state is written on every
// random draw, and sharing a line between cores serializes them.
#[repr(align(128))]
pub struct ThreadCtx {
    rng: Rng,
    events: Vec<Event>,
    /// organisms (and newborns) alive after this thread updated them, with
    /// their tile for the next tick
    next: Vec<Entry>,
    /// organisms this thread killed in other tiles (die at the end of the tick)
    deaths: Vec<u32>,
    /// slots of organisms that died during their own update
    freed: Vec<u32>,
    mutability_delta: f64,
    largest: i32,
}

impl ThreadCtx {
    fn new(seed: u32) -> ThreadCtx {
        ThreadCtx { rng: Rng::new(seed), events: Vec::new(), next: Vec::new(), deaths: Vec::new(), freed: Vec::new(), mutability_delta: 0.0, largest: 0 }
    }
}

/// An organism scheduled for the next tick: its slot, tile (or BIG) and cell count.
#[derive(Clone, Copy)]
struct Entry {
    slot: u32,
    key: u32,
    weight: u32,
}
const BIG_KEY: u32 = u32::MAX;

/// Raw view of the world used while threads run (no Rust references are
/// shared between threads; every access goes through these pointers).
#[derive(Clone, Copy)]
struct Shared {
    cols: i32,
    rows: i32,
    state: *mut u8,
    owner: *mut u32,
    cidx: *mut u16,
    orgs: *mut Org,
    p: *const Params,
    tick: i32,
    tiles_x: i32,
    nb_reach: i32,
}

unsafe impl Send for Shared {}
unsafe impl Sync for Shared {}

static mut CTXS: Vec<ThreadCtx> = Vec::new();
static mut SHARED: Option<Shared> = None;
static mut SLOT_POOL: Vec<u32> = Vec::new();
static SLOT_NEXT: AtomicU32 = AtomicU32::new(0);
static ORG_COUNT: AtomicI32 = AtomicI32::new(0);
static SPECIES_NEXT: AtomicU32 = AtomicU32::new(1);
/// Per-thread position in its tile queue (other threads advance it when stealing).
#[repr(align(128))]
struct Cursor(AtomicU32);
static CURSORS: [Cursor; MAX_THREADS] = [const { Cursor(AtomicU32::new(0)) }; MAX_THREADS];
/// QUEUES[tid][color]: tiles of that color in thread tid's strip of the grid
static mut QUEUES: Vec<[Vec<u32>; 4]> = Vec::new();
static mut PHASE_COLOR: usize = 0;
static mut PARTICIPANTS: usize = 1;
static mut TILE_START: Vec<u32> = Vec::new();
static mut TILE_ORGS: Vec<u32> = Vec::new();
static mut BIG: Vec<u32> = Vec::new();
static mut SEED_BASE: u32 = 0x9E3779B9;
/// Next tick's schedule, built by the threads. Lets the coordinator bucket
/// organisms without reading their (cache-line sized, thread-owned) records.
static mut NEXT: Vec<Entry> = Vec::new();
static mut CACHE_VALID: bool = false;
static mut DEAD_MARK: Vec<u8> = Vec::new();

/// Call after anything outside fast ticks changes the organism list.
pub fn invalidate() {
    unsafe { CACHE_VALID = false; }
}


pub fn seed_threads(seed: u32) {
    unsafe {
        SEED_BASE = seed;
        CTXS.clear();
    }
}

fn ensure_ctxs(n: usize) {
    unsafe {
        while CTXS.len() < n.max(1) {
            let k = CTXS.len() as u32;
            CTXS.push(ThreadCtx::new(SEED_BASE.wrapping_mul(2654435761).wrapping_add(k.wrapping_mul(0x85EBCA6B)) | 1));
        }
    }
}

fn neighbor_reach(p: &Params) -> i32 {
    let mut r = 1;
    for list in [&p.killable, &p.edible, &p.growable] {
        for &(dc, dr) in list.iter() {
            r = r.max(dc.abs()).max(dr.abs());
        }
    }
    r
}

/// Tile of an organism's center for the next tick, or BIG_KEY if it has to run
/// on one thread: its reach is too large for the tiles, or its center is off the
/// grid (possible for organisms without a center cell, e.g. from saved worlds).
#[inline(always)]
fn key_for(c: i32, r: i32, extent: i32, birth_distance: i32, tiles_x: i32, nb_reach: i32, cols: i32, rows: i32) -> u32 {
    let reach = (extent + nb_reach).max(extent + 2).max(birth_distance + extent + 3);
    if reach > MARGIN || c < 0 || r < 0 || c >= cols || r >= rows {
        BIG_KEY
    } else {
        ((r / TILE) * tiles_x + (c / TILE)) as u32
    }
}

/// Full rebuild of the schedule from the organism list (after edits from outside).
fn rebuild_schedule(w: &mut World, tiles_x: i32, nb_reach: i32) {
    unsafe {
        NEXT.clear();
        let list = core::mem::take(&mut w.list);
        let before = list.len();
        for slot in list {
            if !w.orgs[slot as usize].living {
                w.remove_slot(slot);
                continue;
            }
            let o = &w.orgs[slot as usize];
            NEXT.push(Entry { slot, key: key_for(o.c, o.r, o.g().extent, o.birth_distance, tiles_x, nb_reach, w.cols, w.rows), weight: o.n as u32 });
            w.list.push(slot);
        }
        CACHE_VALID = true;
        // everything was killed between ticks (e.g. with the kill tool)
        if before > 0 && w.list.is_empty() {
            w.on_population_extinct();
        }
    }
}

pub fn tick_fast(w: &mut World) {
    let nthreads = threads::threads() as usize;
    ensure_ctxs(MAX_THREADS.min(nthreads.max(1)));
    let tiles_x = (w.cols + TILE - 1) / TILE;
    let nb_reach = neighbor_reach(&w.p);
    unsafe {
        if !CACHE_VALID {
            rebuild_schedule(w, tiles_x, nb_reach);
        }
    }
    let count = w.list.len();

    // slots for this tick's births: every organism can have at most one child
    unsafe {
        SLOT_POOL.clear();
        SLOT_POOL.extend_from_slice(&w.free);
        w.free.clear();
        while SLOT_POOL.len() < count {
            w.orgs.push(core::mem::zeroed());
            SLOT_POOL.push((w.orgs.len() - 1) as u32);
        }
    }
    SLOT_NEXT.store(0, Ordering::Relaxed);
    ORG_COUNT.store(count as i32, Ordering::Relaxed);
    SPECIES_NEXT.store(w.next_species, Ordering::Relaxed);

    unsafe {
        PARTICIPANTS = if count >= PARALLEL_MIN_ORGS { nthreads.clamp(1, MAX_THREADS) } else { 1 };
    }
    bucket(w);

    unsafe {
        SHARED = Some(Shared {
            cols: w.cols,
            rows: w.rows,
            state: w.state.as_mut_ptr(),
            owner: w.owner.as_mut_ptr(),
            cidx: w.cidx.as_mut_ptr(),
            orgs: w.orgs.as_mut_ptr(),
            p: &w.p,
            tick: w.total_ticks,
            tiles_x,
            nb_reach,
        });
        let parallel = count >= PARALLEL_MIN_ORGS && PARTICIPANTS > 1;
        for color in 0..4 {
            if QUEUES.iter().take(PARTICIPANTS).all(|q| q[color].is_empty()) {
                continue;
            }
            PHASE_COLOR = color;
            for k in 0..PARTICIPANTS {
                CURSORS[k].0.store(0, Ordering::Release);
            }
            threads::run_phase(work, parallel);
        }
        // organisms too large for the tiles run alone
        let sh = SHARED.unwrap();
        let ctx = &mut CTXS[0];
        for k in 0..BIG.len() {
            update_and_record(sh, BIG[k], ctx);
        }
        SHARED = None;
    }
    finalize(w, count);
}

fn bucket(w: &World) {
    let tiles_x = (w.cols + TILE - 1) / TILE;
    let tiles_y = (w.rows + TILE - 1) / TILE;
    let ntiles = (tiles_x * tiles_y) as usize;
    unsafe {
        TILE_START.clear();
        TILE_START.resize(ntiles + 1, 0);
        BIG.clear();
        for e in NEXT.iter() {
            if e.key == BIG_KEY {
                BIG.push(e.slot);
            } else {
                TILE_START[e.key as usize + 1] += 1;
            }
        }
        for t in 0..ntiles {
            TILE_START[t + 1] += TILE_START[t];
        }
        let mut fill = TILE_START.clone();
        TILE_ORGS.clear();
        TILE_ORGS.resize(TILE_START[ntiles] as usize, 0);
        for e in NEXT.iter() {
            if e.key != BIG_KEY {
                TILE_ORGS[fill[e.key as usize] as usize] = e.slot;
                fill[e.key as usize] += 1;
            }
        }
        // Split the grid into one vertical strip of tile columns per thread,
        // balanced by the number of cells to update. Columns are contiguous in
        // memory, so each thread keeps working on the same memory every phase
        // and every tick, which keeps it in that core's cache.
        let participants = PARTICIPANTS;
        while QUEUES.len() < participants {
            QUEUES.push([Vec::new(), Vec::new(), Vec::new(), Vec::new()]);
        }
        for q in QUEUES.iter_mut() {
            for c in q.iter_mut() {
                c.clear();
            }
        }
        let mut column_weight = vec![0u64; tiles_x as usize];
        let mut total_weight = 0u64;
        for e in NEXT.iter() {
            if e.key != BIG_KEY {
                column_weight[(e.key % tiles_x as u32) as usize] += e.weight as u64;
                total_weight += e.weight as u64;
            }
        }
        let mut owner_of_column = vec![0usize; tiles_x as usize];
        let mut acc = 0u64;
        for tx in 0..tiles_x as usize {
            // strip index from the weight before this column's midpoint
            let mid = acc + column_weight[tx] / 2;
            let strip = if total_weight == 0 { 0 } else { ((mid * participants as u64) / total_weight) as usize };
            owner_of_column[tx] = strip.min(participants - 1);
            acc += column_weight[tx];
        }
        for tx in 0..tiles_x {
            for ty in 0..tiles_y {
                let t = (ty * tiles_x + tx) as usize;
                if TILE_START[t + 1] > TILE_START[t] {
                    let color = ((tx & 1) | ((ty & 1) << 1)) as usize;
                    QUEUES[owner_of_column[tx as usize]][color].push(t as u32);
                }
            }
        }
    }
}

/// Phase body: work through this thread's own tiles of the current color,
/// then help with whatever is left in the other threads' queues.
fn work(tid: u32) {
    unsafe {
        let sh = SHARED.unwrap();
        let ctx = &mut *(&mut CTXS[tid as usize] as *mut ThreadCtx);
        let color = PHASE_COLOR;
        let participants = PARTICIPANTS;
        for step in 0..participants {
            let q = (tid as usize + step) % participants;
            let queue = &QUEUES[q][color];
            loop {
                let k = CURSORS[q].0.fetch_add(1, Ordering::AcqRel) as usize;
                if k >= queue.len() {
                    break;
                }
                let t = queue[k] as usize;
                for i in TILE_START[t]..TILE_START[t + 1] {
                    update_and_record(sh, TILE_ORGS[i as usize], ctx);
                }
            }
        }
    }
}

fn finalize(w: &mut World, count: usize) {
    unsafe {
        let used = (SLOT_NEXT.load(Ordering::Acquire) as usize).min(SLOT_POOL.len());
        w.next_species = SPECIES_NEXT.load(Ordering::Acquire);
        if DEAD_MARK.len() < w.orgs.len() {
            DEAD_MARK.resize(w.orgs.len(), 0);
        }
        let mut deaths: Vec<u32> = Vec::new();
        for ctx in CTXS.iter_mut() {
            w.events.extend(ctx.events.drain(..));
            deaths.extend(ctx.deaths.drain(..));
            w.free.extend(ctx.freed.drain(..));
            w.total_mutability += ctx.mutability_delta;
            ctx.mutability_delta = 0.0;
            if ctx.largest > w.largest {
                w.largest = ctx.largest;
            }
            ctx.largest = 0;
        }
        // organisms killed by others die now
        for &slot in &deaths {
            w.die(slot);
            w.remove_slot(slot);
            DEAD_MARK[slot as usize] = 1;
        }
        // unused pool slots go back to the free list
        for k in used..SLOT_POOL.len() {
            w.free.push(SLOT_POOL[k]);
        }
        NEXT.clear();
        w.list.clear();
        for ctx in CTXS.iter_mut() {
            for e in ctx.next.drain(..) {
                if DEAD_MARK[e.slot as usize] == 0 {
                    NEXT.push(e);
                    w.list.push(e.slot);
                }
            }
        }
        for &slot in &deaths {
            DEAD_MARK[slot as usize] = 0;
        }
        CACHE_VALID = true;
        if w.list.is_empty() && count > 0 {
            w.on_population_extinct(); // an automatic reset invalidates the schedule again
        }
    }
    if w.p.food_drop_prob > 0.0 {
        w.generate_food();
    }
    w.total_ticks += 1;
}

// ---------------- per-organism update (runs on any thread) ----------------

#[inline(always)]
fn index_of(sh: Shared, c: i32, r: i32) -> i32 {
    if (c as u32) >= sh.cols as u32 || (r as u32) >= sh.rows as u32 {
        -1
    } else {
        c * sh.rows + r
    }
}

#[inline(always)]
unsafe fn set_cell(sh: Shared, idx: usize, state: u8, owner: u32, ci: u16) {
    *sh.state.add(idx) = state;
    *sh.owner.add(idx) = owner;
    *sh.cidx.add(idx) = ci;
}

unsafe fn fill_body(sh: Shared, o: *mut Org, state: u8) {
    let g = &*(*o).genome;
    let off = &g.offsets[(*o).rotation as usize];
    let (c, r) = ((*o).c, (*o).r);
    for i in 0..g.n {
        let idx = index_of(sh, c + off[2 * i] as i32, r + off[2 * i + 1] as i32);
        if idx != -1 {
            set_cell(sh, idx as usize, state, 0, 0);
        }
    }
}

unsafe fn update_grid(sh: Shared, o: *mut Org, slot: u32) {
    let g = &*(*o).genome;
    let off = &g.offsets[(*o).rotation as usize];
    let (c, r) = ((*o).c, (*o).r);
    for i in 0..g.n {
        let idx = index_of(sh, c + off[2 * i] as i32, r + off[2 * i + 1] as i32);
        if idx != -1 {
            set_cell(sh, idx as usize, g.types[i], slot + 1, i as u16);
        }
    }
}

unsafe fn is_clear(sh: Shared, g: &Genome, own: u32, col: i32, row: i32, rotation: u8) -> bool {
    let off = &g.offsets[rotation as usize];
    let food_passable = !(*sh.p).food_blocks_reproduction;
    for i in 0..g.n {
        let idx = index_of(sh, col + off[2 * i] as i32, row + off[2 * i + 1] as i32);
        if idx == -1 {
            return false;
        }
        let s = *sh.state.add(idx as usize);
        if s == EMPTY || (food_passable && s == FOOD) || (own != 0 && *sh.owner.add(idx as usize) == own) {
            continue;
        }
        return false;
    }
    true
}

unsafe fn die_self(sh: Shared, o: *mut Org, ctx: &mut ThreadCtx) {
    if !(*o).living {
        return;
    }
    fill_body(sh, o, if (*(*o).genome).has_poison { EMPTY } else { FOOD });
    (*o).living = false;
    ctx.events.push(Event::simple(EV_DEC_POP, (*o).species, sh.tick));
}

unsafe fn harm_self(sh: Shared, o: *mut Org, ctx: &mut ThreadCtx) {
    let d = (*o).damage.fetch_add(1, Ordering::Relaxed) + 1;
    if d >= (*o).n || (*sh.p).insta_kill {
        die_self(sh, o, ctx);
    }
}

/// Damage another organism; if that kills it, it dies at the end of the tick.
unsafe fn harm_other(sh: Shared, target: u32, ctx: &mut ThreadCtx) {
    let t = sh.orgs.add(target as usize);
    let d = (*t).damage.fetch_add(1, Ordering::Relaxed) + 1;
    if (d >= (*t).n || (*sh.p).insta_kill) && !(*t).dying.swap(true, Ordering::AcqRel) {
        ctx.deaths.push(target);
    }
}

/// Number of successes in `n` trials with probability `p` (inverse transform).
fn binomial(rng: &mut Rng, n: usize, p: f64) -> usize {
    if n == 0 || p <= 0.0 {
        return 0;
    }
    if p >= 1.0 {
        return n;
    }
    let u = rng.next();
    let q = 1.0 - p;
    let mut pmf = q.powi(n as i32);
    let mut cdf = pmf;
    let mut k = 0;
    while u >= cdf && k < n {
        pmf *= (n - k) as f64 / (k + 1) as f64 * (p / q);
        k += 1;
        cdf += pmf;
    }
    k
}

/// Bitmask of `k` distinct positions out of `n` (n <= 64), uniformly chosen.
fn choose_mask(rng: &mut Rng, n: usize, k: usize) -> u64 {
    if k >= n {
        return if n == 64 { u64::MAX } else { (1u64 << n) - 1 };
    }
    let mut mask = 0u64;
    let mut picked = 0;
    while picked < k {
        let i = rng.below(n);
        if mask & (1u64 << i) == 0 {
            mask |= 1u64 << i;
            picked += 1;
        }
    }
    mask
}

/// Update one organism and record what the next tick needs to know.
unsafe fn update_and_record(sh: Shared, slot: u32, ctx: &mut ThreadCtx) {
    let o = sh.orgs.add(slot as usize);
    if !(*o).living || (*o).dying.load(Ordering::Acquire) {
        return; // killed earlier this tick; removed in finalize
    }
    update_org(sh, slot, ctx);
    if (*o).living {
        ctx.next.push(Entry {
            slot,
            key: key_for((*o).c, (*o).r, (*o).g().extent, (*o).birth_distance, sh.tiles_x, sh.nb_reach, sh.cols, sh.rows),
            weight: (*o).n as u32,
        });
    } else {
        // died during its own update: free it here (this thread owns it)
        ctx.mutability_delta -= (*o).mutability as f64;
        Genome::release((*o).genome);
        ctx.freed.push(slot);
    }
}

unsafe fn update_org(sh: Shared, slot: u32, ctx: &mut ThreadCtx) {
    let o = sh.orgs.add(slot as usize);
    if !(*o).living || (*o).dying.load(Ordering::Acquire) {
        return;
    }
    let p = &*sh.p;
    let g = &*(*o).genome;
    (*o).lifetime += 1;
    if (*o).lifetime as f64 > (*o).n as f64 * p.lifespan_multiplier {
        die_self(sh, o, ctx);
        return;
    }
    if (*o).food >= (*o).food_needed(p) {
        reproduce(sh, o, slot, ctx);
    }
    (*o).seen_idx = -1;
    (*o).seen_distance = i32::MAX;
    (*o).seen_direction = 0;

    // producers and leaves: one binomial roll each instead of one roll per cell
    let can_produce = !g.is_mover || p.movers_can_produce;
    let mut producer_mask = u64::MAX;
    let many_producers = g.num_producers > 64;
    if can_produce && g.num_producers > 0 && !many_producers {
        let fired = binomial(&mut ctx.rng, g.num_producers, (p.food_prod_prob / 100.0).min(1.0));
        producer_mask = choose_mask(&mut ctx.rng, g.num_producers, fired);
    }
    if can_produce && g.num_leaves > 0 {
        let fed = binomial(&mut ctx.rng, g.num_leaves, (p.leaf_prob / 100.0).min(1.0));
        (*o).food += fed as f64;
    }

    let mut producer_ord = 0usize;
    for k in 0..g.active.len() {
        let i = g.active[k] as usize;
        let off = &g.offsets[(*o).rotation as usize];
        let c = (*o).c + off[2 * i] as i32;
        let r = (*o).r + off[2 * i + 1] as i32;
        match g.types[i] {
            MOUTH => {
                for &(dc, dr) in p.edible.iter() {
                    let idx = index_of(sh, c + dc, r + dr);
                    if idx != -1 && *sh.state.add(idx as usize) == FOOD {
                        set_cell(sh, idx as usize, EMPTY, 0, 0);
                        (*o).food += 1.0;
                    }
                }
            }
            PRODUCER => {
                if !can_produce {
                    continue;
                }
                let fires = if many_producers {
                    ctx.rng.next() * 100.0 <= p.food_prod_prob
                } else {
                    producer_mask & (1u64 << producer_ord) != 0
                };
                producer_ord += 1;
                if fires {
                    let (dc, dr) = p.growable[ctx.rng.below(p.growable.len())];
                    let idx = index_of(sh, c + dc, r + dr);
                    if idx != -1 && *sh.state.add(idx as usize) == EMPTY {
                        *sh.state.add(idx as usize) = FOOD;
                    }
                }
            }
            KILLER => {
                for &(dc, dr) in p.killable.iter() {
                    if !(*o).living {
                        break;
                    }
                    let idx = index_of(sh, c + dc, r + dr);
                    if idx == -1 {
                        continue;
                    }
                    let t = *sh.owner.add(idx as usize);
                    if t == 0 || t == slot + 1 {
                        continue;
                    }
                    let target = sh.orgs.add((t - 1) as usize);
                    let st = *sh.state.add(idx as usize);
                    if !(*target).living || (*target).dying.load(Ordering::Acquire) || st == ARMOR {
                        continue;
                    }
                    harm_other(sh, t - 1, ctx);
                    if p.insta_kill && st == KILLER {
                        harm_self(sh, o, ctx);
                    }
                    if st == SPIKE {
                        harm_self(sh, o, ctx);
                    }
                }
            }
            EYE => eye(sh, o, slot, c, r, i),
            HEALER => {
                if (*o).damage.load(Ordering::Relaxed) > 0 && ctx.rng.next() * 100.0 < p.heal_prob {
                    (*o).damage.fetch_sub(1, Ordering::Relaxed);
                }
            }
            _ => {}
        }
        if !(*o).living {
            return;
        }
    }

    if g.is_mover {
        (*o).move_count += 1;
        let mut changed_dir = false;
        if (*o).ignore_brain_for == 0 {
            changed_dir = decide(sh, o);
        } else {
            (*o).ignore_brain_for -= 1;
        }
        let moved = attempt_move(sh, o, slot);
        if moved && g.has_booster {
            attempt_move(sh, o, slot);
        }
        if ((*o).move_count > (*o).move_range && !changed_dir) || !moved {
            if !attempt_rotate(sh, o, slot, ctx) {
                (*o).direction = ctx.rng.below(4) as u8;
                (*o).move_count = 0;
                if changed_dir {
                    (*o).ignore_brain_for = (*o).move_range + 1;
                }
            }
        }
    }
}

unsafe fn eye(sh: Shared, o: *mut Org, slot: u32, mut c: i32, mut r: i32, i: usize) {
    let p = &*sh.p;
    let mut direction = (*o).rotation + (*o).g().dirs[i];
    if direction > 3 {
        direction -= 4;
    }
    let (dc, dr) = SCALARS[direction as usize];
    let own = slot + 1;
    let mut d: i32 = 1;
    while (d as f64) <= p.look_range {
        c += dc;
        r += dr;
        let idx = index_of(sh, c, r);
        if idx == -1 {
            return;
        }
        if *sh.state.add(idx as usize) == EMPTY {
            d += 1;
            continue;
        }
        let t = *sh.owner.add(idx as usize);
        if t == own && p.see_through_self {
            d += 1;
            continue;
        }
        if t != 0 && t != own && (*sh.orgs.add((t - 1) as usize)).has_camo {
            d += 1;
            continue;
        }
        if t != own && d < (*o).seen_distance {
            (*o).seen_idx = idx;
            (*o).seen_distance = d;
            (*o).seen_direction = direction;
        }
        return;
    }
}

unsafe fn decide(sh: Shared, o: *mut Org) -> bool {
    let seen = (*o).seen_idx;
    let decision = if seen != -1 { (*o).brain[*sh.state.add(seen as usize) as usize & 15] } else { NEUTRAL };
    let dir = (*o).seen_direction;
    (*o).seen_idx = -1;
    (*o).seen_distance = i32::MAX;
    (*o).seen_direction = 0;
    if decision == CHASE {
        (*o).direction = dir;
        (*o).move_count = 0;
        true
    } else if decision == RETREAT {
        (*o).direction = (dir + 2) % 4;
        (*o).move_count = 0;
        true
    } else {
        false
    }
}

unsafe fn attempt_move(sh: Shared, o: *mut Org, slot: u32) -> bool {
    let (dc, dr) = SCALARS[(*o).direction as usize];
    let (nc, nr) = ((*o).c + dc, (*o).r + dr);
    if is_clear(sh, &*(*o).genome, slot + 1, nc, nr, (*o).rotation) {
        fill_body(sh, o, EMPTY);
        (*o).c = nc;
        (*o).r = nr;
        update_grid(sh, o, slot);
        return true;
    }
    false
}

unsafe fn attempt_rotate(sh: Shared, o: *mut Org, slot: u32, ctx: &mut ThreadCtx) -> bool {
    if !(*o).can_rotate {
        (*o).direction = ctx.rng.below(4) as u8;
        (*o).move_count = 0;
        return true;
    }
    let new_rotation = ctx.rng.below(4) as u8;
    if is_clear(sh, &*(*o).genome, slot + 1, (*o).c, (*o).r, new_rotation) {
        fill_body(sh, o, EMPTY);
        (*o).rotation = new_rotation;
        (*o).direction = ctx.rng.below(4) as u8;
        update_grid(sh, o, slot);
        (*o).move_count = 0;
        return true;
    }
    false
}

unsafe fn is_straight_path(sh: Shared, mut c1: i32, mut r1: i32, mut c2: i32, mut r2: i32, parent_owner: u32) -> bool {
    let passable = |idx: i32| -> bool {
        if idx == -1 {
            return false;
        }
        let s = *sh.state.add(idx as usize);
        s == EMPTY || *sh.owner.add(idx as usize) == parent_owner || s == FOOD
    };
    if c1 == c2 {
        if r1 > r2 {
            core::mem::swap(&mut r1, &mut r2);
        }
        let mut i = r1;
        while i != r2 {
            if !passable(index_of(sh, c1, i)) {
                return false;
            }
            i += 1;
        }
        return true;
    }
    if c1 > c2 {
        core::mem::swap(&mut c1, &mut c2);
    }
    let _ = r2;
    let mut i = c1;
    while i != c2 {
        if !passable(index_of(sh, i, r1)) {
            return false;
        }
        i += 1;
    }
    true
}

unsafe fn reproduce(sh: Shared, parent: *mut Org, parent_slot: u32, ctx: &mut ThreadCtx) {
    let p = &*sh.p;
    let pg = &*(*parent).genome;
    Genome::add_ref((*parent).genome);
    let mut child = Org::new((*parent).genome, p.rotation_enabled);
    child.move_range = (*parent).move_range;
    child.mutability = (*parent).mutability;
    child.species = (*parent).species;
    if pg.is_mover && pg.has_eyes {
        child.brain = (*parent).brain;
    }
    let rng = &mut ctx.rng;
    if p.rotation_enabled {
        child.rotation = rng.below(4) as u8;
    }
    let prob = if p.use_global_mutability {
        p.global_mutability
    } else {
        if rng.next() <= 0.5 {
            child.mutability += 1;
        } else {
            child.mutability -= 1;
            if child.mutability < 1 {
                child.mutability = 1;
            }
        }
        (*parent).mutability as f64
    };
    let mut mutated = false;
    if rng.next() * 100.0 <= prob {
        if child.g().is_mover && rng.next() * 100.0 <= 10.0 {
            if child.g().has_eyes {
                let k = rng.below(NUM_STATES);
                child.brain[k] = rng.below(3) as u8;
                child.brain[EMPTY as usize] = NEUTRAL;
            }
            child.move_range += (rng.next() * 4.0).floor() as i32 - 2;
            if child.move_range <= 0 {
                child.move_range = 1;
            }
        } else {
            mutated = mutate(&mut child, &p.clone_probs(), rng);
        }
    }
    let (sc, sr) = SCALARS[rng.below(4)];
    let offset = (rng.next() * 3.0).floor() as i32;
    let base = (*parent).birth_distance;
    let new_c = (*parent).c + sc * base + sc * offset;
    let new_r = (*parent).r + sr * base + sr * offset;

    let fits = is_clear(sh, child.g(), 0, new_c, new_r, child.rotation)
        && is_straight_path(sh, new_c, new_r, (*parent).c, (*parent).r, parent_slot + 1)
        && reserve_org(p);
    if fits {
        child.c = new_c;
        child.r = new_r;
        let k = SLOT_NEXT.fetch_add(1, Ordering::AcqRel) as usize;
        let slot = SLOT_POOL[k];
        let parent_species = child.species;
        let mutability = child.mutability;
        let n = child.n;
        let counts = if mutated { child.g().counts() } else { [0; NUM_STATES] };
        let dst = sh.orgs.add(slot as usize);
        core::ptr::write(dst, child);
        update_grid(sh, dst, slot);
        ctx.mutability_delta += mutability as f64;
        if n > ctx.largest {
            ctx.largest = n;
        }
        ctx.next.push(Entry {
            slot,
            key: key_for((*dst).c, (*dst).r, (*dst).g().extent, (*dst).birth_distance, sh.tiles_x, sh.nb_reach, sh.cols, sh.rows),
            weight: n as u32,
        });
        if mutated {
            let id = SPECIES_NEXT.fetch_add(1, Ordering::AcqRel);
            let name = ctx.rng.next();
            (*dst).species = id;
            ctx.events.push(Event { kind: EV_NEW_SPECIES, a: id, b: parent_species, tick: sh.tick, f: name, counts });
        } else {
            ctx.events.push(Event::simple(EV_ADD_POP, parent_species, sh.tick));
        }
    } else {
        Genome::release(child.genome);
    }
    (*parent).food -= (*parent).food_needed(p);
}

/// canAddOrganism with a shared counter of organisms plus births so far.
fn reserve_org(p: &Params) -> bool {
    if p.max_organisms < 0.0 {
        ORG_COUNT.fetch_add(1, Ordering::Relaxed);
        return true;
    }
    let before = ORG_COUNT.fetch_add(1, Ordering::AcqRel);
    if (before as f64) < p.max_organisms {
        true
    } else {
        ORG_COUNT.fetch_sub(1, Ordering::AcqRel);
        false
    }
}

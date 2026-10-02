//! World state and the exact (single-threaded, reproducible) simulation.
//!
//! The exact tick mirrors src/Sim/SimWorld.js / the original object-based
//! implementation rule for rule, including the order of every random number,
//! so for the same seed it produces the same world (checked by `npm test`).

use crate::consts::*;
use crate::genome::{cell_distance, CellRec, Genome};
use crate::rng::Rng;
use core::sync::atomic::{AtomicBool, AtomicI32, Ordering};

pub const EV_NEW_SPECIES: u32 = 1;
pub const EV_ADD_POP: u32 = 2;
pub const EV_DEC_POP: u32 = 3;
pub const EV_RESET: u32 = 4;
pub const EV_EXTINCT_PAUSE: u32 = 5;

#[derive(Clone, Copy)]
pub struct Event {
    pub kind: u32,
    pub a: u32,
    pub b: u32,
    pub tick: i32,
    pub f: f64,
    pub counts: [u16; NUM_STATES],
}

impl Event {
    pub fn simple(kind: u32, a: u32, tick: i32) -> Event {
        Event { kind, a, b: 0, tick, f: 0.0, counts: [0; NUM_STATES] }
    }
}

/// Evolution controls (Hyperparameters.js) and world config, set from JS.
#[derive(Clone)]
pub struct Params {
    pub lifespan_multiplier: f64,
    pub food_prod_prob: f64,
    pub use_global_mutability: bool,
    pub global_mutability: f64,
    pub add_prob: f64,
    pub change_prob: f64,
    pub remove_prob: f64,
    pub rotation_enabled: bool,
    pub food_blocks_reproduction: bool,
    pub movers_can_produce: bool,
    pub insta_kill: bool,
    pub look_range: f64,
    pub see_through_self: bool,
    pub food_drop_prob: f64,
    pub extra_mover_food_cost: f64,
    pub max_organisms: f64,
    pub extended_cell_types: bool,
    pub heal_prob: f64,
    pub leaf_prob: f64,
    pub auto_reset: bool,
    pub auto_pause: bool,
    pub clear_walls_on_reset: bool,
    pub killable: Vec<(i32, i32)>,
    pub edible: Vec<(i32, i32)>,
    pub growable: Vec<(i32, i32)>,
}

impl Default for Params {
    fn default() -> Self {
        let adjacent = vec![(0, 1), (0, -1), (1, 0), (-1, 0)];
        Params {
            lifespan_multiplier: 100.0,
            food_prod_prob: 5.0,
            use_global_mutability: false,
            global_mutability: 5.0,
            add_prob: 33.0,
            change_prob: 33.0,
            remove_prob: 33.0,
            rotation_enabled: true,
            food_blocks_reproduction: true,
            movers_can_produce: false,
            insta_kill: false,
            look_range: 20.0,
            see_through_self: false,
            food_drop_prob: 0.0,
            extra_mover_food_cost: 0.0,
            max_organisms: -1.0,
            extended_cell_types: true,
            heal_prob: 10.0,
            leaf_prob: 1.0,
            auto_reset: true,
            auto_pause: false,
            clear_walls_on_reset: false,
            killable: adjacent.clone(),
            edible: adjacent.clone(),
            growable: adjacent,
        }
    }
}

pub fn default_brain() -> [u8; NUM_STATES] {
    let mut b = [NEUTRAL; NUM_STATES];
    b[FOOD as usize] = CHASE;
    b[KILLER as usize] = RETREAT;
    b
}

// Cache-line aligned: in fast mode neighboring slots are usually updated by
// different threads, and sharing lines between cores costs more than the padding.
#[repr(align(64))]
pub struct Org {
    pub c: i32,
    pub r: i32,
    pub lifetime: i32,
    pub food: f64,
    pub living: bool,
    /// fast mode: killed by another organism, removed at the end of the tick
    pub dying: AtomicBool,
    pub direction: u8,
    pub rotation: u8,
    pub can_rotate: bool,
    pub move_count: i32,
    pub move_range: i32,
    pub ignore_brain_for: i32,
    pub mutability: i32,
    pub damage: AtomicI32,
    pub genome: *const Genome,
    /// copies of genome facts that other organisms read (no pointer chasing across threads)
    pub n: i32,
    pub has_camo: bool,
    pub birth_distance: i32,
    pub brain: [u8; NUM_STATES],
    pub seen_idx: i32,
    pub seen_distance: i32,
    pub seen_direction: u8,
    pub species: u32,
}

unsafe impl Send for Org {}
unsafe impl Sync for Org {}

impl Org {
    /// A fresh organism holding one reference to `genome` (the caller's).
    pub fn new(genome: *const Genome, rotation_enabled: bool) -> Org {
        let g = unsafe { &*genome };
        Org {
            c: 0,
            r: 0,
            lifetime: 0,
            food: 0.0,
            living: true,
            dying: AtomicBool::new(false),
            direction: DOWN,
            rotation: UP,
            can_rotate: rotation_enabled,
            move_count: 0,
            move_range: 4,
            ignore_brain_for: 0,
            mutability: 5,
            damage: AtomicI32::new(0),
            genome,
            n: g.n as i32,
            has_camo: g.has_camo,
            birth_distance: g.base_birth_distance,
            brain: default_brain(),
            seen_idx: -1,
            seen_distance: i32::MAX,
            seen_direction: 0,
            species: 0,
        }
    }

    #[inline(always)]
    pub fn g(&self) -> &Genome {
        unsafe { &*self.genome }
    }

    pub fn set_genome(&mut self, genome: *const Genome) {
        self.genome = genome;
        let g = unsafe { &*genome };
        self.n = g.n as i32;
        self.has_camo = g.has_camo;
    }

    pub fn food_needed(&self, p: &Params) -> f64 {
        let n = self.n as f64;
        if self.g().is_mover { n + p.extra_mover_food_cost } else { n }
    }
}

pub struct World {
    pub cols: i32,
    pub rows: i32,
    pub state: Vec<u8>,
    /// organism slot + 1, 0 = none
    pub owner: Vec<u32>,
    /// index of the owner's genome cell
    pub cidx: Vec<u16>,
    pub walls: Vec<u32>,
    pub orgs: Vec<Org>,
    /// living organisms in update order
    pub list: Vec<u32>,
    pub free: Vec<u32>,
    pub total_mutability: f64,
    pub largest: i32,
    pub reset_count: i32,
    pub total_ticks: i32,
    pub p: Params,
    pub rng: Rng,
    pub events: Vec<Event>,
    pub next_species: u32,
    pub render: Vec<u8>,
    /// fast (tiled, multi-threaded) mode instead of exact mode
    pub fast: bool,
}

impl World {
    pub fn new(cols: i32, rows: i32) -> World {
        let mut w = World {
            cols: 0,
            rows: 0,
            state: Vec::new(),
            owner: Vec::new(),
            cidx: Vec::new(),
            walls: Vec::new(),
            orgs: Vec::new(),
            list: Vec::new(),
            free: Vec::new(),
            total_mutability: 0.0,
            largest: 0,
            reset_count: 0,
            total_ticks: 0,
            p: Params::default(),
            rng: Rng::new(1),
            events: Vec::new(),
            next_species: 1,
            render: Vec::new(),
            fast: false,
        };
        w.resize(cols, rows);
        w
    }

    /// New empty grid; all organisms are discarded.
    pub fn resize(&mut self, cols: i32, rows: i32) {
        self.clear_orgs();
        self.cols = cols.max(1);
        self.rows = rows.max(1);
        let n = (self.cols * self.rows) as usize;
        self.state = vec![EMPTY; n];
        self.owner = vec![0; n];
        self.cidx = vec![0; n];
        self.walls.clear();
    }

    pub fn clear_orgs(&mut self) {
        crate::fast::invalidate();
        for &slot in &self.list {
            Genome::release(self.orgs[slot as usize].genome);
        }
        self.list.clear();
        self.orgs.clear();
        self.free.clear();
    }

    // ---------------- grid ----------------

    #[inline(always)]
    pub fn index_of(&self, c: i32, r: i32) -> i32 {
        if (c as u32) >= self.cols as u32 || (r as u32) >= self.rows as u32 {
            -1
        } else {
            c * self.rows + r
        }
    }

    #[inline(always)]
    pub fn change_cell(&mut self, c: i32, r: i32, state: u8, owner: u32, cell_index: u16) {
        let idx = self.index_of(c, r);
        if idx == -1 {
            return;
        }
        let i = idx as usize;
        self.state[i] = state;
        self.owner[i] = owner;
        self.cidx[i] = cell_index;
        if state == WALL {
            self.walls.push(i as u32);
        }
    }

    pub fn center(&self) -> (i32, i32) {
        (self.cols / 2, self.rows / 2)
    }

    pub fn fill_grid(&mut self, state: u8, ignore_walls: bool) {
        for i in 0..self.state.len() {
            if ignore_walls && self.state[i] == WALL {
                continue;
            }
            self.state[i] = state;
            self.owner[i] = 0;
            self.cidx[i] = 0;
        }
    }

    // ---------------- organisms ----------------

    pub fn alloc_slot(&mut self, org: Org) -> u32 {
        if let Some(slot) = self.free.pop() {
            self.orgs[slot as usize] = org;
            slot
        } else {
            self.orgs.push(org);
            (self.orgs.len() - 1) as u32
        }
    }

    pub fn add_organism(&mut self, org: Org) -> u32 {
        let slot = self.alloc_slot(org);
        self.update_grid(slot);
        let o = &self.orgs[slot as usize];
        self.total_mutability += o.mutability as f64;
        let n = o.n;
        self.list.push(slot);
        if n > self.largest {
            self.largest = n;
        }
        slot
    }

    pub fn can_add_organism(&self) -> bool {
        (self.list.len() as f64) < self.p.max_organisms || self.p.max_organisms < 0.0
    }

    pub fn average_mutability(&self) -> f64 {
        if self.list.is_empty() {
            0.0
        } else if self.p.use_global_mutability {
            self.p.global_mutability
        } else {
            self.total_mutability / self.list.len() as f64
        }
    }

    pub fn new_species_id(&mut self) -> u32 {
        let id = self.next_species;
        self.next_species += 1;
        id
    }

    pub fn update_grid(&mut self, slot: u32) {
        let o = &self.orgs[slot as usize];
        let g = o.g();
        let off = &g.offsets[o.rotation as usize];
        let (c, r) = (o.c, o.r);
        let owner = slot + 1;
        for i in 0..g.n {
            let idx = self.index_of(c + off[2 * i] as i32, r + off[2 * i + 1] as i32);
            if idx == -1 {
                continue;
            }
            let k = idx as usize;
            self.state[k] = g.types[i];
            self.owner[k] = owner;
            self.cidx[k] = i as u16;
            if g.types[i] == WALL {
                self.walls.push(k as u32);
            }
        }
    }

    pub fn fill_body(&mut self, slot: u32, state: u8) {
        let o = &self.orgs[slot as usize];
        let g = o.g();
        let off = &g.offsets[o.rotation as usize];
        let (c, r) = (o.c, o.r);
        for i in 0..g.n {
            let idx = self.index_of(c + off[2 * i] as i32, r + off[2 * i + 1] as i32);
            if idx == -1 {
                continue;
            }
            let k = idx as usize;
            self.state[k] = state;
            self.owner[k] = 0;
            self.cidx[k] = 0;
        }
    }

    /// isClear for an organism `g` at (col,row) with rotation; `own` = slot+1 or 0 if not placed
    pub fn is_clear(&self, g: &Genome, own: u32, col: i32, row: i32, rotation: u8) -> bool {
        let off = &g.offsets[rotation as usize];
        let food_passable = !self.p.food_blocks_reproduction;
        for i in 0..g.n {
            let idx = self.index_of(col + off[2 * i] as i32, row + off[2 * i + 1] as i32);
            if idx == -1 {
                return false;
            }
            let k = idx as usize;
            let s = self.state[k];
            if s == EMPTY || (food_passable && s == FOOD) || (own != 0 && self.owner[k] == own) {
                continue;
            }
            return false;
        }
        true
    }

    pub fn is_straight_path(&self, mut c1: i32, mut r1: i32, mut c2: i32, mut r2: i32, parent_owner: u32) -> bool {
        let passable = |w: &World, idx: i32| -> bool {
            if idx == -1 {
                return false;
            }
            let s = w.state[idx as usize];
            s == EMPTY || w.owner[idx as usize] == parent_owner || s == FOOD
        };
        if c1 == c2 {
            if r1 > r2 {
                core::mem::swap(&mut r1, &mut r2);
            }
            let mut i = r1;
            while i != r2 {
                if !passable(self, self.index_of(c1, i)) {
                    return false;
                }
                i += 1;
            }
            return true;
        }
        if c1 > c2 {
            core::mem::swap(&mut c1, &mut c2);
        }
        let _ = (r2,);
        let mut i = c1;
        while i != c2 {
            if !passable(self, self.index_of(i, r1)) {
                return false;
            }
            i += 1;
        }
        true
    }

    pub fn die(&mut self, slot: u32) {
        if !self.orgs[slot as usize].living {
            return;
        }
        let poison = self.orgs[slot as usize].g().has_poison;
        self.fill_body(slot, if poison { EMPTY } else { FOOD });
        let o = &mut self.orgs[slot as usize];
        let species = o.species;
        o.living = false;
        let tick = self.total_ticks;
        self.events.push(Event::simple(EV_DEC_POP, species, tick));
    }

    pub fn harm(&mut self, slot: u32) {
        let o = &self.orgs[slot as usize];
        let d = o.damage.fetch_add(1, Ordering::Relaxed) + 1;
        if d >= o.n || self.p.insta_kill {
            self.die(slot);
        }
    }

    // ---------------- exact tick ----------------

    pub fn tick_exact(&mut self) {
        let count = self.list.len();
        let mut write = 0;
        for i in 0..count {
            let slot = self.list[i];
            let keep = self.orgs[slot as usize].living && self.update_org(slot);
            if keep {
                self.list[write] = slot;
                write += 1;
            } else {
                self.remove_slot(slot);
            }
        }
        let removed = count - write;
        if removed > 0 {
            let total = self.list.len();
            for i in count..total {
                self.list[write] = self.list[i];
                write += 1;
            }
            self.list.truncate(write);
            if write == 0 {
                self.on_population_extinct();
            }
        }
        if self.p.food_drop_prob > 0.0 {
            self.generate_food();
        }
        self.total_ticks += 1;
    }

    /// Frees a dead organism's slot (it is no longer in the update list).
    pub fn remove_slot(&mut self, slot: u32) {
        let o = &self.orgs[slot as usize];
        self.total_mutability -= o.mutability as f64;
        Genome::release(o.genome);
        self.free.push(slot);
    }

    /// Drops organisms that died since the last tick (before saving), like clearDeadOrganisms.
    pub fn remove_dead(&mut self) {
        let before = self.list.len();
        let mut write = 0;
        for i in 0..before {
            let slot = self.list[i];
            if self.orgs[slot as usize].living {
                self.list[write] = slot;
                write += 1;
            } else {
                self.remove_slot(slot);
            }
        }
        self.list.truncate(write);
        if write == 0 && before > 0 {
            self.on_population_extinct();
        }
    }

    /// Consistency check used by tests: 0 if the grid, organism list and
    /// bookkeeping agree, otherwise a code identifying the first problem.
    /// Body cells covered by another living organism are counted in
    /// `overlaps` instead (saved worlds can contain overlapping organisms).
    pub fn check_invariants(&self, overlaps: &mut u32) -> i32 {
        *overlaps = 0;
        let mut in_list = vec![false; self.orgs.len()];
        let mut mutability = 0.0;
        for &slot in &self.list {
            let s = slot as usize;
            if s >= self.orgs.len() || in_list[s] {
                return 1; // bad or duplicate slot
            }
            in_list[s] = true;
            let o = &self.orgs[s];
            mutability += o.mutability as f64;
            if !o.living {
                // killed after its own update; removed at its next update (as in the original)
                continue;
            }
            let g = o.g();
            if o.n != g.n as i32 || o.has_camo != g.has_camo {
                return 3;
            }
            let off = &g.offsets[o.rotation as usize];
            for i in 0..g.n {
                let idx = self.index_of(o.c + off[2 * i] as i32, o.r + off[2 * i + 1] as i32);
                if idx == -1 {
                    continue;
                }
                let k = idx as usize;
                if self.owner[k] != slot + 1 {
                    let other = self.owner[k];
                    if other != 0 && self.orgs[(other - 1) as usize].living {
                        *overlaps += 1;
                        continue;
                    }
                    return 4; // body cell missing from the grid
                }
                if self.state[k] != g.types[i] || self.cidx[k] as usize != i {
                    // an organism listing two cells at the same spot (possible in saved worlds)
                    let ci = self.cidx[k] as usize;
                    if ci < g.n && g.cols[ci] == g.cols[i] && g.rows[ci] == g.rows[i] {
                        continue; // inherited by offspring, so not counted as an overlap
                    }
                    return 9; // body cell has the wrong type
                }
            }
        }
        for k in 0..self.state.len() {
            let t = self.owner[k];
            if t == 0 {
                if self.state[k] > WALL {
                    return 5; // organism cell without an owner
                }
                continue;
            }
            let s = (t - 1) as usize;
            if s >= in_list.len() || !in_list[s] || !self.orgs[s].living {
                return 6; // cell owned by an organism that isn't alive
            }
            if self.state[k] <= WALL {
                return 7; // owned cell that isn't an organism cell
            }
        }
        if (mutability - self.total_mutability).abs() > 1e-6 {
            return 8;
        }
        0
    }

    pub fn living_count(&self) -> u32 {
        self.list.iter().filter(|&&s| self.orgs[s as usize].living).count() as u32
    }

    pub fn on_population_extinct(&mut self) {
        if self.p.auto_pause {
            let tick = self.total_ticks;
            self.events.push(Event::simple(EV_EXTINCT_PAUSE, 0, tick));
        } else if self.p.auto_reset {
            self.reset_count += 1;
            self.reset(true);
        }
    }

    fn update_org(&mut self, slot: u32) -> bool {
        let s = slot as usize;
        {
            let o = &mut self.orgs[s];
            o.lifetime += 1;
            if o.lifetime as f64 > o.n as f64 * self.p.lifespan_multiplier {
                self.die(slot);
                return self.orgs[s].living;
            }
        }
        if self.orgs[s].food >= self.orgs[s].food_needed(&self.p) {
            self.reproduce(slot);
        }
        {
            let o = &mut self.orgs[s];
            o.seen_idx = -1;
            o.seen_distance = i32::MAX;
            o.seen_direction = 0;
        }
        let g = self.orgs[s].g() as *const Genome;
        let g = unsafe { &*g };
        for k in 0..g.active.len() {
            let i = g.active[k] as usize;
            let o = &self.orgs[s];
            let off = &g.offsets[o.rotation as usize];
            let c = o.c + off[2 * i] as i32;
            let r = o.r + off[2 * i + 1] as i32;
            match g.types[i] {
                MOUTH => self.mouth(slot, c, r),
                PRODUCER => self.producer(slot, c, r),
                KILLER => self.killer(slot, c, r),
                EYE => self.eye(slot, c, r, i),
                HEALER => self.healer(slot),
                LEAF => self.leaf(slot),
                _ => {}
            }
            if !self.orgs[s].living {
                return false;
            }
        }
        if g.is_mover {
            self.orgs[s].move_count += 1;
            let mut changed_dir = false;
            if self.orgs[s].ignore_brain_for == 0 {
                changed_dir = self.decide(slot);
            } else {
                self.orgs[s].ignore_brain_for -= 1;
            }
            let moved = self.attempt_move(slot);
            if moved && g.has_booster {
                self.attempt_move(slot);
            }
            let o = &self.orgs[s];
            if (o.move_count > o.move_range && !changed_dir) || !moved {
                let rotated = self.attempt_rotate(slot);
                if !rotated {
                    let d = self.rng.below(4) as u8;
                    let o = &mut self.orgs[s];
                    o.direction = d;
                    o.move_count = 0;
                    if changed_dir {
                        o.ignore_brain_for = o.move_range + 1;
                    }
                }
            }
        }
        self.orgs[s].living
    }

    fn mouth(&mut self, slot: u32, c: i32, r: i32) {
        for k in 0..self.p.edible.len() {
            let (dc, dr) = self.p.edible[k];
            let idx = self.index_of(c + dc, r + dr);
            if idx != -1 && self.state[idx as usize] == FOOD {
                self.state[idx as usize] = EMPTY;
                self.owner[idx as usize] = 0;
                self.cidx[idx as usize] = 0;
                self.orgs[slot as usize].food += 1.0;
            }
        }
    }

    fn producer(&mut self, slot: u32, c: i32, r: i32) {
        if self.orgs[slot as usize].g().is_mover && !self.p.movers_can_produce {
            return;
        }
        if self.rng.next() * 100.0 > self.p.food_prod_prob {
            return;
        }
        let k = self.rng.below(self.p.growable.len());
        let (dc, dr) = self.p.growable[k];
        let idx = self.index_of(c + dc, r + dr);
        if idx != -1 && self.state[idx as usize] == EMPTY {
            self.state[idx as usize] = FOOD;
        }
    }

    fn killer(&mut self, slot: u32, c: i32, r: i32) {
        for k in 0..self.p.killable.len() {
            if !self.orgs[slot as usize].living {
                return;
            }
            let (dc, dr) = self.p.killable[k];
            let idx = self.index_of(c + dc, r + dr);
            if idx == -1 {
                continue;
            }
            let i = idx as usize;
            let t = self.owner[i];
            if t == 0 || t == slot + 1 {
                continue;
            }
            let target = t - 1;
            let st = self.state[i];
            if !self.orgs[target as usize].living || st == ARMOR {
                continue;
            }
            let is_hit = st == KILLER;
            let is_spike = st == SPIKE;
            self.harm(target);
            if self.p.insta_kill && is_hit {
                self.harm(slot);
            }
            if is_spike {
                self.harm(slot);
            }
        }
    }

    fn eye(&mut self, slot: u32, mut c: i32, mut r: i32, i: usize) {
        let o = &self.orgs[slot as usize];
        let mut direction = o.rotation + o.g().dirs[i];
        if direction > 3 {
            direction -= 4;
        }
        let (dc, dr) = SCALARS[direction as usize];
        let range = self.p.look_range;
        let see_through_self = self.p.see_through_self;
        let own = slot + 1;
        let mut d: i32 = 1;
        while (d as f64) <= range {
            c += dc;
            r += dr;
            let idx = self.index_of(c, r);
            if idx == -1 {
                return;
            }
            let k = idx as usize;
            if self.state[k] == EMPTY {
                d += 1;
                continue;
            }
            let t = self.owner[k];
            if t == own && see_through_self {
                d += 1;
                continue;
            }
            if t != 0 && t != own && self.orgs[(t - 1) as usize].has_camo {
                d += 1;
                continue;
            }
            let o = &mut self.orgs[slot as usize];
            if t != own && d < o.seen_distance {
                o.seen_idx = idx;
                o.seen_distance = d;
                o.seen_direction = direction;
            }
            return;
        }
    }

    fn healer(&mut self, slot: u32) {
        let o = &self.orgs[slot as usize];
        if o.damage.load(Ordering::Relaxed) > 0 && self.rng.next() * 100.0 < self.p.heal_prob {
            o.damage.fetch_sub(1, Ordering::Relaxed);
        }
    }

    fn leaf(&mut self, slot: u32) {
        if self.orgs[slot as usize].g().is_mover && !self.p.movers_can_produce {
            return;
        }
        if self.rng.next() * 100.0 < self.p.leaf_prob {
            self.orgs[slot as usize].food += 1.0;
        }
    }

    fn decide(&mut self, slot: u32) -> bool {
        let seen = self.orgs[slot as usize].seen_idx;
        let decision = if seen != -1 {
            let st = self.state[seen as usize];
            self.orgs[slot as usize].brain[st as usize]
        } else {
            NEUTRAL
        };
        let o = &mut self.orgs[slot as usize];
        let dir = o.seen_direction;
        o.seen_idx = -1;
        o.seen_distance = i32::MAX;
        o.seen_direction = 0;
        if decision == CHASE {
            o.direction = dir;
            o.move_count = 0;
            true
        } else if decision == RETREAT {
            o.direction = (dir + 2) % 4;
            o.move_count = 0;
            true
        } else {
            false
        }
    }

    fn attempt_move(&mut self, slot: u32) -> bool {
        let o = &self.orgs[slot as usize];
        let (dc, dr) = SCALARS[o.direction as usize];
        let (nc, nr) = (o.c + dc, o.r + dr);
        if self.is_clear(o.g(), slot + 1, nc, nr, o.rotation) {
            self.fill_body(slot, EMPTY);
            let o = &mut self.orgs[slot as usize];
            o.c = nc;
            o.r = nr;
            self.update_grid(slot);
            return true;
        }
        false
    }

    fn attempt_rotate(&mut self, slot: u32) -> bool {
        if !self.orgs[slot as usize].can_rotate {
            let d = self.rng.below(4) as u8;
            let o = &mut self.orgs[slot as usize];
            o.direction = d;
            o.move_count = 0;
            return true;
        }
        let new_rotation = self.rng.below(4) as u8;
        let o = &self.orgs[slot as usize];
        if self.is_clear(o.g(), slot + 1, o.c, o.r, new_rotation) {
            self.fill_body(slot, EMPTY);
            let d = self.rng.below(4) as u8;
            let o = &mut self.orgs[slot as usize];
            o.rotation = new_rotation;
            o.direction = d;
            self.update_grid(slot);
            self.orgs[slot as usize].move_count = 0;
            return true;
        }
        false
    }

    // ---------------- reproduction ----------------

    /// Child organism inheriting from `parent` (shares the parent's genome).
    pub fn make_child(&self, parent: &Org) -> Org {
        Genome::add_ref(parent.genome);
        let mut child = Org::new(parent.genome, self.p.rotation_enabled);
        child.move_range = parent.move_range;
        child.mutability = parent.mutability;
        child.species = parent.species;
        let pg = parent.g();
        if pg.is_mover && pg.has_eyes {
            child.brain = parent.brain;
        }
        child
    }

    fn reproduce(&mut self, parent_slot: u32) {
        let mut child = self.make_child(&self.orgs[parent_slot as usize]);
        if self.p.rotation_enabled {
            child.rotation = self.rng.below(4) as u8;
        }
        let parent_mut = self.orgs[parent_slot as usize].mutability;
        let prob = if self.p.use_global_mutability {
            self.p.global_mutability
        } else {
            if self.rng.next() <= 0.5 {
                child.mutability += 1;
            } else {
                child.mutability -= 1;
                if child.mutability < 1 {
                    child.mutability = 1;
                }
            }
            parent_mut as f64
        };
        let mut mutated = false;
        if self.rng.next() * 100.0 <= prob {
            if child.g().is_mover && self.rng.next() * 100.0 <= 10.0 {
                if child.g().has_eyes {
                    let k = self.rng.below(NUM_STATES);
                    child.brain[k] = self.rng.below(3) as u8;
                    child.brain[EMPTY as usize] = NEUTRAL;
                }
                child.move_range += (self.rng.next() * 4.0).floor() as i32 - 2;
                if child.move_range <= 0 {
                    child.move_range = 1;
                }
            } else {
                let p = self.p.clone_probs();
                mutated = mutate(&mut child, &p, &mut self.rng);
            }
        }
        let (sc, sr) = SCALARS[self.rng.below(4)];
        let offset = (self.rng.next() * 3.0).floor() as i32;
        let parent = &self.orgs[parent_slot as usize];
        let base = parent.birth_distance;
        let new_c = parent.c + sc * base + sc * offset;
        let new_r = parent.r + sr * base + sr * offset;
        let (pc, pr) = (parent.c, parent.r);

        if self.is_clear(child.g(), 0, new_c, new_r, child.rotation)
            && self.is_straight_path(new_c, new_r, pc, pr, parent_slot + 1)
            && self.can_add_organism()
        {
            child.c = new_c;
            child.r = new_r;
            let parent_species = child.species;
            let counts = child.g().counts();
            let slot = self.add_organism(child);
            let tick = self.total_ticks;
            if mutated {
                let id = self.new_species_id();
                let name = self.rng.next();
                self.orgs[slot as usize].species = id;
                self.events.push(Event { kind: EV_NEW_SPECIES, a: id, b: parent_species, tick, f: name, counts });
            } else {
                self.events.push(Event::simple(EV_ADD_POP, parent_species, tick));
            }
        } else {
            Genome::release(child.genome);
        }
        let parent = &mut self.orgs[parent_slot as usize];
        parent.food -= parent.food_needed(&self.p);
    }

    // ---------------- world actions ----------------

    pub fn generate_food(&mut self) {
        let num_food = ((self.cols as f64 * self.rows as f64 * self.p.food_drop_prob / 50000.0).floor()).max(1.0) as i64;
        let prob = self.p.food_drop_prob;
        for _ in 0..num_food {
            if self.rng.next() <= prob {
                let c = self.rng.below(self.cols as usize) as i32;
                let r = self.rng.below(self.rows as usize) as i32;
                let idx = self.index_of(c, r);
                if idx != -1 && self.state[idx as usize] == EMPTY {
                    self.change_cell(c, r, FOOD, 0, 0);
                }
            }
        }
    }

    /// The starting organism: a mouth between two producers.
    pub fn origin_of_life(&mut self) {
        crate::fast::invalidate();
        let cells = [
            CellRec { t: MOUTH, col: 0, row: 0, dir: 0 },
            CellRec { t: PRODUCER, col: 1, row: 1, dir: 0 },
            CellRec { t: PRODUCER, col: -1, row: -1, dir: 0 },
        ];
        let g = Genome::create(&cells);
        let mut org = Org::new(g, self.p.rotation_enabled);
        let (c, r) = self.center();
        org.c = c;
        org.r = r;
        let counts = org.g().counts();
        let slot = self.add_organism(org);
        let id = self.new_species_id();
        let name = self.rng.next();
        self.orgs[slot as usize].species = id;
        let tick = self.total_ticks;
        self.events.push(Event { kind: EV_NEW_SPECIES, a: id, b: 0, tick, f: name, counts });
    }

    pub fn reset(&mut self, life: bool) {
        self.clear_orgs();
        let keep_walls = !self.p.clear_walls_on_reset;
        self.fill_grid(EMPTY, keep_walls);
        self.total_mutability = 0.0;
        self.total_ticks = 0;
        self.events.push(Event::simple(EV_RESET, 0, 0));
        if life {
            self.origin_of_life();
        }
    }

    pub fn clear_walls(&mut self) {
        let walls = core::mem::take(&mut self.walls);
        for idx in walls {
            if self.state[idx as usize] == WALL {
                self.state[idx as usize] = EMPTY;
                self.owner[idx as usize] = 0;
            }
        }
    }

    /// Kill any organism at each listed cell and place a wall there.
    pub fn place_walls(&mut self, cells: &[i32]) {
        for pair in cells.chunks_exact(2) {
            let idx = self.index_of(pair[0], pair[1]);
            if idx == -1 {
                continue;
            }
            let t = self.owner[idx as usize];
            if t != 0 {
                self.die(t - 1);
            }
            self.change_cell(pair[0], pair[1], WALL, 0, 0);
        }
    }

    pub fn drop_cell_type(&mut self, col: i32, row: i32, size: i32, state: u8, kill_blocking: bool, ignore_state: i32) {
        for i in -size..=size {
            for j in -size..=size {
                let (c, r) = (col + i, row + j);
                let idx = self.index_of(c, r);
                if idx == -1 {
                    continue;
                }
                let t = self.owner[idx as usize];
                if kill_blocking && t != 0 {
                    self.die(t - 1);
                } else if t != 0 {
                    continue;
                }
                if ignore_state != -1 && self.state[idx as usize] as i32 == ignore_state {
                    continue;
                }
                self.change_cell(c, r, state, 0, 0);
            }
        }
    }

    pub fn kill_near(&mut self, col: i32, row: i32, size: i32) {
        for i in -size..=size {
            for j in -size..=size {
                let idx = self.index_of(col + i, row + j);
                if idx == -1 {
                    continue;
                }
                let t = self.owner[idx as usize];
                if t != 0 {
                    self.die(t - 1);
                }
            }
        }
    }

    /// slot + 1 of the nearest organism within the brush, or 0
    pub fn find_near(&self, col: i32, row: i32, size: i32) -> u32 {
        let mut closest = 0u32;
        let mut closest_dist = 100;
        for i in -size..=size {
            for j in -size..=size {
                let idx = self.index_of(col + i, row + j);
                let dist = i.abs() + j.abs();
                if idx == -1 {
                    continue;
                }
                let t = self.owner[idx as usize];
                if t != 0 && (closest == 0 || dist < closest_dist) {
                    closest = t;
                    closest_dist = dist;
                }
            }
        }
        closest
    }

    /// Absolute cells of the organism at (col,row), or just that cell.
    pub fn highlight(&self, col: i32, row: i32, out: &mut Vec<i32>) {
        out.clear();
        let idx = self.index_of(col, row);
        if idx == -1 {
            return;
        }
        let t = self.owner[idx as usize];
        if t == 0 {
            out.push(col);
            out.push(row);
            return;
        }
        let o = &self.orgs[(t - 1) as usize];
        let off = &o.g().offsets[o.rotation as usize];
        for k in 0..o.n as usize {
            out.push(o.c + off[2 * k] as i32);
            out.push(o.r + off[2 * k + 1] as i32);
        }
    }

    /// One byte per cell: state id, plus the absolute direction of eye cells in bits 4-5.
    pub fn snapshot(&mut self) {
        let n = self.state.len();
        if self.render.len() != n {
            self.render = vec![0; n];
        }
        self.render.copy_from_slice(&self.state);
        for i in 0..n {
            if self.state[i] == EYE {
                let t = self.owner[i];
                if t != 0 {
                    let o = &self.orgs[(t - 1) as usize];
                    let mut dir = o.rotation + o.g().dirs[self.cidx[i] as usize];
                    if dir > 3 {
                        dir -= 4;
                    }
                    self.render[i] = EYE | (dir << 4);
                }
            }
        }
    }
}

/// Probabilities used by mutation (copied so `mutate` doesn't borrow the world).
pub struct MutProbs {
    pub add: f64,
    pub change: f64,
    pub remove: f64,
    pub extended: bool,
}

impl Params {
    pub fn clone_probs(&self) -> MutProbs {
        MutProbs { add: self.add_prob, change: self.change_prob, remove: self.remove_prob, extended: self.extended_cell_types }
    }
}

fn random_living(extended: bool, rng: &mut Rng) -> u8 {
    if extended {
        ALL_LIVING[rng.below(ALL_LIVING.len())]
    } else {
        CLASSIC_LIVING[rng.below(CLASSIC_LIVING.len())]
    }
}

/// Mutates the child's body. Mirrors Organism.mutate / Anatomy, including RNG
/// order and the order cells end up in. Returns whether anything changed.
pub fn mutate(child: &mut Org, p: &MutProbs, rng: &mut Rng) -> bool {
    let mut added = false;
    let mut changed = false;
    let mut removed = false;
    let mut cells = child.g().cells();
    let mut birth_distance = child.birth_distance;
    let has_eye = |cells: &Vec<CellRec>| cells.iter().any(|c| c.t == EYE);

    let add_randomized = |cells: &mut Vec<CellRec>, child: &mut Org, rng: &mut Rng, bd: &mut i32, t: u8, col: i32, row: i32| {
        if t == EYE && !has_eye(cells) {
            for &id in RANDOMIZED_DECISIONS.iter() {
                child.brain[id as usize] = rng.below(3) as u8;
            }
        }
        *bd = (*bd).max(cell_distance(col, row));
        let dir = if t == EYE { rng.below(4) as u8 } else { 0 };
        cells.push(CellRec { t, col, row, dir });
    };
    let remove_at = |cells: &mut Vec<CellRec>, col: i32, row: i32, allow_center: bool| -> bool {
        if col == 0 && row == 0 && !allow_center {
            return false;
        }
        if let Some(i) = cells.iter().position(|c| c.col == col && c.row == row) {
            cells.remove(i);
        }
        true
    };

    if rng.next() * 100.0 < p.add {
        let branch = cells[rng.below(cells.len())];
        let t = random_living(p.extended, rng);
        let (gc, gr) = ALL_NEIGHBORS[rng.below(ALL_NEIGHBORS.len())];
        let (c, r) = (branch.col + gc, branch.row + gr);
        if !cells.iter().any(|x| x.col == c && x.row == r) {
            added = true;
            add_randomized(&mut cells, child, rng, &mut birth_distance, t, c, r);
        }
    }
    if rng.next() * 100.0 < p.change {
        let cell = cells[rng.below(cells.len())];
        let t = random_living(p.extended, rng);
        remove_at(&mut cells, cell.col, cell.row, true);
        add_randomized(&mut cells, child, rng, &mut birth_distance, t, cell.col, cell.row);
        changed = true;
    }
    if rng.next() * 100.0 < p.remove && cells.len() > 1 {
        let cell = cells[rng.below(cells.len())];
        removed = remove_at(&mut cells, cell.col, cell.row, false);
    }
    let old = child.genome;
    child.set_genome(Genome::create(&cells));
    Genome::release(old);
    child.birth_distance = birth_distance;
    added || changed || removed
}

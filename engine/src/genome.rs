//! Immutable body plans shared by an organism and its unmutated descendants.

use crate::consts::*;
use core::sync::atomic::{AtomicU32, Ordering};

#[derive(Clone, Copy, Debug)]
pub struct CellRec {
    pub t: u8,
    pub col: i32,
    pub row: i32,
    pub dir: u8,
}

pub fn cell_distance(col: i32, row: i32) -> i32 {
    (row.abs() * 2 + 2).max(col.abs() * 2 + 2)
}

/// Keeps the reference count on its own cache line: it is written on every
/// birth, while the rest of the genome is read by every organism every tick on
/// every thread.
#[repr(align(64))]
struct RefCount(AtomicU32);

pub struct Genome {
    refs: RefCount,
    pub n: usize,
    pub types: Vec<u8>,
    pub cols: Vec<i16>,
    pub rows: Vec<i16>,
    pub dirs: Vec<u8>,
    pub is_mover: bool,
    pub has_eyes: bool,
    pub has_camo: bool,
    pub has_booster: bool,
    pub has_poison: bool,
    pub is_producer: bool,
    pub base_birth_distance: i32,
    /// largest |col| or |row| of any cell (rotation independent)
    pub extent: i32,
    /// indices of cells that do work each tick, in body order
    pub active: Vec<u16>,
    pub num_producers: usize,
    pub num_leaves: usize,
    /// rotated offsets [c0, r0, c1, r1, ...] for each rotation
    pub offsets: [Vec<i16>; 4],
}

const ROT_COL_C: [i32; 4] = [1, 0, -1, 0];
const ROT_COL_R: [i32; 4] = [0, -1, 0, 1];
const ROT_ROW_C: [i32; 4] = [0, 1, 0, -1];
const ROT_ROW_R: [i32; 4] = [1, 0, -1, 0];

impl Genome {
    /// Allocates a genome with one reference.
    pub fn create(cells: &[CellRec]) -> *mut Genome {
        let n = cells.len();
        let mut g = Genome {
            refs: RefCount(AtomicU32::new(1)),
            n,
            types: Vec::with_capacity(n),
            cols: Vec::with_capacity(n),
            rows: Vec::with_capacity(n),
            dirs: Vec::with_capacity(n),
            is_mover: false,
            has_eyes: false,
            has_camo: false,
            has_booster: false,
            has_poison: false,
            is_producer: false,
            base_birth_distance: 4,
            extent: 0,
            active: Vec::new(),
            num_producers: 0,
            num_leaves: 0,
            offsets: [Vec::new(), Vec::new(), Vec::new(), Vec::new()],
        };
        for (i, c) in cells.iter().enumerate() {
            g.types.push(c.t);
            g.cols.push(c.col as i16);
            g.rows.push(c.row as i16);
            g.dirs.push(if c.t == EYE { c.dir } else { 0 });
            g.base_birth_distance = g.base_birth_distance.max(cell_distance(c.col, c.row));
            g.extent = g.extent.max(c.col.abs()).max(c.row.abs());
            match c.t {
                PRODUCER => { g.is_producer = true; g.num_producers += 1; }
                MOVER => g.is_mover = true,
                EYE => g.has_eyes = true,
                CAMO => g.has_camo = true,
                BOOSTER => g.has_booster = true,
                POISON => g.has_poison = true,
                LEAF => g.num_leaves += 1,
                _ => {}
            }
            if is_active(c.t) {
                g.active.push(i as u16);
            }
        }
        for rot in 0..4 {
            let mut off = Vec::with_capacity(n * 2);
            for i in 0..n {
                let (c, r) = (g.cols[i] as i32, g.rows[i] as i32);
                off.push((ROT_COL_C[rot] * c + ROT_COL_R[rot] * r) as i16);
                off.push((ROT_ROW_C[rot] * c + ROT_ROW_R[rot] * r) as i16);
            }
            g.offsets[rot] = off;
        }
        Box::into_raw(Box::new(g))
    }

    pub fn cells(&self) -> Vec<CellRec> {
        (0..self.n)
            .map(|i| CellRec { t: self.types[i], col: self.cols[i] as i32, row: self.rows[i] as i32, dir: self.dirs[i] })
            .collect()
    }

    pub fn counts(&self) -> [u16; NUM_STATES] {
        let mut out = [0u16; NUM_STATES];
        for &t in &self.types {
            out[t as usize] += 1;
        }
        out
    }

    #[inline]
    pub fn add_ref(g: *const Genome) {
        unsafe { (*g).refs.0.fetch_add(1, Ordering::Relaxed); }
    }

    /// Drops one reference and frees the genome when none are left.
    #[inline]
    pub fn release(g: *const Genome) {
        unsafe {
            if (*g).refs.0.fetch_sub(1, Ordering::AcqRel) == 1 {
                drop(Box::from_raw(g as *mut Genome));
            }
        }
    }
}

//! Cell state ids. Must match the order of `CellStates.all` in
//! src/Organism/Cell/CellStates.js (checked by the JS side at startup).

pub const EMPTY: u8 = 0;
pub const FOOD: u8 = 1;
pub const WALL: u8 = 2;
pub const MOUTH: u8 = 3;
pub const PRODUCER: u8 = 4;
pub const MOVER: u8 = 5;
pub const KILLER: u8 = 6;
pub const ARMOR: u8 = 7;
pub const EYE: u8 = 8;
pub const HEALER: u8 = 9;
pub const CAMO: u8 = 10;
pub const LEAF: u8 = 11;
pub const SPIKE: u8 = 12;
pub const BOOSTER: u8 = 13;
pub const POISON: u8 = 14;
pub const NUM_STATES: usize = 15;

/// Cell types whose function runs every tick.
pub const fn is_active(t: u8) -> bool {
    matches!(t, MOUTH | PRODUCER | KILLER | EYE | HEALER | LEAF)
}

pub const CLASSIC_LIVING: [u8; 6] = [MOUTH, PRODUCER, MOVER, KILLER, ARMOR, EYE];
pub const ALL_LIVING: [u8; 12] = [MOUTH, PRODUCER, MOVER, KILLER, ARMOR, EYE, HEALER, CAMO, LEAF, SPIKE, BOOSTER, POISON];

/// Decisions re-rolled when an organism first evolves an eye (Brain.randomizeDecisions).
pub const RANDOMIZED_DECISIONS: [u8; 10] = [MOUTH, PRODUCER, MOVER, ARMOR, EYE, HEALER, LEAF, SPIKE, BOOSTER, POISON];

pub const NEUTRAL: u8 = 0;
pub const RETREAT: u8 = 1;
pub const CHASE: u8 = 2;

/// Directions: up, right, down, left.
pub const SCALARS: [(i32, i32); 4] = [(0, -1), (1, 0), (0, 1), (-1, 0)];
pub const UP: u8 = 0;
pub const DOWN: u8 = 2;

/// Neighbors.all, used when mutation grows a new cell.
pub const ALL_NEIGHBORS: [(i32, i32); 8] = [(0, 1), (0, -1), (1, 0), (-1, 0), (-1, -1), (1, 1), (-1, 1), (1, -1)];

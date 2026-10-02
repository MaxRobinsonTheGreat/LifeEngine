//! mulberry32, bit-identical to the JS implementation used by the tests, so the
//! exact engine reproduces the reference simulation for the same seed.

#[derive(Clone, Copy)]
pub struct Rng {
    s: u32,
}

impl Rng {
    pub const fn new(seed: u32) -> Self {
        Rng { s: seed }
    }

    #[inline(always)]
    pub fn next(&mut self) -> f64 {
        self.s = self.s.wrapping_add(0x6D2B79F5);
        let s = self.s;
        let mut t = (s ^ (s >> 15)).wrapping_mul(1 | s);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t)) ^ t;
        ((t ^ (t >> 14)) as f64) / 4294967296.0
    }

    /// Math.floor(Math.random() * n)
    #[inline(always)]
    pub fn below(&mut self, n: usize) -> usize {
        (self.next() * n as f64).floor() as usize
    }
}

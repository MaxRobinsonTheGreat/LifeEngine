//! Phase scheduling across helper threads.
//!
//! Helper threads are Web Workers that instantiate this same module on the
//! same shared memory and call `eng_helper_main(tid)`, which blocks here
//! waiting for work. The thread that calls `eng_tick` (the coordinator) runs
//! each phase itself and waits for the helpers with atomic wait/notify.
//! In the single-threaded build everything simply runs on the caller.

use core::sync::atomic::{AtomicI32, AtomicU32, Ordering};

pub const SUPPORTED: bool = cfg!(target_feature = "atomics");

/// threads used per phase, including the coordinator
static THREADS: AtomicU32 = AtomicU32::new(1);
/// helpers that have entered helper_main
static REGISTERED: AtomicI32 = AtomicI32::new(0);
#[cfg(target_feature = "atomics")]
static GENERATION: AtomicI32 = AtomicI32::new(0);
#[cfg(target_feature = "atomics")]
static DONE: AtomicI32 = AtomicI32::new(0);
#[cfg(target_feature = "atomics")]
static mut PHASE_FN: fn(u32) = idle;

#[cfg(target_feature = "atomics")]
fn idle(_tid: u32) {}

pub fn set_threads(n: u32) {
    let max = REGISTERED.load(Ordering::Acquire) as u32 + 1;
    THREADS.store(n.clamp(1, max), Ordering::Release);
}

pub fn threads() -> u32 {
    THREADS.load(Ordering::Acquire)
}

/// Spin iterations (roughly a millisecond) before sleeping. Waking a sleeping
/// thread costs tens of microseconds per phase, which measurably slows ticks
/// that only take about a millisecond. Between ticks at low speeds and while
/// paused, helpers still go to sleep.
#[cfg(target_feature = "atomics")]
const SPIN: u32 = 600_000;

#[cfg(target_feature = "atomics")]
fn wait(cell: &AtomicI32, expected: i32) {
    for _ in 0..SPIN {
        if cell.load(Ordering::Acquire) != expected {
            return;
        }
        core::hint::spin_loop();
    }
    unsafe {
        core::arch::wasm32::memory_atomic_wait32(cell.as_ptr(), expected, -1);
    }
}

#[cfg(target_feature = "atomics")]
fn notify(cell: &AtomicI32, waiters: u32) {
    unsafe {
        core::arch::wasm32::memory_atomic_notify(cell.as_ptr(), waiters);
    }
}

/// Runs `f(tid)` on every participating thread and returns when all are done.
/// With `parallel` false (not enough work to be worth waking helpers) the
/// caller runs it alone.
pub fn run_phase(f: fn(u32), parallel: bool) {
    #[cfg(target_feature = "atomics")]
    {
        let helpers = REGISTERED.load(Ordering::Acquire);
        if parallel && threads() > 1 && helpers > 0 {
            unsafe { PHASE_FN = f; }
            DONE.store(0, Ordering::Release);
            GENERATION.fetch_add(1, Ordering::AcqRel);
            notify(&GENERATION, u32::MAX);
            f(0);
            loop {
                let d = DONE.load(Ordering::Acquire);
                if d >= helpers {
                    break;
                }
                wait(&DONE, d);
            }
            return;
        }
    }
    let _ = parallel;
    f(0);
}

/// Helper thread loop. Every helper acknowledges every phase; helpers with a
/// tid beyond the configured thread count just don't do any work.
pub fn helper_main(tid: u32) {
    #[cfg(target_feature = "atomics")]
    {
        let mut seen = GENERATION.load(Ordering::Acquire);
        REGISTERED.fetch_add(1, Ordering::AcqRel);
        loop {
            let g = GENERATION.load(Ordering::Acquire);
            if g == seen {
                wait(&GENERATION, seen);
                continue;
            }
            seen = g;
            if tid < threads() {
                let f = unsafe { PHASE_FN };
                f(tid);
            }
            DONE.fetch_add(1, Ordering::AcqRel);
            notify(&DONE, 1);
        }
    }
    #[cfg(not(target_feature = "atomics"))]
    {
        let _ = tid;
    }
}

pub fn registered_helpers() -> i32 {
    REGISTERED.load(Ordering::Acquire)
}

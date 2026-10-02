const WorldConfig = {
    headless: false,
    clear_walls_on_reset: false,
    auto_reset: true,
    auto_pause: false,
    brush_size: 2,
    // 'fast': tiled, multi-threaded when the page allows it (results vary run to run)
    // 'exact': single-threaded and reproducible (same results as the original engine)
    engine_mode: 'fast',
    threads: 0, // 0 = automatic (one per CPU core, leaving one for the page)
}

module.exports = WorldConfig;
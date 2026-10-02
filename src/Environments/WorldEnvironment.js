const WorldRenderer = require('../Rendering/WorldRenderer');
const EnvironmentController = require('../Controllers/EnvironmentController');
const CellStates = require('../Organism/Cell/CellStates');
const Hyperparams = require('../Hyperparameters.js');
const WorldConfig = require('../WorldConfig');
const FossilRecord = require('../Stats/FossilRecord');
const SimClient = require('../Sim/SimClient');

// Main-thread handle on the world. The simulation itself (the Rust/WebAssembly
// engine, driven by src/Sim/SimHost.js) runs in a
// Web Worker; this class forwards user actions to it, draws the snapshots it
// sends back, and keeps a copy of the latest statistics for the UI.
class WorldEnvironment {
    constructor(cell_size) {
        this.renderer = new WorldRenderer('env-canvas', 'env', cell_size);
        this.controller = new EnvironmentController(this, this.renderer.canvas);
        this.num_rows = Math.ceil(this.renderer.height / cell_size);
        this.num_cols = Math.ceil(this.renderer.width / cell_size);
        this.grid_map = new GridShape(this.num_cols, this.num_rows, cell_size);
        this.renderer.setGridSize(this.num_cols, this.num_rows);

        // latest statistics reported by the simulation
        this.stats = {ticks: 0, orgs: 0, species: 0, top: null, largest: 0, avg_mut: 0, resets: 0, tps: 0};
        this.reset_count = 0;
        this.total_ticks = 0;
        this.largest_cell_count = 0;
        FossilRecord.applyRecord(null);

        this.client = new SimClient();
        this.client.on('frame', (msg) => this.applyFrame(msg));
        this.client.on('extinct', () => {
            if (this.onExtinct) this.onExtinct();
        });
        this.client.on('fatal', (msg) => {
            alert('The simulation engine failed to start: ' + msg.error);
        });
        this.last_hyper = '';
        this.last_config = '';
        this.client.send({
            type: 'init', cols: this.num_cols, rows: this.num_rows, cell_size,
            hyper: JSON.parse(JSON.stringify(Hyperparams)), config: {...WorldConfig},
        });
        this.syncSettings();
        this.frame_pending = false;
        this.last_record_request = 0;
    }

    get organisms() {
        // StatsPanel/old callers only use the length
        return {length: this.stats.orgs};
    }

    averageMutability() {
        return this.stats.avg_mut;
    }

    // Push changed evolution controls / world config to the worker. Cheap enough
    // to call every frame, so UI handlers don't each need to remember to sync.
    syncSettings() {
        const hyper = JSON.stringify(Hyperparams);
        if (hyper !== this.last_hyper) {
            this.last_hyper = hyper;
            this.client.send({type: 'hyper', values: JSON.parse(hyper)});
        }
        const config = JSON.stringify(WorldConfig);
        if (config !== this.last_config) {
            this.last_config = config;
            this.client.send({type: 'config', values: JSON.parse(config)});
        }
    }

    // Called every display frame. Asks the worker for a snapshot unless one is
    // already on its way (this naturally limits requests to what we can draw).
    requestFrame(want_record) {
        this.syncSettings();
        if (this.frame_pending)
            return;
        this.frame_pending = true;
        const now = Date.now();
        const record = want_record && now - this.last_record_request > 1000;
        if (record) this.last_record_request = now;
        this.client.send({
            type: 'frame',
            grid: !WorldConfig.headless,
            mouse: WorldConfig.headless ? null : this.controller.hoverCell(),
            record,
        });
    }

    applyFrame(msg) {
        this.frame_pending = false;
        this.stats = msg.stats;
        this.reset_count = msg.stats.resets;
        this.total_ticks = msg.stats.ticks;
        this.largest_cell_count = msg.stats.largest;
        if (msg.record)
            FossilRecord.applyRecord(msg.record);
        // a frame produced before a resize/load we already applied: skip drawing it
        if (msg.cols !== this.grid_map.cols || msg.rows !== this.grid_map.rows)
            return;
        if (msg.grid) {
            this.renderer.hover = msg.highlight;
            this.renderer.draw(msg.grid);
        }
    }

    setGridSize(cols, rows, cell_size) {
        cols = parseInt(cols);
        rows = parseInt(rows);
        if (cell_size != this.renderer.cell_size || cols != this.num_cols || rows != this.num_rows) {
            this.renderer.cell_size = cell_size;
            this.renderer.fillShape(rows*cell_size, cols*cell_size);
        }
        this.num_cols = cols;
        this.num_rows = rows;
        this.grid_map = new GridShape(cols, rows, cell_size);
        this.renderer.setGridSize(cols, rows);
        this.renderer.invalidate();
    }

    renderFull() {
        this.renderer.invalidate();
    }

    start(fps) {
        this.client.send({type: 'start', fps});
    }

    stop() {
        this.client.send({type: 'stop'});
    }

    reset(confirm_reset=true, reset_life=true) {
        if (confirm_reset && !confirm('The current environment will be lost. Proceed?'))
            return false;
        this.client.send({type: 'reset', life: reset_life});
        this.renderer.clearAllHighlights();
        return true;
    }

    resizeGridColRow(cell_size, cols, rows) {
        cell_size = parseInt(cell_size);
        this.client.send({type: 'resize', cols: parseInt(cols), rows: parseInt(rows), cell_size});
        this.renderer.cell_size = cell_size;
        this.renderer.fillShape(rows*cell_size, cols*cell_size);
        this.setGridSize(cols, rows, cell_size);
    }

    resizeFillWindow(cell_size) {
        cell_size = parseInt(cell_size);
        this.renderer.cell_size = cell_size;
        this.renderer.fillWindow('env');
        const cols = Math.ceil(this.renderer.width / cell_size);
        const rows = Math.ceil(this.renderer.height / cell_size);
        this.client.send({type: 'resize', cols, rows, cell_size});
        this.setGridSize(cols, rows, cell_size);
    }

    clearWalls() {
        this.client.send({type: 'clearWalls'});
    }

    // replace all walls with walls at [c0, r0, c1, r1, ...]
    setWalls(cells) {
        this.client.send({type: 'walls', cells});
    }

    brush(c, r, state, kill_blocking=false, ignore_state=null) {
        this.client.send({type: 'brush', c, r, size: parseInt(WorldConfig.brush_size), state: state.id,
                          kill: kill_blocking, ignore: ignore_state ? ignore_state.id : -1});
    }

    killNear(c, r) {
        this.client.send({type: 'kill', c, r, size: parseInt(WorldConfig.brush_size)});
    }

    // place copies of serialized organisms: [{raw, c, r}, ...]
    dropOrganisms(list) {
        this.client.send({type: 'drop', orgs: list});
    }

    // serialized organism nearest to (c, r) within the brush, or null
    async selectNear(c, r) {
        const reply = await this.client.request({type: 'select', c, r, size: parseInt(WorldConfig.brush_size)});
        return reply.org;
    }

    renameSpecies(species, new_name) {
        const old = species.name;
        species.name = new_name;
        this.client.send({type: 'rename', old, name: new_name});
    }

    // world save as a JSON string (same format as before)
    async serialize() {
        const reply = await this.client.request({type: 'save'});
        return reply.json;
    }

    async loadRaw(env) {
        if ($('#override-controls').is(':checked')) {
            Hyperparams.loadJsonObj(env.controls);
            // worlds saved before healer/camo existed keep their original rules
            if (env.controls && env.controls.extendedCellTypes === undefined)
                Hyperparams.extendedCellTypes = false;
        }
        this.syncSettings();
        const reply = await this.client.request({type: 'load', world: env});
        this.setGridSize(reply.cols, reply.rows, reply.cell_size);
        this.renderer.clearAllHighlights();
    }
}

// The grid geometry the controllers need (cell lookups happen in the worker).
class GridShape {
    constructor(cols, rows, cell_size) {
        this.cols = cols;
        this.rows = rows;
        this.cell_size = cell_size;
    }

    getCenter() {
        return [Math.floor(this.cols/2), Math.floor(this.rows/2)];
    }

    isValidLoc(col, row) {
        return col < this.cols && row < this.rows && col >= 0 && row >= 0;
    }

    xyToColRow(x, y) {
        let c = Math.floor(x/this.cell_size);
        let r = Math.floor(y/this.cell_size);
        c = Math.max(0, Math.min(this.cols - 1, c));
        r = Math.max(0, Math.min(this.rows - 1, r));
        return [c, r];
    }
}

module.exports = WorldEnvironment;

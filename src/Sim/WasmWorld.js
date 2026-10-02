// JS side of the Rust/WebAssembly simulation core (engine/). Owns the module
// instance, mirrors evolution controls into it, turns its events into Species /
// FossilRecord bookkeeping, and converts organisms to and from the save format.
// Exposes the same interface SimHost used with the old JS core.

const CellStates = require('../Organism/Cell/CellStates');
const Hyperparams = require('../Hyperparameters');
const WorldConfig = require('../WorldConfig');
const FossilRecord = require('../Stats/FossilRecord');
const Species = require('../Stats/Species');
const SerializeHelper = require('../Utils/SerializeHelper');

const NUM_STATES = CellStates.all.length;
const EV_NEW_SPECIES = 1, EV_ADD_POP = 2, EV_DEC_POP = 3, EV_RESET = 4, EV_EXTINCT_PAUSE = 5;
const EVENT_SIZE = 5 + NUM_STATES;
const EYE = CellStates.eye.id;
const DEFAULT_BRAIN = (() => {
    const b = new Array(NUM_STATES).fill(0);
    b[CellStates.food.id] = 2;
    b[CellStates.killer.id] = 1;
    return b;
})();
const SPAWN_FIELDS = 14; // c, r, lifetime, food, living, direction, rotation, can_rotate,
                         // move_count, move_range, ignore_brain_for, mutability, damage, species

const speciesName = (f) => f.toString(36).substr(2, 10);

// counts by state id -> {name: count} for the living types (Species.cell_counts)
function countsToAnatomy(counts) {
    return {
        countByName() {
            const out = {};
            for (const s of CellStates.living) out[s.name] = 0;
            for (let id = 0; id < NUM_STATES; id++)
                if (counts[id]) out[CellStates.all[id].name] = counts[id];
            return out;
        },
    };
}

class WasmWorld {
    // module: compiled WebAssembly.Module; memory: WebAssembly.Memory it imports
    constructor(instance, memory, cols, rows, cell_size=5) {
        this.ex = instance.exports;
        this.memory = memory;
        this.cell_size = cell_size;
        this.data_update_rate = 100;
        this.onExtinct = null;
        this.species_by_id = new Map();
        this.override = null; // stats reported to FossilRecord while replaying events
        const states = this.ex.eng_init(cols, rows);
        if (states !== NUM_STATES)
            throw new Error(`engine has ${states} cell states, JS has ${NUM_STATES}`);
        this.ex.eng_seed((Math.random() * 4294967296) >>> 0);
        this.ex.eng_seed_threads((Math.random() * 4294967296) >>> 0);
        this.syncParams();
        FossilRecord.setEnv(this);
    }

    static async create(module, memory, cols, rows, cell_size) {
        const instance = await WebAssembly.instantiate(module, {env: {memory}});
        return new WasmWorld(instance, memory, cols, rows, cell_size);
    }

    // Text of the engine's last panic, if any (after a WebAssembly "unreachable" trap).
    panicMessage() {
        const len = this.ex.eng_panic_message_len();
        if (!len) return '';
        const bytes = new Uint8Array(this.memory.buffer, this.ex.eng_panic_message_ptr(), len).slice();
        return new TextDecoder().decode(bytes);
    }

    // ---------------- memory helpers ----------------

    f64(ptr, n) { return new Float64Array(this.memory.buffer, ptr, n); }
    i32(ptr, n) { return new Int32Array(this.memory.buffer, ptr, n); }
    scratchF64(n) { return this.f64(this.ex.eng_scratch(n * 8), n); }
    scratchI32(n) { return this.i32(this.ex.eng_scratch(n * 4), n); }

    get cols() { return this.ex.eng_cols(); }
    get rows() { return this.ex.eng_rows(); }
    get num_cols() { return this.cols; }
    get num_rows() { return this.rows; }

    // FossilRecord reads these
    get total_ticks() { return this.override ? this.override.ticks : this.ex.eng_total_ticks(); }
    get organisms() { return {length: this.override ? this.override.orgs : this.ex.eng_org_count()}; }
    averageMutability() { return this.override ? this.override.avg_mut : this.ex.eng_average_mutability(); }
    get reset_count() { return this.ex.eng_reset_count(); }
    get largest_cell_count() { return this.ex.eng_largest(); }
    get total_mutability() { return this.ex.eng_total_mutability(); }

    syncParams() {
        const h = Hyperparams, w = WorldConfig;
        const v = this.scratchF64(22);
        const vals = [h.lifespanMultiplier, h.foodProdProb, h.useGlobalMutability ? 1 : 0, h.globalMutability,
            h.addProb, h.changeProb, h.removeProb, h.rotationEnabled ? 1 : 0, h.foodBlocksReproduction ? 1 : 0,
            h.moversCanProduce ? 1 : 0, h.instaKill ? 1 : 0, h.lookRange, h.seeThroughSelf ? 1 : 0,
            h.foodDropProb, h.extraMoverFoodCost, h.maxOrganisms, h.extendedCellTypes ? 1 : 0, h.healProb,
            h.leafProb, w.auto_reset ? 1 : 0, w.auto_pause ? 1 : 0, w.clear_walls_on_reset ? 1 : 0];
        for (let i = 0; i < vals.length; i++) v[i] = Number(vals[i]);
        this.ex.eng_set_params();
        [h.killableNeighbors, h.edibleNeighbors, h.growableNeighbors].forEach((list, kind) => {
            const a = this.scratchI32(list.length * 2);
            list.forEach((p, i) => { a[2*i] = p[0]; a[2*i+1] = p[1]; });
            this.ex.eng_set_neighbors(kind, list.length);
        });
    }

    setFast(fast) { this.ex.eng_set_fast(fast ? 1 : 0); }

    // ---------------- events -> species bookkeeping ----------------

    processEvents() {
        const ptr = this.ex.eng_events();
        const n = this.ex.eng_event_count();
        if (n === 0) return;
        const ev = this.f64(ptr, n * EVENT_SIZE).slice();
        for (let k = 0; k < n; k++) {
            const o = k * EVENT_SIZE;
            const kind = ev[o], a = ev[o+1], b = ev[o+2], tick = ev[o+3];
            if (kind === EV_RESET) {
                this.species_by_id.clear();
                this.override = {ticks: 0, orgs: 0, avg_mut: 0};
                FossilRecord.clear_record();
                this.override = null;
                continue;
            }
            if (kind === EV_EXTINCT_PAUSE) {
                if (this.onExtinct) this.onExtinct();
                continue;
            }
            this.override = {ticks: tick, orgs: this.ex.eng_org_count(), avg_mut: this.ex.eng_average_mutability()};
            if (kind === EV_NEW_SPECIES) {
                const counts = ev.subarray(o + 5, o + 5 + NUM_STATES);
                const ancestor = this.species_by_id.get(b) || null;
                const s = new Species(countsToAnatomy(counts), ancestor, tick);
                s.name = speciesName(ev[o+4]);
                s.engine_id = a;
                FossilRecord.extant_species[s.name] = s;
                this.species_by_id.set(a, s);
            }
            else if (kind === EV_ADD_POP) {
                const s = this.species_by_id.get(a);
                if (s) s.addPop();
            }
            else if (kind === EV_DEC_POP) {
                const s = this.species_by_id.get(a);
                if (s) {
                    s.decreasePop();
                    if (s.population <= 0) this.species_by_id.delete(a);
                }
            }
            this.override = null;
        }
    }

    // ---------------- simulation ----------------

    update() {
        this.ex.eng_tick();
        this.processEvents();
        if (this.ex.eng_total_ticks() % this.data_update_rate == 0)
            FossilRecord.updateData();
    }

    OriginOfLife() {
        this.ex.eng_origin_of_life();
        this.processEvents();
    }

    reset(life=true) {
        this.syncParams();
        this.ex.eng_reset(life ? 1 : 0);
        this.processEvents();
    }

    resize(cols, rows, cell_size=this.cell_size) {
        this.cell_size = cell_size;
        this.ex.eng_resize(parseInt(cols), parseInt(rows));
        this.species_by_id.clear();
    }

    getCenter() { return [Math.floor(this.cols/2), Math.floor(this.rows/2)]; }

    clearWalls() { this.ex.eng_clear_walls(); }

    placeWalls(cells) {
        const a = this.scratchI32(cells.length);
        a.set(cells);
        this.ex.eng_place_walls(cells.length / 2);
        this.processEvents();
    }

    dropCellType(c, r, size, state, kill=false, ignore=-1) {
        this.ex.eng_brush(c, r, size, state, kill ? 1 : 0, ignore);
        this.processEvents();
    }

    killNear(c, r, size) {
        this.ex.eng_kill_near(c, r, size);
        this.processEvents();
    }

    findNearOrganism(c, r, size) {
        const t = this.ex.eng_find_near(c, r, size);
        return t === 0 ? null : t - 1;
    }

    highlightCells(c, r) {
        const ptr = this.ex.eng_highlight(c, r);
        const n = this.ex.eng_highlight_count();
        return n === 0 ? null : this.i32(ptr, n * 2).slice();
    }

    snapshot() {
        const ptr = this.ex.eng_snapshot();
        return new Uint8Array(this.memory.buffer, ptr, this.cols * this.rows).slice();
    }

    stats() {
        const top = FossilRecord.getMostPopulousSpecies();
        return {
            ticks: this.ex.eng_total_ticks(),
            orgs: this.ex.eng_org_count(),
            species: FossilRecord.numExtantSpecies(),
            top: top ? {name: top.name, population: top.population} : null,
            largest: this.ex.eng_largest(),
            avg_mut: this.ex.eng_average_mutability(),
            resets: this.ex.eng_reset_count(),
        };
    }

    // ---------------- organisms ----------------

    // cells in the save format -> genome pointer in the engine
    genomeFromRaw(raw_cells) {
        const cells = [];
        for (const rc of raw_cells) {
            const state = CellStates[rc.state.name];
            if (!state || state.id === undefined) continue; // unknown (e.g. a modded cell type)
            cells.push([state.id, rc.loc_col, rc.loc_row, state.id === EYE ? (rc.direction || 0) : 0]);
        }
        if (cells.length === 0) return 0;
        const a = this.scratchI32(cells.length * 4);
        cells.forEach((q, i) => a.set(q, i * 4));
        return this.ex.eng_genome_new(cells.length);
    }

    // fields: object with the SPAWN_FIELDS values; brain: array by state id
    spawn(genome, fields, brain, check_clear) {
        const v = this.scratchF64(SPAWN_FIELDS + NUM_STATES);
        const f = fields;
        const vals = [f.c, f.r, f.lifetime, f.food_collected, f.living ? 1 : 0, f.direction, f.rotation,
            f.can_rotate ? 1 : 0, f.move_count, f.move_range, f.ignore_brain_for, f.mutability, f.damage, f.species];
        for (let i = 0; i < SPAWN_FIELDS; i++) v[i] = Number(vals[i]) || 0;
        for (let i = 0; i < NUM_STATES; i++) v[SPAWN_FIELDS + i] = brain[i] || 0;
        return this.ex.eng_spawn(genome, check_clear ? 1 : 0);
    }

    brainFromRaw(raw_brain) {
        const b = DEFAULT_BRAIN.slice();
        if (raw_brain && raw_brain.decisions) {
            for (const name in raw_brain.decisions) {
                const s = CellStates[name];
                if (s && s.id !== undefined) b[s.id] = raw_brain.decisions[name];
            }
        }
        return b;
    }

    speciesId(species) {
        if (species.engine_id === undefined) {
            species.engine_id = this.ex.eng_new_species_id();
        }
        this.species_by_id.set(species.engine_id, species);
        return species.engine_id;
    }

    // Drop a copy of a serialized organism, like EnvironmentController.dropOrganism.
    dropOrganism(raw, col, row) {
        const genome = this.genomeFromRaw(raw.anatomy.cells);
        if (!genome) return false;
        const flags = raw.anatomy;
        const has_brain = raw.brain && raw.anatomy.cells.some(c => c.state.name === 'mover') &&
                          raw.anatomy.cells.some(c => c.state.name === 'eye');
        const fields = {c: col, r: row, lifetime: 0, food_collected: 0, living: true, direction: 2, rotation: 0,
            can_rotate: Hyperparams.rotationEnabled, move_count: 0, move_range: raw.move_range, ignore_brain_for: 0,
            mutability: raw.mutability, damage: 0, species: 0};
        const slot = this.spawn(genome, fields, has_brain ? this.brainFromRaw(raw.brain) : DEFAULT_BRAIN, true);
        if (slot < 0) return false;
        const name = raw.species_name;
        let species = name !== undefined ? FossilRecord.extant_species[name] : undefined;
        if (!species) {
            this.ex.eng_org_counts(slot);
            species = new Species(countsToAnatomy(Array.from(this.scratchF64(NUM_STATES))), null, this.ex.eng_total_ticks());
            if (name !== undefined && name !== null) species.name = name;
            species.population = 0;
            species.cumulative_pop = 0;
            FossilRecord.addSpeciesObj(species);
        }
        this.ex.eng_set_org_species(slot, this.speciesId(species));
        species.addPop();
        void flags;
        return true;
    }

    serializeSlot(slot) {
        const n = this.ex.eng_org_read(slot);
        const v = this.scratchF64(SPAWN_FIELDS + NUM_STATES + 8 + n * 4).slice();
        const b = SPAWN_FIELDS + NUM_STATES;
        const cells = [];
        for (let i = 0; i < n; i++) {
            const o = b + 8 + i * 4;
            const cell = {loc_col: v[o+1], loc_row: v[o+2]};
            if (v[o] === EYE) cell.direction = v[o+3];
            cell.state = {name: CellStates.all[v[o]].name};
            cells.push(cell);
        }
        const out = {
            c: v[0], r: v[1], lifetime: v[2], food_collected: v[3], living: v[4] === 1, direction: v[5],
            rotation: v[6], can_rotate: v[7] === 1, move_count: v[8], move_range: v[9], ignore_brain_for: v[10],
            mutability: v[11], damage: v[12],
            anatomy: {
                birth_distance: v[b], is_producer: v[b+1] === 1, is_mover: v[b+2] === 1, has_eyes: v[b+3] === 1,
                has_camo: v[b+4] === 1, has_booster: v[b+5] === 1, has_poison: v[b+6] === 1, cells,
            },
        };
        if (out.anatomy.is_mover && out.anatomy.has_eyes) {
            const decisions = {};
            for (const s of CellStates.all) decisions[s.name] = v[SPAWN_FIELDS + s.id];
            out.brain = {decisions};
        }
        const species = this.species_by_id.get(v[13]);
        out.species_name = species ? species.name : undefined;
        return out;
    }

    serialize() {
        this.ex.eng_remove_dead();
        this.processEvents();
        const env = {
            num_rows: this.rows, num_cols: this.cols, total_mutability: this.ex.eng_total_mutability(),
            largest_cell_count: this.ex.eng_largest(), reset_count: this.ex.eng_reset_count(),
            total_ticks: this.ex.eng_total_ticks(), data_update_rate: this.data_update_rate,
        };
        const cols = this.cols, rows = this.rows;
        const state = new Uint8Array(this.memory.buffer, this.ex.eng_state_ptr(), cols * rows).slice();
        const grid = {cell_size: this.cell_size, cols, rows, food: [], walls: []};
        const FOOD = CellStates.food.id, WALL = CellStates.wall.id;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const s = state[c*rows + r];
                if (s === FOOD) grid.food.push({c, r});
                else if (s === WALL) grid.walls.push({c, r});
            }
        }
        env.grid = grid;
        env.organisms = [];
        const count = this.ex.eng_org_count();
        for (let i = 0; i < count; i++)
            env.organisms.push(this.serializeSlot(this.ex.eng_org_slot(i)));
        env.fossil_record = FossilRecord.serialize();
        env.controls = Hyperparams;
        return env;
    }

    // Load a world in the save format. Mirrors the original WorldEnvironment.loadRaw,
    // including where random numbers are drawn (for the equivalence tests).
    loadRaw(env) {
        this.species_by_id.clear();
        this.ex.eng_resize(env.grid.cols, env.grid.rows); // also discards organisms
        this.override = {ticks: this.ex.eng_total_ticks(), orgs: 0, avg_mut: 0};
        FossilRecord.clear_record();
        this.override = null;
        this.cell_size = env.grid.cell_size ? env.grid.cell_size : this.cell_size;
        const FOOD = CellStates.food.id, WALL = CellStates.wall.id;
        for (const f of env.grid.food) this.ex.eng_raw_set_state(f.c, f.r, FOOD);
        for (const w of env.grid.walls) this.ex.eng_raw_set_state(w.c, w.r, WALL);
        for (const w of env.grid.walls) this.ex.eng_track_wall(w.c, w.r);

        const species = {};
        for (const name in env.fossil_record.species) {
            const s = new Species(null, null, 0);
            s.name = speciesName(this.ex.eng_rand()); // same draw as the original constructor
            SerializeHelper.overwriteNonObjects(env.fossil_record.species[name], s);
            species[name] = s;
        }
        // counters first so species created below get the right start tick
        this.ex.eng_set_counters(env.total_ticks || 0, 0, 0, env.reset_count || 0);
        const placed = [];
        for (const raw of env.organisms) {
            const genome = this.genomeFromRaw(raw.anatomy.cells);
            if (!genome) continue;
            const fields = {c: raw.c, r: raw.r, lifetime: raw.lifetime, food_collected: raw.food_collected,
                living: raw.living !== false, direction: raw.direction, rotation: raw.rotation,
                can_rotate: raw.can_rotate !== undefined ? raw.can_rotate : Hyperparams.rotationEnabled,
                move_count: raw.move_count, move_range: raw.move_range !== undefined ? raw.move_range : 4,
                ignore_brain_for: raw.ignore_brain_for, mutability: raw.mutability !== undefined ? raw.mutability : 5,
                damage: raw.damage, species: 0};
            const slot = this.spawn(genome, fields, this.brainFromRaw(raw.brain), false);
            let s = species[raw.species_name];
            if (!s) {
                this.ex.eng_org_counts(slot);
                s = new Species(countsToAnatomy(Array.from(this.scratchF64(NUM_STATES))), null, env.total_ticks);
                s.name = speciesName(this.ex.eng_rand());
                species[raw.species_name] = s;
            }
            if (!s.cell_counts) {
                this.ex.eng_org_counts(slot);
                s.anatomy = countsToAnatomy(Array.from(this.scratchF64(NUM_STATES)));
                s.calcAnatomyDetails();
            }
            s.name = raw.species_name;
            placed.push([slot, s]);
        }
        for (const name in species) species[name].population = 0;
        for (const [, s] of placed) s.population++;
        for (const name in species) {
            if (species[name].population > 0)
                FossilRecord.addSpeciesObj(species[name]);
        }
        for (const [slot, s] of placed)
            this.ex.eng_set_org_species(slot, this.speciesId(s));
        FossilRecord.loadRaw(env.fossil_record);
        this.data_update_rate = env.data_update_rate || 100;
        this.ex.eng_set_counters(env.total_ticks || 0,
            env.total_mutability !== undefined ? env.total_mutability : this.ex.eng_total_mutability(),
            env.largest_cell_count !== undefined ? env.largest_cell_count : this.ex.eng_largest(),
            env.reset_count || 0);
    }

    // organism summaries for state hashing in tests
    orgSummaries() {
        const n = this.ex.eng_org_summaries();
        return this.scratchF64(n * 10).slice();
    }

    gridStates() {
        return new Uint8Array(this.memory.buffer, this.ex.eng_state_ptr(), this.cols * this.rows).slice();
    }
}

module.exports = WasmWorld;

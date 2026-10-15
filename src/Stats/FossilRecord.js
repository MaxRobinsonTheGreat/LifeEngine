const CellStates = require("../Organism/Cell/CellStates");
const SerializeHelper = require("../Utils/SerializeHelper");
const Species = require("./Species");

// the burrowing body cell. organisms with one can hide underground (Organism.hide), which damages the soil
const BURROW_CELL = CellStates.claw.name;

// ecological roles used for the "Role" grouping. plants have producers and don't move (as in the brief).
// animals use their predator / prey flag from the creature creator, falling back to killer cells if unflagged,
// and prey are split by whether they have a claw (burrowing) cell
const ROLES = ['Plants', 'Predators', 'Prey (burrowing)', 'Prey (non-burrowing)'];

const FossilRecord = {
    init: function(){
        this.extant_species = {};
        this.extinct_species = {};

        // if an organism has fewer than this cumulative pop, discard them on extinction
        this.min_discard = 10;

        this.record_size_limit = 500; // store this many data points

        // an offspring founds a new species once it differs from its species' founder by this many cells
        this.species_threshold = 3;

        // species reaching this population are "notable": their establishment and extinction are logged as key moments
        this.notable_pop = 20;

        // cap on each long-format log so very long runs don't run out of memory. when a log reaches this,
        // it is handed to on_log_full (which downloads it) and cleared, or logging pauses if nothing handles it
        this.log_limit = 100000;
    },

    setEnv: function(env) {
        this.env = env;
        this.setData();
    },

    isNewSpecies: function(org, parent_species) {
        if (!parent_species) return true;
        return parent_species.mutationDistance(org.anatomy) >= this.species_threshold;
    },

    addSpecies: function(org, ancestor) {
        // identical seeded organisms (e.g. the copies placed by OriginOfLife) are one species, not one each
        if (!ancestor) {
            let twin = Object.values(this.extant_species).find(s => !s.ancestor_name && s.isSameFounder(org));
            if (twin) {
                org.species = twin;
                twin.addPop();
                return twin;
            }
        }
        var new_species = new Species(org.anatomy, ancestor, this.env.total_ticks);
        this.extant_species[new_species.name] = new_species;
        org.species = new_species;
        return new_species;
    },

    addSpeciesObj: function(species) {
        if (this.extant_species[species.name]) {
            console.warn('Tried to add already existing species. Add failed.');
            return;
        }
        this.extant_species[species.name] = species;
        return species;
    },

    changeSpeciesName: function(species, new_name) {
        if (this.extant_species[new_name]) {
            console.warn('Tried to change species name to an existing species name. Change failed.');
            return;
        }
        let old_name = species.name;
        delete this.extant_species[old_name];
        species.name = new_name;
        this.extant_species[new_name] = species;
        // descendants store their root's name as their lineage, so renaming a root renames its lineage
        if (!species.lineage) {
            for (let s of Object.values(this.extant_species).concat(Object.values(this.extinct_species)))
                if (s.lineage === old_name) s.lineage = new_name;
        }
    },

    classifyRole(org) {
        let anatomy = org.anatomy;
        if (anatomy.is_producer && !anatomy.is_mover)
            return 'Plants';
        if (org.is_predator)
            return 'Predators';
        if (!org.is_prey && anatomy.cells.some(cell => cell.state === CellStates.killer))
            return 'Predators';
        return anatomy.has_claw ? 'Prey (burrowing)' : 'Prey (non-burrowing)';
    },

    // births are counted for the group the child joins (its own species and role), so births - deaths
    // matches the change in that group's population
    recordBirth(org) {
        org.species.recordBirth();
        this.role_intervals[this.classifyRole(org)].births++;
    },

    // per-capita rates over one sample interval. the population is averaged over the start and end of the interval,
    // where the start is worked back from the births and deaths (so organisms added by the user don't count as growth)
    perCapitaRates(pop_end, births, deaths) {
        let pop_avg = (pop_end + (pop_end - births + deaths)) / 2;
        if (pop_avg <= 0)
            return {birth_rate: null, death_rate: null, growth: null};
        return {birth_rate: births / pop_avg, death_rate: deaths / pop_avg, growth: (births - deaths) / pop_avg};
    },

    recordDeath(org) {
        let offspring = org.offspring || 0;
        org.species.recordDeath(org.lifetime, offspring);
        let role = this.role_intervals[this.classifyRole(org)];
        role.deaths++;
        role.lifetime += org.lifetime;
        role.offspring += offspring;
    },

    // called every time an organism hides underground
    recordBurrow(org) {
        org.species.recordBurrow();
        this.role_intervals[this.classifyRole(org)].burrows++;
        this.interval_burrows++;
        if (!this.first_burrow_seen) {
            this.first_burrow_seen = true;
            this.addEvent('burrow_first', 'First organism burrowed (species "' + org.species.name + '")', org.species.name);
        }
    },

    numExtantSpecies() {return Object.values(this.extant_species).length},
    numExtinctSpecies() {return Object.values(this.extinct_species).length},
    speciesIsExtant(species_name) {return !!this.extant_species[species_name]},

    fossilize: function(species) {
        if (!this.extant_species[species.name]) {
            console.warn('Tried to fossilize non existing species.');
            return false;
        }
        species.end_tick = this.env.total_ticks;
        species.ancestor = undefined; // garbage collect ancestors
        delete this.extant_species[species.name];
        // keep it until the next sample so its final deaths count towards fitness and lifespan at death
        this.recently_extinct.push(species);
        if (species.peak_pop >= this.notable_pop) {
            this.addEvent('species_extinct', 'Species "' + species.name + '" went extinct (peak pop ' + species.peak_pop + ', lasted ' + species.lifespan() + ' ticks)', species.name);
        }
        if (species.cumulative_pop >= this.min_discard) {
            this.extinct_species[species.name] = this.summarizeSpecies(species);
            return true;
        }
        return false;
    },

    resurrect: function(species) {
        if (species.extinct) {
            species.extinct = false;
            this.extant_species[species.name] = species;
            delete this.extinct_species[species.name];
        }
    },

    summarizeSpecies(species) {
        let summary = SerializeHelper.copyNonObjects(species);
        summary.lifespan_at_death = species.lifespanAtDeath();
        summary.fitness = species.fitness();
        summary.age = species.age(this.env.total_ticks);
        summary.lineage = species.getLineage();
        summary.cell_counts = Object.assign({}, species.cell_counts);
        return summary;
    },

    addEvent(type, label, species_name='') {
        this.events.push({tick: this.env.total_ticks, type: type, label: label, species: species_name});
    },

    setData() {
        // all parallel arrays
        this.tick_record = [];
        this.pop_counts = [];
        this.species_counts = [];
        this.av_mut_rates = [];
        this.av_cells = [];
        this.av_cell_counts = [];
        // both are taken over the organisms that died during the sample interval
        this.fitness_all = []; // avg offspring produced by every organism that died
        this.fitness_species = []; // unweighted mean over species of that same value
        this.lifespan_at_death_all = []; // avg ticks lived by every organism that died
        this.lifespan_at_death_species = []; // unweighted mean over species of that same value
        // per-capita rates for the whole population over the sample interval (see perCapitaRates)
        this.growth_rates = [];
        this.birth_rates = [];
        this.death_rates = [];
        this.av_species_age = [];
        this.burrower_counts = []; // organisms with at least one claw (burrowing) cell
        this.burrower_fracs = [];
        this.evolved_claw_counts = []; // organisms with claw cells in lineages that started without them
        this.hidden_counts = []; // organisms underground at the moment of sampling
        this.burrow_counts = []; // times organisms hid during the sample interval
        this.soil_means = [];
        this.soil_degraded_fracs = [];
        // per sample: {lineage: {name: {pop, fitness, lifespan, growth, birth_rate, death_rate, burrows}}, role: {...}}
        this.group_samples = [];

        // uncapped records for exporting
        this.full_log = [];
        this.species_log = [];
        this.groups_log = [];
        this.log_part = 1;
        this.log_paused = false;
        this.role_intervals = {};
        this.role_pops = {};
        for (let role of ROLES)
            this.role_intervals[role] = {births: 0, deaths: 0, lifetime: 0, offspring: 0, burrows: 0};
        this.interval_burrows = 0;
        this.first_burrow_seen = false;
        this.events = [];
        this.recently_extinct = [];
        this.last_interval_species = [];
        this.initial_soil = null;
        this.burrowing_seen = false;
        this.claw_evolved_seen = false;
        this.updateData();
    },

    updateData() {
        var tick = this.env.total_ticks;
        this.tick_record.push(tick);
        this.pop_counts.push(this.env.organisms.length);
        this.species_counts.push(this.numExtantSpecies());
        this.av_mut_rates.push(this.env.averageMutability());
        this.calcCellCountAverages();
        this.calcFitness(tick);
        this.calcGroups(tick);
        this.calcSoil();
        this.checkKeyMoments();
        this.logRow(tick);
        while (this.tick_record.length > this.record_size_limit) {
            this.tick_record.shift();
            this.pop_counts.shift();
            this.species_counts.shift();
            this.av_mut_rates.shift();
            this.av_cells.shift();
            this.av_cell_counts.shift();
            this.fitness_all.shift();
            this.fitness_species.shift();
            this.lifespan_at_death_all.shift();
            this.lifespan_at_death_species.shift();
            this.growth_rates.shift();
            this.birth_rates.shift();
            this.death_rates.shift();
            this.av_species_age.shift();
            this.burrower_counts.shift();
            this.burrower_fracs.shift();
            this.evolved_claw_counts.shift();
            this.hidden_counts.shift();
            this.burrow_counts.shift();
            this.soil_means.shift();
            this.soil_degraded_fracs.shift();
            this.group_samples.shift();
        }
        this.checkLogLimits();
    },

    // lineage numbers are summed from the species, role numbers from the organisms (population), births (growth) and deaths
    calcGroups(tick) {
        let lineages = {};
        let all_species = Object.values(this.extant_species).concat(this.last_interval_species);
        for (let s of new Set(all_species)) {
            let name = s.getLineage();
            if (!lineages[name]) lineages[name] = {pop: 0, births: 0, deaths: 0, lifetime: 0, offspring: 0, burrows: 0};
            lineages[name].pop += s.population;
            lineages[name].births += s.last_interval_births;
            lineages[name].deaths += s.last_interval_deaths;
            lineages[name].lifetime += s.last_interval_lifetime;
            lineages[name].offspring += s.last_interval_offspring;
            lineages[name].burrows += s.last_interval_burrows;
        }
        let roles = {};
        for (let role of ROLES) {
            let interval = this.role_intervals[role];
            roles[role] = {pop: this.role_pops[role] || 0, births: interval.births, deaths: interval.deaths, lifetime: interval.lifetime,
                offspring: interval.offspring, burrows: interval.burrows};
            interval.births = 0;
            interval.deaths = 0;
            interval.lifetime = 0;
            interval.offspring = 0;
            interval.burrows = 0;
        }
        let sample = {};
        for (let [grouping, groups] of [['lineage', lineages], ['role', roles]]) {
            sample[grouping] = {};
            for (let name in groups) {
                let g = groups[name];
                let fitness = g.deaths > 0 ? g.offspring / g.deaths : null;
                let lifespan = g.deaths > 0 ? g.lifetime / g.deaths : null;
                let rates = this.perCapitaRates(g.pop, g.births, g.deaths);
                sample[grouping][name] = {pop: g.pop, fitness: fitness, lifespan: lifespan, growth: rates.growth,
                    birth_rate: rates.birth_rate, death_rate: rates.death_rate, burrows: g.burrows};
                let blank = (v) => v === null ? '' : v;
                if (!this.log_paused)
                    this.groups_log.push([tick, grouping, name, g.pop, g.deaths, blank(fitness), blank(lifespan), g.burrows,
                        g.births, blank(rates.birth_rate), blank(rates.death_rate), blank(rates.growth)]);
            }
        }
        this.group_samples.push(sample);
    },

    checkLogLimits() {
        if (this.log_paused) return;
        if (this.species_log.length < this.log_limit && this.groups_log.length < this.log_limit) return;
        if (this.on_log_full && this.on_log_full(this.log_part)) {
            this.species_log = [];
            this.groups_log = [];
            this.log_part++;
        }
        else {
            this.log_paused = true;
            this.addEvent('log_full', 'Per-species log is full and has stopped. Export it, or turn on auto-save to keep logging');
        }
    },

    // counted from the living organisms (not species founders) so drift within a species is captured
    calcCellCountAverages() {
        var total_org = this.env.organisms.length;
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        if (cell_counts[BURROW_CELL] === undefined)
            cell_counts[BURROW_CELL] = 0;
        var burrowers = 0;
        var evolved_claw = 0;
        this.evolved_claw_species = null;
        var hidden = 0;
        this.role_pops = {};
        for (let org of this.env.organisms) {
            let role = this.classifyRole(org);
            this.role_pops[role] = (this.role_pops[role] || 0) + 1;
            let has_burrow = false;
            for (let cell of org.anatomy.cells) {
                cell_counts[cell.state.name] = (cell_counts[cell.state.name] || 0) + 1;
                if (cell.state.name === BURROW_CELL)
                    has_burrow = true;
            }
            if (has_burrow) {
                burrowers++;
                if (!org.species.seeded_claw) {
                    evolved_claw++;
                    if (!this.evolved_claw_species) this.evolved_claw_species = org.species.name;
                }
            }
            if (org.isHidden && org.isHidden()) hidden++;
        }
        this.burrower_counts.push(burrowers);
        this.evolved_claw_counts.push(evolved_claw);
        this.hidden_counts.push(hidden);
        this.burrow_counts.push(this.interval_burrows);
        this.interval_burrows = 0;
        this.burrower_fracs.push(total_org > 0 ? burrowers / total_org : 0);
        if (total_org == 0) {
            this.av_cells.push(0);
            this.av_cell_counts.push(cell_counts);
            return;
        }

        var total_cells = 0;
        for (let c in cell_counts) {
            total_cells += cell_counts[c];
            cell_counts[c] /= total_org;
        }
        this.av_cells.push(total_cells / total_org);
        this.av_cell_counts.push(cell_counts);
    },

    // fitness (offspring) and lifespan at death, both averaged over the organisms that died during the interval,
    // plus births and the per-capita growth rate
    calcFitness(tick) {
        let births = 0;
        let deaths = 0;
        let lifetime = 0;
        let offspring = 0;
        let pop = 0;
        let species_fitness_sum = 0;
        let species_lifespan_sum = 0;
        let species_with_deaths = 0;
        let age_sum = 0;
        let living_species = Object.values(this.extant_species);
        // a set, in case a recently extinct species was resurrected by the user
        for (let s of new Set(living_species.concat(this.recently_extinct))) {
            let interval_fitness = null;
            let interval_lifespan = null;
            if (s.interval_deaths > 0) {
                interval_fitness = s.interval_offspring / s.interval_deaths;
                interval_lifespan = s.interval_lifetime / s.interval_deaths;
                deaths += s.interval_deaths;
                lifetime += s.interval_lifetime;
                offspring += s.interval_offspring;
                species_fitness_sum += interval_fitness;
                species_lifespan_sum += interval_lifespan;
                species_with_deaths++;
            }
            let interval_births = s.interval_births || 0;
            births += interval_births;
            pop += s.population;
            if (!s.extinct)
                age_sum += s.age(tick);
            if (!this.log_paused && (s.population > 0 || s.interval_deaths > 0)) {
                let growth = this.perCapitaRates(s.population, interval_births, s.interval_deaths).growth;
                this.species_log.push([tick, s.name, s.ancestor_name, s.getLineage(), s.population, s.interval_deaths,
                    interval_fitness === null ? '' : interval_fitness, interval_lifespan === null ? '' : interval_lifespan,
                    s.age(tick), s.hasCellType(BURROW_CELL) ? 1 : 0, s.interval_burrows,
                    interval_births, growth === null ? '' : growth]);
            }
            s.last_interval_births = interval_births;
            s.interval_births = 0;
            s.last_interval_burrows = s.interval_burrows;
            s.interval_burrows = 0;
            s.last_interval_deaths = s.interval_deaths;
            s.last_interval_lifetime = s.interval_lifetime;
            s.last_interval_offspring = s.interval_offspring;
            s.interval_deaths = 0;
            s.interval_lifetime = 0;
            s.interval_offspring = 0;
        }
        this.last_interval_species = this.recently_extinct; // so calcGroups still sees species that died out this interval
        this.recently_extinct = [];
        this.fitness_all.push(deaths > 0 ? offspring / deaths : null);
        this.fitness_species.push(species_with_deaths > 0 ? species_fitness_sum / species_with_deaths : null);
        this.lifespan_at_death_all.push(deaths > 0 ? lifetime / deaths : null);
        this.lifespan_at_death_species.push(species_with_deaths > 0 ? species_lifespan_sum / species_with_deaths : null);
        let rates = this.perCapitaRates(pop, births, deaths);
        this.growth_rates.push(rates.growth);
        this.birth_rates.push(rates.birth_rate);
        this.death_rates.push(rates.death_rate);
        this.av_species_age.push(living_species.length > 0 ? age_sum / living_species.length : 0);
    },

    // soil health is read from grid cells' `fertility` value if the soil mechanic is present
    calcSoil() {
        let grid = this.env.grid_map ? this.env.grid_map.grid : [];
        let total = 0;
        let count = 0;
        for (let col of grid) {
            for (let cell of col) {
                if (typeof cell.fertility === 'number') {
                    total += cell.fertility;
                    count++;
                }
            }
        }
        if (count === 0) {
            this.soil_means.push(null);
            this.soil_degraded_fracs.push(null);
            return;
        }
        let mean = total / count;
        if (this.initial_soil === null)
            this.initial_soil = mean;
        // a tile counts as degraded once it has lost half of the starting average fertility
        let degraded = 0;
        for (let col of grid) {
            for (let cell of col) {
                if (typeof cell.fertility === 'number' && cell.fertility < this.initial_soil * 0.5)
                    degraded++;
            }
        }
        this.soil_means.push(mean);
        this.soil_degraded_fracs.push(degraded / count);
    },

    checkKeyMoments() {
        let last = this.tick_record.length - 1;
        let burrowers = this.burrower_counts[last];
        // claws placed in the starting population (or dropped from the editor) aren't a key moment,
        // only claws gained by mutation in a lineage that started without them
        if (this.evolved_claw_counts[last] > 0 && !this.claw_evolved_seen) {
            this.claw_evolved_seen = true;
            this.addEvent('claw_evolved', 'Claw (burrowing) cells evolved (species "' + this.evolved_claw_species + '")', this.evolved_claw_species);
        }
        if (burrowers > 0)
            this.burrowing_seen = true;
        else if (this.burrowing_seen) {
            this.burrowing_seen = false;
            this.addEvent('burrow_end', 'No organisms with claw cells left');
        }

        let soil = this.soil_means[last];
        if (soil !== null && this.initial_soil > 0) {
            for (let loss of [25, 50, 75]) {
                let type = 'soil_' + loss;
                if (soil <= this.initial_soil * (1 - loss / 100) && !this.events.some(e => e.type === type))
                    this.addEvent(type, 'Average soil fertility down ' + loss + '% from start');
            }
        }

        for (let s of Object.values(this.extant_species)) {
            if (!s.notable && s.peak_pop >= this.notable_pop) {
                s.notable = true;
                this.addEvent('species_established', 'Species "' + s.name + '" reached ' + this.notable_pop + ' organisms', s.name);
            }
        }
    },

    // called by the environment just before it pauses or resets after everything dies,
    // so the end of the run is sampled and can be exported before the record is cleared
    onTotalExtinction() {
        this.addEvent('total_extinction', 'All organisms extinct');
        this.updateData();
        if (this.on_extinction)
            this.on_extinction();
    },

    logRow(tick) {
        let last = this.tick_record.length - 1;
        let row = {
            tick: tick,
            population: this.pop_counts[last],
            species: this.species_counts[last],
            avg_mutation_rate: this.av_mut_rates[last],
            avg_cells: this.av_cells[last],
            fitness_all: this.fitness_all[last],
            fitness_species: this.fitness_species[last],
            lifespan_at_death_all: this.lifespan_at_death_all[last],
            lifespan_at_death_species: this.lifespan_at_death_species[last],
            growth_rate: this.growth_rates[last],
            birth_rate: this.birth_rates[last],
            death_rate: this.death_rates[last],
            avg_species_age: this.av_species_age[last],
            burrowers: this.burrower_counts[last],
            burrower_frac: this.burrower_fracs[last],
            evolved_claw: this.evolved_claw_counts[last],
            hidden: this.hidden_counts[last],
            burrows: this.burrow_counts[last],
            soil_mean: this.soil_means[last],
            soil_degraded_frac: this.soil_degraded_fracs[last],
        };
        for (let name in this.av_cell_counts[last])
            row['avg_' + name] = this.av_cell_counts[last][name];
        this.full_log.push(row);
    },

    getMostPopulousSpecies(){
        var max_pop = 0;
        var max_species = undefined;
        for (let s of Object.values(this.extant_species)) {
            if (s.population > max_pop) {
                max_pop = s.population;
                max_species = s;
            }
        }
        return max_species;
    },

    clear_record() {
        this.extant_species = {};
        this.extinct_species = {};
        this.setData();
    },

    toCSV(header, rows) {
        let escape = (v) => {
            if (v === null || v === undefined) return '';
            let str = String(v);
            return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
        };
        return [header.join(',')].concat(rows.map(r => r.map(escape).join(','))).join('\n');
    },

    timeSeriesCSV() {
        if (this.full_log.length === 0) return '';
        let header = Object.keys(this.full_log[this.full_log.length - 1]);
        return this.toCSV(header, this.full_log.map(row => header.map(h => row[h])));
    },

    speciesLogCSV() {
        return this.toCSV(['tick', 'species', 'ancestor', 'lineage', 'population', 'deaths', 'fitness', 'lifespan_at_death', 'age', 'has_claw', 'burrows', 'births', 'growth_rate'], this.species_log);
    },

    groupsLogCSV() {
        return this.toCSV(['tick', 'grouping', 'group', 'population', 'deaths', 'fitness', 'lifespan_at_death', 'burrows',
            'births', 'birth_rate', 'death_rate', 'growth_rate'], this.groups_log);
    },

    speciesSummaryCSV() {
        let summaries = Object.values(this.extant_species).map(s => this.summarizeSpecies(s))
            .concat(Object.values(this.extinct_species));
        let cell_names = CellStates.living.map(c => c.name);
        if (!cell_names.includes(BURROW_CELL)) cell_names.push(BURROW_CELL);
        let header = ['species', 'ancestor', 'lineage', 'extinct', 'start_tick', 'end_tick', 'age', 'peak_pop', 'peak_tick',
            'cumulative_pop', 'deaths', 'offspring', 'fitness', 'lifespan_at_death', 'burrows'].concat(cell_names);
        let rows = summaries.map(s => [s.name, s.ancestor_name, s.lineage, s.extinct, s.start_tick, s.end_tick, s.age, s.peak_pop,
            s.peak_tick, s.cumulative_pop, s.total_deaths, s.total_offspring, s.fitness, s.lifespan_at_death, s.total_burrows || 0]
            .concat(cell_names.map(c => (s.cell_counts && s.cell_counts[c]) || 0)));
        return this.toCSV(header, rows);
    },

    eventsCSV() {
        return this.toCSV(['tick', 'type', 'species', 'label'], this.events.map(e => [e.tick, e.type, e.species, e.label]));
    },

    serialize() {
        this.updateData();
        let record = SerializeHelper.copyNonObjects(this);
        record.records = {
            tick_record:this.tick_record,
            pop_counts:this.pop_counts,
            species_counts:this.species_counts,
            av_mut_rates:this.av_mut_rates,
            av_cells:this.av_cells,
            av_cell_counts:this.av_cell_counts,
            fitness_all:this.fitness_all,
            fitness_species:this.fitness_species,
            lifespan_at_death_all:this.lifespan_at_death_all,
            lifespan_at_death_species:this.lifespan_at_death_species,
            growth_rates:this.growth_rates,
            birth_rates:this.birth_rates,
            death_rates:this.death_rates,
            av_species_age:this.av_species_age,
            burrower_counts:this.burrower_counts,
            burrower_fracs:this.burrower_fracs,
            evolved_claw_counts:this.evolved_claw_counts,
            hidden_counts:this.hidden_counts,
            burrow_counts:this.burrow_counts,
            soil_means:this.soil_means,
            soil_degraded_fracs:this.soil_degraded_fracs,
            full_log:this.full_log,
            species_log:this.species_log,
            groups_log:this.groups_log,
            group_samples:this.group_samples,
            events:this.events,
            extinct_species:this.extinct_species,
            initial_soil:this.initial_soil,
        };
        let species = {};
        for (let s of Object.values(this.extant_species)) {
            species[s.name] = SerializeHelper.copyNonObjects(s);
            delete species[s.name].name; // the name will be used as the key, so remove it from the value
        }
        record.species = species;
        return record;
    },

    loadRaw(record) {
        SerializeHelper.overwriteNonObjects(record, this);
        for (let key in record.records) {
            this[key] = record.records[key];
        }
        // in saves made before offspring were counted, "fitness" held the lifespan at death
        if (record.records && !record.records.lifespan_at_death_all) {
            this.lifespan_at_death_all = this.fitness_all;
            this.lifespan_at_death_species = this.fitness_species;
            this.fitness_all = null;
            this.fitness_species = null;
            for (let sample of this.group_samples || []) {
                for (let grouping in sample || {}) {
                    for (let g of Object.values(sample[grouping])) {
                        g.lifespan = g.fitness;
                        g.fitness = null;
                    }
                }
            }
        }
        // saves made before these metrics existed won't have every array, so pad them to stay parallel
        let n = this.tick_record.length;
        for (let key of ['fitness_all', 'fitness_species', 'lifespan_at_death_all', 'lifespan_at_death_species', 'growth_rates', 'birth_rates', 'death_rates', 'av_species_age', 'burrower_counts', 'burrower_fracs', 'evolved_claw_counts', 'hidden_counts', 'burrow_counts', 'soil_means', 'soil_degraded_fracs', 'group_samples']) {
            if (!Array.isArray(this[key]) || this[key].length !== n)
                this[key] = new Array(n).fill(null);
        }
        this.recently_extinct = [];
        this.last_interval_species = [];
    }

}

FossilRecord.init();

FossilRecord.ROLES = ROLES;

module.exports = FossilRecord;

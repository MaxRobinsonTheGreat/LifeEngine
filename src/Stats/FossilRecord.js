const CellStates = require("../Organism/Cell/CellStates");
const SerializeHelper = require("../Utils/SerializeHelper");
const Species = require("./Species");

const FossilRecord = {
    init: function(){
        this.extant_species = [];
        this.extinct_species = [];

        // if an organism has fewer than this cumulative pop, discard them on extinction
        this.min_discard = 10;

        this.record_size_limit = 500; // store this many data points
    },

    setEnv: function(env) {
        this.env = env;
        this.setData();
    },

    addSpecies: function(org, ancestor) {
        var new_species = new Species(org.anatomy, ancestor, this.env.total_ticks);
        this.extant_species.push(new_species);
        org.species = new_species;
        return new_species;
    },

    addSpeciesObj: function(species) {
        this.extant_species.push(species);
        return species;
    },

    fossilize: function(species) {
        species.end_tick = this.env.total_ticks;
        for (i in this.extant_species) {
            var s = this.extant_species[i];
            if (s == species) {
                this.extant_species.splice(i, 1);
                species.ancestor = undefined; // garbage collect dead species
                // if (species.ancestor)
                //     species.ancestor.ancestor = undefined;
                if (species.cumulative_pop < this.min_pop) {
                    return false;
                }
                // disabled for now, causes memory problems on long runs
                // this.extinct_species.push(s);
                return true;
            }
        }
    },

    resurrect: function(species) {
        if (species.extinct) {
            for (i in this.extinct_species) {
                var s = this.extinct_species[i];
                if (s == species) {
                    this.extinct_species.splice(i, 1);
                    this.extant_species.push(species);
                    species.extinct = false;
                }
            }
        }
    },

    setData() {
        // all parallel arrays
        this.tick_record = [];
        this.pop_counts = [];
        this.species_counts = [];
        this.av_mut_rates = [];
        this.av_cells = [];
        this.av_cell_counts = [];
        this.updateData();
    },

    updateData() {
        var tick = this.env.total_ticks;
        this.tick_record.push(tick);
        this.pop_counts.push(this.env.organisms.length);
        this.species_counts.push(this.extant_species.length);
        this.av_mut_rates.push(this.env.averageMutability());
        this.calcCellCountAverages();
        while (this.tick_record.length > this.record_size_limit) {
            this.tick_record.shift();
            this.pop_counts.shift();
            this.species_counts.shift();
            this.av_mut_rates.shift();
            this.av_cells.shift();
            this.av_cell_counts.shift();
        }
    },

    calcCellCountAverages() {
        var total_org = 0;
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        var first=true;
        for (let s of this.extant_species) {
            if (s.cumulative_pop < this.min_discard && !first){
                continue;
            }
            for (let name in s.cell_counts) {
                cell_counts[name] += s.cell_counts[name] * s.population;
            }
            total_org += s.population;
            first=false;
        }
        if (total_org == 0)
            return cell_counts;

        var total_cells = 0;
        for (let c in cell_counts) {
            total_cells += cell_counts[c];
            cell_counts[c] /= total_org;
        }
        this.av_cells.push(total_cells / total_org);
        this.av_cell_counts.push(cell_counts);
    },

    clear_record() {
        this.extant_species = [];
        this.extinct_species = [];
        this.setData();
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
        };
        let species = {};
        for (let s of this.extant_species) {
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
    }

}

FossilRecord.init();

module.exports = FossilRecord;
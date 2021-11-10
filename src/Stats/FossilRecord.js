const CellStates = require("../Organism/Cell/CellStates");
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
        // console.log("Adding Species")
        var new_species = new Species(org.anatomy, ancestor, this.env.total_ticks);
        this.extant_species.push(new_species);
        org.species = new_species;
        return new_species;
    },

    addSpeciesObj: function(species) {
        // console.log("Adding Species")
        this.extant_species.push(species);
        return species;
    },

    fossilize: function(species) {
        // console.log("Extinction")
        species.end_tick = this.env.total_ticks;
        for (i in this.extant_species) {
            var s = this.extant_species[i];
            if (s == species) {
                this.extant_species.splice(i, 1);
                if (species.cumulative_pop < this.min_pop) {
                    return false;
                }
                this.extinct_species.push(s);
                // console.log("Extant species:", this.extant_species.length)
                // console.log("Extinct species:", this.extinct_species.length)
                return true;
            }
        }
    },

    resurrect: function(species) {
        // console.log("Resurrecting species")
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
        this.tick_record = [0];
        this.pop_counts = [0];
        this.species_counts = [0];
        this.av_mut_rates = [0];
        this.av_cells = [0];
        this.av_cell_counts = [this.calcCellCountAverages()];
    },

    updateData() {
        var tick = this.env.total_ticks;
        this.tick_record.push(tick);
        this.pop_counts.push(this.env.organisms.length);
        this.species_counts.push(this.extant_species.length);
        this.av_mut_rates.push(this.env.averageMutability());
        this.calcCellCountAverages();

        if (this.tick_record.length > this.record_size_limit) {
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

    clear_record: function() {
        this.extant_species = [];
        this.extinct_species = [];
        this.setData();
    },

}

FossilRecord.init();

module.exports = FossilRecord;
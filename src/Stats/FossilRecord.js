const Species = require("./Species");

const FossilRecord = {
    init: function(){
        this.extant_species = [];
        this.extinct_species = [];

        // if an organism has fewer than this cumulative pop, discard them on extinction
        this.min_discard = 5;
    },

    setEnv: function(env) {
        this.env = env;
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

    clear_record: function() {
        this.extant_species = [];
        this.extinct_species = [];
        // console.log("Cleared", this.extant_species, this.extinct_species)
    },

}

FossilRecord.init();

module.exports = FossilRecord;
const Species = require("./Species");

const FossilRecord = {
    init: function(){
        this.extant_species = [];
        this.extinct_species = [];

        // if an organism has fewer than this cumulative pop, discard them
        this.discard_pop = 5;
    },

    setEnv: function(env) {
        this.env = env;
    },

    addSpecies: function(org, ancestor) {
        // console.log("Adding Species")
        var new_species = new Species(org.anatomy, ancestor, this.env.total_ticks)
        this.extant_species.push(new_species);
        org.species = new_species;
        return new_species;
    },

    fossilize: function(species) {
        species.end_tick = this.env.total_ticks;
        for (i in this.extant_species) {
            var s = this.extant_species[i];
            if (s == species) {
                this.extant_species.splice(i, 1);
                if (species.cumulative_pop <= this.discard_pop) {
                    return false;
                }
                this.extinct_species.push(s);
                // console.log("Extant:", this.extant_species.length)
                // console.log("Extinct:", this.extinct_species.length)
                return true;
            }
        }
    },

    clear_record: function() {
        this.species = [];
    },

}

FossilRecord.init();

module.exports = FossilRecord;
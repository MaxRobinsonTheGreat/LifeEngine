const CellStates = require("../Organism/Cell/CellStates");
let FossilRecord = undefined; // workaround to a circular dependency problem
const getFossilRecord = () => {
    if (!FossilRecord)
        FossilRecord = require("./FossilRecord");
    return FossilRecord;
}

class Species {
    constructor(anatomy, ancestor, start_tick) {
        this.anatomy = anatomy;
        this.ancestor = ancestor; // eventually need to garbage collect ancestors to avoid memory problems
        this.ancestor_name = ancestor ? ancestor.name : '';
        // the seeded organism this species descends from. empty for a root species, which uses its own name
        this.lineage = ancestor ? ancestor.getLineage() : '';
        this.population = 1;
        this.cumulative_pop = 1;
        this.peak_pop = 1;
        this.peak_tick = start_tick;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.name = Math.random().toString(36).substr(2, 10);
        this.extinct = false;

        // recorded when organisms of this species die:
        // lifespan at death (ticks lived) and fitness (offspring produced over the organism's life)
        this.total_deaths = 0;
        this.total_lifetime = 0;
        this.total_offspring = 0;
        this.interval_deaths = 0; // reset by FossilRecord every time data is sampled
        this.interval_lifetime = 0;
        this.interval_offspring = 0;
        // births into this species (the founder of a new species counts as its first birth), for the growth rate
        this.interval_births = 0;

        // burrowing: how often members of this species hide underground
        this.total_burrows = 0;
        this.interval_burrows = 0;

        // predator / prey flags of the founder, so identical bodies with different roles stay separate species
        let founder = anatomy ? anatomy.owner : null;
        this.founder_role = founder ? (founder.is_predator ? 'predator' : founder.is_prey ? 'prey' : 'none') : '';

        this.calcAnatomyDetails();

        // whether this lineage started with claw (burrowing) cells, i.e. they were seeded rather than evolved.
        // inherited, so claws gained by mutation anywhere in a claw-less lineage count as evolved
        this.seeded_claw = ancestor ? !!ancestor.seeded_claw : this.hasCellType(CellStates.claw.name);
    }

    isSameFounder(org) {
        let role = org.is_predator ? 'predator' : org.is_prey ? 'prey' : 'none';
        return role === this.founder_role && this.mutationDistance(org.anatomy) === 0;
    }

    calcAnatomyDetails() {
        if (!this.anatomy) return;
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        // morphology of the founding organism, used to measure how far descendants have drifted
        this.signature = new Map();
        for (let cell of this.anatomy.cells) {
            cell_counts[cell.state.name] = (cell_counts[cell.state.name] || 0) + 1;
            this.signature.set(cell.loc_col + ',' + cell.loc_row, cell.state.name);
        }
        this.cell_counts=cell_counts;
    }

    // Number of cell positions that differ between the founder and the given anatomy.
    // A single add, remove or change mutation alters exactly one position, so this
    // approximates the number of morphological mutations separating the two.
    mutationDistance(anatomy) {
        if (!this.signature) return Infinity;
        let distance = 0;
        let matched = 0;
        for (let cell of anatomy.cells) {
            let state = this.signature.get(cell.loc_col + ',' + cell.loc_row);
            if (state === undefined)
                distance++; // added cell
            else {
                matched++;
                if (state !== cell.state.name)
                    distance++; // changed cell
            }
        }
        distance += this.signature.size - matched; // removed cells
        return distance;
    }

    getLineage() {
        return this.lineage || this.name;
    }

    hasCellType(name) {
        return !!this.cell_counts && this.cell_counts[name] > 0;
    }

    addPop() {
        this.population++;
        this.cumulative_pop++;
        if (this.population > this.peak_pop) {
            this.peak_pop = this.population;
            this.peak_tick = getFossilRecord().env.total_ticks;
        }
    }

    recordDeath(lifetime, offspring) {
        this.total_deaths++;
        this.total_lifetime += lifetime;
        this.total_offspring += offspring;
        this.interval_deaths++;
        this.interval_lifetime += lifetime;
        this.interval_offspring += offspring;
    }

    recordBirth() {
        this.interval_births++;
    }

    recordBurrow() {
        this.total_burrows++;
        this.interval_burrows++;
    }

    decreasePop() {
        this.population--;
        if (this.population <= 0) {
            this.extinct = true;
            getFossilRecord().fossilize(this);
        }
    }

    // average ticks lived by organisms of this species that have died (over its whole history)
    lifespanAtDeath() {
        return this.total_deaths > 0 ? this.total_lifetime / this.total_deaths : 0;
    }

    // average offspring produced by organisms of this species that have died (over its whole history)
    fitness() {
        return this.total_deaths > 0 ? this.total_offspring / this.total_deaths : 0;
    }

    lifespan() {
        return this.end_tick - this.start_tick;
    }

    age(cur_tick) {
        return this.extinct ? this.lifespan() : cur_tick - this.start_tick;
    }
}

module.exports = Species;

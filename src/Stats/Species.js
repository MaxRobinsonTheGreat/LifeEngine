const CellStates = require("../Organism/Cell/CellStates");

class Species {
    constructor(anatomy, ancestor, start_tick) {
        this.anatomy = anatomy;
        // this.ancestor = ancestor; // garbage collect ancestors to avoid memory problems
        this.population = 1;
        this.cumulative_pop = 1;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.name = '_' + Math.random().toString(36).substr(2, 9);
        this.extinct = false;
        this.calcAnatomyDetails();
    }

    calcAnatomyDetails() {
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        for (let cell of this.anatomy.cells) {
            cell_counts[cell.state.name]+=1;
        }
        this.cell_counts=cell_counts;
    }

    addPop() {
        this.population++;
        this.cumulative_pop++;
    }

    decreasePop() {
        this.population--;
        if (this.population <= 0) {
            this.extinct = true;
            const FossilRecord = require("./FossilRecord");
            FossilRecord.fossilize(this);
        }
    }

    lifespan() {
        return this.end_tick - this.start_tick;
    }
}

module.exports = Species;
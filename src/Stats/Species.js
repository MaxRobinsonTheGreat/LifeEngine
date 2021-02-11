const CellStates = require("../Organism/Cell/CellStates");

class Species {
    constructor(anatomy, ancestor, start_tick) {
        this.anatomy = anatomy;
        this.ancestor = ancestor;
        this.population = 1;
        this.cumulative_pop = 1;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.color = Math.floor(Math.random()*16777215).toString(16);
        if (ancestor != null) {
            // needs to be reworked, maybe removed
            var mutator = Math.floor(Math.random()*16777215)-8000000;
            this.color = (mutator + parseInt(ancestor.color, 16)).toString(16);
        }
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
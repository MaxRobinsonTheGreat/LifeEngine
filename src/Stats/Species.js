class Species {
    constructor(anatomy, ancestor, start_tick) {
        this.anatomy = anatomy;
        this.ancestor = ancestor;
        this.population = 1;
        this.cumulative_pop = 1;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.color = '#asdfasdf';
        this.name = '_' + Math.random().toString(36).substr(2, 9);;
        this.extinct = false;
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
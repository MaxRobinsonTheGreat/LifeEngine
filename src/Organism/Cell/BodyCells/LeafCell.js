const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

// Photosynthesis: each tick, a chance to feed its own organism directly. Unlike
// a producer, the food never appears on the grid, so it can't be stolen.
class LeafCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.leaf, org, loc_col, loc_row);
    }

    performFunction() {
        if (this.org.anatomy.is_mover && !Hyperparams.moversCanProduce)
            return;
        if (Math.random() * 100 < Hyperparams.leafProb)
            this.org.food_collected++;
    }
}

module.exports = LeafCell;

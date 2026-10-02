const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

// Each tick, has a chance to repair one point of damage on its organism.
class HealerCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.healer, org, loc_col, loc_row);
    }

    performFunction() {
        var org = this.org;
        if (org.damage > 0 && Math.random() * 100 < Hyperparams.healProb)
            org.damage--;
    }
}

module.exports = HealerCell;

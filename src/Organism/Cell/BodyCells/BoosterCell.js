const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

// Passive. A moving organism with a booster tries to move a second cell each tick.
class BoosterCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.booster, org, loc_col, loc_row);
        this.org.anatomy.has_booster = true;
    }
}

module.exports = BoosterCell;

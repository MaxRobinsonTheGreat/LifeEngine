const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

// Passive. A killer cell that damages a spike cell takes 1 damage itself.
class SpikeCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.spike, org, loc_col, loc_row);
    }
}

module.exports = SpikeCell;

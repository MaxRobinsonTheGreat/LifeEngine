const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

class ClawCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.claw, org, loc_col, loc_row);
        this.org.anatomy.has_claw = true;
    }
}

module.exports = ClawCell;
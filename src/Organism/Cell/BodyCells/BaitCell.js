const CellStates = require("../CellStates");
const KillerCell = require("./KillerCell");

class BaitCell extends KillerCell{
    constructor(org, loc_col, loc_row){
        super(org, loc_col, loc_row, CellStates.bait);
    }
}

module.exports = BaitCell;
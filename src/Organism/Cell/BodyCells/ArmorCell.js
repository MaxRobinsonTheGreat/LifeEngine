const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

class ArmorCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.armor, org, loc_col, loc_row);
    }
}

module.exports = ArmorCell;
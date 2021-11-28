const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

class FinCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.fin, org, loc_col, loc_row);
        this.org.anatomy.has_fins = true;
    }
}

module.exports = FinCell;
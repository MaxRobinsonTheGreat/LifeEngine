const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

class CamoCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.camo ,org, loc_col, loc_row);
    }
}

module.exports = CamoCell;
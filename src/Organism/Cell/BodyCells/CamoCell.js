const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

// Passive. An organism with at least one camo cell is invisible to other
// organisms' eyes: they see straight through its body.
class CamoCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.camo, org, loc_col, loc_row);
        this.org.anatomy.has_camo = true;
    }
}

module.exports = CamoCell;

const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

class CamoCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.camo ,org, loc_col, loc_row);
    }

    initInherit(parent) {
        // deep copy parent values
        super.initInherit(parent);
        this.mimic = parent.mimic;
    }
    
    initRandom() {
        // initialize values randomly
        this.mimic = CellStates.getRandomLivingType;
    }

    initDefault() {
        // initialize to default values
        this.mimic = CellStates.mouth; 
    }
}

module.exports = CamoCell;
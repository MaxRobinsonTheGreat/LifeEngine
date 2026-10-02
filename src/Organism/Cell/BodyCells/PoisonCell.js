const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

// Passive. An organism with poison leaves no food when it dies: its body just
// disappears, so predators gain nothing from killing it.
class PoisonCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.poison, org, loc_col, loc_row);
        this.org.anatomy.has_poison = true;
    }
}

module.exports = PoisonCell;

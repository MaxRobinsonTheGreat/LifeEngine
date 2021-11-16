const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class HealerCell extends BodyCell{
    constructor(org, loc_col, loc_row) {
        super(CellStates.healer, org, loc_col, loc_row);
    }

    //heals all living neighbor cells, can be itself or another organism
    performFunction() {
        var env = this.org.env;
        var c = this.getRealCol();
        var r = this.getRealRow();
        var neighbors = Hyperparams.healableNeighbors;
        var r = Math.random() * this.org.healRate;
        if (r < 1) {
            for(var loc in neighbors) {
                var cell = env.grid_map.cellAt(c+loc[0], r+loc[1]);
                this.healNeighbor(cell);
            }
        }
    }

    healNeighbor(cell) {
        if (cell == null || cell.owner == null || !cell.owner.living) {
            return;
        }
        cell.owner.heal();
    }
}

module.exports = HealerCell
const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class KillerCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.killer, org, loc_col, loc_row);
    }

    performFunction() {
        var env = this.org.env;
        var c = this.getRealCol();
        var r = this.getRealRow();
        var neighbors = Hyperparams.killableNeighbors;
        for (var i = 0; i < neighbors.length; i++) {
            if (!this.org.living)
                return; // died from a killer-on-killer hit; its body is already food
            var loc = neighbors[i];
            this.killNeighbor(env.grid_map.cellAt(c+loc[0], r+loc[1]));
        }
    }

    killNeighbor(n_cell) {
        if(n_cell == null || n_cell.owner == null || n_cell.owner == this.org || !n_cell.owner.living || n_cell.state == CellStates.armor) 
            return;
        var is_hit = n_cell.state == CellStates.killer; // has to be calculated before death
        var is_spike = n_cell.state == CellStates.spike;
        n_cell.owner.harm();
        if (Hyperparams.instaKill && is_hit) {
            this.org.harm();
        }
        if (is_spike) {
            this.org.harm(); // spikes hurt whoever attacks them
        }
    }
}

module.exports = KillerCell;

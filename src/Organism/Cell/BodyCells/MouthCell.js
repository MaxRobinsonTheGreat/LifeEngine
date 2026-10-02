const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class MouthCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.mouth, org, loc_col, loc_row);
    }

    performFunction() {
        var env = this.org.env;
        var grid_map = env.grid_map;
        var state_ids = grid_map.state_ids;
        var food_id = CellStates.food.id;
        var real_c = this.getRealCol();
        var real_r = this.getRealRow();
        var neighbors = Hyperparams.edibleNeighbors;
        for (var i = 0; i < neighbors.length; i++){
            var loc = neighbors[i];
            var idx = grid_map.indexOf(real_c+loc[0], real_r+loc[1]);
            if (idx !== -1 && state_ids[idx] === food_id)
                this.eatNeighbor(grid_map.flat[idx], env);
        }
    }

    eatNeighbor(n_cell, env) {
        if (n_cell == null)
            return;
        if (n_cell.state == CellStates.food){
            env.changeCell(n_cell.col, n_cell.row, CellStates.empty, null);
            this.org.food_collected++;
        }
    }
}

module.exports = MouthCell;
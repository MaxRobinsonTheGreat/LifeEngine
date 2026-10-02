const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class ProducerCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.producer, org, loc_col, loc_row);
        this.org.anatomy.is_producer = true;
    }

    performFunction() {
        if (this.org.anatomy.is_mover && !Hyperparams.moversCanProduce)
            return;
        // roll first: most ticks produce nothing, so skip the location math
        if (Math.random() * 100 > Hyperparams.foodProdProb)
            return;
        var growable = Hyperparams.growableNeighbors;
        var loc = growable[Math.floor(Math.random() * growable.length)];
        var c = this.getRealCol() + loc[0];
        var r = this.getRealRow() + loc[1];
        var env = this.org.env;
        var idx = env.grid_map.indexOf(c, r);
        if (idx !== -1 && env.grid_map.state_ids[idx] === CellStates.empty.id)
            env.changeCell(c, r, CellStates.food, null);
    }
}

module.exports = ProducerCell;

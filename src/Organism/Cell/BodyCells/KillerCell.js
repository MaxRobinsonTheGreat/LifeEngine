const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class KillerCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.killer, org, loc_col, loc_row);
    }

    performFunction() {
        var env = this.org.env;
        if (this.org.is_predator) {
            for (const loc of Hyperparams.killableNeighbors) {
                for (const distance of [1, 2]) {
                    const cell = env.grid_map.cellAt(
                        this.org.c + loc[0] * distance,
                        this.org.r + loc[1] * distance
                    );
                    this.killNeighbor(cell);
                }
            }
            return;
        }
        var c = this.getRealCol();
        var r = this.getRealRow();
        for (var loc of Hyperparams.killableNeighbors) {
            var cell = env.grid_map.cellAt(c+loc[0], r+loc[1]);
            this.killNeighbor(cell);
        }
    }

    killNeighbor(n_cell) {
        if(n_cell == null || n_cell.owner == null || n_cell.owner == this.org || !n_cell.owner.living || n_cell.owner.isHidden() || n_cell.state == CellStates.armor)
            return;
        if (this.org.is_predator) {
            if (!n_cell.owner.is_prey)
                return;
            const foodReward = n_cell.owner.anatomy.cells.length;
            n_cell.owner.die();
            this.org.food_collected += foodReward;
            return;
        }
        if (Hyperparams.dontKillSameSpecies && n_cell.owner.species.name === this.org.species.name)
            return;
        var is_hit = n_cell.state == CellStates.killer; // has to be calculated before death
        n_cell.owner.harm();
        if (Hyperparams.instaKill && is_hit) {
            this.org.harm();
        }
    }
}

module.exports = KillerCell;

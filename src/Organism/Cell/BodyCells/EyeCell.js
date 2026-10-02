const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");
const Directions = require("../../Directions");

class EyeCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.eye, org, loc_col, loc_row);
        this.org.anatomy.has_eyes = true;
    }

    initInherit(parent) {
        // deep copy parent values
        super.initInherit(parent);
        this.direction = parent.direction;
    }
    
    initRandom() {
        // initialize values randomly
        this.direction = Directions.getRandomDirection();
    }

    initDefault() {
        // initialize to default values
        this.direction = Directions.up;
    }

    getAbsoluteDirection() {
        var dir = this.org.rotation + this.direction;
        if (dir > 3)
            dir -= 4;
        return dir;
    }

    performFunction() {
        this.look();
    }

    // Scan forward up to lookRange cells and report the first non-empty cell to the brain.
    look() {
        var org = this.org;
        var grid_map = org.env.grid_map;
        var state_ids = grid_map.state_ids;
        var empty_id = CellStates.empty.id;
        var see_through_self = Hyperparams.seeThroughSelf;
        var direction = this.getAbsoluteDirection();
        var scalar = Directions.scalars[direction];
        var add_col = scalar[0];
        var add_row = scalar[1];
        var col = this.getRealCol();
        var row = this.getRealRow();
        var range = Hyperparams.lookRange;
        for (var i = 1; i <= range; i++){
            col += add_col;
            row += add_row;
            var idx = grid_map.indexOf(col, row);
            if (idx === -1)
                return;
            if (state_ids[idx] === empty_id)
                continue;
            var cell = grid_map.flat[idx];
            if (cell.owner === org && see_through_self)
                continue;
            if (cell.owner !== null && cell.owner !== org && cell.owner.anatomy.has_camo)
                continue; // camouflaged organisms are invisible
            org.brain.observe(cell, i, direction);
            return;
        }
    }
}

module.exports = EyeCell;
const Directions = require("../Directions");
const Hyperparams = require("../../Hyperparameters");
const CellStates = require("../Cell/CellStates");
const Observation = require("./Observation")

class Eye {
    constructor(direction=-1) {
        this.direction = direction;
        if (direction == -1){
            this.direction = Directions.getRandomDirection();
        }
    }

    getAbsoluteDirection(parent_dir) {
        var dir = parent_dir + this.direction;
        if (dir > 3)
            dir -= 4;
        return dir;
    }

    look(start_col, start_row, rotation, env) {
        var direction = this.getAbsoluteDirection(rotation);
        var addCol = 0;
        var addRow = 0;
        switch(direction) {
            case Directions.up:
                addRow = -1;
                break;
            case Directions.down:
                addRow = 1;
                break;
            case Directions.right:
                addCol = 1;
                break;
            case Directions.left:
                addCol = -1;
                break;
        }
        var col=start_col;
        var row=start_row;
        var cell = null;
        for (var i=0; i<Hyperparams.lookRange; i++){
            col+=addCol;
            row+=addRow;
            cell = env.grid_map.cellAt(col, row);
            if (cell == null) {
                break;
            }
            if (cell.state != CellStates.empty){
                var distance = Math.abs(start_col-col) + Math.abs(start_row-row);
                return new Observation(cell, distance, direction);
            }
        }
        return new Observation(cell, Hyperparams.lookRange, direction);
    }
}

module.exports = Eye;
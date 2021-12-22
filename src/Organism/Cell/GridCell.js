const CellStates = require("./CellStates");
const Hyperparams = require("../../Hyperparameters");

// A cell exists in a grid map.
class Cell{
    constructor(state, col, row, x, y){
        this.owner = null; // owner organism
        this.cell_owner = null; // specific body cell of the owner organism that occupies this grid cell
        this.setType(state);
        this.col = col;
        this.row = row;
        this.x = x;
        this.y = y;
    }

    setType(state) {
        this.state = state;
    }
}

module.exports = Cell;

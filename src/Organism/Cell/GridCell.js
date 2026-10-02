const CellStates = require("./CellStates");
const Hyperparams = require("../../Hyperparameters");

// A cell exists in a grid map.
class Cell{
    constructor(state, col, row, x, y, state_ids=null, idx=0){
        this.owner = null; // owner organism
        this.cell_owner = null; // specific body cell of the owner organism that occupies this grid cell
        this.render_pending = false; // true while queued in the renderer's dirty list
        this.state_ids = state_ids; // GridMap's typed-array mirror of every cell's state id
        this.idx = idx; // this cell's index in GridMap.flat / GridMap.state_ids
        this.state = null;
        this.setType(state);
        this.col = col;
        this.row = row;
        this.x = x;
        this.y = y;
    }

    setType(state) {
        this.state = state;
        if (this.state_ids !== null)
            this.state_ids[this.idx] = state.id;
    }
}

module.exports = Cell;

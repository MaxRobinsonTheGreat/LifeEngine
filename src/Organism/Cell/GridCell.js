const Hyperparams = require('../../Hyperparameters.js');

// A cell exists in a grid map.
class Cell{
    constructor(state, col, row, x, y, fertility = Hyperparams.maxFertility) {
        this.owner = null; // owner organism
        this.cell_owner = null; // specific body cell of the owner organism that occupies this grid cell
        this.setType(state);
        this.col = col;
        this.row = row;
        this.x = x;
        this.y = y;
        
        this.setFertility(fertility);
    }

    setType(state) {
        this.state = state;
    }

    setFertility(fertility) {
        this.fertility = fertility;
    }

    regenerateFertility() {
        if (this.owner !== null) return false;
        if (this.fertility >= Hyperparams.maxFertility) return false;
        if ((Math.random() * 100) < Hyperparams.fertilityRegenRate) {
            this.setFertility(Math.min(this.fertility + 1, Hyperparams.maxFertility));
            return true;
        }
        return false;
    }
}

module.exports = Cell;

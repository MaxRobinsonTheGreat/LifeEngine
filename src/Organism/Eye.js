const Directions = require("./Directions");

class Eye {
    constructor(loc_cell, direction=-1) {
        this.direction = direction;
        if (direction == -1){
            this.direction = Directions.getRandomDirection();
        }
        this.loc_cell = loc_cell
    }

    getAbsoluteDirection(parent_dir) {
        var dir = parent_dir + this.direction;
        if (dir > 3)
            dir -= 4;
        return dir;
    }
}

module.exports = Eye;
const CellTypes = require("./CellTypes");
const Directions = require("../Directions");
const Hyperparams = require("../../Hyperparameters");

// A local cell is a lightweight container for a cell in an organism. It does not directly exist in the grid 
class LocalCell{
    constructor(type, loc_col, loc_row){
        this.type = type;
        this.loc_col = loc_col;
        this.loc_row = loc_row;
    }

    rotatedCol(dir){
        switch(dir){
            case Directions.up:
                return this.loc_col;
            case Directions.down:
                return this.loc_col * -1;
            case Directions.left:
                return this.loc_row;
            case Directions.right:
                return this.loc_row * -1;
        }
    }

    rotatedRow(dir){
        switch(dir){
            case Directions.up:
                return this.loc_row;
            case Directions.down:
                return this.loc_row * -1;
            case Directions.left:
                return this.loc_col * -1;
            case Directions.right:
                return this.loc_col;
        }
    }
}

module.exports = LocalCell;

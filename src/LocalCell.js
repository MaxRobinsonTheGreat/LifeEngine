const CellTypes = require("./CellTypes");

// A local cell is a lightweight container for a cell in an organism. It does not directly exist in the grid 
class LocalCell{
    constructor(type, loc_col, loc_row){
        this.type = type;
        this.loc_col = loc_col;
        this.loc_row = loc_row;
    }
}

module.exports = LocalCell;

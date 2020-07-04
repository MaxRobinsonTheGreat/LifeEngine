const Cell = require('./Cell');
const CellTypes = require('./CellTypes');

class GridMap {
    constructor(cols, rows, cell_size, filltype=CellTypes.empty) {
        this.grid = [];
        this.cols = cols;
        this.rows = rows;
        this.cell_size = cell_size;
        for(var c=0; c<cols; c++) {
            var row = [];
            for(var r=0; r<rows; r++) {
                var cell = new Cell(filltype, c, r, c*cell_size, r*cell_size);

                row.push(cell);
            }            
            this.grid.push(row);
        }
    }

    fillGrid(type) {
        for (var col of grid) {
            for (var cell of col){
                cell.setType(type);
            }
        }
    }

    cellAt(col, row) {
        if (!this.isValidLoc(col, row)) {
            return null;
        }
        return this.grid[col][row];
    }

    setCellType(col, row, type) {
        if (!this.isValidLoc(col, row)) {
            return;
        }
        this.grid[col][row].setType(type);
    }

    setCellOwner(col, row, owner) {
        if (!this.isValidLoc(col, row)) {
            return;
        }
        this.grid[col][row].owner = owner;
    }

    isValidLoc(col, row){
        return col<this.cols && row<this.rows && col>=0 && row>=0;
    }

    getCenter(){
        return [Math.floor(this.cols/2), Math.floor(this.rows/2)]
    }

    xyToColRow(x, y) {
        var c = Math.floor(x/this.cell_size);
        var r = Math.floor(y/this.cell_size);
        if (c >= this.cols)
            c = this.cols-1;
        else if (c < 0)
            c = 0;
        if (r >= this.rows)
            r = this.rows-1;
        else if (r < 0)
            r = 0;
        return [c, r];
    }
}

module.exports = GridMap;

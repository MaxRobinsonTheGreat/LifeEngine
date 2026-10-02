const Cell = require('../Organism/Cell/GridCell');
const CellStates = require('../Organism/Cell/CellStates');

class GridMap {
    constructor(cols, rows, cell_size) {
        this.resize(cols, rows, cell_size);
    }

    resize(cols, rows, cell_size) {
        cols = parseInt(cols);
        rows = parseInt(rows);
        this.grid = [];
        // column-major flat view of the same cell objects: flat[col*rows + row]
        this.flat = new Array(cols * rows);
        // State id of every cell, kept in sync by GridCell.setType. Hot paths read
        // this instead of dereferencing cell objects (far fewer cache misses).
        this.state_ids = new Uint8Array(cols * rows);
        this.cols = cols;
        this.rows = rows;
        this.cell_size = cell_size;
        for(var c=0; c<cols; c++) {
            var row = [];
            for(var r=0; r<rows; r++) {
                var cell = new Cell(CellStates.empty, c, r, c*cell_size, r*cell_size, this.state_ids, c*rows + r);
                row.push(cell);
                this.flat[c*rows + r] = cell;
            }            
            this.grid.push(row);
        }
    }

    fillGrid(state, ignore_walls=false) {
        for (var col of this.grid) {
            for (var cell of col) {
                if (ignore_walls && cell.state===CellStates.wall) continue;
                cell.setType(state);
                cell.owner = null;
                cell.cell_owner = null;
            }
        }
    }

    cellAt(col, row) {
        // unsigned compare rejects negatives and out-of-range values in one test
        if ((col >>> 0) >= this.cols || (row >>> 0) >= this.rows) {
            return null;
        }
        return this.flat[col * this.rows + row];
    }

    setCellType(col, row, state) {
        if (!this.isValidLoc(col, row)) {
            return;
        }
        this.grid[col][row].setType(state);
    }

    setCellOwner(col, row, cell_owner) {
        if (!this.isValidLoc(col, row)) {
            return;
        }
        this.grid[col][row].cell_owner = cell_owner;
        if (cell_owner != null)
            this.grid[col][row].owner = cell_owner.org;
        else 
            this.grid[col][row].owner = null;
    }

    // flat index of (col, row), or -1 if out of bounds
    indexOf(col, row) {
        if ((col >>> 0) >= this.cols || (row >>> 0) >= this.rows)
            return -1;
        return col * this.rows + row;
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

    serialize() {
        // Rather than store every single cell, we will store non organism cells (food+walls)
        // and assume everything else is empty. Organism cells will be set when the organism
        // list is loaded. This reduces filesize and complexity.
        let grid = {cell_size:this.cell_size, cols:this.cols, rows:this.rows};
        grid.food = [];
        grid.walls = [];
        for (let col of this.grid) {
            for (let cell of col) {
                if (cell.state===CellStates.wall || cell.state===CellStates.food){
                    let c = {c: cell.col, r: cell.row}; // no need to store state
                    if (cell.state===CellStates.food)
                        grid.food.push(c)
                    else
                        grid.walls.push(c)
                }
            }
        }
        return grid;
    }

    loadRaw(grid) {
        for (let f of grid.food)
            this.setCellType(f.c, f.r, CellStates.food);
        for (let w of grid.walls)
            this.setCellType(w.c, w.r, CellStates.wall);
    }
}

module.exports = GridMap;

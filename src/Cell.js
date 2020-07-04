const CellTypes = require("./CellTypes");

// A cell exists in a grid system.
class Cell{
    constructor(type, col, row, x, y){
        this.owner = null;
        this.setType(type);
        this.col = col;
        this.row = row;
        this.x = x;
        this.y = y;
    }

    setType(type) {
        this.type = type;
    }

    performFunction(env) {
        switch(this.type){
            case CellTypes.mouth:
                eatFood(this, env);
                break;
            case CellTypes.producer:
                growFood(this, env);
                break;
            case CellTypes.killer:
                killNeighbors(this, env);
                break;
        }
    }

    getColor() {
        return CellTypes.colors[this.type];
    }

    isLiving() {
        return  this.type != CellTypes.empty && 
                this.type != CellTypes.food && 
                this.type != CellTypes.wall;
    }
}

function eatFood(self, env){
    eatNeighborFood(env.grid_map.cellAt(self.col+1, self.row), self, env);
    eatNeighborFood(env.grid_map.cellAt(self.col-1, self.row), self, env);
    eatNeighborFood(env.grid_map.cellAt(self.col, self.row+1), self, env);
    eatNeighborFood(env.grid_map.cellAt(self.col, self.row-1), self, env);
}

function eatNeighborFood(n_cell, self, env){
    if (n_cell == null)
        return;
    if (n_cell.type == CellTypes.food){
        env.changeCell(n_cell.col, n_cell.row, CellTypes.empty, null);
        self.owner.food_collected++;
    }
}

function growFood(self, env){
    if (self.owner.is_mover)
        return;
    for (var c=-1; c<=1; c++){
        for (var r=-1; r<=1; r++){
            if (r==0 && c==0)
                continue;
            var cell = env.grid_map.cellAt(self.col+c, self.row+r);
            if (cell != null && cell.type == CellTypes.empty && Math.random() * 100 <= 0.5){
                env.changeCell(self.col+c, self.row+r, CellTypes.food, null);
                return;
            }
        }
    }
}

function killNeighbors(self, env) {
    killNeighbor(env.grid_map.cellAt(self.col+1, self.row));
    killNeighbor(env.grid_map.cellAt(self.col-1, self.row));
    killNeighbor(env.grid_map.cellAt(self.col, self.row+1));
    killNeighbor(env.grid_map.cellAt(self.col, self.row-1));
}

function killNeighbor(n_cell) {
    if(n_cell == null) {
        return
    }
    if (n_cell.type != CellTypes.armor && n_cell.owner != null && n_cell.owner != self.owner && n_cell.owner.living){
        n_cell.owner.die();
        if (n_cell == CellTypes.killer){
            self.owner.die();
        }
    }
}

module.exports = Cell;

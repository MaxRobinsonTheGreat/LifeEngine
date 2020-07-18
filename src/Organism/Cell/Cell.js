const CellTypes = require("./CellTypes");
const Hyperparams = require("../../Hyperparameters");

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
    for (var loc of Hyperparams.edibleNeighbors){
        var cell = env.grid_map.cellAt(self.col+loc[0], self.row+loc[1]);
        eatNeighborFood(self, cell, env);
    }
}

function eatNeighborFood(self, n_cell, env){
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
    var prob = Hyperparams.foodProdProb;
    if (Math.random() * 100 <= prob){
        var loc = Hyperparams.growableNeighbors[Math.floor(Math.random() * Hyperparams.growableNeighbors.length)]
        var c=loc[0];
        var r=loc[1];
        var cell = env.grid_map.cellAt(self.col+c, self.row+r);
        if (cell != null && cell.type == CellTypes.empty){
            env.changeCell(self.col+c, self.row+r, CellTypes.food, null);
            return;
        }
    }
}

function killNeighbors(self, env) {
    for (var loc of Hyperparams.killableNeighbors){
        var cell = env.grid_map.cellAt(self.col+loc[0], self.row+loc[1]);
        killNeighbor(self, cell);
    }
}

function killNeighbor(self, n_cell) {
    if(n_cell == null || n_cell.owner == null || self.owner == null || n_cell.owner == self.owner || !n_cell.owner.living || n_cell.type == CellTypes.armor) 
        return;
    var is_hit = n_cell.type == CellTypes.killer; // has to be calculated before death
    n_cell.owner.harm();
    if (is_hit){
        self.owner.harm();
    }
}

module.exports = Cell;

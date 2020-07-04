const CellTypes = require("./CellTypes");
const Cell = require("./Cell");
const GridMap = require("./GridMap");
const LocalCell = require("./LocalCell");
const { producer } = require("./CellTypes");

class Organism {
    constructor(col, row, env, parent=null) {
        this.c = col;
        this.r = row;
        this.env = env;
        this.lifetime = 0;
        this.food_collected = 0;
        this.living = true;
        this.cells = [];
        this.is_producer = false;
        this.is_mover = false;
        if (parent != null) {
            this.inherit(parent);
        }
    }

    addCell(type, c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r)
                return false;
        }
        this.checkProducerMover(type);
        this.cells.push(new LocalCell(type, c, r));
        return true;
    }

    removeCell(c, r) {
        var check_change = false;
        for (var i=0; i<this.cells.length; i++) {
            var cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r){
                if (cell.type == this.producer || cell.type == this.mover) {
                    check_change = true;
                }
                this.cells.splice(i, 1);
                break;
            }
        }
        if (check_change) {
            this.is_producer = false;
            this.is_producer = false;
            for (var cell of this.cells) {
                this.checkProducerMover(cell.type);
            }
        }
    }

    checkProducerMover(type) {
        if (type == CellTypes.producer)
            this.is_producer = true;
        if (type == CellTypes.mover)
            this.is_mover = true;
    }

    inherit(parent) {
        for (var c of parent.cells){
            //deep copy parent cells
            this.addCell(c.type, c.loc_col, c.loc_row);
        }
    }

    // amount of food required before it can reproduce
    foodNeeded() {
        return this.cells.length;
    }

    lifespan() {
        return this.cells.length * 150;
    }

    reproduce() {
        //produce mutated child
        //check nearby locations (is there room and a direct path)
        var org = new Organism(0, 0, this.env, this);
        if (Math.random() * 100 <= 5) { 
            org.mutate();
        }

        var direction = this.getRandomDirection();
        var direction_c = direction[0];
        var direction_r = direction[1];
        var boost = Math.floor(Math.random() * 2) + 1;
        boost = 1;

        var new_c = this.c + (direction_c*this.cells.length*2) + (direction_c*boost);
        var new_r = this.r + (direction_r*this.cells.length*2) + (direction_r*boost);
        if (org.isClear(new_c, new_r)){// && org.isStraightPath(new_c, new_r, this.c, this.r, this)){
            org.c = new_c;
            org.r = new_r;
            this.env.addOrganism(org);
            org.updateGrid();
        }

        this.food_collected -= this.foodNeeded();
        

    }

    mutate() {
        var choice = Math.floor(Math.random() * 3);
        if (choice == 0) {
            var type = CellTypes.getRandomLivingType();
            var branch = this.cells[Math.floor(Math.random() * this.cells.length)];
            var c = branch.loc_col+Math.floor(Math.random() * 2) - 1;
            var r = branch.loc_row+Math.floor(Math.random() * 2) - 1;
            return this.addCell(type, c, r);
        }
        else if (choice == 1){
            // change cell
            var cell = this.cells[Math.floor(Math.random() * this.cells.length)];
            cell.type = CellTypes.getRandomLivingType();
            this.checkProducerMover(cell.type);
            return true;
        }
        else {
            // remove cell
            if(this.cells.length > 1) {
                this.cells.splice(Math.floor(Math.random() * this.cells.length), 1);
                return true;
            }
        }
        return false;
    }

    attemptMove(col, row) {
        var direction = this.getRandomDirection();
        var direction_c = direction[0];
        var direction_r = direction[1];
        var new_c = this.c + direction_c;
        var new_r = this.r + direction_r;
        if (this.isClear(new_c, new_r)) {
            for (var cell of this.cells) {
                var real_c = this.c + cell.loc_col;
                var real_r = this.r + cell.loc_row;
                this.env.changeCell(real_c, real_r, CellTypes.empty, null);
            }
            this.c = new_c;
            this.r = new_r;
            this.updateGrid();
        }
    }

    getRandomDirection(){
        var directions = [[0,1],[0,-1],[1,0],[-1,0]]
        return directions[Math.floor(Math.random() * directions.length)];
    }

    // assumes either c1==c2 or r1==r2, returns true if there is a clear path from point a to b
    isStraightPath(c1, r1, c2, r2, parent){
        // TODO FIX!!!
        if (c1 == c2) {
            if (r1 > r2){
                var temp = r2;
                r2 = r1;
                r1 = temp;
            }
            for (var i=r1; i!=r2; i++) {
                var cell = this.env.grid_map.cellAt(c1, i)
                if (!this.isPassableCell(cell, parent)){
                    return false;
                }
            }
            return true;
        }
        else {
            if (c1 > c2){
                var temp = c2;
                c2 = c1;
                c1 = temp;
            }
            for (var i=c1; i!=c2; i++) {
                var cell = this.env.grid_map.cellAt(i, r1);
                if (!this.isPassableCell(cell, parent)){
                    return false;
                }
            }
            return true;
        }
    }

    isPassableCell(cell, parent){
        return cell.type == CellTypes.empty || cell.owner == this || cell.owner == parent;
    }

    isClear(col, row) {
        for(var loccell of this.cells) {
            var cell = this.getRealCell(loccell, col, row);
            if(cell == null || cell.type != CellTypes.empty && cell.owner != this) {
                return false;
            }
        }
        return true;
    }

    die() {
        for (var cell of this.cells) {
            var real_c = this.c + cell.loc_col;
            var real_r = this.r + cell.loc_row;
            this.env.changeCell(real_c, real_r, CellTypes.food, null);
        }
        this.living = false;
    }

    updateGrid() {
        for (var cell of this.cells) {
            var real_c = this.c + cell.loc_col;
            var real_r = this.r + cell.loc_row;
            this.env.changeCell(real_c, real_r, cell.type, this);
        }
    }

    update() {
        // this.food_collected++;
        this.lifetime++;
        if (this.lifetime > this.lifespan()) {
            this.die();
            return this.living;
        }
        for (var cell of this.cells) {
            this.getRealCell(cell).performFunction(this.env);
        }
        if (!this.living){
            return this.living
        }
        if (this.is_mover) {
            this.attemptMove();
        }
        if (this.food_collected >= this.foodNeeded()) {
            this.reproduce();
        }

        return this.living;
    }

    getRealCell(local_cell, c=this.c, r=this.r){
        var real_c = c + local_cell.loc_col;
        var real_r = r + local_cell.loc_row;
        return this.env.grid_map.cellAt(real_c, real_r);
    }

}

module.exports = Organism;

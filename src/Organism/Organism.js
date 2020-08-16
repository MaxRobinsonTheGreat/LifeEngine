const CellTypes = require("./Cell/CellTypes");
const Cell = require("./Cell/Cell");
const GridMap = require("../Grid/GridMap");
const LocalCell = require("./Cell/LocalCell");
const Neighbors = require("../Grid/Neighbors");
const Hyperparams = require("../Hyperparameters");
const Directions = require("./Directions");
const Eye = require("./Perception/Eye");
const Brain = require("./Perception/Brain");

const directions = [[0,1],[0,-1],[1,0],[-1,0]]

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
        this.has_eyes = false;
        this.direction = Directions.down;
        this.rotation = Directions.up;
        this.can_rotate = Hyperparams.moversCanRotate;
        this.move_count = 0;
        this.move_range = 4;
        this.mutability = 5;
        this.damage = 0;
        this.birth_distance = 4;
        this.brain = new Brain(this);
        if (parent != null) {
            this.inherit(parent);
        }
    }

    addCell(type, c, r, eye=null) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return false;
            }
        }

        this.checkTypeChange(type);
        this.cells.push(new LocalCell(type, c, r, eye));
        return true;
    }

    removeCell(c, r) {
        if (c == 0 && r == 0)
            return false;
        var check_change = false;
        for (var i=0; i<this.cells.length; i++) {
            var cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r){
                if (cell.type == CellTypes.producer || cell.type == CellTypes.mover) {
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
                this.checkTypeChange(cell.type);
            }
        }
        return true;
    }

    getLocalCell(c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return cell;
            }
        }
        return null;
    }

    checkTypeChange(type) {
        if (type == CellTypes.producer)
            this.is_producer = true;
        if (type == CellTypes.mover)
            this.is_mover = true;
        if (type == CellTypes.eye)
            this.has_eyes = true;
    }

    inherit(parent) {
        this.move_range = parent.move_range;
        this.mutability = parent.mutability;
        this.birth_distance = parent.birth_distance;
        for (var c of parent.cells){
            //deep copy parent cells
            if (c.type == CellTypes.eye){
                this.addCell(c.type, c.loc_col, c.loc_row, c.eye);
            }
            else
                this.addCell(c.type, c.loc_col, c.loc_row);
        }
        if(parent.is_mover) {
            for (var i in parent.brain.decisions) {
                this.brain.decisions[i] = parent.brain.decisions[i];
            }
        }
    }

    // amount of food required before it can reproduce
    foodNeeded() {
        return this.cells.length;
    }

    lifespan() {
        // console.log(Hyperparams.lifespanMultiplier)
        return this.cells.length * Hyperparams.lifespanMultiplier;
    }

    maxHealth() {
        return this.cells.length;
    }

    reproduce() {
        //produce mutated child
        //check nearby locations (is there room and a direct path)
        var org = new Organism(0, 0, this.env, this);
        if(Hyperparams.offspringRotate){
            org.rotation = Directions.getRandomDirection();
        }
        var prob = this.mutability;
        if (Hyperparams.useGlobalMutability){
            prob = Hyperparams.globalMutability;
        }
        else {
            //mutate the mutability
            if (Math.random() <= 0.5)
                org.mutability++;
            else{ 
                org.mutability--;
                if (org.mutability < 1)
                    org.mutability = 1;
            }
        } 
        if (Math.random() * 100 <= prob) { 
            org.mutate();
        }
        

        var direction = Directions.getRandomScalar();
        var direction_c = direction[0];
        var direction_r = direction[1];
        var offset = (Math.floor(Math.random() * 3));
        var basemovement = this.birth_distance;
        var new_c = this.c + (direction_c*basemovement) + (direction_c*offset);
        var new_r = this.r + (direction_r*basemovement) + (direction_r*offset);

        if (org.isClear(new_c, new_r) && org.isStraightPath(new_c, new_r, this.c, this.r, this)){
            org.c = new_c;
            org.r = new_r;
            this.env.addOrganism(org);
            org.updateGrid();
        }
        this.food_collected -= this.foodNeeded();

    }

    mutate() {
        var choice = Math.floor(Math.random() * 100);
        var mutated = false;
        if (choice <= Hyperparams.addProb) {
            // add cell
            var type = CellTypes.getRandomLivingType();
            var num_to_add = Math.floor(Math.random() * 3) + 1;
            var branch = this.cells[Math.floor(Math.random() * this.cells.length)];
            var growth_direction = Neighbors.all[Math.floor(Math.random() * Neighbors.all.length)]
            var c = branch.loc_col+growth_direction[0];
            var r = branch.loc_row+growth_direction[1];
            mutated = this.addCell(type, c, r);
            this.birth_distance++;
        }
        else if (choice <= Hyperparams.addProb + Hyperparams.changeProb){
            // change cell
            var cell = this.cells[Math.floor(Math.random() * this.cells.length)];
            if (cell.type == CellTypes.eye) {
                delete cell.eye;
            }
            cell.type = CellTypes.getRandomLivingType();
            if (cell.type == CellTypes.eye) {
                cell.eye = new Eye();
            }
            this.checkTypeChange(cell.type);
            mutated = true;
        }
        else if (choice <= Hyperparams.addProb + Hyperparams.changeProb + Hyperparams.removeProb){
            // remove cell
            if(this.cells.length > 1) {
                var cell = this.cells[Math.floor(Math.random() * this.cells.length)];
                mutated = this.removeCell(cell.loc_col, cell.loc_row);
            }
        }

        if (this.is_mover && Math.random() * 100 <= 10) { 
            this.move_range += Math.floor(Math.random() * 4) - 2;
            if (this.move_range <= 0){
                this.move_range = 1;
            };
        }
        if (Math.random() * 100 <= 10) { 
            this.birth_distance += Math.floor(Math.random() * 5) - 2;
            if (this.birth_distance < 1)
                this.birth_distance = 1;
        }
        if (this.is_mover && this.has_eyes && Math.random() * 100 <= 10) { 
            this.brain.mutate();
        }
        return mutated;
    }

    attemptMove() {
        var direction = Directions.scalars[this.direction];
        var direction_c = direction[0];
        var direction_r = direction[1];
        var new_c = this.c + direction_c;
        var new_r = this.r + direction_r;
        if (this.isClear(new_c, new_r)) {
            for (var cell of this.cells) {
                var real_c = this.c + cell.rotatedCol(this.rotation);
                var real_r = this.r + cell.rotatedRow(this.rotation);
                this.env.changeCell(real_c, real_r, CellTypes.empty, null);
            }
            this.c = new_c;
            this.r = new_r;
            this.updateGrid();
            return true;
        }
        return false;
    }

    attemptRotate() {
        if(!this.can_rotate){
            this.direction = Directions.getRandomDirection();
            this.move_count = 0;
            return true;
        }
        var new_rotation = Directions.getRandomDirection();
        if(this.isClear(this.c, this.r, new_rotation)){
            for (var cell of this.cells) {
                var real_c = this.c + cell.rotatedCol(this.rotation);
                var real_r = this.r + cell.rotatedRow(this.rotation);
                this.env.changeCell(real_c, real_r, CellTypes.empty, null);
            }
            this.rotation = new_rotation;
            this.direction = Directions.getRandomDirection();
            this.updateGrid();
            this.move_count = 0;
            return true;
        }
        return false;
    }

    changeDirection(dir) {
        this.direction = dir;
        this.move_count = 0;
    }

    // assumes either c1==c2 or r1==r2, returns true if there is a clear path from point a to b
    isStraightPath(c1, r1, c2, r2, parent){
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
        return cell != null && (cell.type == CellTypes.empty || cell.owner == this || cell.owner == parent || cell.type == CellTypes.food);
    }

    isClear(col, row, rotation=this.rotation) {
        for(var loccell of this.cells) {
            var cell = this.getRealCell(loccell, col, row, rotation);
            if(cell==null) {
                return false;
            }
            if (cell.owner==this || cell.type==CellTypes.empty || (!Hyperparams.foodBlocksReproduction && cell.type==CellTypes.food)){
                continue;
            }
            return false;
        }
        return true;
    }

    harm() {
        this.damage++;
        if (this.damage >= this.maxHealth() || Hyperparams.instaKill) {
            this.die();
        }
    }

    die() {
        for (var cell of this.cells) {
            var real_c = this.c + cell.rotatedCol(this.rotation);
            var real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, CellTypes.food, null);
        }
        this.living = false;
    }

    updateGrid() {
        for (var cell of this.cells) {
            var real_c = this.c + cell.rotatedCol(this.rotation);
            var real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, cell.type, this);
            if (cell.type == CellTypes.eye) {
                this.getRealCell(cell).direction = cell.eye.getAbsoluteDirection(this.rotation);
            }
        }
    }

    update() {
        this.lifetime++;
        if (this.lifetime > this.lifespan()) {
            this.die();
            return this.living;
        }
        if (this.food_collected >= this.foodNeeded()) {
            this.reproduce();
        }
        for (var cell of this.cells) {
            if (cell.type == CellTypes.eye){
                var obs = cell.eye.look(this.getRealCol(cell), this.getRealRow(cell), this.rotation, this.env);
                this.brain.observe(obs);
            }
            else {
                this.getRealCell(cell).performFunction(this.env);
                if (!this.living){
                    return this.living
                }
            }
        }
        
        if (this.is_mover) {
            this.move_count++;
            var changed_dir = this.brain.decide();
            var moved = this.attemptMove();
            if ((this.move_count > this.move_range && !changed_dir) || !moved){
                this.attemptRotate();
            }
        }

        return this.living;
    }

    getRealCell(local_cell, c=this.c, r=this.r, rotation=this.rotation){
        var real_c = c + local_cell.rotatedCol(rotation);
        var real_r = r + local_cell.rotatedRow(rotation);
        return this.env.grid_map.cellAt(real_c, real_r);
    }

    getRealCol(local_cell) {
        return this.c + local_cell.rotatedCol(this.rotation);
    }
    getRealRow(local_cell) {
        return this.r + local_cell.rotatedRow(this.rotation);
    }

}

module.exports = Organism;

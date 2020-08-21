const CellStates = require("../Organism/Cell/CellStates");
const BodyCellFactory = require("./Cell/BodyCells/BodyCellFactory");
const Neighbors = require("../Grid/Neighbors");
const Hyperparams = require("../Hyperparameters");
const Directions = require("./Directions");
const Brain = require("./Perception/Brain");

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
        this.ignore_brain_for = 0;
        this.mutability = 5;
        this.damage = 0;
        this.birth_distance = 4;
        this.brain = new Brain(this);
        if (parent != null) {
            this.inherit(parent);
        }
    }

    canAddCellAt(c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return false;
            }
        }
        return true;
    }

    addDefaultCell(state, c, r) {
        var new_cell = BodyCellFactory.createDefault(this, state, c, r);
        this.cells.push(new_cell);
        return new_cell;
    }

    addRandomizedCell(state, c, r) {
        if (state==CellStates.eye && !this.has_eyes) {
            this.brain.randomizeDecisions();
        }
        var new_cell = BodyCellFactory.createRandom(this, state, c, r);
        this.cells.push(new_cell);
        return new_cell;
    }

    addInheritCell(parent_cell) {
        var new_cell = BodyCellFactory.createInherited(this, parent_cell);
        this.cells.push(new_cell);
        return new_cell;
    }

    replaceCell(state, c, r, randomize=true) {
        this.removeCell(c, r, true);
        if (randomize) {
            return this.addRandomizedCell(state, c, r);
        }
        else {
            return this.addDefaultCell(state, c, r);
        }
    }

    removeCell(c, r, override_defense=false) {
        if (c == 0 && r == 0 && !override_defense)
            return false;
        for (var i=0; i<this.cells.length; i++) {
            var cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r){
                this.cells.splice(i, 1);
                break;
            }
        }
        this.checkTypeChange(cell.state);
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

    checkTypeChange() {
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
        for (var cell of this.cells) {
            if (cell.state == CellStates.producer)
                this.is_producer = true;
            if (cell.state == CellStates.mover)
                this.is_mover = true;
            if (cell.state == CellStates.eye)
                this.has_eyes = true;
        }
    }

    inherit(parent) {
        this.move_range = parent.move_range;
        this.mutability = parent.mutability;
        this.birth_distance = parent.birth_distance;
        for (var c of parent.cells){
            //deep copy parent cells
            this.addInheritCell(c);
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
            // console.log("add cell")

            var branch = this.cells[Math.floor(Math.random() * this.cells.length)];
            var state = CellStates.getRandomLivingType();//branch.state;
            var growth_direction = Neighbors.all[Math.floor(Math.random() * Neighbors.all.length)]
            var c = branch.loc_col+growth_direction[0];
            var r = branch.loc_row+growth_direction[1];
            // mutated = this.addCell(state, c, r);
            if (this.canAddCellAt(c, r)){
                mutated = true;
                this.addRandomizedCell(state, c, r);
            }
            this.birth_distance++;
        }
        else if (choice <= Hyperparams.addProb + Hyperparams.changeProb){
            // change cell
            var cell = this.cells[Math.floor(Math.random() * this.cells.length)];
            var state = CellStates.getRandomLivingType();
            // console.log("change cell", state)
            this.replaceCell(state, cell.loc_col, cell.loc_row);
            mutated = true;
        }
        else if (choice <= Hyperparams.addProb + Hyperparams.changeProb + Hyperparams.removeProb){
            // remove cell
            // console.log("remove cell")

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
                this.env.changeCell(real_c, real_r, CellStates.empty, null);
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
                this.env.changeCell(real_c, real_r, CellStates.empty, null);
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
        return cell != null && (cell.state == CellStates.empty || cell.owner == this || cell.owner == parent || cell.state == CellStates.food);
    }

    isClear(col, row, rotation=this.rotation) {
        for(var loccell of this.cells) {
            var cell = this.getRealCell(loccell, col, row, rotation);
            if(cell==null) {
                return false;
            }
            if (cell.owner==this || cell.state==CellStates.empty || (!Hyperparams.foodBlocksReproduction && cell.state==CellStates.food)){
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
            this.env.changeCell(real_c, real_r, CellStates.food, null);
        }
        this.living = false;
    }

    updateGrid() {
        for (var cell of this.cells) {
            var real_c = this.c + cell.rotatedCol(this.rotation);
            var real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, cell.state, cell);
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
            cell.performFunction();
            if (!this.living)
                return this.living
        }
        
        if (this.is_mover) {
            this.move_count++;
            var changed_dir = false;
            if (this.ignore_brain_for == 0){
                changed_dir = this.brain.decide();
            }  
            else{
                this.ignore_brain_for --;
            }
            var moved = this.attemptMove();
            if ((this.move_count > this.move_range && !changed_dir) || !moved){
                var rotated = this.attemptRotate();
                if (!rotated) {
                    this.changeDirection(Directions.getRandomDirection());
                    if (changed_dir)
                        this.ignore_brain_for = this.move_range + 1;
                }
            }
        }

        return this.living;
    }

    getRealCell(local_cell, c=this.c, r=this.r, rotation=this.rotation){
        var real_c = c + local_cell.rotatedCol(rotation);
        var real_r = r + local_cell.rotatedRow(rotation);
        return this.env.grid_map.cellAt(real_c, real_r);
    }

}

module.exports = Organism;

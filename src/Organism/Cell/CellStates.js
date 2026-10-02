const Hyperparams = require("../../Hyperparameters");

// A cell state is used to differentiate type and render the cell
class CellState{
    constructor(name) {
        this.name = name;
        this.color = 'black';
        this.custom_render = false; // true if render() draws more than a flat square
        this.active = false; // true if body cells of this state do work each tick
    }

    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
    }
}

class Empty extends CellState {
    constructor() {
        super('empty');
    }
}
class Food extends CellState {
    constructor() {
        super('food');
    }
}
class Wall extends CellState {
    constructor() {
        super('wall');
    }
}
class Mouth extends CellState {
    constructor() {
        super('mouth');
        this.active = true;
    }
}
class Producer extends CellState {
    constructor() {
        super('producer');
        this.active = true;
    }
}
class Mover extends CellState {
    constructor() {
        super('mover');
    }
}
class Killer extends CellState {
    constructor() {
        super('killer');
        this.active = true;
    }
}
class Armor extends CellState {
    constructor() {
        super('armor');
    }
}
class Eye extends CellState {
    constructor() {
        super('eye');
        this.slit_color = 'black';
        this.custom_render = true;
        this.active = true;
    }
    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
        if(size == 1)
            return;
        var half = size/2;
        var x = -(size)/8
        var y = -half;
        var h = size/2 + size/4;
        var w = size/4;
        ctx.translate(cell.x+half, cell.y+half);
        ctx.rotate((cell.cell_owner.getAbsoluteDirection() * 90) * Math.PI / 180);
        ctx.fillStyle = this.slit_color;
        ctx.fillRect(x, y, w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

class Healer extends CellState {
    constructor() {
        super('healer');
        this.active = true;
    }
}
class Camo extends CellState {
    constructor() {
        super('camo');
    }
}
class Leaf extends CellState {
    constructor() {
        super('leaf');
        this.active = true;
    }
}
class Spike extends CellState {
    constructor() {
        super('spike');
    }
}
class Booster extends CellState {
    constructor() {
        super('booster');
    }
}
class Poison extends CellState {
    constructor() {
        super('poison');
    }
}

const CellStates = {
    empty: new Empty(),
    food: new Food(),
    wall: new Wall(),
    mouth: new Mouth(),
    producer: new Producer(),
    mover: new Mover(),
    killer: new Killer(),
    armor: new Armor(),
    eye: new Eye(),
    healer: new Healer(),
    camo: new Camo(),
    leaf: new Leaf(),
    spike: new Spike(),
    booster: new Booster(),
    poison: new Poison(),
    defineLists() {
        // ids must stay below 16: the render snapshot stores the id in 4 bits
        this.all = [this.empty, this.food, this.wall, this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye,
                    this.healer, this.camo, this.leaf, this.spike, this.booster, this.poison]
        this.classic_living = [this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye];
        this.extended_living = [this.healer, this.camo, this.leaf, this.spike, this.booster, this.poison];
        this.living = this.classic_living.concat(this.extended_living);
        for (let i = 0; i < this.all.length; i++)
            this.all[i].id = i; // compact id used by GridMap.state_ids
    },
    getRandomName: function() {
        return this.all[Math.floor(Math.random() * this.all.length)].name;
    },
    // Types that mutation and random generation may produce. The extended types
    // can be disabled in the evolution controls to get the classic six-cell rules.
    getRandomLivingType: function() {
        const pool = Hyperparams.extendedCellTypes ? this.living : this.classic_living;
        return pool[Math.floor(Math.random() * pool.length)];
    }
}

CellStates.defineLists();

module.exports = CellStates;

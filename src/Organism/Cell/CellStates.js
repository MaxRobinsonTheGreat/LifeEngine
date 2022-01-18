// A cell state is used to differentiate type and render the cell
class CellState{
    constructor(name, dc_code = ':__:') {
        this.name = name;
        this.color = 'black';
        this.dc_code = dc_code;
    }

    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
    }
}

class Empty extends CellState {
    constructor() {
        super('empty',':vd:');
    }
}
class Food extends CellState {
    constructor() {
        super('food',':food:');
    }
}
class Wall extends CellState {
    constructor() {
        super('wall',':wall:');
    }
}
class Mouth extends CellState {
    constructor() {
        super('mouth',':eat:');
    }
}
class Producer extends CellState {
    constructor() {
        super('producer',':prod:');
    }
}
class Mover extends CellState {
    constructor() {
        super('mover',':mov:');
    }
}
class Killer extends CellState {
    constructor() {
        super('killer',':kill:');
    }
}
class Armor extends CellState {
    constructor() {
        super('armor',':arm:');
    }
}
class Eye extends CellState {
    constructor() {
        super('eye',':eye:');
        this.slit_color = 'black';
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
    defineLists() {
        this.all = [this.empty, this.food, this.wall, this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye]
        this.living = [this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye];
    },
    getRandomName: function() {
        return this.all[Math.floor(Math.random() * this.all.length)].name;
    },
    getRandomLivingType: function() {
        return this.living[Math.floor(Math.random() * this.living.length)];
    }
}

CellStates.defineLists();

module.exports = CellStates;

// A cell state is used to differentiate type and render the cell
class CellState{
    constructor(name, color) {
        this.name = name;
        this.color = color
    }

    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
    }
}

class Empty extends CellState {
    constructor() {
        super('empty', '#121D29');
    }
}
class Food extends CellState {
    constructor() {
        super('food', 'green');
    }
}
class Wall extends CellState {
    constructor() {
        super('wall', 'gray');
    }
}
class Mouth extends CellState {
    constructor() {
        super('mouth', 'orange');
    }
}
class Producer extends CellState {
    constructor() {
        super('producer', 'white');
    }
}
class Mover extends CellState {
    constructor() {
        super('mover', '#3493EB');
    }
}
class Killer extends CellState {
    constructor() {
        super('killer', 'red');
    }
}
class Armor extends CellState {
    constructor() {
        super('armor', 'purple');
    }
}
class Eye extends CellState {
    constructor() {
        super('eye', '#d4bb3f');
        this.slit_color = '#121D29';
    }
    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
        if(size == 1)
            return;
        var half = size/2;
        var x = -(size)/8
        var y = -half
        var h = size/2 + size/4;
        var w = size/4;
        ctx.translate(cell.x+half, cell.y+half);
        ctx.rotate((cell.cell_owner.getAbsoluteDirection() * 90) * Math.PI / 180);
        ctx.fillStyle = this.slit_color
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

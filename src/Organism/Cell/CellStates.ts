// A cell state is used to differentiate type and render the cell
/**
 *
 *
 *
 */
class CellState{
  name: any;
  color: string;

  constructor( name ) {
    this.name = name;
    this.color = "black";
  }

  render( ctx, cell, size ) {
    ctx.fillStyle = this.color;
    ctx.fillRect( cell.x, cell.y, size, size );
  }
}

class Empty extends CellState {
  constructor() {
    super( "empty" );
  }
}
class Food extends CellState {
  constructor() {
    super( "food" );
  }
}
class Wall extends CellState {
  constructor() {
    super( "wall" );
  }
}
class Mouth extends CellState {
  constructor() {
    super( "mouth" );
  }
}
class Producer extends CellState {
  constructor() {
    super( "producer" );
  }
}
class Mover extends CellState {
  constructor() {
    super( "mover" );
  }
}
class Killer extends CellState {
  constructor() {
    super( "killer" );
  }
}
class Armor extends CellState {
  constructor() {
    super( "armor" );
  }
}
class Eye extends CellState {
  slit_color: string;
  constructor() {
    super( "eye" );
    this.slit_color = "black";
  }

  render( ctx, cell, size ) {
    ctx.fillStyle = this.color;
    ctx.fillRect( cell.x, cell.y, size, size );
    if ( size == 1 )
      return;
    var half = size / 2,
        x = -( size ) / 8,
        y = -half,
        h = size / 2 + size / 4,
        w = size / 4;

    ctx.translate( cell.x + half, cell.y + half );
    ctx.rotate( ( cell.cell_owner.getAbsoluteDirection() * 90 ) * Math.PI / 180 );
    ctx.fillStyle = this.slit_color;
    ctx.fillRect( x, y, w, h );
    ctx.setTransform( 1, 0, 0, 1, 0, 0 );
  }
}


export class CellStates {
  static empty = new Empty();
  static food = new Food();
  static wall = new Wall();
  static mouth = new Mouth();
  static producer = new Producer();
  static mover = new Mover();
  static killer = new Killer();
  static armor = new Armor();
  static eye = new Eye();

  
  static all = [ this.empty, this.food, this.wall, this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye ];
  static living = [ this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye ];

  static get randomName() {
    return this.all[ Math.floor( Math.random() * this.all.length ) ].name;
  }

  static get randomLivingType() {
    return this.living[ Math.floor( Math.random() * this.living.length ) ];
  }
}
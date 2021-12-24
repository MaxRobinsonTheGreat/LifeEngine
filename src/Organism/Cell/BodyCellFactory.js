import { MouthCell } from "./MouthCell.js"; 
import { ProducerCell } from "./ProducerCell.js"; 
import { MoverCell } from "./MoverCell.js"; 
import { KillerCell } from "./KillerCell.js"; 
import { ArmorCell } from "./ArmorCell.js"; 
// import { EyeCell } from "./NYI-EyeCell"; 
import { CellStates } from "./CellStates.js"; 


export const BodyCellFactory = {
  init: function() {
    var type_map = {};

    type_map[ CellStates.mouth.name ] = MouthCell;
    type_map[ CellStates.producer.name ] = ProducerCell;
    type_map[ CellStates.mover.name ] = MoverCell;
    type_map[ CellStates.killer.name ] = KillerCell;
    type_map[ CellStates.armor.name ] = ArmorCell;
    this.type_map = type_map;
  },

  createInherited: function( org, to_copy ) {
    var cell = new this.type_map[ to_copy.state.name ]( org, to_copy.loc_col, to_copy.loc_row );

    cell.initInherit( to_copy );
    return cell;
  },

  createRandom: function( org, state, loc_col, loc_row ) {
    var cell = new ( this.type_map[ state.name ] )( org, loc_col, loc_row );

    cell.initRandom();
    return cell;
  },

  createDefault: function( org, state, loc_col, loc_row ) {
    var cell = new ( this.type_map[ state.name ] )( org, loc_col, loc_row );

    cell.initDefault();
    return cell;
  },
};

BodyCellFactory.init();
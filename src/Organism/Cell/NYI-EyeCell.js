// const CellStates } from "../CellStates" ),
//       BodyCell } from "./BodyCell" ),
//       Hyperparams } from "../../../Hyperparameters" ),
//       Directions } from "../../Directions" ),
//       Observation } from "../Perception/Observation" );

import { CellStates } from "./CellStates.js";
import { BodyCell } from "./BodyCell.js";
import { Hyperparams } from "../../Hyperparameters";
/**
 *
 *
 * @class EyeCell
 * @extends {BodyCell}
 */
export class EyeCell extends BodyCell{
  constructor( org, loc_col, loc_row ){
    super( CellStates.eye, org, loc_col, loc_row );
    this.org.anatomy.has_eyes = true;
  }

  initInherit( parent ) {
    // deep copy parent values
    super.initInherit( parent );
    this.direction = parent.direction;
  }
    
  initRandom() {
    // initialize values randomly
    this.direction = Directions.getRandomDirection();
  }

  initDefault() {
    // initialize to default values
    this.direction = Directions.up;
  }

  getAbsoluteDirection() {
    var dir = this.org.rotation + this.direction;

    if ( dir > 3 )
      dir -= 4;
    return dir;
  }

  performFunction() {
    var obs = this.look();

    this.org.brain.observe( obs );
  }

  look() {
    var env = this.org.env,
        direction = this.getAbsoluteDirection(),
        addCol = 0,
        addRow = 0;

    switch ( direction ) {
    case Directions.up:
      addRow = -1;
      break;
    case Directions.down:
      addRow = 1;
      break;
    case Directions.right:
      addCol = 1;
      break;
    case Directions.left:
      addCol = -1;
      break;
    }
    var start_col = this.getRealCol(),
        start_row = this.getRealRow(),
        col = start_col,
        row = start_row,
        cell = null;

    for ( var i = 0; i < Hyperparams.lookRange; i++ ){
      col += addCol;
      row += addRow;
      cell = env.grid_map.cellAt( col, row );
      if ( cell == null ) 
        break;
            
      if ( cell.state != CellStates.empty ){
        var distance = Math.abs( start_col - col ) + Math.abs( start_row - row );

        return new Observation( cell, distance, direction );
      }
    }
    return new Observation( cell, Hyperparams.lookRange, direction );
  }
}
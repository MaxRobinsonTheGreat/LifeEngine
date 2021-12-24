import { CellStates } from "./CellStates.js";
import { BodyCell } from "./BodyCell.js";

/**
 *
 *
 * @class MoverCell
 * @extends {BodyCell}
 */
export class MoverCell extends BodyCell{
  constructor( org, loc_col, loc_row ){
    super( CellStates.mover, org, loc_col, loc_row );
    this.org.anatomy.is_mover = true;
  }
}
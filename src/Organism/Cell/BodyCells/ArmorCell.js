import { CellStates } from "../CellStates.js";
import { BodyCell } from "./BodyCell.js";

/**
 * 
 *
 * @class ArmorCell
 * @extends {BodyCell}
 */
export class ArmorCell extends BodyCell{
  constructor( org, loc_col, loc_row ){
    super( CellStates.armor, org, loc_col, loc_row );
  }
}
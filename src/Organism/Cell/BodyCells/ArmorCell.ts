import { CellStates } from "../CellStates";
import { BodyCell } from "./BodyCell";

/**
 * 
 *
 *
 * 
 */
export class ArmorCell extends BodyCell{
  constructor( org, loc_col, loc_row ){
    super( CellStates.armor, org, loc_col, loc_row );
  }
}
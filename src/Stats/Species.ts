import { CellStates } from "../Organism/Cell/CellStates";
import { FossilRecord } from "./FossilRecord";

export class Species {
  cumulative_pop: number;
  cell_counts: any;
  population: any;
  anatomy: any;
  start_tick: any;
  end_tick: number;
  name: string;
  extinct: boolean;
  constructor( anatomy, ancestor, start_tick ) {
    this.anatomy = anatomy;
    // this.ancestor = ancestor; // garbage collect ancestors to avoid memory problems
    this.population = 1;
    this.cumulative_pop = 1;
    this.start_tick = start_tick;
    this.end_tick = -1;
    this.name = "_" + Math.random().toString( 36 ).substr( 2, 9 );
    this.extinct = false;
    this.calcAnatomyDetails();
  }

  calcAnatomyDetails() {
    var cell_counts = {};

    for ( const c of CellStates.living ) 
      cell_counts[ c.name ] = 0;
        
    for ( const cell of this.anatomy.cells ) 
      cell_counts[ cell.state.name ] += 1;
        
    this.cell_counts = cell_counts;
  }

  addPop() {
    this.population++;
    this.cumulative_pop++;
  }

  decreasePop() {
    this.population--;
    if ( this.population <= 0 ) {
      this.extinct = true;

      FossilRecord.fossilize( this );
    }
  }

  lifespan() {
    return this.end_tick - this.start_tick;
  }
}
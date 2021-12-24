const CellStates = require( "../CellStates" ),
      BodyCell = require( "./BodyCell" ),
      Hyperparams = require( "../../../Hyperparameters" );

class ProducerCell extends BodyCell{
  constructor( org, loc_col, loc_row ){
    super( CellStates.producer, org, loc_col, loc_row );
    this.org.anatomy.is_producer = true;
  }

  performFunction() {
    if ( this.org.anatomy.is_mover && !Hyperparams.moversCanProduce )
      return;
    var env = this.org.env,
        prob = Hyperparams.foodProdProb,
        real_c = this.getRealCol(),
        real_r = this.getRealRow();

    if ( Math.random() * 100 <= prob ) {
      var loc = Hyperparams.growableNeighbors[ Math.floor( Math.random() * Hyperparams.growableNeighbors.length ) ],
          loc_c = loc[ 0 ],
          loc_r = loc[ 1 ],
          cell = env.grid_map.cellAt( real_c + loc_c, real_r + loc_r );

      if ( cell != null && cell.state == CellStates.empty ){
        env.changeCell( real_c + loc_c, real_r + loc_r, CellStates.food, null );
        return;
      }
    }
  }
}

module.exports = ProducerCell;
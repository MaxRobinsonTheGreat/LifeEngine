const PopulationChart = require( "./Charts/PopulationChart" ),
      SpeciesChart = require( "./Charts/SpeciesChart" ),
      MutationChart = require( "./Charts/MutationChart" ),
      CellsChart = require( "./Charts/CellsChart" ),
      FossilRecord = require( "./FossilRecord" );


const ChartSelections = [ PopulationChart, SpeciesChart, CellsChart, MutationChart ];

class StatsPanel {
  constructor( env ) {
    this.defineControls();
    this.chart_selection = 0;
    this.setChart();
    this.env = env;
    this.last_reset_count = env.reset_count;
  }

  setChart( selection = this.chart_selection ) {
    this.chart_controller = new ChartSelections[ selection ]();
    this.chart_controller.setData();
    this.chart_controller.render();
  }

  startAutoRender() {
    this.setChart();
    this.render_loop = setInterval( () => { this.updateChart(); }, 1000 );
  }

  stopAutoRender() {
    clearInterval( this.render_loop );
  }

  defineControls() {
    $( "#chart-option" ).change ( () => {
      this.chart_selection = $( "#chart-option" )[ 0 ].selectedIndex;
      this.setChart();
    } );
  }

  updateChart() {
    if ( this.last_reset_count < this.env.reset_count )
      this.reset();
        
    this.last_reset_count = this.env.reset_count;
    this.chart_controller.updateData();
    this.chart_controller.render();
  }

  updateDetails() {
    var org_count = this.env.organisms.length;

    $( "#org-count" ).text( "Total Population: " + org_count );
    $( "#species-count" ).text( "Number of Species: " + FossilRecord.extant_species.length );
    $( "#largest-org" ).text( "Largest Organism Ever: " + this.env.largest_cell_count + " cells" );
    $( "#avg-mut" ).text( "Average Mutation Rate: " + Math.round( this.env.averageMutability() * 100 ) / 100 );


  }

  reset() {
    this.setChart();
  }
    
}

module.exports = StatsPanel;
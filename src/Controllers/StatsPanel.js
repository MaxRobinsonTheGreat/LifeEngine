const FossilRecord = require("../Stats/FossilRecord");

class StatsPanel {
    constructor() {
        this.defineControls();
        this.clearData();
        this.last_update_tick = 0;
        this.update_every = 100;

        // maps species to their index in chart's data storage
        this.species_index_map = [];
        this.index_counter = 0;
        this.min_display = 10;
    }

    startAutoRender(){
        this.render_loop = setInterval(function(){this.render();}.bind(this), 1000);
    }

    stopAutoRender() {
        clearInterval(this.render_loop);
    }

    defineControls() {
        $('#update-chart').click( function() {
            this.render();
        }.bind(this));
    }

    updateData(tick, population_size) {
        if (tick - this.last_update_tick >= this.update_every){
            // this.data[0].dataPoints.push({x: tick, y:population_size});
            this.last_update_tick = tick;

            for (var species of FossilRecord.extant_species) {
                if (species.cumulative_pop < this.min_display){
                    continue;
                }
                
                if (this.species_index_map[species.name] == null) {
                    console.log("new species")
                    this.species_index_map[species.name] = this.index_counter;
                    this.index_counter++;
                    this.data.push({
                        type: "line",
                        markerType: "none",
                        dataPoints: []
                    });
                }
                var data_index = this.species_index_map[species.name];
                this.data[data_index].dataPoints.push({x:tick, y:species.population});
            }
        }
    }
    
    render() {
        this.chart.render();
    }

    clearData() {
        this.data = [{
            type: "line",
            markerType: "none",
            dataPoints: []
        }];
        this.chart = new CanvasJS.Chart("chartContainer", {
            title:{
                text: "Population" 
            },
            data: this.data
        });
        this.render();
    }
    
}

module.exports = StatsPanel;
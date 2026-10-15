const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class FitnessChart extends ChartController {
    constructor() {
        super("Fitness (Average Lifespan)",
            "Ticks",
            "Fitness is the average number of ticks lived by organisms that died during each sample interval. " +
            "\"Per species\" averages each species' value equally, so small species count as much as large ones.");
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true,
                name: "fitness_all",
                legendText: "Avg. lifespan (all organisms)",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#d62728',
                showInLegend: true,
                name: "fitness_species",
                legendText: "Avg. lifespan (mean per species)",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#1f77b4',
                showInLegend: true,
                name: "species_age",
                legendText: "Avg. age of living species",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.fitness_all[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.fitness_species[i]});
        this.data[2].dataPoints.push({x:t, y:FossilRecord.av_species_age[i]});
    }
}

module.exports = FitnessChart;

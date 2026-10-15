const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class FitnessChart extends ChartController {
    constructor() {
        super("Fitness (Offspring per Organism)",
            "Offspring",
            "Fitness is lifetime reproductive success: the average number of offspring produced by the organisms that died during each sample interval. " +
            "Only children that were actually placed in the world count. " +
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
                legendText: "Avg. offspring (all organisms that died)",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#d62728',
                showInLegend: true,
                name: "fitness_species",
                legendText: "Avg. offspring (mean per species)",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.fitness_all[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.fitness_species[i]});
    }
}

module.exports = FitnessChart;

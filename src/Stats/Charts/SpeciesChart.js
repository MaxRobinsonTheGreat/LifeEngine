const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class SpeciesChart extends ChartController {
    constructor() {
        super("Species");
    }
    
    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "spec",
                legendText: "Number of Species",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.species_counts[i];
        this.data[0].dataPoints.push({x:t, y:p});
    }
}

module.exports = SpeciesChart;
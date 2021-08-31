const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class PopulationChart extends ChartController {
    constructor() {
        super("Population");
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "pop1",
                legendText: "Total Population",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.pop_counts[i];
        this.data[0].dataPoints.push({x:t, y:p});
    }
}

module.exports = PopulationChart;
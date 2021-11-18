const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class VarietyChart extends ChartController {
    constructor() {
        super("Variety");
    }
    
    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "vary",
                legendText: "Variety Ratio (%)",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.species_counts[i]/(FossilRecord.pop_counts[i]!=0?FossilRecord.pop_counts[i]:FossilRecord.pop_counts[i]+1)*100;
        this.data[0].dataPoints.push({x:t, y:p});
    }
}

module.exports = VarietyChart;
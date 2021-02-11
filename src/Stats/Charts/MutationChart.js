const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class MutationChart extends ChartController {
    constructor() {
        super("Mutation Rate");
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "pop1",
                legendText: "Average Mutation Rate",
                dataPoints: []
            }
        );
        for (var i in FossilRecord.tick_record) {
            var t = FossilRecord.tick_record[i];
            var p = FossilRecord.av_mut_rates[i];
            this.data[0].dataPoints.push({x:t, y:p});
        }
        // console.log(this.data)
    }

    addNewest() {
        var i = FossilRecord.tick_record.length-1;
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.av_mut_rates[i];
        this.data[0].dataPoints.push({x:t, y:p});
    }

    removeOldest() {
        this.data[0].dataPoints.shift();
    }
}

module.exports = MutationChart;
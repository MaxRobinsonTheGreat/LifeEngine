const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class GrowthChart extends ChartController {
    constructor() {
        super("Growth Rate (per Capita)",
            "Per organism per 100 ticks",
            GrowthChart.NOTE + "Birth and death rates are the two parts: growth rate = birth rate - death rate.");
        GrowthChart.allowNegative(this.chart);
    }

    static allowNegative(chart) {
        delete chart.options.axisY.minimum;
        chart.options.axisY.stripLines = [{value: 0, color: '#999', thickness: 1}];
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true,
                name: "growth_rate",
                legendText: "Growth rate",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#2ca02c',
                showInLegend: true,
                name: "birth_rate",
                legendText: "Birth rate",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#d62728',
                showInLegend: true,
                name: "death_rate",
                legendText: "Death rate",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.growth_rates[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.birth_rates[i]});
        this.data[2].dataPoints.push({x:t, y:FossilRecord.death_rates[i]});
    }
}

GrowthChart.NOTE = "Growth rate is (births - deaths) / population over each 100-tick sample interval, using the average of the " +
    "population at the start and end of the interval. Above 0 the group is growing, below 0 it is shrinking. ";

module.exports = GrowthChart;

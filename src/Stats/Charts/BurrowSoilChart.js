const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");
const Hyperparams = require("../../Hyperparameters");

class BurrowSoilChart extends ChartController {
    constructor() {
        super("Burrowing & Soil Health",
            "Organisms",
            "Claw organisms have at least one claw (burrowing) cell. Underground is how many are hidden when sampled. " +
            "The number of times organisms hid per interval is in the CSV exports (burrows column). " +
            "Soil (right axis) is average fertility as a % of the maximum, and degraded tiles are those below half the starting average.");
        this.chart.options.axisY2 = {
            title: "Soil (%)",
            minimum: 0,
            maximum: 100,
        };
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#8c564b',
                showInLegend: true,
                name: "burrowers",
                legendText: "Organisms with claw cells",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#9467bd',
                showInLegend: true,
                name: "hidden",
                legendText: "Underground",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#2ca02c',
                showInLegend: true,
                axisYType: "secondary",
                name: "soil_mean",
                legendText: "Avg. soil fertility (%)",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                lineDashType: "dash",
                color: '#ff7f0e',
                showInLegend: true,
                axisYType: "secondary",
                name: "soil_degraded",
                legendText: "Degraded tiles (%)",
                dataPoints: []
            }
        );
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var soil = FossilRecord.soil_means[i];
        var degraded = FossilRecord.soil_degraded_fracs[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.burrower_counts[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.hidden_counts[i]});
        this.data[2].dataPoints.push({x:t, y:soil === null || soil === undefined ? null : 100 * soil / Hyperparams.maxFertility});
        this.data[3].dataPoints.push({x:t, y:degraded === null || degraded === undefined ? null : 100 * degraded});
    }
}

module.exports = BurrowSoilChart;

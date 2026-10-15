const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class LifespanChart extends ChartController {
    constructor() {
        super("Lifespan at Death",
            "Ticks",
            "Average number of ticks lived by the organisms that died during each sample interval (organisms still alive are not counted). " +
            "\"Per species\" averages each species' value equally, so small species count as much as large ones.");
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true,
                name: "lifespan_at_death_all",
                legendText: "Avg. lifespan at death (all organisms that died)",
                dataPoints: []
            }
        );
        this.data.push({
                type: "line",
                markerType: "none",
                color: '#d62728',
                showInLegend: true,
                name: "lifespan_at_death_species",
                legendText: "Avg. lifespan at death (mean per species)",
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
        this.data[0].dataPoints.push({x:t, y:FossilRecord.lifespan_at_death_all[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.lifespan_at_death_species[i]});
        this.data[2].dataPoints.push({x:t, y:FossilRecord.av_species_age[i]});
    }
}

module.exports = LifespanChart;

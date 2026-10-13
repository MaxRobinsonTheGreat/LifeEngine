const CellStates = require("../../Organism/Cell/CellStates");
const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class CellsChart extends ChartController {
    constructor() {
        super("Organism Size / Composition", 
            "Avg. Number of Cells per Organism",
            "Cell counts are averaged over every living organism, including claw (burrowing) cells.");
    }

    setData() {
        this.clear();
        //this.mouth, this.producer, this.mover, this.killer, this.armor, this.claw, this.eye
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "pop1",
                legendText: "Avg. organism size",
                dataPoints: []
            }
        );
        for (var c of CellStates.living) {
            this.data.push({
                type: "line",
                markerType: "none",
                color: c.color,
                showInLegend: true, 
                name: c.name,
                legendText: "Avg. " + c.name + " cells",
                dataPoints: []
            }
        );
        }
        this.addAllDataPoints();


    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.av_cells[i];
        this.data[0].dataPoints.push({x:t, y:p});
        var counts = FossilRecord.av_cell_counts[i] || {};
        for (var j=1; j<this.data.length; j++) {
            var count = counts[this.data[j].name] || 0;
            this.data[j].dataPoints.push({x:t,y:count})
        }
    }
}

module.exports = CellsChart;
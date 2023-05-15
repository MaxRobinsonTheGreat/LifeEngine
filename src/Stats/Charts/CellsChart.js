import CellStates from '../../Organism/Cell/CellStates';
import ChartController from './ChartController';

class CellsChart extends ChartController {
    constructor(fossilRecord) {
        super(
            fossilRecord,
            'Organism Size / Composition',
            'Avg. Number of Cells per Organism',
            'Note: to maintain efficiency, species with very small populations are discarded when collecting cell statistics.',
        );
    }

    setData() {
        this.clear();
        //this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye
        this.data.push({
            type: 'line',
            markerType: 'none',
            color: 'black',
            showInLegend: true,
            name: 'pop1',
            legendText: 'Avg. organism size',
            dataPoints: [],
        });
        for (var c of CellStates.living) {
            this.data.push({
                type: 'line',
                markerType: 'none',
                color: c.color,
                showInLegend: true,
                name: c.name,
                legendText: 'Avg. ' + c.name + ' cells',
                dataPoints: [],
            });
        }
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = this.fossilRecord.tick_record[i];
        var p = this.fossilRecord.av_cells[i];
        this.data[0].dataPoints.push({ x: t, y: p });
        var j = 1;
        for (var name in this.fossilRecord.av_cell_counts[i]) {
            var count = this.fossilRecord.av_cell_counts[i][name];
            this.data[j].dataPoints.push({ x: t, y: count });
            j++;
        }
    }
}

export default CellsChart;

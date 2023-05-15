import ChartController from './ChartController';

class SpeciesChart extends ChartController {
    constructor(fossilRecord) {
        super(fossilRecord, 'Species');
    }

    setData() {
        this.clear();
        this.data.push({
            type: 'line',
            markerType: 'none',
            color: 'black',
            showInLegend: true,
            name: 'spec',
            legendText: 'Number of Species',
            dataPoints: [],
        });
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = this.fossilRecord.tick_record[i];
        var p = this.fossilRecord.species_counts[i];
        this.data[0].dataPoints.push({ x: t, y: p });
    }
}

export default SpeciesChart;

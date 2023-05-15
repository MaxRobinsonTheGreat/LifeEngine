import ChartController from './ChartController';

class PopulationChart extends ChartController {
    constructor(fossilRecord) {
        super(fossilRecord, 'Population');
    }

    setData() {
        this.clear();
        this.data.push({
            type: 'line',
            markerType: 'none',
            color: 'black',
            showInLegend: true,
            name: 'pop1',
            legendText: 'Total Population',
            dataPoints: [],
        });
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = this.fossilRecord.tick_record[i];
        var p = this.fossilRecord.pop_counts[i];
        this.data[0].dataPoints.push({ x: t, y: p });
    }
}

export default PopulationChart;

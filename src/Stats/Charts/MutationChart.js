import ChartController from './ChartController';

class MutationChart extends ChartController {
    constructor(fossilRecord) {
        super(fossilRecord, 'Mutation Rate');
    }

    setData() {
        this.clear();
        this.data.push({
            type: 'line',
            markerType: 'none',
            color: 'black',
            showInLegend: true,
            name: 'pop1',
            legendText: 'Average Mutation Rate',
            dataPoints: [],
        });
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = this.fossilRecord.tick_record[i];
        var p = this.fossilRecord.av_mut_rates[i];
        this.data[0].dataPoints.push({ x: t, y: p });
    }
}

export default MutationChart;

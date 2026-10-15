const FossilRecord = require("../FossilRecord");

class ChartController {
    constructor(title, y_axis="", note="") {
        this.data = [];
        this.chart = new CanvasJS.Chart("chartContainer", {
            zoomEnabled: true,
            title:{
                text: title
            },
            axisX:{
                title: "Ticks",
                minimum: 0,
            },
            axisY:{
                title: y_axis,
                minimum: 0,
            },
            data: this.data
        });
        this.chart.render();
        $('#chart-note').text(note);
    }

    setData() {
        alert("Must override updateData!");
    }

    setMinimum() {
        var min = 0;
        if (this.data[0].dataPoints != [])
            min = this.data[0].dataPoints[0].x;
        this.chart.options.axisX.minimum = min;
    }

    addAllDataPoints(){
        for (var i in FossilRecord.tick_record) {
            this.addDataPoint(i)
        }
    }

    render() {
        this.setMinimum();
        this.chart.render();
    }

    updateData() {
        let record_size = FossilRecord.tick_record.length;
        let data_points = this.data[0].dataPoints;
        let newest_t = -1;
        if (data_points.length>0) {
            newest_t = this.data[0].dataPoints[data_points.length-1].x;
        }
        let to_add = 0;
        let cur_t = FossilRecord.tick_record[record_size-1];
        // first count up the number of new datapoints the chart is missing
        while (cur_t !== newest_t) {
            to_add++;
            cur_t = FossilRecord.tick_record[record_size-to_add-1]
        }
        // then add them in order
        this.addNewest(to_add)

        // remove oldest datapoints until the chart is the same size as the saved records
        while (data_points.length > FossilRecord.tick_record.length) {
            this.removeOldest();
        }
    }

    addNewest(to_add) {
        for (let i=to_add; i>0; i--) {
            let j = FossilRecord.tick_record.length-i;
            this.addDataPoint(j);
        }
    }

    removeOldest() {
        for (var dps of this.data) {
            dps.dataPoints.shift();
        }
    }

    addDataPoint(i) {
        alert("Must override addDataPoint")
    }

    clear() {
        this.data.length = 0;
        this.chart.render();
    }
}

module.exports = ChartController;
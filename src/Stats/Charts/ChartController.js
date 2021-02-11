const FossilRecord = require("../FossilRecord");

class ChartController {
    constructor(title, note="") {
        this.data = [];
        this.chart = new CanvasJS.Chart("chartContainer", {
            zoomEnabled: true,
            title:{
                text: title
            },
            data: this.data
        });
        this.chart.render();
        $('#chart-note').text(note);
    }

    setData() {
        alert("Must override updateData!");
    }

    addAllDataPoints(){
        for (var i in FossilRecord.tick_record) {
            this.addDataPoint(i)
        }
    }

    render() {
        this.chart.render();
    }

    updateData() {
        var r_len = FossilRecord.tick_record.length;
        var newest_t = -1;
        var oldest_t = 0;
        if (this.data[0].dataPoints.length>0) {
            newest_t = this.data[0].dataPoints[this.data[0].dataPoints.length-1].x;
            newest_t = this.data[0].dataPoints[0].x;
        }
        if (newest_t < FossilRecord.tick_record[r_len-1]) {
            this.addNewest();
        }
        if (oldest_t < FossilRecord.tick_record[0]) {
            this.removeOldest();
        }
    }

    addNewest() {
        var i = FossilRecord.tick_record.length-1;
        this.addDataPoint(i);
    }

    addDataPoint(i) {
        alert("Must override addDataPoint")
    }

    removeOldest() {
        for (var dps of this.data) {
            dps.dataPoints.shift();
        }
    }

    clear() {
        this.data.length = 0;
        this.chart.render();
    }
}

module.exports = ChartController;
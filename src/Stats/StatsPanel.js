const PopulationChart = require("./Charts/PopulationChart");
const SpeciesChart = require("./Charts/SpeciesChart");
const MutationChart = require("./Charts/MutationChart");


const ChartSelections = [PopulationChart, SpeciesChart, MutationChart];

class StatsPanel {
    constructor(env) {
        this.defineControls();
        this.chart_selection = 0;
        this.setChart();
        this.env = env;
        this.last_reset_count=env.reset_count;
    }

    setChart(selection=this.chart_selection) {
        this.chart_controller = new ChartSelections[selection]();
        this.chart_controller.setData();
        this.chart_controller.render();
    }

    startAutoRender() {
        this.setChart();
        this.render_loop = setInterval(function(){this.updateChart();}.bind(this), 1000);
    }

    stopAutoRender() {
        clearInterval(this.render_loop);
    }

    defineControls() {
        $('#chart-option').change ( function() {
            this.chart_selection = $("#chart-option")[0].selectedIndex;
            this.setChart();
        }.bind(this));
    }

    updateChart() {
        if (this.last_reset_count < this.env.reset_count){
            this.reset()
        }
        this.last_reset_count = this.env.reset_count;
        this.chart_controller.updateData();
        this.chart_controller.render();
    }

    updateDetails() {
        var org_count = this.env.organisms.length;
        $('#org-count').text("Organism count:  " + org_count);
        if (org_count > this.organism_record) 
            this.organism_record = org_count;
        $('#org-record').text("Highest count: " + this.env.organism_record);
        $('#avg-mut').text("Average Mutation Rate: " + Math.round(this.env.averageMutability() * 100) / 100);
        $('#largest-org').text("Largest Organism: " + this.env.largest_cell_count + " cells");

    }

    reset() {
        this.setChart();
    }
    
}

module.exports = StatsPanel;
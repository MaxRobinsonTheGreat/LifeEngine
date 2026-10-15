const PopulationChart = require("./Charts/PopulationChart");
const SpeciesChart = require("./Charts/SpeciesChart");
const MutationChart = require("./Charts/MutationChart");
const CellsChart = require("./Charts/CellsChart");
const FitnessChart = require("./Charts/FitnessChart");
const LifespanChart = require("./Charts/LifespanChart");
const GrowthChart = require("./Charts/GrowthChart");
const BurrowSoilChart = require("./Charts/BurrowSoilChart");
const GroupChart = require("./Charts/GroupChart");
const FossilRecord = require("./FossilRecord");


// same order as the options in #chart-option
const ChartSelections = [
    () => new PopulationChart(),
    () => new SpeciesChart(),
    () => new CellsChart(),
    () => new MutationChart(),
    () => new FitnessChart(),
    () => new LifespanChart(),
    () => new GrowthChart(),
    () => new BurrowSoilChart(),
    (panel) => new GroupChart(panel, 'pop'),
    (panel) => new GroupChart(panel, 'growth'),
    (panel) => new GroupChart(panel, 'fitness'),
    (panel) => new GroupChart(panel, 'lifespan'),
];
const GROUP_CHARTS = [8, 9, 10, 11];

class StatsPanel {
    constructor(env, editor) {
        this.env = env;
        this.editor = editor;
        this.grouping = 'lineage';
        this.followed_species = null;
        this.hidden_groups = new Set(); // legend entries the user has switched off
        this.download_queue = [];
        this.defineControls();
        this.chart_selection = 0;
        this.setChart();
        this.last_reset_count=env.reset_count;
    }

    setChart(selection=this.chart_selection) {
        $('#group-controls').css('display', GROUP_CHARTS.includes(selection) ? 'block' : 'none');
        this.chart_controller = ChartSelections[selection](this);
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
        $('#species-threshold').change(function() {
            let threshold = parseInt($('#species-threshold').val());
            if (threshold >= 1)
                FossilRecord.species_threshold = threshold;
            $('#species-threshold').val(FossilRecord.species_threshold);
        });
        $('#export-timeseries').click(() => this.download('timeseries', FossilRecord.timeSeriesCSV()));
        $('#export-species-log').click(() => this.download('species_log', FossilRecord.speciesLogCSV()));
        $('#export-species').click(() => this.download('species_summary', FossilRecord.speciesSummaryCSV()));
        $('#export-groups').click(() => this.download('groups_log', FossilRecord.groupsLogCSV()));
        $('#export-events').click(() => this.download('key_moments', FossilRecord.eventsCSV()));
        $('#export-all').click(() => this.exportAll());
        $('#auto-save-logs').change(() => {
            if (this.autoSave() && FossilRecord.log_paused)
                FossilRecord.log_paused = false; // logging stopped because it filled up, so start again
        });
        FossilRecord.on_extinction = () => {
            if (this.autoSave())
                this.exportAll();
        };
        // a full log is downloaded as a numbered part and then cleared from memory
        FossilRecord.on_log_full = (part) => {
            if (!this.autoSave()) return false;
            this.download('species_log_part' + part, FossilRecord.speciesLogCSV());
            this.download('groups_log_part' + part, FossilRecord.groupsLogCSV());
            return true;
        };

        $('#group-by').change(() => {
            this.grouping = $('#group-by').val();
            this.setChart();
        });
        $('#follow-species').click(() => {
            let species = this.editor && this.editor.organism ? this.editor.organism.species : null;
            let known = species && (FossilRecord.speciesIsExtant(species.name) || FossilRecord.extinct_species[species.name]);
            if (!known) {
                alert('Use the "Select" tool to click an organism in the world first, then press Follow.');
                return;
            }
            this.followed_species = species.name;
            this.grouping = 'followed';
            $('#group-by').val('followed');
            $('#followed-name').text('Following: "' + species.name + '"');
            this.setChart();
        });
        $('#show-all-groups').click(() => {
            this.hidden_groups.clear();
            this.setChart();
        });
    }

    autoSave() {
        return $('#auto-save-logs').is(':checked');
    }

    // downloads are spaced out because browsers can drop several downloads started at the same moment
    download(name, csv) {
        this.download_queue.push({name: name + '_tick' + this.env.total_ticks + '.csv', csv: csv});
        if (this.download_queue.length === 1)
            this.nextDownload();
    }

    nextDownload() {
        let item = this.download_queue[0];
        let url = URL.createObjectURL(new Blob([item.csv], {type: 'text/csv;charset=utf-8'}));
        let downloadEl = document.getElementById('download-el');
        downloadEl.setAttribute("href", url);
        downloadEl.setAttribute("download", item.name);
        downloadEl.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            this.download_queue.shift();
            if (this.download_queue.length > 0)
                this.nextDownload();
        }, 300);
    }

    exportAll() {
        let part = FossilRecord.log_part > 1 ? '_part' + FossilRecord.log_part : '';
        this.download('timeseries', FossilRecord.timeSeriesCSV());
        this.download('species_log' + part, FossilRecord.speciesLogCSV());
        this.download('groups_log' + part, FossilRecord.groupsLogCSV());
        this.download('species_summary', FossilRecord.speciesSummaryCSV());
        this.download('key_moments', FossilRecord.eventsCSV());
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
        $('#org-count').text("Total Population: " + org_count);
        $('#species-count').text("Number of Species: " + FossilRecord.numExtantSpecies());
        let top_species = FossilRecord.getMostPopulousSpecies();
        if (top_species)
            $('#top-species').text("Most Populous Species: \"" + top_species.name + "\" (" + top_species.population + " organisms)");
        else    
            $('#top-species').text("Most Populous Species: None");
        $('#largest-org').text("Largest Organism Ever: " + this.env.largest_cell_count + " cells");
        $('#avg-mut').text("Average Mutation Rate: " + Math.round(this.env.averageMutability() * 100) / 100);

        let last = FossilRecord.tick_record.length - 1;
        let fitness = FossilRecord.fitness_all[last];
        $('#avg-fitness').text("Fitness (Avg. Offspring of Organisms that Died): " + (fitness === null || fitness === undefined ? "-" : Math.round(fitness * 100) / 100));
        let lifespan = FossilRecord.lifespan_at_death_all[last];
        let growth = FossilRecord.growth_rates[last];
        $('#growth-rate').text("Growth Rate (per Capita): " + (growth === null || growth === undefined ? "-" : Math.round(growth * 1000) / 1000));
        $('#avg-lifespan').text("Avg. Lifespan at Death: " + (lifespan === null || lifespan === undefined ? "-" : Math.round(lifespan) + " ticks"));
        $('#burrower-count').text("Organisms with Claw Cells: " + FossilRecord.burrower_counts[last] + " (" + FossilRecord.hidden_counts[last] + " underground)");
        let soil = FossilRecord.soil_means[last];
        $('#soil-health').text("Average Soil Fertility: " + (soil === null || soil === undefined ? "n/a" : Math.round(soil * 100) / 100));
        if (!$('#species-threshold').is(':focus')) // the threshold can change when a world is loaded
            $('#species-threshold').val(FossilRecord.species_threshold);
        this.renderKeyMoments();
    }

    renderKeyMoments() {
        let events = FossilRecord.events;
        if (events === this.rendered_events && events.length === this.rendered_count) return;
        this.rendered_events = events;
        this.rendered_count = events.length;
        let container = $('#key-moments');
        container.empty();
        if (events.length === 0)
            container.append($('<p>').text('None yet'));
        for (let i = events.length - 1; i >= 0; i--) // newest first
            container.append($('<p>').text('Tick ' + events[i].tick + ': ' + events[i].label));
    }

    reset() {
        this.setChart();
    }
    
}

module.exports = StatsPanel;
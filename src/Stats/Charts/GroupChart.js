const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

const PALETTE = ['#1f77b4', '#d62728', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2', '#17becf', '#bcbd22', '#7f7f7f'];
const ROLE_COLORS = {
    'Plants': '#2ca02c',
    'Predators': '#d62728',
    'Prey (burrowing)': '#8c564b',
    'Prey (non-burrowing)': '#1f77b4',
};
const METRICS = {
    pop: {title: "Population", y_axis: "Organisms"},
    fitness: {title: "Fitness (Average Lifespan)", y_axis: "Ticks"},
};
const NOTES = {
    lineage: "One line per lineage: a seeded organism and every species descended from it. Click a legend entry to hide/show it.",
    role: "Plants have producers and don't move. Animals are split by their predator / prey flag (killer cells if unflagged), and prey by whether they have a claw (burrowing) cell. Click a legend entry to hide/show it.",
    followed: "The followed species, its descendant species combined, and both together. Covers the per-species log kept in memory. Click a legend entry to hide/show it.",
};

// Population or fitness split by lineage, ecological role, or a followed species and its descendants.
// The series are rebuilt from the records on every update because new groups can appear at any time.
class GroupChart extends ChartController {
    constructor(panel, metric) {
        super(METRICS[metric].title + " by " + GroupChart.groupingLabel(panel), METRICS[metric].y_axis, NOTES[panel.grouping]);
        this.panel = panel;
        this.metric = metric;
        this.chart.options.legend = {
            cursor: "pointer",
            itemclick: (e) => {
                let name = e.dataSeries.name;
                if (this.panel.hidden_groups.has(name))
                    this.panel.hidden_groups.delete(name);
                else
                    this.panel.hidden_groups.add(name);
                e.dataSeries.visible = !this.panel.hidden_groups.has(name);
                this.chart.render();
            }
        };
    }

    static groupingLabel(panel) {
        if (panel.grouping === 'followed')
            return panel.followed_species ? '"' + panel.followed_species + '" + Descendants' : 'Followed Species';
        return panel.grouping === 'role' ? 'Role' : 'Lineage';
    }

    setData() {
        this.clear();
        this.rebuild();
    }

    updateData() {
        this.rebuild();
    }

    rebuild() {
        let series = this.panel.grouping === 'followed' ? this.collectFollowed() : this.collectGroups(this.panel.grouping);
        let names = Object.keys(series);
        // keep existing series objects so the chart doesn't flicker or lose its zoom
        let existing = {};
        for (let d of this.data) existing[d.name] = d;
        this.data.length = 0;
        names.forEach((name, i) => {
            let d = existing[name] || {
                type: "line",
                markerType: "none",
                showInLegend: true,
                name: name,
                legendText: name,
                color: ROLE_COLORS[name] || PALETTE[i % PALETTE.length],
            };
            d.dataPoints = series[name];
            d.visible = !this.panel.hidden_groups.has(name);
            this.data.push(d);
        });
    }

    collectGroups(grouping) {
        let series = {};
        let ticks = FossilRecord.tick_record;
        for (let i = 0; i < ticks.length; i++) {
            let sample = FossilRecord.group_samples[i];
            if (!sample || !sample[grouping]) continue;
            for (let name in sample[grouping]) {
                if (!series[name]) series[name] = [];
                series[name].push({x: ticks[i], y: sample[grouping][name][this.metric]});
            }
        }
        return series;
    }

    collectFollowed() {
        let root = this.panel.followed_species;
        if (!root) return {};
        let log = FossilRecord.species_log;
        // species_log columns: tick, species, ancestor, lineage, population, deaths, fitness, age, has_burrow
        let parent = {};
        for (let row of log) parent[row[1]] = row[2];
        for (let s of Object.values(FossilRecord.extant_species)) parent[s.name] = s.ancestor_name;
        let in_tree = {}; // memoised: does this species descend from root?
        let descends = (name) => {
            if (in_tree[name] !== undefined) return in_tree[name];
            let seen = [];
            let cur = name;
            let result = false;
            while (cur) {
                if (cur === root) { result = true; break; }
                if (in_tree[cur] !== undefined) { result = in_tree[cur]; break; }
                seen.push(cur);
                cur = parent[cur];
            }
            for (let n of seen) in_tree[n] = result;
            return result;
        };

        let by_tick = new Map();
        for (let row of log) {
            let name = row[1];
            if (!descends(name)) continue;
            let key = name === root ? 'self' : 'desc';
            if (!by_tick.has(row[0])) by_tick.set(row[0], {self: {pop: 0, deaths: 0, lifetime: 0}, desc: {pop: 0, deaths: 0, lifetime: 0}});
            let g = by_tick.get(row[0])[key];
            g.pop += row[4];
            g.deaths += row[5];
            if (row[6] !== '') g.lifetime += row[6] * row[5];
        }

        let names = {self: root, desc: root + ' descendants', total: root + ' + descendants'};
        let series = {};
        for (let k in names) series[names[k]] = [];
        let value = (g) => this.metric === 'pop' ? g.pop : (g.deaths > 0 ? g.lifetime / g.deaths : null);
        for (let [tick, g] of by_tick) {
            let total = {pop: g.self.pop + g.desc.pop, deaths: g.self.deaths + g.desc.deaths, lifetime: g.self.lifetime + g.desc.lifetime};
            series[names.self].push({x: tick, y: value(g.self)});
            series[names.desc].push({x: tick, y: value(g.desc)});
            series[names.total].push({x: tick, y: value(total)});
        }
        return series;
    }

    setMinimum() {
        let firsts = this.data.filter(d => d.dataPoints.length > 0).map(d => d.dataPoints[0].x);
        this.chart.options.axisX.minimum = firsts.length > 0 ? Math.min(...firsts) : 0;
    }
}

module.exports = GroupChart;

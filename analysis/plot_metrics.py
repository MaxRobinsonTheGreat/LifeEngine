"""Plot the CSVs exported from the Statistics tab ("Export Metrics").

Usage:
    pip install matplotlib
    python analysis/plot_metrics.py <folder with CSVs> [--out plots] [--smooth 5] [--follow SPECIES] [--top 8]

The folder should hold the files from one run (timeseries, groups_log, species_log, key_moments). If there are
several files of one kind (numbered parts from auto-save, or several exports), all of them are read and duplicate
rows are dropped. Figures are saved as PNGs in --out.
"""
import argparse
import csv
import glob
import os
from collections import defaultdict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROLE_COLORS = {
    "Plants": "#2ca02c",
    "Predators": "#d62728",
    "Prey (burrowing)": "#8c564b",
    "Prey (non-burrowing)": "#1f77b4",
}
EVENT_COLORS = {"burrow_start": "#8c564b", "burrow_end": "#8c564b", "total_extinction": "black"}


def read_rows(folder, prefix):
    rows = []
    seen = set()
    for path in sorted(glob.glob(os.path.join(folder, prefix + "*.csv"))):
        with open(path, newline="") as f:
            for row in csv.DictReader(f):
                key = tuple(row.values())
                if key not in seen:
                    seen.add(key)
                    rows.append(row)
    return rows


def num(value):
    return float(value) if value not in ("", None) else None


def smooth(values, window):
    """Trailing mean that skips gaps (None), so sparse fitness values stay readable."""
    if window <= 1:
        return values
    out = []
    for i in range(len(values)):
        chunk = [v for v in values[max(0, i - window + 1):i + 1] if v is not None]
        out.append(sum(chunk) / len(chunk) if chunk else None)
    return out


def draw_events(ax, events, include_species=False):
    for e in events:
        if not include_species and e["type"].startswith("species_"):
            continue
        ax.axvline(int(e["tick"]), color=EVENT_COLORS.get(e["type"], "#2ca02c"), linestyle="--", linewidth=0.8, alpha=0.7)


def label_events(ax, events):
    ymax = ax.get_ylim()[1]
    for e in events:
        if e["type"].startswith("species_"):
            continue
        ax.text(int(e["tick"]), ymax, " " + e["label"], rotation=90, va="top", fontsize=7, alpha=0.8)


def group_series(groups_rows, grouping, field):
    series = defaultdict(lambda: ([], []))
    for row in groups_rows:
        if row["grouping"] != grouping:
            continue
        xs, ys = series[row["group"]]
        xs.append(int(row["tick"]))
        ys.append(num(row[field]))
    return series


def top_groups(series, n):
    """The n groups with the highest peak, so lineages that never took off don't clutter the plot."""
    peaks = {name: max([y for y in ys if y is not None] or [0]) for name, (xs, ys) in series.items()}
    return sorted(peaks, key=peaks.get, reverse=True)[:n]


def plot_groups(groups_rows, events, out, window, top):
    for grouping in ("lineage", "role"):
        pop = group_series(groups_rows, grouping, "population")
        fit = group_series(groups_rows, grouping, "fitness")
        if not pop:
            continue
        names = top_groups(pop, top) if grouping == "lineage" else list(pop)
        fig, (ax1, ax2) = plt.subplots(2, 1, sharex=True, figsize=(11, 7))
        for name in names:
            color = ROLE_COLORS.get(name)
            ax1.plot(*pop[name], label=name, color=color)
            xs, ys = fit[name]
            ax2.plot(xs, smooth(ys, window), label=name, color=color)
        ax1.set_ylabel("Population")
        ax2.set_ylabel("Fitness (avg lifespan, ticks)")
        ax2.set_xlabel("Tick")
        for ax in (ax1, ax2):
            draw_events(ax, events)
        label_events(ax1, events)
        ax1.legend(fontsize=8, loc="upper left")
        ax1.set_title("Population and fitness by " + grouping + (" (smoothed over %d samples)" % window if window > 1 else ""))
        fig.tight_layout()
        fig.savefig(os.path.join(out, "groups_%s.png" % grouping), dpi=150)
        plt.close(fig)

        # stacked area: who makes up the world over time (a simple Muller-style view)
        ticks = sorted({x for xs, _ in pop.values() for x in xs})
        index = {t: i for i, t in enumerate(ticks)}
        stacks = []
        for name in names:
            ys = [0.0] * len(ticks)
            for x, y in zip(*pop[name]):
                ys[index[x]] = y or 0
            stacks.append(ys)
        fig, ax = plt.subplots(figsize=(11, 4))
        ax.stackplot(ticks, stacks, labels=names, colors=[ROLE_COLORS.get(n) for n in names] if grouping == "role" else None, alpha=0.85)
        draw_events(ax, events)
        ax.set_xlabel("Tick")
        ax.set_ylabel("Population")
        ax.set_title("Population share by " + grouping)
        ax.legend(fontsize=8, loc="upper left")
        fig.tight_layout()
        fig.savefig(os.path.join(out, "stacked_%s.png" % grouping), dpi=150)
        plt.close(fig)


def plot_burrow_soil(ts_rows, groups_rows, events, out):
    if not ts_rows:
        return
    ticks = [int(r["tick"]) for r in ts_rows]
    fig, ax1 = plt.subplots(figsize=(11, 4))
    ax1.plot(ticks, [num(r["burrowers"]) for r in ts_rows], color="#8c564b", label="Organisms with claw cells")
    if "hidden" in ts_rows[0]:
        ax1.plot(ticks, [num(r["hidden"]) for r in ts_rows], color="#9467bd", label="Underground")
    role_pop = group_series(groups_rows, "role", "population")
    for name in ("Prey (burrowing)", "Prey (non-burrowing)", "Predators"):
        if name in role_pop:
            ax1.plot(*role_pop[name], color=ROLE_COLORS[name], alpha=0.5, linewidth=0.8, label=name)
    ax1.set_ylabel("Organisms")
    ax1.set_xlabel("Tick")
    soil = [num(r["soil_mean"]) for r in ts_rows]
    start = next((v for v in soil if v), None)
    if start:
        # both soil lines as percentages so they share an axis
        ax2 = ax1.twinx()
        ax2.plot(ticks, [100 * v / start if v is not None else None for v in soil], color="#2ca02c", label="Avg. soil fertility (% of start)")
        ax2.plot(ticks, [100 * num(r["soil_degraded_frac"]) if r["soil_degraded_frac"] != "" else None for r in ts_rows],
                 color="#ff7f0e", linestyle="--", label="Degraded tiles (%)")
        ax2.set_ylabel("Soil (%)")
        ax2.set_ylim(0, 105)
        ax2.legend(fontsize=8, loc="upper right")
    draw_events(ax1, events)
    ax1.legend(fontsize=8, loc="upper left")
    ax1.set_title("Burrowing (claw cells), prey and soil health")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "burrow_soil.png"), dpi=150)
    plt.close(fig)


def plot_followed(species_rows, events, out, root, window):
    parent = {r["species"]: r["ancestor"] for r in species_rows}
    memo = {}

    def descends(name):
        chain = []
        cur = name
        result = False
        while cur:
            if cur == root:
                result = True
                break
            if cur in memo:
                result = memo[cur]
                break
            chain.append(cur)
            cur = parent.get(cur, "")
        for n in chain:
            memo[n] = result
        return result

    totals = defaultdict(lambda: {"self": [0, 0, 0.0], "desc": [0, 0, 0.0]})  # pop, deaths, lifetime
    for r in species_rows:
        if not descends(r["species"]):
            continue
        g = totals[int(r["tick"])]["self" if r["species"] == root else "desc"]
        g[0] += int(r["population"])
        g[1] += int(r["deaths"])
        if r["fitness"] != "":
            g[2] += float(r["fitness"]) * int(r["deaths"])
    if not totals:
        print("No rows found for species '%s'" % root)
        return
    ticks = sorted(totals)
    fig, (ax1, ax2) = plt.subplots(2, 1, sharex=True, figsize=(11, 7))
    for key, label in (("self", root), ("desc", root + " descendants")):
        ax1.plot(ticks, [totals[t][key][0] for t in ticks], label=label)
        fit = [totals[t][key][2] / totals[t][key][1] if totals[t][key][1] else None for t in ticks]
        ax2.plot(ticks, smooth(fit, window), label=label)
    ax1.set_ylabel("Population")
    ax2.set_ylabel("Fitness (avg lifespan, ticks)")
    ax2.set_xlabel("Tick")
    for ax in (ax1, ax2):
        draw_events(ax, [e for e in events if not e["type"].startswith("species_") or e["species"] == root], include_species=True)
    ax1.legend(fontsize=8)
    ax1.set_title("Species '%s' and its descendants" % root)
    fig.tight_layout()
    fig.savefig(os.path.join(out, "followed_%s.png" % root), dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("folder")
    parser.add_argument("--out", default="plots")
    parser.add_argument("--smooth", type=int, default=5, help="samples to average fitness over (1 = off)")
    parser.add_argument("--follow", help="species name to plot with all its descendant species")
    parser.add_argument("--top", type=int, default=8, help="max lineages to draw")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    ts_rows = read_rows(args.folder, "timeseries")
    groups_rows = read_rows(args.folder, "groups_log")
    events = read_rows(args.folder, "key_moments")

    plot_groups(groups_rows, events, args.out, args.smooth, args.top)
    plot_burrow_soil(ts_rows, groups_rows, events, args.out)
    if args.follow:
        plot_followed(read_rows(args.folder, "species_log"), events, args.out, args.follow, args.smooth)
    print("Saved plots to", os.path.abspath(args.out))


if __name__ == "__main__":
    main()

// const CellTypes = require("../Organism/Cell/CellTypes");
const CellStates = require("../Organism/Cell/CellStates");
const Directions = require("../Organism/Directions");

// Renderer controls access to a canvas. There is one renderer for each canvas
class Renderer {
    constructor(canvas_id, container_id, cell_size) {
        this.cell_size = cell_size;
        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext("2d");
        this.fillWindow(container_id)
		this.height = this.canvas.height;
        this.width = this.canvas.width;
        // Dirty-cell queue. A per-cell flag dedupes entries, which is much cheaper
        // than a Set on the simulation hot path (every changeCell lands here).
        this.cells_to_render = [];
        // reusable per-state buckets so each frame sets fillStyle once per state
        this.buckets = new Map();
        this.cells_to_highlight = new Set();
        this.highlighted_cells = new Set();
    }

    fillWindow(container_id) {
        this.fillShape($('#'+container_id).height(), $('#'+container_id).width());
    }

    fillShape(height, width) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.height = this.canvas.height;
        this.width = this.canvas.width;
    }

    clear() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderFullGrid(grid) {
        for (var col of grid) {
            for (var cell of col){
                this.bucketCell(cell);
            }
        }
        this.flushBuckets();
    }

    renderCells() {
        var queue = this.cells_to_render;
        for (var i = 0; i < queue.length; i++) {
            var cell = queue[i];
            cell.render_pending = false;
            this.bucketCell(cell);
        }
        queue.length = 0;
        this.flushBuckets();
    }

    clearRenderQueue() {
        var queue = this.cells_to_render;
        for (var i = 0; i < queue.length; i++)
            queue[i].render_pending = false;
        queue.length = 0;
    }

    bucketCell(cell) {
        var bucket = this.buckets.get(cell.state);
        if (bucket === undefined) {
            bucket = [];
            this.buckets.set(cell.state, bucket);
        }
        bucket.push(cell);
    }

    // Draw all bucketed cells grouped by state: one fillStyle change per state
    // instead of one per cell. States with custom rendering (eyes) draw per cell.
    flushBuckets() {
        var ctx = this.ctx;
        var size = this.cell_size;
        for (var [state, bucket] of this.buckets) {
            if (bucket.length === 0)
                continue;
            if (state.custom_render) {
                for (var i = 0; i < bucket.length; i++)
                    state.render(ctx, bucket[i], size);
            }
            else {
                ctx.fillStyle = state.color;
                for (var i = 0; i < bucket.length; i++)
                    ctx.fillRect(bucket[i].x, bucket[i].y, size, size);
            }
            bucket.length = 0;
        }
    }

    renderCell(cell) {
        cell.state.render(this.ctx, cell, this.cell_size);
    }

    renderOrganism(org) {
        for(var org_cell of org.anatomy.cells) {
            var cell = org.getRealCell(org_cell);
            this.renderCell(cell);
        }
    }

    addToRender(cell) {
        if (this.highlighted_cells.size !== 0 && this.highlighted_cells.has(cell)){
            this.cells_to_highlight.add(cell);
        }
        if (!cell.render_pending) {
            cell.render_pending = true;
            this.cells_to_render.push(cell);
        }
    }

    renderHighlights() {
        for (var cell of this.cells_to_highlight) {
            this.renderCellHighlight(cell);
            this.highlighted_cells.add(cell);
        }
        this.cells_to_highlight.clear();
        
    }

    highlightOrganism(org) {
        for(var org_cell of org.anatomy.cells) {
            var cell = org.getRealCell(org_cell);
            this.cells_to_highlight.add(cell);
        }
    }

    highlightCell(cell) {
        this.cells_to_highlight.add(cell);
    }

    renderCellHighlight(cell, color="yellow") {
        this.renderCell(cell);
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillRect(cell.x, cell.y, this.cell_size, this.cell_size);
        this.ctx.globalAlpha = 1;
        this.highlighted_cells.add(cell);
    }

    clearAllHighlights(clear_to_highlight=false) {
        for (var cell of this.highlighted_cells) {
            this.renderCell(cell);
        }
        this.highlighted_cells.clear();
        if (clear_to_highlight) {
            this.cells_to_highlight.clear();
        }
    }
}

module.exports = Renderer;

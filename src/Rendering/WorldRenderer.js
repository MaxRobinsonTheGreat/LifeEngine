const CellStates = require("../Organism/Cell/CellStates");

const EYE = CellStates.eye.id;

// Draws the world from snapshots sent by the simulation worker. Each snapshot is
// one byte per cell (state id, plus eye direction in bits 4-5). Only cells that
// changed since the previous snapshot are redrawn, grouped by byte value so the
// canvas fill color is set once per value.
class WorldRenderer {
    constructor(canvas_id, container_id, cell_size) {
        this.cell_size = cell_size;
        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext("2d");
        this.fillWindow(container_id);
        this.cols = 0;
        this.rows = 0;
        this.last = null;         // previous snapshot
        this.highlighted = [];    // grid indices drawn with a highlight last frame
        this.hover = null;        // Int32Array [c0, r0, ...] to highlight, from the worker
        this.buckets = [];
        for (let i = 0; i < 256; i++) this.buckets.push([]);
    }

    fillWindow(container_id) {
        this.fillShape($('#'+container_id).height(), $('#'+container_id).width());
    }

    fillShape(height, width) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.height = this.canvas.height;
        this.width = this.canvas.width;
        this.last = null;
    }

    setGridSize(cols, rows) {
        if (cols !== this.cols || rows !== this.rows) {
            this.cols = cols;
            this.rows = rows;
            this.last = null;
        }
    }

    // force a full redraw on the next frame
    invalidate() {
        this.last = null;
    }

    clearAllHighlights() {
        this.hover = null;
    }

    drawCell(v, idx, size) {
        const c = (idx / this.rows) | 0;
        const r = idx - c * this.rows;
        this.ctx.fillRect(c * size, r * size, size, size);
    }

    drawEye(v, idx, size) {
        const ctx = this.ctx;
        const c = (idx / this.rows) | 0;
        const x = c * size, y = (idx - c * this.rows) * size;
        ctx.fillStyle = CellStates.eye.color;
        ctx.fillRect(x, y, size, size);
        if (size == 1)
            return;
        const half = size / 2;
        ctx.translate(x + half, y + half);
        ctx.rotate(((v >> 4) * 90) * Math.PI / 180);
        ctx.fillStyle = CellStates.eye.slit_color;
        ctx.fillRect(-size / 8, -half, size / 4, size / 2 + size / 4);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    drawValue(v, idx) {
        if ((v & 15) === EYE) {
            this.drawEye(v, idx, this.cell_size);
        }
        else {
            this.ctx.fillStyle = CellStates.all[v & 15].color;
            this.drawCell(v, idx, this.cell_size);
        }
    }

    draw(grid) {
        const last = this.last;
        const full = last === null || last.length !== grid.length;
        const buckets = this.buckets;
        if (full) {
            for (let i = 0; i < grid.length; i++) buckets[grid[i]].push(i);
        }
        else {
            for (let i = 0; i < grid.length; i++)
                if (grid[i] !== last[i]) buckets[grid[i]].push(i);
        }
        const size = this.cell_size;
        const ctx = this.ctx;
        for (let v = 0; v < 256; v++) {
            const bucket = buckets[v];
            if (bucket.length === 0) continue;
            if ((v & 15) === EYE) {
                for (let k = 0; k < bucket.length; k++) this.drawEye(v, bucket[k], size);
            }
            else {
                ctx.fillStyle = CellStates.all[v & 15].color;
                for (let k = 0; k < bucket.length; k++) this.drawCell(v, bucket[k], size);
            }
            bucket.length = 0;
        }
        this.last = grid;
        this.drawHighlights(grid);
    }

    drawHighlights(grid) {
        // restore cells highlighted last frame
        for (const idx of this.highlighted)
            if (idx < grid.length) this.drawValue(grid[idx], idx);
        this.highlighted = [];
        const hover = this.hover;
        if (hover === null)
            return;
        const ctx = this.ctx;
        const size = this.cell_size;
        for (let i = 0; i < hover.length; i += 2) {
            const c = hover[i], r = hover[i+1];
            if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
            const idx = c * this.rows + r;
            this.drawValue(grid[idx], idx);
            ctx.fillStyle = 'yellow';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(c * size, r * size, size, size);
            ctx.globalAlpha = 1;
            this.highlighted.push(idx);
        }
    }
}

module.exports = WorldRenderer;

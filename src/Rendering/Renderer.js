
// Renderer controls access to a canvas. There is one renderer for each canvas
class Renderer {
    constructor(canvas_id, container_id, cell_size) {
        this.cell_size = cell_size;
        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = $('#'+container_id).width();
        this.canvas.height = $('#'+container_id).height();
		this.height = this.canvas.height;
        this.width = this.canvas.width;
        this.cells_to_render = new Set();
        this.cells_to_highlight = new Set();
        this.highlighted_cells = new Set();
    }

    clear() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.height, this.width);
    }

    renderFullGrid(grid) {
        for (var col of grid) {
            for (var cell of col){
                this.ctx.fillStyle = cell.getColor();
                this.ctx.fillRect(cell.x, cell.y, this.cell_size, this.cell_size);
            }
        }
    }

    renderCells() {
        for (var cell of this.cells_to_render) {
            this.renderCell(cell);
        }
        this.cells_to_render.clear();
    }

    renderCell(cell) {
        this.ctx.fillStyle = cell.getColor();
        this.ctx.fillRect(cell.x, cell.y, this.cell_size, this.cell_size);
    }

    renderOrganism(org) {
        for(var org_cell of org.cells) {
            var cell = org.getRealCell(org_cell);
            this.renderCell(cell);
        }
    }

    addToRender(cell) {
        if (this.highlighted_cells.has(cell)){
            this.cells_to_highlight.add(cell);
        }
        this.cells_to_render.add(cell);
    }

    renderHighlights() {
        for (var cell of this.cells_to_highlight) {
            this.renderCellHighlight(cell);
            this.highlighted_cells.add(cell);
        }
        this.cells_to_highlight.clear();
        
    }

    highlightOrganism(org) {
        for(var org_cell of org.cells) {
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

// $("body").mousemove(function(e) {
//     console.log("hello");
// });

module.exports = Renderer;

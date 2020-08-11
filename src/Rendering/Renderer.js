const CellTypes = require("../Organism/Cell/CellTypes");
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
        this.cells_to_render = new Set();
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
        if (cell.type == CellTypes.eye) {
            this.renderEyeCell(cell);
        }
    }

    renderEyeCell(cell) {
        if(this.cell_size == 1)
            return;
        if (this.cell_size % 2 == 0){
            //even
            var w = 2;
        }
        else{
            //odd
            var w = 1;
        }
        var halfInt = Math.floor(this.cell_size/2);
        var halfFloat = this.cell_size/2;
        var h = this.cell_size/3;
        var x = cell.x + h - Math.floor(w/2);
        var y = cell.y;
        

        this.ctx.translate(cell.x+halfFloat, cell.y+halfFloat);
        this.ctx.rotate(cell.direction * 90 * Math.PI / 180);
        // switch(cell.direction) {
        //     case Directions.up:
        //         this.ctx.rotate(90 * Math.PI / 180);
        //         break;
        //     case Directions.right:
        //         this.ctx.rotate(Math.PI / 180);
        //         break;
        //     case Directions.down:
        //         this.ctx.rotate(180 * Math.PI / 180);
        //         break;
        //     case Directions.left:
        //         this.ctx.rotate(270 * Math.PI / 180);
        //         break;
        // }
        this.ctx.fillStyle = '#FFFC5E';
        this.ctx.fillRect(-halfFloat, -halfFloat, this.cell_size, h);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
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

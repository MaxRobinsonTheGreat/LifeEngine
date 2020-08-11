const Environment = require('./Environment');
const Grid = require('../Grid/GridMap');
const Renderer = require('../Rendering/Renderer');
const GridMap = require('../Grid/GridMap');
const Organism = require('../Organism/Organism');
const CellTypes = require('../Organism/Cell/CellTypes');
const Cell = require('../Organism/Cell/Cell');
const EnvironmentController = require('../Controllers/EnvironmentController');

class WorldEnvironment extends Environment{
    constructor(cell_size) {
        super();
        this.renderer = new Renderer('env-canvas', 'env', cell_size);
        this.controller = new EnvironmentController(this, this.renderer.canvas);
        var grid_rows = Math.floor(this.renderer.height / cell_size);
        var grid_cols = Math.floor(this.renderer.width / cell_size);
        this.grid_map = new GridMap(grid_cols, grid_rows, cell_size);
        this.renderer.renderFullGrid(this.grid_map.grid);
        this.organisms = [];
        this.walls = [];
        this.total_mutability = 0;
        this.auto_reset = true;
        this.largest_cell_count = 0;
        this.reset_count = 0;
    }

    update(delta_time) {
        var to_remove = [];
        for (var i in this.organisms) {
            var org = this.organisms[i];
            if (!org.living || !org.update()) {
                to_remove.push(i);
            }
        }
        this.removeOrganisms(to_remove);
    }

    render() {
        this.renderer.renderCells();
        this.renderer.renderHighlights();
    }

    removeOrganisms(org_indeces) {
        for (var i of org_indeces.reverse()){
            this.total_mutability -= this.organisms[i].mutability;
            this.organisms.splice(i, 1);
        }
        if (this.organisms.length == 0 && this.auto_reset){
            this.reset_count++;
            this.reset();
        }
    }

    OriginOfLife() {
        var center = this.grid_map.getCenter();
        var org = new Organism(center[0], center[1], this);
        org.addCell(CellTypes.eye, 0, 0);
        org.addCell(CellTypes.mouth, -1, -1);
        org.addCell(CellTypes.mover, 1, 1);
        this.addOrganism(org);
    }

    addOrganism(organism) {
        organism.updateGrid();
        this.total_mutability += organism.mutability;
        this.organisms.push(organism);
        if (organism.cells.length > this.largest_cell_count) 
            this.largest_cell_count = organism.cells.length;
    }

    averageMutability() {
        if (this.organisms.length < 1)
            return 0;
        return this.total_mutability / this.organisms.length;
    }

    changeCell(c, r, type, owner) {
        super.changeCell(c, r, type, owner);
        this.renderer.addToRender(this.grid_map.cellAt(c, r));
        if(type == CellTypes.wall)
            this.walls.push(this.grid_map.cellAt(c, r));
    }

    clearWalls() {
        for(var wall of this.walls){
            if (this.grid_map.cellAt(wall.col, wall.row).type == CellTypes.wall)
                this.changeCell(wall.col, wall.row, CellTypes.empty, null);
        }
    }

    clearOrganisms() {
        for (var org of this.organisms)
            org.die();
        this.organisms = [];
    }

    reset(clear_walls=true) {
        this.organisms = [];
        this.grid_map.fillGrid(CellTypes.empty);
        this.renderer.renderFullGrid(this.grid_map.grid);
        this.total_mutability = 0;
        this.OriginOfLife();
    }

    resizeGridColRow(cell_size, cols, rows) {
        this.renderer.cell_size = cell_size;
        this.renderer.fillShape(rows*cell_size, cols*cell_size);
        this.grid_map.resize(cols, rows, cell_size);
        this.reset();
    }

    resizeFillWindow(cell_size) {
        this.renderer.cell_size = cell_size;
        this.renderer.fillWindow('env');
        var cols = Math.floor(this.renderer.width / cell_size);
        var rows = Math.floor(this.renderer.height / cell_size);
        this.grid_map.resize(cols, rows, cell_size);
        this.reset();
    }
}

module.exports = WorldEnvironment;


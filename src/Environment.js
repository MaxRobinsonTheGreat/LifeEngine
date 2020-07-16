const Grid = require('./GridMap');
const Renderer = require('./Rendering/Renderer');
const GridMap = require('./GridMap');
const Organism = require('./Organism');
const CellTypes = require('./CellTypes');
const Cell = require('./Cell');
const EnvironmentController = require('./EnvironmentController');

class Environment{
    constructor(cell_size) {
        this.renderer = new Renderer('canvas', this, cell_size);
        this.controller = new EnvironmentController(this, this.renderer.canvas);
        this.grid_rows = Math.floor(this.renderer.height / cell_size);
        this.grid_cols = Math.floor(this.renderer.width / cell_size);
        this.grid_map = new GridMap(this.grid_cols, this.grid_rows, cell_size);
        this.renderer.renderFullGrid();
        this.organisms = [];
        this.walls = [];
        this.total_mutability = 0;
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
    }

    OriginOfLife() {
        var center = this.grid_map.getCenter();
        var org = new Organism(center[0], center[1], this);
        org.addCell(CellTypes.mouth, 0, 0);
        org.addCell(CellTypes.producer, -1, -1);
        org.addCell(CellTypes.producer, 1, 1);
        this.addOrganism(org);
    }

    addOrganism(organism) {
        organism.updateGrid();
        this.total_mutability += organism.mutability;
        this.organisms.push(organism);
    }

    averageMutability() {
        if (this.organisms.length < 1)
            return 0;
        return this.total_mutability / this.organisms.length;
    }

    changeCell(c, r, type, owner) {
        this.grid_map.setCellType(c, r, type);
        this.grid_map.setCellOwner(c, r, owner);
        this.renderer.addToRender(this.grid_map.cellAt(c, r));
        if(type == CellTypes.wall)
            this.walls.push(this.grid_map.cellAt(c, r));
    }

    clearWalls() {
        for(var wall of this.walls)
            this.changeCell(wall.col, wall.row, CellTypes.empty, null);
    }

    clearOrganisms() {
        for (var org of this.organisms)
            org.die();
        this.organisms = [];
    }

    reset() {
        this.organisms = [];
        this.grid_map.fillGrid(CellTypes.empty);
        this.renderer.renderFullGrid();
        this.total_mutability = 0;
        this.OriginOfLife();
    }
}

module.exports = Environment;


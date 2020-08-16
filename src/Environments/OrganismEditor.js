const Environment = require('./Environment');
const Organism = require('../Organism/Organism');
const GridMap = require('../Grid/GridMap');
const Renderer = require('../Rendering/Renderer');
const CellTypes = require('../Organism/Cell/CellTypes');
const EditorController = require("../Controllers/EditorController");
const Cell = require("../Organism/Cell/Cell");
const Eye = require('../Organism/Perception/Eye');
const Directions = require('../Organism/Directions');

class OrganismEditor extends Environment{
    constructor() {
        super();
        this.is_active = true;
        var cell_size = 13;
        this.renderer = new Renderer('editor-canvas', 'editor-env', cell_size);
        this.controller = new EditorController(this, this.renderer.canvas);
        this.grid_map = new GridMap(15, 15, cell_size);
        this.clear();

        this.renderer.renderFullGrid(this.grid_map.grid);
    }

    update() {
        if (this.is_active){
            this.renderer.renderHighlights();
        }
    }

    changeCell(c, r, type, owner) {
        super.changeCell(c, r, type, owner);
        this.renderer.renderFullGrid(this.grid_map.grid);
    }

    // absolute c r, not local
    addCellToOrg(c, r, type) {
        var center = this.grid_map.getCenter();
        var loc_c = c - center[0];
        var loc_r = r - center[1];
        var prev_cell = this.organism.getLocalCell(loc_c, loc_r)
        if (prev_cell != null) {
            console.log(prev_cell.type)
            if (type == CellTypes.eye && prev_cell.type != CellTypes.eye){
                prev_cell.eye = new Eye(Directions.up);
                
            }
            prev_cell.type = type;
            this.changeCell(c, r, type, this.organism);
        }
        else if (this.organism.addCell(type, loc_c, loc_r)){
            this.changeCell(c, r, type, this.organism);
        }
    }

    removeCellFromOrg(c, r) {
        var center = this.grid_map.getCenter();
        var loc_c = c - center[0];
        var loc_r = r - center[1];
        if (loc_c == 0 && loc_r == 0){
            alert("Cannot remove center cell");
            return;
        }
        var prev_cell = this.organism.getLocalCell(loc_c, loc_r)
        if (prev_cell != null) {
            if (this.organism.removeCell(loc_c, loc_r)) {
                this.changeCell(c, r, CellTypes.empty, null);
            }
        }
    }

    setOrganismToCopyOf(orig_org){
        this.grid_map.fillGrid(CellTypes.empty);
        var center = this.grid_map.getCenter();
        this.organism = new Organism(center[0], center[1], this, orig_org);
        this.organism.updateGrid();
        this.controller.updateDetails();
    }

    getCopyOfOrg() {
        var new_org = new Organism(0, 0, null, this.organism);
        return new_org;
    }

    clear() {
        this.grid_map.fillGrid(CellTypes.empty);
        var center = this.grid_map.getCenter();
        this.organism = new Organism(center[0], center[1], this, null);
        this.organism.addCell(CellTypes.mouth, 0, 0);
        this.organism.updateGrid();
    }
}

module.exports = OrganismEditor;
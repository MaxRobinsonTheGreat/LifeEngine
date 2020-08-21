const Environment = require('./Environment');
const Organism = require('../Organism/Organism');
const GridMap = require('../Grid/GridMap');
const Renderer = require('../Rendering/Renderer');
const CellStates = require('../Organism/Cell/CellStates');
const EditorController = require("../Controllers/EditorController");
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
    }

    update() {
        if (this.is_active){
            this.renderer.renderHighlights();
        }
    }

    changeCell(c, r, state, owner) {
        super.changeCell(c, r, state, owner);
        this.renderFull();
    }

    renderFull() {
        this.renderer.renderFullGrid(this.grid_map.grid);
    }

    // absolute c r, not local
    addCellToOrg(c, r, state) {
        var center = this.grid_map.getCenter();
        var loc_c = c - center[0];
        var loc_r = r - center[1];
        var prev_cell = this.organism.getLocalCell(loc_c, loc_r)
        if (prev_cell != null) {
            var new_cell = this.organism.replaceCell(state, prev_cell.loc_col, prev_cell.loc_row, false);
            this.changeCell(c, r, state, new_cell);
        }
        else if (this.organism.canAddCellAt(loc_c, loc_r)){
            this.changeCell(c, r, state, this.organism.addDefaultCell(state, loc_c, loc_r));
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
                this.changeCell(c, r, CellStates.empty, null);
            }
        }
    }

    setOrganismToCopyOf(orig_org){
        this.grid_map.fillGrid(CellStates.empty);
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
        this.grid_map.fillGrid(CellStates.empty);
        var center = this.grid_map.getCenter();
        this.organism = new Organism(center[0], center[1], this, null);
        this.organism.addDefaultCell(CellStates.mouth, 0, 0);
        this.organism.updateGrid();
    }
}

module.exports = OrganismEditor;
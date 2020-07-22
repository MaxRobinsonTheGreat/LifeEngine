const CanvasController = require("./CanvasController");
const Organism = require('../Organism/Organism');
const Modes = require("./ControlModes");
const CellTypes = require("../Organism/Cell/CellTypes");
const Neighbors = require("../Grid/Neighbors");
const Cell = require("../Organism/Cell/Cell");

class EnvironmentController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.None;
        this.org_to_clone = null;
    }

    mouseMove() {
        this.performModeAction();
    }

    mouseDown() {
        this.performModeAction();
    }

    performModeAction() {
        var mode = this.mode;
        var right_click = this.right_click;
        var left_click = this.left_click;
        if (mode != Modes.None && (right_click || left_click)) {
            var cell = this.cur_cell;
            if (cell == null){
                return;
            }
            switch(mode) {
                case Modes.FoodDrop:
                    if (left_click){
                        this.dropCellType(cell.col, cell.row, CellTypes.food, false);
                    }
                    else if (right_click){
                        this.dropCellType(cell.col, cell.row, CellTypes.empty, false);
                    }
                    break;
                case Modes.WallDrop:
                        if (left_click){
                            this.dropCellType(cell.col, cell.row, CellTypes.wall, true);

                        }
                        else if (right_click){
                            this.dropCellType(cell.col, cell.row, CellTypes.empty, false);
                        }
                        break;
                case Modes.ClickKill:
                    this.killNearOrganisms();
                    break;

                case Modes.Select:
                    if (this.cur_org == null) {
                        this.cur_org = this.findNearOrganism();
                    }
                    if (this.cur_org != null){
                        this.control_panel.setEditorOrganism(this.cur_org);
                    }
                    break;

                case Modes.Clone:
                    if (this.org_to_clone != null){
                        var new_org = new Organism(this.mouse_c, this.mouse_r, this.env, this.org_to_clone);
                        if (new_org.isClear(this.mouse_c, this.mouse_r)){
                            this.env.addOrganism(new_org)
                        }
                    }
                    break;
            }
        }
    }

    dropCellType(col, row, type, killBlocking=false) {
        for (var loc of Neighbors.allSelf){
            var c=col + loc[0];
            var r=row + loc[1];
            var cell = this.env.grid_map.cellAt(c, r);
            if (cell == null)
                continue;
            if (killBlocking && cell.owner != null){
                cell.owner.die();
            }
            else if (cell.owner != null) {
                continue;
            }
            this.env.changeCell(c, r, type, null);
        }
    }

    findNearOrganism() {
        for (var loc of Neighbors.all){
            var c = this.cur_cell.col + loc[0];
            var r = this.cur_cell.row + loc[1];
            var cell = this.env.grid_map.cellAt(c, r);
            if (cell.owner != null)
                return cell.owner;
        }
        return null;
    }

    killNearOrganisms() {
        for (var loc of Neighbors.allSelf){
            var c = this.cur_cell.col + loc[0];
            var r = this.cur_cell.row + loc[1];
            var cell = this.env.grid_map.cellAt(c, r);
            if (cell.owner != null)
                cell.owner.die();
        }
    }


}

module.exports = EnvironmentController;

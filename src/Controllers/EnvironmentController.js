const CanvasController = require("./CanvasController");
const Organism = require('../Organism/Organism');
const Modes = require("./ControlModes");
const CellTypes = require("../Organism/Cell/CellTypes");

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
                    if (left_click && cell.type == CellTypes.empty){
                        this.env.changeCell(cell.col, cell.row, CellTypes.food, null);
                    }
                    else if (right_click && cell.type == CellTypes.food){
                        this.env.changeCell(cell.col, cell.row, CellTypes.empty, null);
                    }
                    break;
                case Modes.WallDrop:
                        if (left_click && (cell.type == CellTypes.empty || cell.type == CellTypes.food)){
                            this.env.changeCell(cell.col, cell.row, CellTypes.wall, null);
                        }
                        else if (right_click && cell.type == CellTypes.wall){
                            this.env.changeCell(cell.col, cell.row, CellTypes.empty, null);
                        }
                        break;
                case Modes.ClickKill:
                    if (this.cur_org != null)
                        this.cur_org.die();
                    break;

                case Modes.Select:
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

    dropWall(cell) {

    }

    dropFood(cell) {

    }


}

module.exports = EnvironmentController;

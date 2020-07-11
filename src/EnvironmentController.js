var Modes = require("./ControlModes");
const CellTypes = require("./CellTypes");

class EnvironmentController{
    constructor(env, canvas) {
        this.env = env;
        this.canvas = canvas;
        this.mouse_x;
        this.mouse_y;
        this.mouse_c;
        this.mouse_r;
        this.left_click = false;
        this.right_click = false;
        this.cur_cell = null;
        this.cur_org = null;
        this.mode = Modes.None;
        this.defineEvents();
    }

    defineEvents() {
        this.canvas.addEventListener('mousemove', e => {
            var prev_cell = this.cur_cell;
            var prev_org = this.cur_org;

            this.mouse_x = e.offsetX;
            this.mouse_y = e.offsetY;
            var colRow = this.env.grid_map.xyToColRow(this.mouse_x, this.mouse_y);
            this.mouse_c = colRow[0];
            this.mouse_r = colRow[1];
            this.cur_cell = this.env.grid_map.cellAt(this.mouse_c, this.mouse_r);
            this.cur_org = this.cur_cell.owner;

            if (this.cur_org != prev_org || this.cur_cell != prev_cell) {
                this.env.renderer.clearAllHighlights(true);
                if (this.cur_org != null) {
                    this.env.renderer.highlightOrganism(this.cur_org);
                }
                else if (this.cur_cell != null) {
                    this.env.renderer.highlightCell(this.cur_cell, true);
                }
            }
            this.performModeAction();
        });

        this.canvas.addEventListener('mouseup', function(evt) {
            evt.preventDefault();
            this.left_click=false;
            this.right_click=false;
        }.bind(this));

        this.canvas.addEventListener('mousedown', function(evt) {
            evt.preventDefault();
            if (evt.button == 0) {
                this.left_click = true;
            }
            if (evt.button == 2) 
                this.right_click = true;
            this.performModeAction();
        }.bind(this));

        this.canvas.addEventListener('contextmenu', function(evt) {
            evt.preventDefault();
        });

        this.canvas.addEventListener('mouseleave', function(){
            this.right_click = false;
            this.left_click = false;
        }.bind(this));

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
            }
        }
    }


}

module.exports = EnvironmentController;

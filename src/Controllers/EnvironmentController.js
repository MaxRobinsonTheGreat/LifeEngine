const CanvasController = require("./CanvasController");
const Organism = require('../Organism/Organism');
const Modes = require("./ControlModes");
const CellTypes = require("../Organism/Cell/CellTypes");
const Neighbors = require("../Grid/Neighbors");
const Cell = require("../Organism/Cell/Cell");

class EnvironmentController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.Drag;
        this.org_to_clone = null;
        this.defineZoomControls();
        this.scale = 1;
    }

    defineZoomControls() {
          var scale = 1;
          var zoom_speed = 0.5;
          const el = document.querySelector('#env-canvas');
          el.onwheel = function zoom(event) {
            event.preventDefault();
            var sign = -1*Math.sign(event.deltaY);
            
            // Restrict scale
            scale = Math.max(0.5, scale+(sign*zoom_speed));
          
            // Apply scale transform
            el.style.transform = `scale(${scale})`;
            this.scale = scale;
          }.bind(this);
    }

    resetView() {
        $('#env-canvas').css('transform', 'scale(1)');
        $('#env-canvas').css('top', '0px');
        $('#env-canvas').css('left', '0px');
        this.scale = 1;
    }

    updateMouseLocation(offsetX, offsetY){
        
        super.updateMouseLocation(offsetX, offsetY);
    }

    mouseMove() {
        this.performModeAction();
    }

    mouseDown() {
        this.start_x = this.mouse_x;
        this.start_y = this.mouse_y;
        this.performModeAction();
    }

    mouseUp() {

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
                        console.log(this.cur_org)
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
                case Modes.Drag:
                    var cur_top = parseInt($('#env-canvas').css('top'), 10);
                    var cur_left = parseInt($('#env-canvas').css('left'), 10);
                    var new_top = cur_top + ((this.mouse_y - this.start_y)*this.scale);
                    var new_left = cur_left + ((this.mouse_x - this.start_x)*this.scale);
                    $('#env-canvas').css('top', new_top+'px');
                    $('#env-canvas').css('left', new_left+'px');
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
            if (cell != null && cell.owner != null)
                return cell.owner;
        }
        return null;
    }

    killNearOrganisms() {
        for (var loc of Neighbors.allSelf){
            var c = this.cur_cell.col + loc[0];
            var r = this.cur_cell.row + loc[1];
            var cell = this.env.grid_map.cellAt(c, r);
            if (cell != null && cell.owner != null)
                cell.owner.die();
        }
    }


}

module.exports = EnvironmentController;

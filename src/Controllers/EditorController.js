const CanvasController = require("./CanvasController");
const Modes = require("./ControlModes");
const CellTypes = require("../Organism/Cell/CellTypes");
const Directions = require("../Organism/Directions");

class EditorController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.None;
        this.edit_cell_type = null;
        this.highlight_org = false;
        this.defineCellTypeSelection();
        this.defineEditorOptions();
    }

    mouseMove() {
        if (this.right_click || this.left_click)
            this.editOrganism();
    }

    mouseDown() {
        this.editOrganism();
    }

    mouseUp(){}

    getCurLocalCell(){
        console.log(this.env.organism.getLocalCell(this.mouse_c-this.env.organism.c, this.mouse_r-this.env.organism.r))
        return this.env.organism.getLocalCell(this.mouse_c-this.env.organism.c, this.mouse_r-this.env.organism.r);
    }

    setEyeDirection(){

    }

    editOrganism() {
        if (this.edit_cell_type == null || this.mode != Modes.Edit)
            return;
        if (this.left_click){
            if(this.edit_cell_type == CellTypes.eye) {
                if (this.cur_cell.type == CellTypes.eye){
                    var loc_cell = this.getCurLocalCell();
                    var dir = loc_cell.eye.direction;
                    dir = Directions.rotateRight(dir);
                    loc_cell.eye.direction = dir;
                    this.cur_cell.direction = dir;
                    this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
                }
                else {
                    this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
                    var loc_cell = this.getCurLocalCell();
                    loc_cell.eye.direction = Directions.up;
                    this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
                }
            }
            else{
                this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
            }
        }
        if (this.right_click)
            this.env.removeCellFromOrg(this.mouse_c, this.mouse_r);
    }

    updateDetails() {
        $('#birth-distance').val(this.env.organism.birth_distance);
    }

    defineCellTypeSelection() {
        var self = this;
        $('.cell-type').click( function() {
            switch(this.id){
                case "mouth":
                    self.edit_cell_type = CellTypes.mouth;
                    break;
                case "producer":
                    self.edit_cell_type = CellTypes.producer;
                    break;
                case "mover":
                    self.edit_cell_type = CellTypes.mover;
                    break;
                case "killer":
                    self.edit_cell_type = CellTypes.killer;
                    break;
                case "armor":
                    self.edit_cell_type = CellTypes.armor;
                    break;
                case "eye":
                    self.edit_cell_type = CellTypes.eye;
                    break;
            }
            $(".cell-type" ).css( "border-color", "black" );
            var selected = '#'+this.id+'.cell-type';
            $(selected).css("border-color", "yellow");
        });
    }

    defineEditorOptions() {
        $('#birth-distance').change ( function() {
            this.env.organism.birth_distance = parseInt($('#birth-distance').val());
        }.bind(this));
        
    }
}

module.exports = EditorController;

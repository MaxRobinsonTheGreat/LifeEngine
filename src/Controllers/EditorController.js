const CanvasController = require("./CanvasController");
const Modes = require("./ControlModes");
const CellTypes = require("../Organism/Cell/CellTypes");

class EditorController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.None;
        this.edit_cell_type = null;
        this.highlight_org = false;
        this.defineCellTypeSelection();
    }

    mouseMove() {
        if (this.right_click || this.left_click)
            this.editOrganism();
    }

    mouseDown() {
        this.editOrganism();
    }

    editOrganism() {
        if (this.edit_cell_type == null || this.mode != Modes.Edit)
            return;
        if (this.left_click)
            this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
        if (this.right_click)
            this.env.removeCellFromOrg(this.mouse_c, this.mouse_r);
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
            }
            $(".cell-type" ).css( "border-color", "black" );
            var selected = '#'+this.id+'.cell-type';
            $(selected).css("border-color", "yellow");
        });
    }
}

module.exports = EditorController;

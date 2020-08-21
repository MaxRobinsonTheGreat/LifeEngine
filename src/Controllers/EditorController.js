const CanvasController = require("./CanvasController");
const Modes = require("./ControlModes");
const CellStates = require("../Organism/Cell/CellStates");
const Directions = require("../Organism/Directions");
const Hyperparams = require("../Hyperparameters");

class EditorController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.None;
        this.edit_cell_type = null;
        this.highlight_org = false;
        this.defineCellTypeSelection();
        this.defineEditorDetails();
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
        return this.env.organism.getLocalCell(this.mouse_c-this.env.organism.c, this.mouse_r-this.env.organism.r);
    }

    editOrganism() {
        if (this.edit_cell_type == null || this.mode != Modes.Edit)
            return;
        if (this.left_click){
            if(this.edit_cell_type == CellStates.eye && this.cur_cell.state == CellStates.eye) {
                var loc_cell = this.getCurLocalCell();
                loc_cell.direction = Directions.rotateRight(loc_cell.direction);
                this.env.renderFull();
            }
            else
                this.env.addCellToOrg(this.mouse_c, this.mouse_r, this.edit_cell_type);
        }
        if (this.right_click)
            this.env.removeCellFromOrg(this.mouse_c, this.mouse_r);
        this.setBrainPanelVisibility();
        this.setMoveRangeVisibility();
    }

    updateDetails() {
        $('#birth-distance').val(this.env.organism.birth_distance);
        $('.cell-count').text("Cell count: "+this.env.organism.cells.length);
    }

    defineCellTypeSelection() {
        var self = this;
        $('.cell-type').click( function() {
            switch(this.id){
                case "mouth":
                    self.edit_cell_type = CellStates.mouth;
                    break;
                case "producer":
                    self.edit_cell_type = CellStates.producer;
                    break;
                case "mover":
                    self.edit_cell_type = CellStates.mover;
                    break;
                case "killer":
                    self.edit_cell_type = CellStates.killer;
                    break;
                case "armor":
                    self.edit_cell_type = CellStates.armor;
                    break;
                case "eye":
                    self.edit_cell_type = CellStates.eye;
                    break;
            }
            $(".cell-type" ).css( "border-color", "black" );
            var selected = '#'+this.id+'.cell-type';
            $(selected).css("border-color", "yellow");
        });
    }

    defineEditorDetails() {
        this.details_html = $('#organism-details');
        this.edit_details_html = $('#edit-organism-details');

        this.decision_names = ["ignore", "move away", "move towards"];

        $('#birth-distance-edit').change ( function() {
            this.env.organism.birth_distance = parseInt($('#birth-distance-edit').val());
        }.bind(this));
        $('#move-range-edit').change ( function() {
            this.env.organism.move_range = parseInt($('#move-range-edit').val());
        }.bind(this));
        $('#observation-type-edit').change ( function() {
            this.setBrainEditorValues($('#observation-type-edit').val());
        }.bind(this));
        $('#reaction-edit').change ( function() {
            var obs = $('#observation-type-edit').val();
            var decision = parseInt($('#reaction-edit').val());
            this.env.organism.brain.decisions[obs] = decision;
        }.bind(this));
    }

    clearDetailsPanel() {
        $('#organism-details').css('display', 'none');
        $('#edit-organism-details').css('display', 'none');
    }

    setDetailsPanel() {
        var org = this.env.organism;
        
        $('.cell-count').text("Cell count: "+org.cells.length);
        $('#birth-distance').text("Reproduction Distance: "+org.birth_distance);
        $('#move-range').text("Move Range: "+org.move_range);
        $('#mutation-rate').text("Mutation Rate: "+org.mutability);
        if (Hyperparams.useGlobalMutability) {
            $('#mutation-rate').css('display', 'none');
        }
        else {
            $('#mutation-rate').css('display', 'block');
        }

        this.setMoveRangeVisibility();

        if (this.setBrainPanelVisibility()) {
            var chase_types = [];
            var retreat_types = [];
            for(var cell_name in org.brain.decisions) {
                var decision = org.brain.decisions[cell_name];
                if (decision == 1) {
                    retreat_types.push(cell_name)
                }
                else if (decision == 2) {
                    chase_types.push(cell_name);
                }
            }
            $('#chase-types').text("Move Towards: " + chase_types);
            $('#retreat-types').text("Move Away From: " + retreat_types);

        }
        $('#organism-details').css('display', 'block');
    }

    setEditorPanel() {
        this.clearDetailsPanel();
        var org = this.env.organism;

        $('.cell-count').text("Cell count: "+org.cells.length);
        $('#birth-distance-edit').val(org.birth_distance);
        if (this.setMoveRangeVisibility()){
            $('#move-range-edit').val(org.move_range);
        }
        
        if (this.setBrainPanelVisibility()){
            this.setBrainEditorValues($('#observation-type-edit').val());
        }

        $('#cell-selections').css('display', 'grid');
        $('#edit-organism-details').css('display', 'block');
    }

    setBrainPanelVisibility() {
        var org = this.env.organism;
        if (org.has_eyes && org.is_mover) {
            $('.brain-details').css('display', 'block');
            return true;
        }
        $('.brain-details').css('display', 'none');
        return false;
    }

    setMoveRangeVisibility() {
        var org = this.env.organism;
        if (org.is_mover) {
            $('#move-range-cont').css('display', 'block');
            $('#move-range').css('display', 'block');
            return true;
        }
        $('#move-range-cont').css('display', 'none');
        $('#move-range').css('display', 'none');
        return false;
    }

    setBrainEditorValues(name) {
        $('#observation-type-edit').val(name);
        var reaction = this.env.organism.brain.decisions[name];
        $('#reaction-edit').val(reaction);
    }
}

module.exports = EditorController;

const Hyperparams = require("../Hyperparameters");
const Modes = require("./ControlModes");
const CellTypes = require("../Organism/Cell/CellTypes");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineEngineSpeedControls();
        this.defineTabNavigation();
        this.defineHyperparameterControls();
        this.defineModeControls();
        this.fps = engine.fps;
        this.organism_record=0;
        this.env_controller = this.engine.env.controller;
        this.editor_controller = this.engine.organism_editor.controller;
        this.env_controller.setControlPanel(this);
        this.editor_controller.setControlPanel(this);
    }

    defineEngineSpeedControls(){
        this.slider = document.getElementById("slider");
        this.slider.oninput = function() {
            this.fps = this.slider.value
            if (this.engine.running) {
                this.changeEngineSpeed(this.fps);
                
            }
            $('#fps').text("Target FPS: "+this.fps);
        }.bind(this);
        $('#pause-button').click(function() {
            if ($('#pause-button').text() == "Pause" && this.engine.running) {
                $('#pause-button').text("Play");
                this.engine.stop();
            }
            else if (!this.engine.running){
                $('#pause-button').text("Pause");
                this.engine.start(this.fps);
            }
        }.bind(this));
    }

    defineTabNavigation() {
        var self = this;
        $('.tabnav-item').click(function() {
            $('.tab').css('display', 'none');
            var tab = '#'+this.id+'.tab';
            self.engine.organism_editor.is_active = (this.id == 'editor');
            $(tab).css('display', 'grid');
        });
    }

    defineHyperparameterControls() {
        $('#food-prod-prob').change(function() {
            var food_prob = $('#food-prod-prob').val();
            if ($('#fixed-ratio').is(":checked")) {
                Hyperparams.foodProdProb = food_prob;
                Hyperparams.calcProducerFoodRatio(false);
                $('#lifespan-multiplier').val(Hyperparams.lifespanMultiplier);
            }
            else{
                Hyperparams.foodProdProb = food_prob;
            }
        }.bind(this));
        $('#lifespan-multiplier').change(function() {
            var lifespan = $('#lifespan-multiplier').val();
            if ($('#fixed-ratio').is(":checked")) {
                Hyperparams.lifespanMultiplier = lifespan;
                Hyperparams.calcProducerFoodRatio(true);
                $('#food-prod-prob').val(Hyperparams.foodProdProb);
            }
            else {
                Hyperparams.lifespanMultiplier = lifespan;
            }
        }.bind(this));
        $('.mut-prob').change( function() {
            switch(this.id){
                case "add-prob":
                    Hyperparams.addProb = this.value;
                    Hyperparams.balanceMutationProbs(1);
                    break;
                case "change-prob":
                    Hyperparams.changeProb = this.value;
                    Hyperparams.balanceMutationProbs(2);
                    break;
                case "remove-prob":
                    Hyperparams.removeProb = this.value;
                    Hyperparams.balanceMutationProbs(3);
                    break;
            }
            $('#add-prob').val(Math.floor(Hyperparams.addProb));
            $('#change-prob').val(Math.floor(Hyperparams.changeProb));
            $('#remove-prob').val(Math.floor(Hyperparams.removeProb));
        });

        $('#mover-rot').change(function() {
            Hyperparams.moversCanRotate = this.checked;
        });
        $('#offspring-rot').change(function() {
            Hyperparams.offspringRotate = this.checked;
        });
        $('#insta-kill').change(function() {
            Hyperparams.instaKill = this.checked;
        });
    }

    defineModeControls() {
        var self = this;
        $('#editor-mode').change( function(el) {
            var selection = $(this).children("option:selected").val();
            var prev_mode = self.env_controller.mode;
            $('#cell-selections').css('display', 'none');
            switch(selection){
                case "none":
                    self.setMode(Modes.None);
                    break;
                case "food":
                    self.setMode(Modes.FoodDrop);
                    break;
                case "wall":
                    self.setMode(Modes.WallDrop);
                    break;
                case "kill":
                    self.setMode(Modes.ClickKill);
                    break;
                case "select":
                    if (prev_mode==Modes.Edit || prev_mode==Modes.Clone && self.engine.organism_editor.organism.cells.length > 1){
                        if (confirm("Selecting a new organism will clear the current organism. Are you sure you wish to switch?")) {
                            self.setMode(Modes.Select);
                        }
                        else {
                            $("#editor-mode").val('edit');
                        }
                    }
                    else {
                        self.setMode(Modes.Select);
                    }
                    break;
                case "edit":
                    self.setMode(Modes.Edit);
                    $('#cell-selections').css('display', 'grid');
                    break;
                case "clone":
                    self.setMode(Modes.Clone);
                    self.env_controller.org_to_clone = self.engine.organism_editor.getCopyOfOrg();
                    break;
            }
        });


        $('#reset-env').click( function() {
            this.engine.env.reset();
        }.bind(this));
        $('#kill-all').click( function() {
            this.engine.env.clearOrganisms();
        }.bind(this));
        $('#clear-walls').click( function() {
            this.engine.env.clearWalls();
        }.bind(this));
        $('#clear-editor').click( function() {
            this.engine.organism_editor.clear();
        }.bind(this));
    }

    setMode(mode) {
        this.env_controller.mode = mode;
        this.editor_controller.mode = mode;
    }

    setEditorOrganism(org) {
        this.engine.organism_editor.setOrganismToCopyOf(org);
    }

    changeEngineSpeed(change_val) {
        this.engine.stop();
        this.engine.start(change_val)
        this.fps = this.engine.fps;
    }

    update() {
        $('#fps-actual').text("Actual FPS: " + Math.floor(this.engine.actual_fps));
        var org_count = this.engine.env.organisms.length;
        $('#org-count').text("Organism count:  " + org_count);
        if (org_count > this.organism_record) 
            this.organism_record = org_count;
        $('#org-record').text("Highest count: " + this.organism_record);
        $('#avg-mut').text("Average Mutation Rate: " + Math.round(this.engine.env.averageMutability() * 100) / 100);
    }

}


module.exports = ControlPanel;
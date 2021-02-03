const Hyperparams = require("../Hyperparameters");
const Modes = require("./ControlModes");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineMinMaxControls();
        this.defineEngineSpeedControls();
        this.defineGridSizeControls();
        this.defineTabNavigation();
        this.defineHyperparameterControls();
        this.defineModeControls();
        this.defineChallenges();
        this.fps = engine.fps;
        this.organism_record=0;
        this.env_controller = this.engine.env.controller;
        this.editor_controller = this.engine.organism_editor.controller;
        this.env_controller.setControlPanel(this);
        this.editor_controller.setControlPanel(this);
    }

    defineMinMaxControls(){
        $('#minimize').click ( function() {
            $('.control-panel').css('display', 'none');
            $('.hot-controls').css('display', 'block');
        });
        $('#maximize').click ( function() {
            $('.control-panel').css('display', 'grid');
            $('.hot-controls').css('display', 'none');
        });
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
        $('.pause-button').click(function() {
            $('.pause-button').find("i").toggleClass("fa fa-pause");
            $('.pause-button').find("i").toggleClass("fa fa-play");
            if (this.engine.running) {
                this.engine.stop();
            }
            else if (!this.engine.running){
                this.engine.start(this.fps);
            }
        }.bind(this));
    }

    defineGridSizeControls() {
        $('#fill-window').change(function() {
            if (this.checked)
                $('.col-row-input').css('display' ,'none');
            else
                $('.col-row-input').css('display' ,'block');
        });

        $('#resize').click(function() {
            var cell_size = $('#cell-size').val();
            var fill_window = $('#fill-window').is(":checked");
            if (fill_window) {
                this.engine.env.resizeFillWindow(cell_size);
            }
            else {
                var cols = $('#col-input').val();
                var rows = $('#row-input').val();
                this.engine.env.resizeGridColRow(cell_size, cols, rows);
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
            var food_prob = 
            Hyperparams.foodProdProb = $('#food-prod-prob').val();;
        }.bind(this));
        $('#lifespan-multiplier').change(function() {
            Hyperparams.lifespanMultiplier = $('#lifespan-multiplier').val();
        }.bind(this));

        $('#mover-rot').change(function() {
            Hyperparams.moversCanRotate = this.checked;
        });
        $('#offspring-rot').change(function() {
            Hyperparams.offspringRotate = this.checked;
        });
        $('#insta-kill').change(function() {
            Hyperparams.instaKill = this.checked;
        });
        $('#look-range').change(function() {
            Hyperparams.lookRange = $('#look-range').val();
        });
        $('#food-drop-rate').change(function() {
            Hyperparams.foodDropProb = $('#food-drop-rate').val();
        });

        $('#evolved-mutation').change( function() {
            if (this.checked) {
                $('.global-mutation-in').css('display', 'none');
                $('#avg-mut').css('display', 'block');
            }
            else {
                $('.global-mutation-in').css('display', 'block');
                $('#avg-mut').css('display', 'none');
            }
            Hyperparams.useGlobalMutability = !this.checked;
        });
        $('#global-mutation').change( function() {
            Hyperparams.globalMutability = $('#global-mutation').val();
        });
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
        $('#movers-produce').change( function() {
            Hyperparams.moversCanProduce = this.checked;
        });
        $('#food-blocks').change( function() {
            Hyperparams.foodBlocksReproduction = this.checked;        
        });
        $('#reset-rules').click( function() {
            Hyperparams.setDefaults();
            $('#food-prod-prob').val(Hyperparams.foodProdProb);
            $('#lifespan-multiplier').val(Hyperparams.lifespanMultiplier);
            $('#mover-rot').prop('checked', Hyperparams.moversCanRotate);
            $('#offspring-rot').prop('checked', Hyperparams.offspringRotate);
            $('#insta-kill').prop('checked', Hyperparams.instaKill);
            $('#evolved-mutation').prop('checked', !Hyperparams.useGlobalMutability);
            $('#add-prob').val(Hyperparams.addProb);
            $('#change-prob').val(Hyperparams.changeProb);
            $('#remove-prob').val(Hyperparams.removeProb);
            $('#movers-produce').prop('checked', Hyperparams.moversCanProduce);
            $('#food-blocks').prop('checked', Hyperparams.foodBlocksReproduction);
            if (!Hyperparams.useGlobalMutability) {
                $('.global-mutation-in').css('display', 'none');
                $('#avg-mut').css('display', 'block');
            }
            else {
                $('.global-mutation-in').css('display', 'block');
                $('#avg-mut').css('display', 'none');
            }
        });
    }

    defineModeControls() {
        var self = this;
        $('.edit-mode-btn').click( function() {
            $('#cell-selections').css('display', 'none');
            $('#organism-options').css('display', 'none');
            self.editor_controller.setDetailsPanel();
            switch(this.id){
                case "food-drop":
                    self.setMode(Modes.FoodDrop);
                    break;
                case "wall-drop":
                    self.setMode(Modes.WallDrop);
                    break;
                case "click-kill":
                    self.setMode(Modes.ClickKill);
                    break;
                case "select":
                    self.setMode(Modes.Select);
                    break;
                case "edit":
                    self.setMode(Modes.Edit);
                    self.editor_controller.setEditorPanel();
                    break;
                case "drop-org":
                    self.setMode(Modes.Clone);
                    self.env_controller.org_to_clone = self.engine.organism_editor.getCopyOfOrg();
                    break;
                case "drag-view":
                    self.setMode(Modes.Drag);
            }
            $('.edit-mode-btn').css('background-color', '#9099c2');
            $('#'+this.id).css('background-color', '#81d2c7');
        });

        $('.reset-view').click( function(){
            this.env_controller.resetView();
        }.bind(this));

        var env = this.engine.env;
        $('#reset-env').click( function() {
            this.engine.env.reset();
        }.bind(this));
        $('#auto-reset').change(function() {
            env.auto_reset = this.checked;
        });
        $('#clear-walls').click( function() {
            if (confirm("Are you sure you want to clear all the walls?")) {
                this.engine.env.clearWalls();
            }
        }.bind(this));
        $('#clear-editor').click( function() {
            this.engine.organism_editor.clear();
            this.editor_controller.setEditorPanel();
        }.bind(this));
    }

    defineChallenges() {
        $('.challenge-btn').click(function() {
            $('#challenge-title').text($(this).text());
            $('#challenge-description').text($(this).val());
        });
    }

    setMode(mode) {
        this.env_controller.mode = mode;
        this.editor_controller.mode = mode;
    }

    setEditorOrganism(org) {
        this.engine.organism_editor.setOrganismToCopyOf(org);
        this.editor_controller.clearDetailsPanel();
        this.editor_controller.setDetailsPanel();
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
        $('#largest-org').text("Largest Organism: " + this.engine.env.largest_cell_count + " cells");
        $('#reset-count').text("Auto reset count: " + this.engine.env.reset_count);
    }

}


module.exports = ControlPanel;
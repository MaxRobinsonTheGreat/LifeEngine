const Hyperparams = require("../Hyperparameters");
const Modes = require("./ControlModes");
const StatsPanel = require("../Stats/StatsPanel");

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
        this.stats_panel = new StatsPanel(this.engine.env);
        this.headless_opacity = 1;
        this.opacity_change_rate = -0.8;
        this.paused=false;
    }

    defineMinMaxControls(){
        this.control_panel_active = true;
        this.no_hud = false;
        $('#minimize').click ( () => {
            $('.control-panel').css('display', 'none');
            $('.hot-controls').css('display', 'block');
            this.control_panel_active = false;
            this.stats_panel.stopAutoRender();
        });
        $('#maximize').click ( () => {
            $('.control-panel').css('display', 'grid');
            $('.hot-controls').css('display', 'none');
            this.control_panel_active = true;
            if (this.tab_id == 'stats') {
                this.stats_panel.startAutoRender();
            }
        });
        const V_KEY = 118;
        $('body').keypress( (e) => {
            if (e.which === V_KEY) {
                if (this.no_hud) {
                    let control_panel_display = this.control_panel_active ? 'grid' : 'none';
                    let hot_control_display = !this.control_panel_active ? 'block' : 'none';
                    if (this.control_panel_active && this.tab_id == 'stats') {
                        this.stats_panel.startAutoRender();
                    };
                    $('.control-panel').css('display', control_panel_display);
                    $('.hot-controls').css('display', hot_control_display);
                }
                else {
                    $('.control-panel').css('display', 'none');
                    $('.hot-controls').css('display', 'none');
                }
                this.no_hud = !this.no_hud;
            }
        });
        // var self = this;
        // $('#minimize').click ( function() {
        //     $('.control-panel').css('display', 'none');
        //     $('.hot-controls').css('display', 'block');
            
        // }.bind(this));
        // $('#maximize').click ( function() {
        //     $('.control-panel').css('display', 'grid');
        //     $('.hot-controls').css('display', 'none');
        //     if (self.tab_id == 'stats') {
        //         self.stats_panel.startAutoRender();
        //     }
        // });
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
            this.paused = !this.paused;
            if (this.engine.running) {
                this.engine.stop();
            }
            else if (!this.engine.running){
                this.engine.start(this.fps);
            }
        }.bind(this));
        $('.headless').click(function() {
            $('.headless').find("i").toggleClass("fa fa-eye");
            $('.headless').find("i").toggleClass("fa fa-eye-slash");
            if (Hyperparams.headless){
                $('#headless-notification').css('display', 'none');
                this.engine.env.renderFull();
            }
            else {
                $('#headless-notification').css('display', 'block');
            }
            Hyperparams.headless = !Hyperparams.headless;
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
            this.engine.env.reset();
            this.stats_panel.reset();
            
        }.bind(this));
    }

    defineTabNavigation() {
        this.tab_id = 'about';
        var self = this;
        $('.tabnav-item').click(function() {
            $('.tab').css('display', 'none');
            var tab = '#'+this.id+'.tab';
            $(tab).css('display', 'grid');
            self.engine.organism_editor.is_active = (this.id == 'editor');
            self.stats_panel.stopAutoRender();
            if (this.id == 'stats') {
                self.stats_panel.startAutoRender();
            }
            self.tab_id = this.id;
        });
    }

    defineHyperparameterControls() {
        $('#food-prod-prob').change(function() {
            Hyperparams.foodProdProb = $('#food-prod-prob').val();
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
            Hyperparams.globalMutability = parseInt($('#global-mutation').val());
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
            $('#food-drop-rate').val(Hyperparams.foodDropProb);
            $('#look-range').val(Hyperparams.lookRange);

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
            switch(this.id) {
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
                    self.env_controller.add_new_species = self.editor_controller.new_species;
                    self.editor_controller.new_species = false;
                    // console.log(self.env_controller.add_new_species)
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
            this.stats_panel.reset();
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

    updateHeadlessIcon(delta_time) {
        if (this.paused)
            return;
        var op = this.headless_opacity + (this.opacity_change_rate*delta_time/1000);
        if (op <= 0.4){
            op=0.4;
            this.opacity_change_rate = -this.opacity_change_rate;
        }
        else if (op >= 1){
            op=1;
            this.opacity_change_rate = -this.opacity_change_rate;
        }
        this.headless_opacity = op;
        $('#headless-notification').css('opacity',(op*100)+'%');
    }

    update(delta_time) {
        $('#fps-actual').text("Actual FPS: " + Math.floor(this.engine.actual_fps));
        $('#reset-count').text("Auto reset count: " + this.engine.env.reset_count);
        this.stats_panel.updateDetails();
        if (Hyperparams.headless)
            this.updateHeadlessIcon(delta_time);

    }

}


module.exports = ControlPanel;
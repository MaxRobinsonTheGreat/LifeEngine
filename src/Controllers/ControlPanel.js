const Hyperparams = require("../Hyperparameters");
const Modes = require("./ControlModes");
const StatsPanel = require("../Stats/StatsPanel");
const WorldConfig = require("../WorldConfig");
const LoadController = require("./LoadController");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineMinMaxControls();
        this.defineHotkeys();
        this.defineEngineSpeedControls();
        this.defineTabNavigation();
        this.defineHyperparameterControls();
        this.defineWorldControls();
        this.defineModeControls();
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
        this.setHyperparamDefaults();
        LoadController.control_panel = this;
    }

    defineMinMaxControls(){
        this.control_panel_active = false;
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
    }

    defineHotkeys() {
        $('body').keydown( (e) => {
            let focused = document.activeElement;
            if (focused.tagName === "INPUT" && focused.type === "text") return;
            switch (e.key.toLowerCase()) {
                // hot bar controls
                case 'a':
                    $('.reset-view')[0].click();
                    break;
                case 's':
                    $('#drag-view').click();
                    break;
                case 'd':
                    $('#wall-drop').click();
                    break;
                case 'f':
                    $('#food-drop').click();
                    break;
                case 'g':
                    $('#click-kill').click();
                    break;
                case 'h':
                    $('.headless')[0].click();
                    break;
                case 'j':
                case ' ':
                    e.preventDefault();
                    $('.pause-button')[0].click();
                    break;
                // miscellaneous hotkeys
                case 'q': // minimize/maximize control panel
                    e.preventDefault();
                    if (this.control_panel_active)
                        $('#minimize').click();
                    else
                        $('#maximize').click();
                    break;
                case 'z':
                    $('#select').click();
                    break;
                case 'x':
                    $('#edit').click();
                    break;
                case 'c':
                    $('#drop-org').click();
                    break;
                case 'v': // toggle hud
                    if (this.no_hud) {
                        let control_panel_display = this.control_panel_active ? 'grid' : 'none';
                        let hot_control_display = !this.control_panel_active ? 'block' : 'none';
                        if (this.control_panel_active && this.tab_id == 'stats') {
                            this.stats_panel.startAutoRender();
                        };
                        $('.control-panel').css('display', control_panel_display);
                        $('.hot-controls').css('display', hot_control_display);
                        $('.community-section').css('display', 'block');
                    }
                    else {
                        $('.control-panel').css('display', 'none');
                        $('.hot-controls').css('display', 'none');
                        $('.community-section').css('display', 'none');
                        LoadController.close();
                    }
                    this.no_hud = !this.no_hud;
                    break;
                case 'b':
                    $('#clear-walls').click();
            }
        });
    }

    defineEngineSpeedControls(){
        this.slider = document.getElementById("slider");
        this.slider.oninput = function() {
            const max_fps = 300;
            this.fps = parseInt(this.slider.value);
            if (this.fps>=max_fps) this.fps = 1000;
            if (this.engine.running) {
                this.changeEngineSpeed(this.fps);
            }
            let text = this.fps >= max_fps ? 'MAX' : this.fps;
            $('#fps').text("Target FPS: "+text);
        }.bind(this);

        $('.pause-button').click(function() {
            // toggle pause
            this.setPaused(this.engine.running);
        }.bind(this));

        $('.headless').click(function() {
            $('.headless').find("i").toggleClass("fa fa-eye");
            $('.headless').find("i").toggleClass("fa fa-eye-slash");
            if (WorldConfig.headless){
                $('#headless-notification').css('display', 'none');
                this.engine.env.renderFull();
            }
            else {
                $('#headless-notification').css('display', 'block');
            }
            WorldConfig.headless = !WorldConfig.headless;
        }.bind(this));
    }

    defineTabNavigation() {
        this.tab_id = 'about';
        var self = this;
        $('.tabnav-item').click(function() {
            $('.tab').css('display', 'none');
            var tab = '#'+this.id+'.tab';
            $(tab).css('display', 'grid');
            $('.tabnav-item').removeClass('open-tab')
            $('#'+this.id+'.tabnav-item').addClass('open-tab');
            self.engine.organism_editor.is_active = (this.id == 'editor');
            self.stats_panel.stopAutoRender();
            if (this.id === 'stats') {
                self.stats_panel.startAutoRender();
            }
            else if (this.id === 'editor') {
                self.editor_controller.refreshDetailsPanel();
            }
            self.tab_id = this.id;
        });
    }

    defineWorldControls() {
        $('#fill-window').change(function() {
            if (this.checked)
                $('.col-row-input').css('display' ,'none');
            else
                $('.col-row-input').css('display' ,'block');
        });

        $('#resize').click(function() {
            if (!confirm('The current environment will be lost. Proceed?'))
                return;
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
            this.engine.env.reset(false);
            this.stats_panel.reset();
            
        }.bind(this));

        $('#auto-reset').change(function() {
            WorldConfig.auto_reset = this.checked;
        });
        $('#auto-pause').change(function() {
            WorldConfig.auto_pause = this.checked;
        });
        $('#clear-walls-reset').change(function() {
            WorldConfig.clear_walls_on_reset = this.checked;
        });
        $('#reset-with-editor-org').click( () => {
            let env = this.engine.env;
            if (!env.reset(true, false)) return;
            let center = env.grid_map.getCenter();
            let org = this.editor_controller.env.getCopyOfOrg();
            this.env_controller.dropOrganism(org, center[0], center[1])
        });
        $('#save-env').click( () => {
            let was_running = this.engine.running;
            this.setPaused(true);
            let env = this.engine.env.serialize();
            let data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(env));
            let downloadEl = document.getElementById('download-el');
            downloadEl.setAttribute("href", data);
            downloadEl.setAttribute("download", $('#save-env-name').val()+".json");
            downloadEl.click();
            if (was_running)
                this.setPaused(false);
        });
        $('#load-env').click(() => {
            LoadController.loadJson((env)=>{
                this.loadEnv(env);
            });
        });
        $('#upload-env').change((e)=>{
            let files = e.target.files;
            if (!files.length) {return;};
            let reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let env = JSON.parse(e.target.result);
                    this.loadEnv(env);
                } catch(except) {
                    console.error(except)
                    alert('Failed to load world');
                }
                $('#upload-env')[0].value = '';
            };
            reader.readAsText(files[0]);
        });
    }

    loadEnv(env) {
        if (this.tab_id == 'stats')
            this.stats_panel.stopAutoRender();
        let was_running = this.engine.running;
        this.setPaused(true);
        this.engine.env.loadRaw(env);
        if (was_running)
            this.setPaused(false);
        this.updateHyperparamUIValues();
        this.env_controller.resetView();
        if (this.tab_id == 'stats')
            this.stats_panel.startAutoRender();
    }

    defineHyperparameterControls() {
        $('#food-prod-prob').change(function() {
            Hyperparams.foodProdProb = $('#food-prod-prob').val();
        }.bind(this));
        $('#lifespan-multiplier').change(function() {
            Hyperparams.lifespanMultiplier = $('#lifespan-multiplier').val();
        }.bind(this));

        $('#rot-enabled').change(function() {
            Hyperparams.rotationEnabled = this.checked;
        });
        $('#insta-kill').change(function() {
            Hyperparams.instaKill = this.checked;
        });
        $('#look-range').change(function() {
            Hyperparams.lookRange = $('#look-range').val();
        });
        $('#see-through-self').change(function() {
            Hyperparams.seeThroughSelf = this.checked;
        });
        $('#food-drop-rate').change(function() {
            Hyperparams.foodDropProb = $('#food-drop-rate').val();
        });
        $('#extra-mover-cost').change(function() {
            Hyperparams.extraMoverFoodCost = parseInt($('#extra-mover-cost').val());
        });
        $('#org-limit').change(function() {
            Hyperparams.maxOrganisms = parseInt($('#org-limit').val());
        });

        $('#evolved-mutation').change( function() {
            if (this.checked) {
                $('.global-mutation-container').css('display', 'none');
                $('#avg-mut').css('display', 'block');
            }
            else {
                $('.global-mutation-container').css('display', 'block');
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
                    break;
                case "change-prob":
                    Hyperparams.changeProb = this.value;
                    break;
                case "remove-prob":
                    Hyperparams.removeProb = this.value;
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
        $('#reset-rules').click(() => {
            this.setHyperparamDefaults();
        });
        $('#save-controls').click(() => {
            let data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Hyperparams));
            let downloadEl = document.getElementById('download-el');
            downloadEl.setAttribute("href", data);
            downloadEl.setAttribute("download", "controls.json");
            downloadEl.click();
        });
        $('#load-controls').click(() => {
            $('#upload-hyperparams').click();
        });
        $('#upload-hyperparams').change((e)=>{
            let files = e.target.files;
            if (!files.length) {return;};
            let reader = new FileReader();
            reader.onload = (e) => {
                let result=JSON.parse(e.target.result);
                Hyperparams.loadJsonObj(result);
                this.updateHyperparamUIValues();
                // have to clear the value so change() will be triggered if the same file is uploaded again
                $('#upload-hyperparams')[0].value = '';
            };
            reader.readAsText(files[0]);
        });
    }

    setHyperparamDefaults() {
        Hyperparams.setDefaults();
        this.updateHyperparamUIValues();
    }

    updateHyperparamUIValues(){
        $('#food-prod-prob').val(Hyperparams.foodProdProb);
        $('#lifespan-multiplier').val(Hyperparams.lifespanMultiplier);
        $('#rot-enabled').prop('checked', Hyperparams.rotationEnabled);
        $('#insta-kill').prop('checked', Hyperparams.instaKill);
        $('#evolved-mutation').prop('checked', !Hyperparams.useGlobalMutability);
        $('#add-prob').val(Hyperparams.addProb);
        $('#change-prob').val(Hyperparams.changeProb);
        $('#remove-prob').val(Hyperparams.removeProb);
        $('#movers-produce').prop('checked', Hyperparams.moversCanProduce);
        $('#food-blocks').prop('checked', Hyperparams.foodBlocksReproduction);
        $('#food-drop-rate').val(Hyperparams.foodDropProb);
        $('#extra-mover-cost').val(Hyperparams.extraMoverFoodCost);
        $('#org-limit').val(Hyperparams.maxOrganisms);
        $('#look-range').val(Hyperparams.lookRange);
        $('#see-through-self').prop('checked', Hyperparams.seeThroughSelf);
        $('#global-mutation').val(Hyperparams.globalMutability);

        if (!Hyperparams.useGlobalMutability) {
            $('.global-mutation-container').css('display', 'none');
            $('#avg-mut').css('display', 'block');
        }
        else {
            $('.global-mutation-container').css('display', 'block');
            $('#avg-mut').css('display', 'none');
        }
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
                    break;
                case "drop-org":
                    self.setMode(Modes.Clone);
                    break;
                case "drag-view":
                    self.setMode(Modes.Drag);
            }
            $('.edit-mode-btn').removeClass('selected');
            $('.'+this.id).addClass('selected');
        });
        $('.reset-view').click( function(){
            this.env_controller.resetView();
        }.bind(this));

        var env = this.engine.env;
        $('#reset-env').click( function() {
            env.reset();
            this.stats_panel.reset();
        }.bind(this));
        $('#clear-env').click( () => {
            env.reset(true, false);
            this.stats_panel.reset();
        });
        $('#brush-slider').on('input change', function () {
            WorldConfig.brush_size = this.value;
        });
        $('#random-walls').click( function() {
            this.env_controller.randomizeWalls();
        }.bind(this));
        $('#clear-walls').click( function() {
            this.engine.env.clearWalls();
        }.bind(this));
        $('#clear-editor').click( function() {
            this.engine.organism_editor.setDefaultOrg();
            this.editor_controller.setEditorPanel();
        }.bind(this));
        $('#generate-random').click( function() {
            this.engine.organism_editor.createRandom();
            this.editor_controller.refreshDetailsPanel();
        }.bind(this));
        $('.reset-random').click( function() {
            this.engine.organism_editor.resetWithRandomOrgs(this.engine.env);
        }.bind(this));

        window.onbeforeunload = function (e) {
            e = e || window.event;
            let return_str = 'this will cause a confirmation on page close'
            if (e) {
                e.returnValue = return_str;
            }
            return return_str;
        };
    }

    setPaused(paused) {
        if (paused) {
            $('.pause-button').find("i").removeClass("fa-pause");
            $('.pause-button').find("i").addClass("fa-play");
            if (this.engine.running) 
                this.engine.stop();
        }
        else if (!paused) {
            
            $('.pause-button').find("i").addClass("fa-pause");
            $('.pause-button').find("i").removeClass("fa-play");
            if (!this.engine.running)
                this.engine.start(this.fps);
        }
    }

    setMode(mode) {
        this.env_controller.mode = mode;
        this.editor_controller.mode = mode;

        if (mode == Modes.Edit) {
            this.editor_controller.setEditorPanel();
        }

        if (mode == Modes.Clone) {
            this.env_controller.org_to_clone = this.engine.organism_editor.getCopyOfOrg();
        }
    }

    setEditorOrganism(org) {
        this.engine.organism_editor.setOrganismToCopyOf(org);
        this.editor_controller.clearDetailsPanel();
        this.editor_controller.setDetailsPanel();
    }

    changeEngineSpeed(change_val) {
        this.engine.restart(change_val)
        this.fps = this.engine.fps;
    }

    updateHeadlessIcon(delta_time) {
        if (!this.engine.running)
            return;
        const min_opacity = 0.4;
        var op = this.headless_opacity + (this.opacity_change_rate*delta_time/1000);
        if (op <= min_opacity){
            op=min_opacity;
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
        if (WorldConfig.headless)
            this.updateHeadlessIcon(delta_time);

    }

}


module.exports = ControlPanel;
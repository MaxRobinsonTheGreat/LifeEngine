const Hyperparams = require("../Hyperparameters");
const Modes = require("./ControlModes");
const StatsPanel = require("../Stats/StatsPanel");
const WorldConfig = require("../WorldConfig");
const LoadController = require("./LoadController");
const {ColorScheme, color_scheme_names} = require("../Rendering/ColorScheme");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.fps = engine.fps;
        this.defineMinMaxControls();
        this.defineHotkeys();
        this.defineEngineSpeedControls();
        this.defineTabNavigation();
        this.defineHyperparameterControls();
        this.defineWorldControls();
        this.defineModeControls();
        this.defineColorSchemeControls();
        this.defineBrainEditorControls();
        this.organism_record=0;
        this.env_controller = this.engine.env.controller;
        this.editor_controller = this.engine.organism_editor.controller;
        this.env_controller.setControlPanel(this);
        this.editor_controller.setControlPanel(this);
        this.stats_panel = new StatsPanel(this.engine.env, this.engine.organism_editor);
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
        this.hot_slider = document.getElementById("slider-hot");

        // helper mappings
        const sliderToFps = (val) => {
            val = parseFloat(val);
            if (val <= 50) {
                // map 1..50 -> 1..120 linearly
                const ratio = (val - 1) / 49; // 0..1
                return Math.round(1 + ratio * 119);
            }
            const t = (val - 50) / 50; // 0-1
            const exp = 120 * Math.pow(10000 / 120, t);
            return Math.round(exp);
        };

        const fpsToSlider = (fps) => {
            if (fps <= 120) {
                return 1 + ((fps - 1) * 49) / 119;
            }
            const t = Math.log(fps / 120) / Math.log(10000 / 120); // 0-1
            return 50 + t * 50;
        };

        // initialise slider position from current fps and label
        this.slider.value = fpsToSlider(this.fps);
        if (this.hot_slider) {
            this.hot_slider.value = this.slider.value;
        }
        $('#fps').text("Target FPS: "+this.fps);

        this.slider.oninput = function() {
            let newFps;
            let fpsText;
            if (this.slider.value == 100) {
                newFps = 10000000;
                fpsText = "MAXIMUM OVERDRIVE";
            } else {
                newFps = sliderToFps(this.slider.value);
                fpsText = newFps;
            }
            
            this.fps = newFps;
            if (this.engine.running) {
                this.changeEngineSpeed(newFps);
            }
            $('#fps').text("Target FPS: " + fpsText);
            if (this.hot_slider) this.hot_slider.value = this.slider.value;
        }.bind(this);

        // check initial value
        if (this.slider.value == 100) {
            this.slider.oninput();
        }

        if (this.hot_slider) {
            this.hot_slider.oninput = function() {
                let newFps;
                let fpsText;
                if (this.hot_slider.value == 100) {
                    newFps = 10000000;
                    fpsText = "MAXIMUM OVERDRIVE";
                } else {
                    newFps = sliderToFps(this.hot_slider.value);
                    fpsText = newFps;
                }
                this.fps = newFps;
                if (this.engine.running) {
                    this.changeEngineSpeed(newFps);
                }
                $('#fps').text("Target FPS: " + fpsText);
                this.slider.value = this.hot_slider.value;
            }.bind(this);
            if (this.hot_slider.value == 100) {
                this.hot_slider.oninput();
            }
        }

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
                self.editor_controller.setEditorPanel();
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
            this.setPaused(true);
            if (fill_window) {
                this.engine.env.resizeFillWindow(cell_size);
            }
            else {
                var cols = $('#col-input').val();
                var rows = $('#row-input').val();
                this.engine.env.resizeGridColRow(cell_size, cols, rows);
            }
            this.engine.env.reset(false, true);
            this.stats_panel.reset();
            this.setPaused(false);
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
        if (env.grid.cell_size) {
            $('#cell-size').val(env.grid.cell_size);
        }
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
        $('#independent-eye-decisions').change(function() {
            Hyperparams.evolveIndependentEyeDecisions = this.checked;
        });
        $('#food-drop-rate').change(function() {
            Hyperparams.foodDropProb = $('#food-drop-rate').val();
        });
        $('#extra-mover-cost').change(function() {
            Hyperparams.extraMoverFoodCost = parseInt($('#extra-mover-cost').val());
        });
        $('#hide-duration').change(function() {
            Hyperparams.hideDuration = parseInt($('#hide-duration').val());
        });
        $('#hide-fertility-cost').change(function() {
            Hyperparams.hideFertilityCost = parseFloat($('#hide-fertility-cost').val());
        });
        $('#min-burrow-fertility').change(function() {
            Hyperparams.minBurrowFertility = parseFloat($('#min-burrow-fertility').val());
        });
        $('#min-plant-fertility').change(function() {
            Hyperparams.minPlantFertility = parseFloat($('#min-plant-fertility').val());
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
        $('#mutation-symmetry-chance').change(function() {
            Hyperparams.mutationSymmetryChance = parseInt($('#mutation-symmetry-chance').val());
        });
        $('#brain-mutation-chance').change(function() {
            Hyperparams.brainMutationChance = parseInt($('#brain-mutation-chance').val());
        });
        $('#movers-produce').change( function() {
            Hyperparams.moversCanProduce = this.checked;
        });
        $('#food-blocks').change( function() {
            Hyperparams.foodBlocksReproduction = this.checked;        
        });
        $('#dont-kill-same-species').change(function() {
            Hyperparams.dontKillSameSpecies = this.checked;
        });
        $('#reset-rules').click(() => {
            this.setHyperparamDefaults();
        });
        $('#safe-steps-per-tick').change(() => {
            this.engine.setSafeStepsPerTick(parseInt($('#safe-steps-per-tick').val()));
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
        $('#mutation-symmetry-chance').val(Hyperparams.mutationSymmetryChance);
        $('#brain-mutation-chance').val(Hyperparams.brainMutationChance);
        $('#movers-produce').prop('checked', Hyperparams.moversCanProduce);
        $('#food-blocks').prop('checked', Hyperparams.foodBlocksReproduction);
        $('#dont-kill-same-species').prop('checked', Hyperparams.dontKillSameSpecies);
        $('#food-drop-rate').val(Hyperparams.foodDropProb);
        $('#extra-mover-cost').val(Hyperparams.extraMoverFoodCost);
        $('#hide-duration').val(Hyperparams.hideDuration);
        $('#hide-fertility-cost').val(Hyperparams.hideFertilityCost);
        $('#min-burrow-fertility').val(Hyperparams.minBurrowFertility);
        $('#min-plant-fertility').val(Hyperparams.minPlantFertility);
        $('#org-limit').val(Hyperparams.maxOrganisms);
        $('#look-range').val(Hyperparams.lookRange);
        $('#see-through-self').prop('checked', Hyperparams.seeThroughSelf);
        $('#global-mutation').val(Hyperparams.globalMutability);
        $('#independent-eye-decisions').prop('checked', Hyperparams.evolveIndependentEyeDecisions);
        
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
            self.editor_controller.setEditorPanel();
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
            this.editor_controller.setEditorPanel();
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

    defineColorSchemeControls() {
        const select = $('#color-scheme-select');
        if (!select.length) return;
        color_scheme_names.forEach(name => select.append(`<option value="${name}">${name}</option>`));
        select.val('neon');
        select.change(function() { ColorScheme.loadColorScheme(this.value); });
    }

    // Brain Editor Controls
    defineBrainEditorControls() {
                // Replace brain detail panels with a single Brain-edit button while
        // retaining the original .brain-details wrapper so existing visibility
        // logic still works.
        const btnHtml = '<button class="brain-editor-btn" title="Edit Brain">Brain <i class="fa fa-brain"></i></button>';

        // Ensure each details section has a .brain-details container we can reuse.
        ['#organism-details', '#edit-organism-details'].forEach(sel => {
            let cont = $(sel + ' .brain-details');
            if (!cont.length) {
                $(sel).append('<div class="brain-details"></div>');
                cont = $(sel + ' .brain-details');
            }
            cont.empty().append(btnHtml);
        });

        if (!$('#brain-editor-window').length) {
            $('.control-panel').append(`
                <div id="brain-editor-window" class="brain-editor-window">
                    <div id="brain-info" class="brain-info"></div>
                    <div id="brain-maps"></div>
                    <button id="close-brain-editor"><i class="fa fa-times"></i></button>
                </div>`);
        }

        this.brain_editor_open = false;

        $('.brain-editor-btn').click(() => { this.toggleBrainEditor(); });
        $('#close-brain-editor').click(() => { this.toggleBrainEditor(false); });
    }

    toggleBrainEditor(show = undefined) {
        const win = $('#brain-editor-window');
        if (!win.length) return;
        if (show === undefined) {
            show = !this.brain_editor_open;
        }
        win.css('display', show ? 'block' : 'none');
        this.brain_editor_open = show;
        if (show) {
            this.editor_controller.updateBrainInfo();
        } else {
            if (this.engine && this.engine.organism_editor) {
                this.engine.organism_editor.renderer.clearAllHighlights(true);
            }
        }
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

        if (mode == Modes.Clone) {
            this.env_controller.org_to_clone = this.engine.organism_editor.organism;
        }
    }

    setEditorOrganism(org) {
        this.engine.organism_editor.setOrganismToCopyOf(org);
        this.editor_controller.clearDetailsPanel();
        this.editor_controller.setEditorPanel();
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
        $('#fps-hot').text(Math.floor(this.engine.actual_fps)+' FPS');
        $('#reset-count').text("Auto reset count: " + this.engine.env.reset_count);
        this.stats_panel.updateDetails();
        if (WorldConfig.headless)
            this.updateHeadlessIcon(delta_time);

    }

}


module.exports = ControlPanel;
const CellStates = require("../Organism/Cell/CellStates");

// Renderer controls access to a canvas. There is one renderer for each canvas
class ColorScheme {

    constructor(world_env, editor_env) {
        this.world_env = world_env;
        this.editor_env = editor_env;
        this.default_color_scheme = {
            "empty":"#0E1318",
            "food":"#2F7AB7",
            "wall":"#808080",
            "mouth":"#DEB14D",
            "producer":"#15DE59",
            "mover":"#60D4FF",
            "killer":"#F82380",
            "armor":"#7230DB",
            "eye":"#B6C1EA",
            "eye-slit": "#0E1318"
        };
        this.color_scheme = {};
        this.applyColorScheme();
    }

    loadColorScheme() {
        $('#empty-color').val(this.color_scheme["empty"]);
        $('#food-color').val(this.color_scheme["food"]);
        $('#wall-color').val(this.color_scheme["wall"]);
        $('#mouth-color').val(this.color_scheme["mouth"]);
        $('#producer-color').val(this.color_scheme["producer"]);
        $('#mover-color').val(this.color_scheme["mover"]);
        $('#killer-color').val(this.color_scheme["killer"]);
        $('#armor-color').val(this.color_scheme["armor"]);
        $('#eye-color').val(this.color_scheme["eye"]);
        for (var state of CellStates.all) {
            state.color = this.color_scheme[state.name];
        }
        CellStates.eye.slit_color=this.color_scheme['eye-slit']
        for (var cell_type in this.color_scheme) {
            $('#'+cell_type+'.cell-type ').css('background-color', this.color_scheme[cell_type]);
            $('#'+cell_type+'.cell-legend-type').css('background-color', this.color_scheme[cell_type]);
            
        }
        this.world_env.renderer.renderFullGrid(this.world_env.grid_map.grid);
        this.editor_env.renderer.renderFullGrid(this.editor_env.grid_map.grid);
    }

    setColorScheme() {
        this.color_scheme["empty"] = $('#empty-color').val();
        this.color_scheme["food"] = $('#food-color').val();
        this.color_scheme["wall"] = $('#wall-color').val();
        this.color_scheme["mouth"] = $('#mouth-color').val();
        this.color_scheme["producer"] = $('#producer-color').val();
        this.color_scheme["mover"] = $('#mover-color').val();
        this.color_scheme["killer"] = $('#killer-color').val();
        this.color_scheme["armor"] = $('#armor-color').val();
        this.color_scheme["eye"] = $('#eye-color').val();
        this.color_scheme["eye-slit"] = $('#empty-color').val();
    }

    resetColorScheme() {
        this.color_scheme = this.default_color_scheme;
        this.loadColorScheme();
    }

    applyColorScheme() {
        this.setColorScheme();
        this.loadColorScheme();
    }
}

module.exports = ColorScheme;
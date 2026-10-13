const CellStates = require("../Organism/Cell/CellStates");

const color_schemes = {
    "neon":{
        "empty":"#0E1318",
        "food":"#2F7AB7",
        "wall":"white",
        "mouth":"#DEB14D",
        "producer":"#15DE59",
        "mover":"#60D4FF",
        "killer":"#F82380",
        "armor":"#7230DB",
        "claw":"#FF6B35",
        "eye":"#B6C1EA",
        "eye-slit": "#0E1318"
    },
    "classic":{
        "empty":"#121D29",
        "food":"green",
        "wall":"gray",
        "mouth":"orange",
        "producer":"pink",
        "mover":"blue",
        "killer":"red",
        "armor":"purple",
        "claw":"sienna",
        "eye":"yellow",
        "eye-slit": "#121D29"
    },
    "soft":{
        "empty":"#0B0E11",
        "food":"#4F86B2",
        "wall":"#5F6F78",
        "mouth":"#B89A6A",
        "producer":"#4EA17B",
        "mover":"#6BA2C4",
        "killer":"#B06B85",
        "armor":"#7C69B5",
        "claw":"#C4835A",
        "eye":"#AEB4C2",
        "eye-slit": "#0B0E11"
    },
    "dark":{
        "empty":"black",
        "food":"#225986",
        "wall":"#56616E",
        "mouth":"#AD8A45",
        "producer":"#198D4F",
        "mover":"#278BB0",
        "killer":"#992E5E",
        "armor":"#5632B5",
        "claw":"#B5562A",
        "eye":"#8892B3",
        "eye-slit": "black"
    },
    "grayscale":{
        "empty":"black",
        "food":"#777777",
        "wall":"#EEEEEE",
        "mouth":"#FFFFFF",
        "producer":"#CCCCCC",
        "mover":"#BBBBBB",
        "killer":"#AAAAAA",
        "armor":"#999999",
        "claw":"#555555",
        "eye":"#888888",
        "eye-slit": "black"
    }
}
const color_scheme_names = Object.keys(color_schemes);

// Renderer controls access to a canvas. There is one renderer for each canvas
class ColorSchemeSingleton {
    constructor() {
        this.world_env = null;
        this.editor_env = null;
    }
    setEnvironment(world_env, editor_env) {
        this.world_env = world_env;
        this.editor_env = editor_env;
    }
    loadColorScheme(scheme_name='neon') {
        const color_scheme = color_schemes[scheme_name];
        for (var state of CellStates.all) {
            state.color = color_scheme[state.name];
        }
        CellStates.eye.slit_color=color_scheme['eye-slit']
        for (var cell_type in color_scheme) {
            $('#'+cell_type+'.cell-type ').css('background-color', color_scheme[cell_type]);
            $('#'+cell_type+'.cell-legend-type').css('background-color', color_scheme[cell_type]);
            
        }
        this.world_env.renderer.renderFullGrid(this.world_env.grid_map.grid);
        this.editor_env.renderer.renderFullGrid(this.editor_env.grid_map.grid);
    }
}

const ColorScheme = new ColorSchemeSingleton();
module.exports = {
    ColorScheme,
    color_scheme_names
}
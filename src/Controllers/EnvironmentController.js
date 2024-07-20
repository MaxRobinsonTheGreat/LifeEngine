const CanvasController = require("./CanvasController");
const Organism = require('../Organism/Organism');
const Modes = require("./ControlModes");
const CellStates = require("../Organism/Cell/CellStates");
const Neighbors = require("../Grid/Neighbors");
const FossilRecord = require("../Stats/FossilRecord");
const WorldConfig = require("../WorldConfig");
const Perlin = require("../Utils/Perlin");

class EnvironmentController extends CanvasController{
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.FoodDrop;
        this.org_to_clone = null;
        this.defineZoomControls();
        this.scale = 1;
    }

    defineZoomControls() {
          var scale = 1;
          var zoom_speed = 0.7;
          const el = document.querySelector('#env-canvas');
          el.onwheel = function zoom(event) {
            event.preventDefault();

            var sign = Math.sign(event.deltaY);
          
            scale *= Math.pow(zoom_speed, sign);
          
            const MAX = 32;
            const MIN = Math.pow(2, -3);
            scale = Math.min(MAX, Math.max(MIN, scale));

            var cur_top = parseInt($('#env-canvas').css('top'));
            var cur_left = parseInt($('#env-canvas').css('left'));

            var diff_x = (this.canvas.width/2  - this.mouse_x) * (scale - this.scale);
            var diff_y = (this.canvas.height/2 - this.mouse_y) * (scale - this.scale);

            $('#env-canvas').css('top', (cur_top+diff_y)+'px');
            $('#env-canvas').css('left', (cur_left+diff_x)+'px');
          
            // Apply scale transform
            el.style.transform = `scale(${scale})`;
            this.scale = scale;

          }.bind(this);
    }

    resetView() {
        $('#env-canvas').css('transform', 'scale(1)');
        $('#env-canvas').css('top', '0px');
        $('#env-canvas').css('left', '0px');
        this.scale = 1;
    }

    /*
    Iterate over grid from 0,0 to env.num_cols,env.num_rows and create random walls using perlin noise to create a more organic shape.
    */
    randomizeWalls(thickness=1) {
        this.env.clearWalls();
        const noise_threshold = -0.017;
        let avg_noise = 0;
        let resolution = 20;
        Perlin.seed();

        for (let r = 0; r < this.env.num_rows; r++) {
            for (let c = 0; c < this.env.num_cols; c++) {
                let xval = c/this.env.num_cols*(resolution/this.env.renderer.cell_size*(this.env.num_cols/this.env.num_rows));
                let yval = r/this.env.num_rows*(resolution/this.env.renderer.cell_size*(this.env.num_rows/this.env.num_cols));
                let noise = Perlin.get(xval, yval);
                avg_noise += noise/(this.env.num_rows*this.env.num_cols);
                if (noise > noise_threshold && noise < noise_threshold + thickness/resolution) {
                    let cell = this.env.grid_map.cellAt(c, r);
                    if (cell != null) {
                        if(cell.owner != null) cell.owner.die();
                        this.env.changeCell(c, r, CellStates.wall, null);
                    }
                }
            }
        }
    }

    updateMouseLocation(offsetX, offsetY){
        super.updateMouseLocation(offsetX, offsetY);
    }

    mouseMove() {
        this.performModeAction();
    }

    mouseDown() {
        this.start_x = this.mouse_x;
        this.start_y = this.mouse_y;
        this.performModeAction();
    }

    mouseUp() {

    }

    performModeAction() {
        if (WorldConfig.headless && this.mode != Modes.Drag)
            return;
        var mode = this.mode;
        var right_click = this.right_click;
        var left_click = this.left_click;
        if (mode != Modes.None && (right_click || left_click)) {
            var cell = this.cur_cell;
            if (cell == null){
                return;
            }
            switch(mode) {
                case Modes.FoodDrop:
                    if (left_click){
                        this.dropCellType(cell.col, cell.row, CellStates.food, false, CellStates.wall);
                    }
                    else if (right_click){
                        this.dropCellType(cell.col, cell.row, CellStates.empty, false, CellStates.wall);
                    }
                    break;
                case Modes.WallDrop:
                        if (left_click){
                            this.dropCellType(cell.col, cell.row, CellStates.wall, true);
                        }
                        else if (right_click){
                            this.dropCellType(cell.col, cell.row, CellStates.empty, false, CellStates.food);
                        }
                        break;
                case Modes.ClickKill:
                    this.killNearOrganisms();
                    break;

                case Modes.Select:
                    if (this.cur_org == null) {
                        this.cur_org = this.findNearOrganism();
                    }
                    if (this.cur_org != null){
                        this.control_panel.setEditorOrganism(this.cur_org);
                    }
                    break;

                case Modes.Clone:
                    if (this.org_to_clone != null){
                        this.dropOrganism(this.org_to_clone, this.mouse_c, this.mouse_r);
                    }
                    break;
                case Modes.Drag:
                    this.dragScreen();
                    break;
            }
        }
        else if (this.middle_click) {
            //drag on middle click
            this.dragScreen();
        }
    }

    dragScreen() {
        var cur_top = parseInt($('#env-canvas').css('top'));
        var cur_left = parseInt($('#env-canvas').css('left'));
        var new_top = cur_top + ((this.mouse_y - this.start_y)*this.scale);
        var new_left = cur_left + ((this.mouse_x - this.start_x)*this.scale);
        $('#env-canvas').css('top', new_top+'px');
        $('#env-canvas').css('left', new_left+'px');
    }

    dropOrganism(organism, col, row) {

        // close the organism and drop it in the world
        var new_org = new Organism(col, row, this.env, organism);

        if (new_org.isClear(col, row)) {
            let new_species = !FossilRecord.speciesIsExtant(new_org.species.name);
            if (new_org.species.extinct) {
                FossilRecord.resurrect(new_org.species);
            }
            else if (new_species) {
                FossilRecord.addSpeciesObj(new_org.species);
                new_org.species.start_tick = this.env.total_ticks;
                new_org.species.population = 0;
            }

            this.env.addOrganism(new_org);
            new_org.species.addPop();
            return true;
        }
        return false;
    }

    dropCellType(col, row, state, killBlocking=false, ignoreState=null) {
        for (var loc of Neighbors.inRange(WorldConfig.brush_size)){
            var c=col + loc[0];
            var r=row + loc[1];
            var cell = this.env.grid_map.cellAt(c, r);
            if (cell == null)
                continue;
            if (killBlocking && cell.owner != null){
                cell.owner.die();
            }
            else if (cell.owner != null) {
                continue;
            }
            if (ignoreState != null && cell.state == ignoreState)
                continue;
            this.env.changeCell(c, r, state, null);
        }
    }

    findNearOrganism() {
        let closest = null;
        let closest_dist = 100;
        for (let loc of Neighbors.inRange(WorldConfig.brush_size)){
            let c = this.cur_cell.col + loc[0];
            let r = this.cur_cell.row + loc[1];
            let cell = this.env.grid_map.cellAt(c, r);
            let dist = Math.abs(loc[0]) + Math.abs(loc[1]);
            if (cell != null && cell.owner != null) { 
                if (closest === null || dist < closest_dist) {
                    closest = cell.owner;
                    closest_dist = dist;
                }
            }
        }
        return closest;
    }

    killNearOrganisms() {
        for (var loc of Neighbors.inRange(WorldConfig.brush_size)){
            var c = this.cur_cell.col + loc[0];
            var r = this.cur_cell.row + loc[1];
            var cell = this.env.grid_map.cellAt(c, r);
            if (cell != null && cell.owner != null)
                cell.owner.die();
        }
    }


}

module.exports = EnvironmentController;

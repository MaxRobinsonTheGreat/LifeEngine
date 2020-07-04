
class EnvironmentController{
    constructor(env, canvas) {
        this.env = env;
        this.canvas = canvas;
        this.mouse_x;
        this.mouse_y;
        this.mouse_c;
        this.mouse_r;
        this.mouse_down = false;
        this.cur_cell = null;
        this.cur_org = null;
        this.defineEvents();
    }

    defineEvents() {
        this.canvas.addEventListener('mousedown', e => {
            this.mouse_down=true;
        });

        this.canvas.addEventListener('mouseup', e => {
            this.mouse_down=false;
        });

        this.canvas.addEventListener('mousemove', e => {
            var prev_cell = this.cur_cell;
            var prev_org = this.cur_org;

            this.mouse_x = e.offsetX;
            this.mouse_y = e.offsetY;
            var colRow = this.env.grid_map.xyToColRow(this.mouse_x, this.mouse_y);
            this.mouse_c = colRow[0];
            this.mouse_r = colRow[1];
            this.cur_cell = this.env.grid_map.cellAt(this.mouse_c, this.mouse_r);
            this.cur_org = this.cur_cell.owner;

            if (this.cur_org != prev_org || this.cur_cell != prev_cell) {
                this.env.renderer.clearAllHighlights(true);
                if (this.cur_org != null) {
                    this.env.renderer.highlightOrganism(this.cur_org);
                }
                else if (this.cur_cell != null) {
                    this.env.renderer.highlightCell(this.cur_cell, true);
                }
            }
        });
    }


}

module.exports = EnvironmentController;



class CanvasController{
    constructor(env, canvas) {
        this.env = env;
        this.canvas = canvas;
        this.mouse_x;
        this.mouse_y;
        this.mouse_c;
        this.mouse_r;
        this.left_click = false;
        this.right_click = false;
        this.cur_cell = null;
        this.cur_org = null;
        this.highlight_org = true;
        this.defineEvents();
    }

    setControlPanel(panel){
        this.control_panel = panel;
    }

    defineEvents() {
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
                if (this.cur_org != null && this.highlight_org) {
                    this.env.renderer.highlightOrganism(this.cur_org);
                }
                else if (this.cur_cell != null) {
                    this.env.renderer.highlightCell(this.cur_cell, true);
                }
            }
            this.mouseMove();
        });

        this.canvas.addEventListener('mouseup', function(evt) {
            evt.preventDefault();
            this.left_click=false;
            this.right_click=false;
        }.bind(this));

        this.canvas.addEventListener('mousedown', function(evt) {
            evt.preventDefault();
            if (evt.button == 0) {
                this.left_click = true;
            }
            if (evt.button == 2) 
                this.right_click = true;
            this.mouseDown();
        }.bind(this));

        this.canvas.addEventListener('contextmenu', function(evt) {
            evt.preventDefault();
        });

        this.canvas.addEventListener('mouseleave', function(){
            this.right_click = false;
            this.left_click = false;
            this.env.renderer.clearAllHighlights(true);
        }.bind(this));

    }

    mouseMove() {
        alert("mouse move must be overriden");
    }

    mouseDown() {
        alert("mouse down must be overriden");
    }
}

module.exports = CanvasController;
const Environment = require('./Environment');
const ControlPanel = require('./ControlPanel');

class Engine{
    constructor(){
        this.fps = 0;
        this.env = new Environment(5);
        this.controlpanel = new ControlPanel(this);
        this.env.OriginOfLife();
        this.last_update = Date.now();
        this.delta_time = 0;
        this.actual_fps = 0;
        this.running = false;
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        if (fps > 300)
            fps = 300;
        this.fps = fps;
        this.game_loop = setInterval(function(){this.update();}.bind(this), 1000/fps);
        this.running = true;
        if (this.fps >= 45) {
            if (this.render_loop != null) {
                clearInterval(this.render_loop);
                this.render_loop = null;
            }
        }
        else
            this.setRenderLoop();
    }
    
    stop() {
        clearInterval(this.game_loop);
        this.running = false;
        this.setRenderLoop();
    }

    setRenderLoop() {
        if (this.render_loop == null) {
            this.render_loop = setInterval(function(){this.env.render();}.bind(this), 1000/45);
        }
    }


    update() {
        this.delta_time = Date.now() - this.last_update;
        this.last_update = Date.now();
        this.env.update(this.delta_time);
        this.env.render();
        this.actual_fps = 1/this.delta_time*1000;
        this.controlpanel.update();
    }

}

module.exports = Engine;

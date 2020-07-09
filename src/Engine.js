const Environment = require('./Environment');
const ControlPanel = require('./ControlPanel');

class Engine{
    constructor(){
        this.fps = 0;
        this.environment = new Environment(5);
        this.controlpanel = new ControlPanel(this);
        this.environment.OriginOfLife();
        this.last_update = Date.now();
        this.delta_time = 0;
        this.actual_fps = 0;
        this.running = false;
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        if (fps > 500)
            fps = 500;
        this.fps = fps;
        this.game_loop = setInterval(function(){this.update();}.bind(this), 1000/fps);
        this.running = true;
    }
    
    stop() {
        clearInterval(this.game_loop);
        this.running = false;
    }


    update() {
        this.delta_time = Date.now() - this.last_update;
        this.last_update = Date.now();
        this.environment.update(this.delta_time);
        this.environment.render();
        this.actual_fps = 1/this.delta_time*1000;
    }

}

module.exports = Engine;

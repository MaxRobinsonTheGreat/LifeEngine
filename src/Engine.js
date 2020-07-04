const Environment = require('./Environment');

class Engine{
    constructor(){
        this.fps = 0;
        this.environment = new Environment(5);
        this.environment.OriginOfLife();
        this.last_update = Date.now();
        this.delta_time = 0;
        this.running = false;
    }

    start(fps=60) {
        this.fps = fps;
        this.game_loop = setInterval(function(){this.update();}.bind(this), 1000/fps);
        this.runnning = true;
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
    }

}

module.exports = Engine;

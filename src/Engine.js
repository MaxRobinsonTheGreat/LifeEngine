const Environment = require('./Environments/Environment');
const ControlPanel = require('./Controllers/ControlPanel');
const OrganismEditor = require('./Environments/OrganismEditor');

const render_speed = 60;

class Engine{
    constructor(){
        this.fps = 60;
        this.env = new Environment(4);
        this.organism_editor = new OrganismEditor();
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
        this.game_loop = setInterval(function(){this.environmentUpdate();}.bind(this), 1000/fps);
        this.running = true;
        if (this.fps >= render_speed) {
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
            this.render_loop = setInterval(function(){this.necessaryUpdate();}.bind(this), 1000/render_speed);
        }
    }


    environmentUpdate() {
        this.delta_time = Date.now() - this.last_update;
        this.last_update = Date.now();
        this.env.update(this.delta_time);
        this.actual_fps = 1/this.delta_time*1000;
        if(this.render_loop == null){
            this.necessaryUpdate();
        }
            
    }

    necessaryUpdate() {
        this.env.render();
        this.controlpanel.update();
        this.organism_editor.update();
    }

}

module.exports = Engine;

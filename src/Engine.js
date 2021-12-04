const WorldEnvironment = require('./Environments/WorldEnvironment');
const ControlPanel = require('./Controllers/ControlPanel');
const OrganismEditor = require('./Environments/OrganismEditor');
const ColorScheme = require('./Rendering/ColorScheme');

const render_speed = 30;

class Timer {
    constructor(){
        this.delta_time = 0;
        this.started = performance.now();
        this.last_time = this.started;
        this.time = 0;
        this.freqPerSecond = 0;
        this.avgFreqPerSecond = 0;
    }

    update() {
        this.time = performance.now();
        this.delta_time = this.time - this.last_time;
        this.last_time = this.time;

        this.freqPerSecond = 1000/this.delta_time;
        this.avgFreqPerSecond = (10*this.avgFreqPerSecond + this.freqPerSecond)/11;
    }

    tick() {
        return performance.now() - this.time;
    }
}

class Engine {
    constructor(){
        this.fps = 60;
        this.env = new WorldEnvironment(5);
        this.organism_editor = new OrganismEditor();
        this.controlpanel = new ControlPanel(this);
        this.colorscheme = new ColorScheme(this.env, this.organism_editor);
        this.colorscheme.loadColorScheme();
        this.env.OriginOfLife();
        this.ui_timer = new Timer();
        this.sim_timer = new Timer();
        this.sim_time = 0;
        this.actual_fps = 0;
        this.running = false;
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        this.fps = fps;
        this.game_loop = setInterval(function(){this.simulationUpdate();}.bind(this), 1000/fps);
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
            this.render_loop = setInterval(function(){this.interfaceUpdate();}.bind(this), 1000/render_speed);
        }
    }

    simulationUpdate() {
        this.sim_timer.update();
        this.env.update(this.sim_timer.delta_time);
        this.actual_fps = this.sim_timer.avgFreqPerSecond;
        this.sim_time = this.sim_timer.tick();
        if(this.render_loop == null){
            this.interfaceUpdate();
        }
            
    }

    interfaceUpdate() {
        this.ui_timer.update();
        this.env.render();
        this.controlpanel.update(this.ui_timer.delta_time);
        this.organism_editor.update();
        this.ui_timer.update();
    }

}

module.exports = Engine;

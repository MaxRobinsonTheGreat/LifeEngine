const WorldEnvironment = require('./Environments/WorldEnvironment');
const ControlPanel = require('./Controllers/ControlPanel');
const OrganismEditor = require('./Environments/OrganismEditor');
const ColorScheme = require('./Rendering/ColorScheme');

class Engine {
    constructor(){
        this.fps = 60;
        this.env = new WorldEnvironment(5);
        this.organism_editor = new OrganismEditor();
        this.controlpanel = new ControlPanel(this);
        this.colorscheme = new ColorScheme(this.env, this.organism_editor);
        this.colorscheme.loadColorScheme();
        this.env.OriginOfLife();

        this.env_dirty = true;

        this.sim_start_time = Date.now();
        this.actual_fps = 0;
        this.running = false;

        this.uiStep();
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        this.fps = fps;
        this.running = true;

        clearTimeout(this.sim_timer);
        this.sim_last_update = Date.now();
        this.scheduleSimulationStep();
    }
    
    stop() {
        clearTimeout(this.sim_timer);
        this.running = false;
    }

    restart(fps) {
        this.start(fps);
    }

    simulationStep() {
        this.env.update();
        this.env_dirty = true;
    }

    scheduleSimulationStep() {
        const sim_end = Date.now();
        const sim_time = sim_end - this.sim_start_time;
        const frame_time = 1000 / this.fps;
        const sleep = frame_time - sim_time;

        this.sim_timer = setTimeout(()=>{
            const sim_start = Date.now();
            this.actual_fps = 1000 / (sim_start - this.sim_start_time);
            console.log(this.actual_fps);
            this.sim_start_time = sim_start;
            this.simulationStep();
            this.scheduleSimulationStep();
        }, sleep);
    }

    uiStep() {
        if (this.env_dirty) {
            this.env.render();
            this.env_dirty = false;
        }
        this.controlpanel.update(this.ui_delta_time);
        this.organism_editor.update();
        window.requestAnimationFrame(()=>{this.uiStep()});
    }

}

module.exports = Engine;

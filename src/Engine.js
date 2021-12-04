const WorldEnvironment = require('./Environments/WorldEnvironment');
const ControlPanel = require('./Controllers/ControlPanel');
const OrganismEditor = require('./Environments/OrganismEditor');
const ColorScheme = require('./Rendering/ColorScheme');

// If the simulation speed is below this value, a new interval will be created to handle ui rendering
// at a reasonable speed. If it is above, the simulation interval will be used to update the ui.
const min_render_speed = 60;

class Stats {
    constructor(){
        this.average = 0;
        this.min = Number.MAX_SAFE_INTEGER;
        this.max = Number.MIN_SAFE_INTEGER;
    }

    add_value(value) {
        //takes a running average by weighting the current average as 75% of the 
        //new value and the new value as 25%.  Adds a smoothing effect and works
        //as a first order filter
        this.average = (this.average * 3 + value)/4;
        if(this.min > value){
            this.min = value;
        }
        if(this.max < value){
            this.max = value;
        }

    }
}
class Timer {
    constructor(){
        this.delta_time = 0;
        this.started = performance.now();
        this.last_time = this.started;
        this.time = 0;
        this.fps = 0;
        this.fps_stats = new Stats();
        this.count = 0;
        this.tick_stats = new Stats();
    }

    update_state() {
        this.count++;
        this.time = performance.now();

        if(this.time == this.last_time) {
            this.time = this.last_time + 0.5;
        }
        this.delta_time = this.time - this.last_time;
        this.last_time = this.time;
        this.fps = 1000/this.delta_time;
        this.fps_stats.add_value(fps);
    }
    /* Returns a delta time from the last update() call and calculates stats on that
     * can be used for calculating execution time of the given exec */
    time_since_last_update() {
        let val = performance.now() - this.time;
        if(val > 0) {
            this.tick_stats.add_value(val);
        }
        return val;
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
        
        this.sim_timer = new Timer();

        this.ui_timer = new Timer();

        this.actual_fps = 0;
        this.running = false;
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        this.fps = fps;
        this.sim_loop = setInterval(()=>{
            this.environmentUpdate();
        }, 1000/fps);
        this.running = true;
        if (this.fps >= min_render_speed) {
            if (this.ui_loop != null) {
                clearInterval(this.ui_loop);
                this.ui_loop = null;
            }
        }
        else
            this.setUiLoop();
    }
    
    stop() {
        clearInterval(this.sim_loop);
        this.running = false;
        this.setUiLoop();
    }

    restart(fps) {
        clearInterval(this.sim_loop);
        this.start(fps);
    }

    setUiLoop() {
        if (!this.ui_loop) {
            this.ui_loop = setInterval(()=> {
                this.necessaryUpdate();
            }, 1000/min_render_speed);
        }
    }

    environmentUpdate() {
        this.sim_timer.update_state();
        this.actual_fps = this.sim_timer.fps;

        //SIM EXEC
        this.env.update(this.sim_timer.delta_time);

        //SIM EXEC TIME STATS
        let sim_exec_time = this.sim_timer.time_since_last_update();
        if(this.sim_timer.count % 600 == 0) {
            //can use the following to get an idea of how long the sim takes            
            console.log('SIM TIME: ' + sim_exec_time + 'ms');
            console.log(' - avg: ' + this.sim_timer.tick_stats.average + 'ms');
            console.log(' - min: ' + this.sim_timer.tick_stats.min + 'ms');
            console.log(' - max: ' + this.sim_timer.tick_stats.max + 'ms');
        }
        if(this.ui_loop == null) {
            this.necessaryUpdate();
        }
            
    }

    necessaryUpdate() {
        this.ui_timer.update_state();

        // RENDER EXEC
        this.env.render();
        this.controlpanel.update(this.ui_timer.delta_time);
        this.organism_editor.update();

        // UI EXEC TIME STATS
        let ui_exec_time = this.ui_timer.time_since_last_update();
        if(this.ui_timer.count % 600 == 0) {
            //can use the following to get an idea of how long the ui takes 
            console.log('UI TIME: ' + ui_exec_time + 'ms');
            console.log(' - avg: ' + this.ui_timer.tick_stats.average + 'ms');
            console.log(' - min: ' + this.ui_timer.tick_stats.min + 'ms');
            console.log(' - max: ' + this.ui_timer.tick_stats.max + 'ms');
        }
    }

}

module.exports = Engine;

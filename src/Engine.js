const WorldEnvironment = require('./Environments/WorldEnvironment');
const ControlPanel = require('./Controllers/ControlPanel');
const OrganismEditor = require('./Environments/OrganismEditor');
const ColorScheme = require('./Rendering/ColorScheme');

// If the simulation speed is below this value, a new interval will be created to handle ui rendering
// at a reasonable speed. If it is above, the simulation interval will be used to update the ui.
const min_render_speed = 60;
const min_interrupt_checks_to_run = 1000;

class Stats {
    constructor(new_sample_weight = 0.25){
        //protect for sample_size < 1;
        if(new_sample_weight < 0) {
            new_sample_weight = 0;
        }
        else if (new_sample_weight > 1){
            new_sample_weight = 1;
        }
        this.weight = new_sample_weight;
        this.average = 0;
        this.min = Number.MAX_SAFE_INTEGER;
        this.max = Number.MIN_SAFE_INTEGER;
    }

    addValue(new_value) {
        //takes a running average by multiplying the current average by the "number of samples to "
        this.average = (this.average * (1-this.weight) + new_value * this.weight);
        if(this.min > new_value){
            this.min = new_value;
        }
        if(this.max < new_value){
            this.max = new_value;
        }

    }
}
class Timer {
    constructor(new_sample_weight=0.25){

        this.delta_time = 0;
        this.started = performance.now();
        this.last_time = this.started;
        this.min_res = 0.1;
        this.time = 0;
        this.fps = 0;
        this.fps_stats = new Stats(new_sample_weight);
        this.count = 0;
        this.tick_stats = new Stats(new_sample_weight);
        this.interrupt_check
    }

    updateState() {
        this.count++;
        this.time = performance.now();

        if(this.time == this.last_time) {
            return;
        }
        this.delta_time = this.time - this.last_time;
        this.last_time = this.time;
        this.fps = 1000/this.delta_time;
        this.fps_stats.addValue(fps);
    }
    /* Returns a delta time from the last update() call and calculates stats on that
     * can be used for calculating execution time of the given exec */
    timeSinceLastUpdate() {
        let call_time = performance.now();
        let time_since = call_time - this.time;
        if(time_since > 0) {
            this.tick_stats.addValue(time_since);
        }
        return time_since;
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

        //Interrupt time check
        this.min_resolution = this.findMinResolution();
        this.max_fps = 1000/this.min_resolution;
        this.min_interrupt_time = Number.MAX_SAFE_INTEGER;
        this.avg_interrupt_time = 1.0;

        this.minInterruptCheckStart();
    }

    findMinResolution(){
        let start = performance.now();
        let end = performance.now();
        while(start == end){
            end = performance.now();
        }
        return end - start;
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        this.fps = fps;
        this.setSimLoop();        
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
    
    setSimLoop(){
        let timeout_dur = 1000/this.fps;
        if(timeout_dur < this.min_resolution) {
            timeout_dur = this.min_resolution;
        }
        this.sim_loop = setInterval(()=>{
            this.environmentUpdate();
        }, timeout_dur);
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
        //this.setSimLoop(); //set next timeout at start of exec
        this.sim_timer.updateState();
        this.actual_fps = this.sim_timer.fps;

        //SIM EXEC
        this.env.update(this.sim_timer.delta_time);

        //SIM EXEC TIME STATS
        let sim_exec_time = this.sim_timer.timeSinceLastUpdate();
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
        this.ui_timer.updateState();

        // RENDER EXEC
        this.env.render();
        this.controlpanel.update(this.ui_timer.delta_time);
        this.organism_editor.update();

        // UI EXEC TIME STATS
        let ui_exec_time = this.ui_timer.timeSinceLastUpdate();
        if(this.ui_timer.count % 600 == 0) {
            //can use the following to get an idea of how long the ui takes 
            console.log('UI TIME: ' + ui_exec_time + 'ms');
            console.log(' - avg: ' + this.ui_timer.tick_stats.average + 'ms');
            console.log(' - min: ' + this.ui_timer.tick_stats.min + 'ms');
            console.log(' - max: ' + this.ui_timer.tick_stats.max + 'ms');
        }
    }

    minInterruptCheckStart(checks_ran = 0){
        let test_start = performance.now();
        let id = setTimeout(()=>{this.minInterruptCheck(checks_ran,id,test_start);},0);
    }
    minInterruptCheck(checks_ran,id, test_start){
        let test_end = performance.now();
        let current_delta_time = test_end - test_start;

        /* Limit it to minimum timer resolution to ensure that our FPS calculations don't 
         * go haywire. */
        if(current_delta_time <= this.min_resolution) {
            this.max_fps = 1000/this.min_resolution;
            this.min_interrupt_time = this.min_resolution;
        }
        else if(current_delta_time<this.min_interrupt_time){
            this.max_fps = 1000/current_delta_time;
            this.min_interrupt_time = current_delta_time; }
               
        this.avg_interrupt_time = this.avg_interrupt_time * (checks_ran / (checks_ran + 1.0)) + current_delta_time * (1.0/(checks_ran + 1.0));
        checks_ran = checks_ran + 1.0;
        if (checks_ran > min_interrupt_checks_to_run) {
            console.log('CALCULATED TIMING STATS ' + checks_ran);
            console.log('      max fps: ' + this.max_fps);
            console.log('min interrupt: ' + this.min_interrupt_time);
            console.log('avg interrupt: ' + this.avg_interrupt_time);
            console.log('min timer res: ' + this.min_resolution);
            console.log
        }
        else { 
            clearTimeout(id);
            this.minInterruptCheckStart(checks_ran); 
        }
    }

}

module.exports = Engine;

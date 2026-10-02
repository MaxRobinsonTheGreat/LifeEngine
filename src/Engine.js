const WorldEnvironment = require('./Environments/WorldEnvironment');
const ControlPanel = require('./Controllers/ControlPanel');
const OrganismEditor = require('./Environments/OrganismEditor');
const ColorScheme = require('./Rendering/ColorScheme');

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// The simulation runs in a Web Worker (see src/Sim). This thread only handles
// input and draws: once per display frame it asks the worker for a snapshot.
class Engine {
    constructor(){
        this.fps = 60;
        this.env = new WorldEnvironment(5);
        this.organism_editor = new OrganismEditor();
        this.controlpanel = new ControlPanel(this);
        this.colorscheme = new ColorScheme(this.env, this.organism_editor);
        this.colorscheme.loadColorScheme();
        this.env.onExtinct = () => {
            // auto pause: the worker already stopped itself
            if (this.running)
                $('.pause-button')[0].click();
        };

        this.ui_last_update = now();
        this.running = false;
        this.startRenderLoop();
    }

    get actual_fps() {
        return this.running ? this.env.stats.tps : 0;
    }

    start(fps=60) {
        if (fps <= 0)
            fps = 1;
        this.fps = fps;
        this.env.start(fps);
        this.running = true;
    }

    stop() {
        this.env.stop();
        this.running = false;
    }

    restart(fps) {
        this.start(fps);
    }

    startRenderLoop() {
        const frame = () => {
            this.renderFrame();
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    renderFrame() {
        const t = now();
        const ui_delta_time = t - this.ui_last_update;
        this.ui_last_update = t;
        this.env.requestFrame(this.controlpanel.tab_id === 'stats');
        this.controlpanel.update(ui_delta_time);
        this.organism_editor.update();
    }
}

module.exports = Engine;

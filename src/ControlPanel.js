
class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineEngineSpeedControls();
        this.fps = engine.fps;
    }

    defineEngineSpeedControls(){
        this.slider = document.getElementById("slider");
        this.slider.oninput = function() {
            this.fps = this.slider.value
            if (this.engine.running) {
                this.changeEngineSpeed(this.fps);
            }
        }.bind(this);
        $('#pause-button').click(function() {
            if ($('#pause-button').text() == "Pause" && this.engine.running) {
                $('#pause-button').text("Play")
                this.engine.stop();
            }
            else if (!this.engine.running){
                $('#pause-button').text("Pause")
                this.engine.start(this.fps);
            }
            console.log()
        }.bind(this));
    }

    changeEngineSpeed(change_val) {
        this.engine.stop();
        this.engine.start(change_val)
        this.fps = this.engine.fps;
    }

}


module.exports = ControlPanel;
var Hyperparams = require("./Hyperparameters");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineEngineSpeedControls();
        this.defineHyperparameterControls();
        this.fps = engine.fps;
        this.organism_record=0;
    }

    defineEngineSpeedControls(){
        this.slider = document.getElementById("slider");
        this.slider.oninput = function() {
            this.fps = this.slider.value
            if (this.engine.running) {
                this.changeEngineSpeed(this.fps);
                
            }
            $('#fps').text("Target FPS: "+this.fps);
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

    defineHyperparameterControls() {
        $('#food-prod-prob').change(function() {
            var food_prob = $('#food-prod-prob').val();
            if ($('#fixed-ratio').is(":checked")) {
                Hyperparams.foodProdProb = food_prob;
                Hyperparams.calcProducerFoodRatio(false);
                $('#lifespan-multiplier').val(Hyperparams.lifespanMultiplier);
            }
            else{
                Hyperparams.foodProdProb = food_prob;
            }
        }.bind(this));
        $('#lifespan-multiplier').change(function() {
            var lifespan = $('#lifespan-multiplier').val();
            if ($('#fixed-ratio').is(":checked")) {
                Hyperparams.lifespanMultiplier = lifespan;
                Hyperparams.calcProducerFoodRatio(true);
                $('#food-prod-prob').val(Hyperparams.foodProdProb);
            }
            else {
                Hyperparams.lifespanMultiplier = lifespan;
            }
        }.bind(this));
    }

    changeEngineSpeed(change_val) {
        this.engine.stop();
        this.engine.start(change_val)
        this.fps = this.engine.fps;
    }

    update() {
        $('#fps-actual').text("Actual FPS: " + Math.floor(this.engine.actual_fps));
        var org_count = this.engine.env.organisms.length;
        $('#org-count').text("Organism count:  " + org_count);
        if (org_count > this.organism_record) 
            this.organism_record = org_count;
        $('#org-record').text("Highest count: " + this.organism_record);

    }

}


module.exports = ControlPanel;
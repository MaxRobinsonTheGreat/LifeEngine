const Hyperparams = require("./Hyperparameters");
const Modes = require("./ControlModes");
const CellTypes = require("./CellTypes");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineEngineSpeedControls();
        this.defineHyperparameterControls();
        this.defineModeControls();
        this.fps = engine.fps;
        this.organism_record=0;
        this.env_controller = this.engine.env.controller;
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
                $('#pause-button').text("Play");
                this.engine.stop();
            }
            else if (!this.engine.running){
                $('#pause-button').text("Pause");
                console.log(this.fps)
                this.engine.start(this.fps);
            }
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
        $('.mut-prob').change( function() {
            switch(this.id){
                case "add-prob":
                    Hyperparams.addProb = this.value;
                    Hyperparams.balanceMutationProbs(1);
                    break;
                case "change-prob":
                    Hyperparams.changeProb = this.value;
                    Hyperparams.balanceMutationProbs(2);
                    break;
                case "remove-prob":
                    Hyperparams.removeProb = this.value;
                    Hyperparams.balanceMutationProbs(3);
                    break;
            }
            $('#add-prob').val(Math.floor(Hyperparams.addProb));
            $('#change-prob').val(Math.floor(Hyperparams.changeProb));
            $('#remove-prob').val(Math.floor(Hyperparams.removeProb));
        });
    }

    defineModeControls() {
        var self = this;
        $('.control-mode-button').click( function() {
            switch(this.id){
                case "food-button":
                    self.env_controller.mode = Modes.FoodDrop;
                    break;
                case "wall-button":
                    self.env_controller.mode = Modes.WallDrop;
                    break;
                case "kill-button":
                    self.env_controller.mode = Modes.ClickKill;
                    break;
                case "none-button":
                    self.env_controller.mode = Modes.None;
                    break;
            }
            $(".control-mode-button" ).css( "background-color", "lightgray" );
            $("#"+this.id).css("background-color", "darkgray");
        });


        $('#reset-env').click( function() {
            this.engine.env.reset();
        }.bind(this));
        $('#kill-all').click( function() {
            this.engine.env.clearOrganisms();
        }.bind(this));
        $('#clear-walls').click( function() {
            this.engine.env.clearWalls();
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
        $('#avg-mut').text("Average Mutation Rate: " + Math.round(this.engine.env.averageMutability() * 100) / 100);
    }

}


module.exports = ControlPanel;
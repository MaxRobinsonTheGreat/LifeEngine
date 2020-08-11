const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function() {
        this.lifespanMultiplier = 100;
        this.foodProdProb = 4;
        this.foodProdProbScalar = 4;
        this.killableNeighbors = Neighbors.adjacent;
        this.edibleNeighbors = Neighbors.adjacent;
        this.growableNeighbors = Neighbors.adjacent;

        this.useGlobalMutability = false;
        this.globalMutability = 5;
        this.addProb = 33;
        this.changeProb = 33;
        this.removeProb = 33;
        
        this.moversCanRotate = true;
        this.offspringRotate = true;

        this.foodBlocksReproduction = true;
        this.moversCanProduce = false;

        this.instaKill = false;

        this.lookRange = 5;
    },

    // calculates the optimal ratio where a producer cell is most likely to produce 1 food in its lifespan * a scalar of my choice :)
    calcProducerFoodRatio : function(lifespan_fixed=true) {
        if (lifespan_fixed) {
            // change the foodProdProb
            this.foodProdProb = (100 / this.lifespanMultiplier) * this.foodProdProbScalar;
        }
        else {
            // change the lifespanMultiplier
            this.lifespanMultiplier = Math.floor(100 / (this.foodProdProb/this.foodProdProbScalar));
        }
    },

    balanceMutationProbs : function(choice) {
        if (choice == 1) {
            var remaining = 100 - this.addProb;
            this.changeProb = remaining/2;
            this.removeProb = remaining/2;
        }
        else if (choice == 2) {
            var remaining = 100 - this.changeProb;
            this.addProb = remaining/2;
            this.removeProb = remaining/2;
        }
        else {
            var remaining = 100 - this.removeProb;
            this.changeProb = remaining/2;
            this.addProb = remaining/2;
        }
    }
}

Hyperparams.setDefaults();

module.exports = Hyperparams;
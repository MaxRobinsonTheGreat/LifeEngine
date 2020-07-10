const Neighbors = require("./Neighbors");

var Hyperparams = {
    lifespanMultiplier: 100,
    foodProdProb: 1,
    killableNeighbors: Neighbors.adjacent,
    edibleNeighbors: Neighbors.adjacent,
    growableNeighbors: Neighbors.adjacent,


    // calculates the optimal ratio where a producer cell is most likely to produce 1 food in its lifespan.
    calcProducerFoodRatio : function(lifespan_fixed=true) {
        if (lifespan_fixed) {
            // change the foodProdProb
            this.foodProdProb = 100 / this.lifespanMultiplier;
        }
        else {
            // change the lifespanMultiplier
            this.lifespanMultiplier = Math.floor(100 / this.foodProdProb);
        }
    }
}

module.exports = Hyperparams;
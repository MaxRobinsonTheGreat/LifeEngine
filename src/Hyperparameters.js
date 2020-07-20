const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    lifespanMultiplier: 100,
    foodProdProb: 4,
    foodProdProbScalar: 4,
    killableNeighbors: Neighbors.adjacent,
    edibleNeighbors: Neighbors.adjacent,
    growableNeighbors: Neighbors.adjacent,
    
    useGlobalMutability: false,
    globalMutability: 5,

    addProb: 33,
    changeProb: 33,
    removeProb: 33,

    moversCanRotate: true,
    offspringRotate: true,

    foodBlocksReproduction: true,
    moversCanProduce: false,

    instaKill: false,

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

module.exports = Hyperparams;
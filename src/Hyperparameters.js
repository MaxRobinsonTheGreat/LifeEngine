const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function() {
        this.headless = false;

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
        // 1 add, 2 change, 3 remove
        this.addChReProbPrio = [3, 2, 1]
        
        this.moversCanRotate = true;
        this.offspringRotate = true;

        this.foodBlocksReproduction = true;
        this.moversCanProduce = false;

        this.instaKill = false;

        this.lookRange = 20;

        this.foodDropProb = 0;
    },

    balanceMutationProbs : function(choice) {
        
        // Move to last
        this.addChReProbPrio.push(this.addChReProbPrio.splice(this.addChReProbPrio.indexOf(choice), 1)[0]);
        
        // If last used (first in list) was addProb, add to it.
        if (this.addChReProbPrio[0] == 1) {
            // If it is enough to change the addProb
            if ((this.changeProb + this.removeProb) <= 100) {
                this.addProb = 100 - this.changeProb - this.removeProb;
            } else {
                // Isn't enough, we need to change the other too
                this.addProb = 0
                if (this.addChReProbPrio[1] == 2) {
                    this.this.changeProb = 100 - this.removeProb;
                } else {
                    this.this.removeProb = 100 - this.changeProb;
                }
        } else if (this.addChReProbPrio[0] == 2) {
            if ((this.addProb + this.removeProb) <= 100) {
                this.changeProb = 100 - this.addProb - this.removeProb;
            } else {
                this.changeProb = 0;
                if (this.addChReProbPrio[1] == 1) {
                    this.addProb = 100 - this.removeProb;
                } else {
                    this.addRemove = 100 - this.addProb;
                }
            }
        } else if (this.addChReProbPrio[0] == 3) {
            if ((this.addProb + this.changeProb) <= 100) {
                this.removeProb = 100 - this.addProb - this.changeProb;
            } else {
                this.removeProb = 0;
                if (this.addChReProbPrio[1] == 1) {
                    this.addProb = 100 - this.changeProb;
                } else {
                    this.changeProb = 100 - this.addProb;
                }
            }
        }
    }
}

Hyperparams.setDefaults();

module.exports = Hyperparams;

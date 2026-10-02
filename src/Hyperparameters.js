const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function() {
        this.lifespanMultiplier = 100;
        this.foodProdProb = 5;
        this.killableNeighbors = Neighbors.adjacent;
        this.edibleNeighbors = Neighbors.adjacent;
        this.growableNeighbors = Neighbors.adjacent;

        this.useGlobalMutability = false;
        this.globalMutability = 5;
        this.addProb = 33;
        this.changeProb = 33;
        this.removeProb = 33;
        
        this.rotationEnabled = true;

        this.foodBlocksReproduction = true;
        this.moversCanProduce = false;

        this.instaKill = false;

        this.lookRange = 20;
        this.seeThroughSelf = false;

        this.foodDropProb = 0;

        this.extraMoverFoodCost = 0;

        this.maxOrganisms = -1;

        this.extendedCellTypes = true; // allow healer, camo, leaf, spike, booster and poison cells to evolve
        this.leafProb = 1; // % chance per tick that a leaf cell feeds its organism
        this.healProb = 10; // % chance per tick that a healer cell repairs 1 damage
    },

    loadJsonObj(obj) {
        for (let key in obj) {
            let value = obj[key];
            // older saves stored some numeric controls as strings (e.g. "0"),
            // which silently breaks arithmetic like lookRange + 1
            if (typeof this[key] === 'number' && typeof value === 'string' && value.trim() !== '' && !isNaN(value))
                value = parseFloat(value);
            this[key] = value;
        }
    }
}

Hyperparams.setDefaults();

module.exports = Hyperparams;
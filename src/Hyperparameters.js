const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function() {
        this.lifespanMultiplier = 150;
        this.foodProdProb = 5;
        this.killableNeighbors = Neighbors.adjacent;
        this.edibleNeighbors = Neighbors.adjacent;
        this.growableNeighbors = Neighbors.adjacent;

        this.useGlobalMutability = false;
        this.globalMutability = 5;
        this.addProb = 25;
        this.changeProb = 25;
        this.removeProb = 25;
        this.brainMutationChance = 25;
        this.mutationSymmetryChance = 10;
        
        this.rotationEnabled = true;

        this.foodBlocksReproduction = true;
        this.moversCanProduce = false;

        this.instaKill = false;
        this.dontKillSameSpecies = false;

        this.lookRange = 30;
        this.seeThroughSelf = false;
        this.evolveIndependentEyeDecisions = true;

        this.foodDropProb = 0;

        this.extraMoverFoodCost = 0;

        // claw cells: prey hide underground when they see a predator
        this.hideDuration = 100; // ticks spent hidden
        this.hideFertilityCost = 10; // fertility removed from each grid cell under the organism when it hides
        this.minBurrowFertility = 5; // average fertility needed under the organism to burrow

        this.maxOrganisms = -1;

        this.maxFertility = 10;

        this.fertilityRegenRate = 0.01;
        this.minPlantFertility = 5; // average fertility needed under a plant for it to be born there

        this.fertilityTerrainSeed = 42;
        this.fertilityPatchThreshold = 0;
        this.fertilityPatchResolution = 20;

    },

    loadJsonObj(obj) {
        for (let key in obj) {
            this[key] = obj[key];
        }
    }
}

Hyperparams.setDefaults();

module.exports = Hyperparams;
const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function() {
        this.lifespanMultiplier = 150;
        this.predatorLifespanMultiplier = 2;
        this.predatorMoveInterval = 3;
        this.burrowerMoveInterval = 3;
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

        // claw balance switches, all off by default so existing setups behave as before
        this.clawCellsFree = false; // claw cells don't count toward the food needed to reproduce
        this.hibernateWhileHidden = false; // ticks spent hidden don't count toward the lifespan
        this.stayHiddenNearPredator = false; // stay hidden (for up to another hideDuration ticks) while a predator is close
        this.stayHiddenRange = 6; // predator cells within this many cells of a hidden organism keep it underground
        this.burrowOnlyWhenClose = false; // only burrow when the nearest seen predator is within burrowTriggerRange, otherwise run
        this.burrowTriggerRange = 8;

        this.maxOrganisms = -1;

        this.maxFertility = 10;

        this.fertilityRegenRate = 0.05;
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
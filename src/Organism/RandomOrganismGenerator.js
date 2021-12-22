const CellStates = require("./Cell/CellStates");
const Organism = require("./Organism");
const Brain = require("./Perception/Brain")

class RandomOrganismGenerator {

    static generate(env) {

        var center = env.grid_map.getCenter();
        var organism = new Organism(center[0], center[1], env, null);
        organism.anatomy.addDefaultCell(CellStates.mouth, 0, 0);

        var outermostLayer = RandomOrganismGenerator.organismLayers;
        var x, y;

        // iterate from center to edge of organism
        // layer 0 is the central cell of the organism
        for (var layer = 1; layer <= outermostLayer; layer++) {

            var someCellSpawned = false;
            var spawnChance = RandomOrganismGenerator.cellSpawnChance * 1 - ((layer - 1) / outermostLayer);

            // top
            y = -layer;
            for (x = -layer; x <= layer; x++)
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(organism, x, y, spawnChance);

            // bottom
            y = layer;
            for (x = -layer; x <= layer; x++) 
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(organism, x, y, spawnChance);

            // left
            x = -layer;
            for (y = -layer + 1; y <= layer - 1; y++) 
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(organism, x, y, spawnChance);

            // right
            x = layer;
            for (y = -layer + 1; y < layer - 1; y++)
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(organism, x, y, spawnChance);

            if (!someCellSpawned)
                break;
        }

        // randomize the organism's brain
        organism.brain.randomizeDecisions(true);

        return organism;
    }

    static trySpawnCell(organism, x, y, spawnChance) {

        var neighbors = organism.anatomy.getNeighborsOfCell(x, y);
        if (neighbors.length && Math.random() < spawnChance) {
            organism.anatomy.addRandomizedCell(CellStates.getRandomLivingType(), x, y);
            return true;
        }
        return false;
    }

}

RandomOrganismGenerator.organismLayers = 4;
RandomOrganismGenerator.cellSpawnChance = 0.75;

module.exports = RandomOrganismGenerator;
const CellStates = require("./Cell/CellStates");
const Organism = require("./Organism");
const Brain = require("./Perception/Brain")
const Directions = require("./Directions");

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

    static generatePredatorPrey(env) {
        const organisms = [];
        const rowSpacing = 0.15;

        for (let i = 0; i < 10; i++) {
            const columnIndex = Math.floor(i / 5);
            const rowIndex = i % 5;
            const row = Math.floor(env.num_rows * (0.2 + rowIndex * rowSpacing));
            const groupCol = Math.floor(env.num_cols * (0.2 + columnIndex * 0.4));
            const preyOffset = Math.min(8, Math.max(1, Math.floor(env.num_cols * 0.04)));
            const predator = new Organism(
                groupCol,
                row,
                env
            );
            predator.is_predator = true;       // your choice; the JSON had false
            predator.move_range = 4;
            predator.move_speed = 1;
            predator.direction = Directions.right;

            const a = predator.anatomy;
            a.addDefaultCell(CellStates.mouth, 0, 0);   // centre
            a.addDefaultCell(CellStates.killer, 0, -1);   // left
            a.addDefaultCell(CellStates.mouth, 0, 1);   // right
            a.addDefaultCell(CellStates.mover, -1, 0);   // above centre

            const eyeTop = a.addDefaultCell(CellStates.eye, -2, 0);
            eyeTop.direction = Directions.left;

            const eyeBottom = a.addDefaultCell(CellStates.eye, 1, 0);
            eyeBottom.direction = Directions.right;

            // brain: hunt prey, eat food, avoid other Killers
            predator.brain.decisions[CellStates.food.name] = Brain.Decision.chase;
            predator.brain.decisions[CellStates.mouth.name] = Brain.Decision.chase;
            predator.brain.decisions[CellStates.mover.name] = Brain.Decision.chase;
            predator.brain.decisions[CellStates.eye.name] = Brain.Decision.chase;
            predator.brain.decisions[CellStates.killer.name] = Brain.Decision.retreat;

            organisms.push(predator);

            const prey = new Organism(
                groupCol + preyOffset,
                row,
                env
            );
            prey.is_prey = true;
            prey.move_range = 4;
            prey.move_speed = 2;
            prey.direction = Directions.left;
            prey.anatomy.addDefaultCell(CellStates.mouth, 1, 0);
            prey.anatomy.addDefaultCell(CellStates.mover, 0, 0);
            const preyEye = prey.anatomy.addDefaultCell(CellStates.eye, -1, 0);
            preyEye.direction = Directions.left;
            prey.brain.decisions[CellStates.killer.name] = Brain.Decision.retreat;
            organisms.push(prey);
        }

        return organisms;
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
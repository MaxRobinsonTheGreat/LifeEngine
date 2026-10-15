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

            // regular prey to the right of the predator, burrowing prey to the left, both facing it
            // (the predator reaches 2 cells left but only 1 right, hence the extra -1)
            organisms.push(RandomOrganismGenerator.createPrey(env, groupCol + preyOffset, row));
            organisms.push(RandomOrganismGenerator.createClawPrey(env, groupCol - preyOffset - 1, row));
        }

        return organisms;
    }

    // plants on an evenly spaced lattice, keeping only spots that are free and fertile enough,
    // so the layout is the same every run for a given terrain. Call after the animals are on the grid.
    static generatePlants(env) {
        const plants = [];
        const spacing = Math.max(8, Math.floor(Math.min(env.num_cols, env.num_rows) / 6));
        for (let row = Math.floor(spacing / 2); row < env.num_rows - 1; row += spacing) {
            for (let col = Math.floor(spacing / 2); col < env.num_cols - 1; col += spacing) {
                const plant = RandomOrganismGenerator.createPlant(env, col, row);
                if (plant.isClear(col, row) && plant.canGrowAt(col, row)) {
                    plant.updateGrid(); // claim the spot so later plants can't overlap it
                    plants.push(plant);
                }
            }
        }
        return plants;
    }

    // the classic Life Engine starting plant: a mouth with two diagonal producers
    static createPlant(env, col, row) {
        const plant = new Organism(col, row, env);
        plant.anatomy.addDefaultCell(CellStates.mouth, 0, 0);
        plant.anatomy.addDefaultCell(CellStates.producer, 1, 1);
        plant.anatomy.addDefaultCell(CellStates.producer, -1, -1);
        return plant;
    }

    // horizontal prey: eye(looking left) - mover - mouth
    static createPrey(env, col, row) {
        const prey = RandomOrganismGenerator.newPrey(env, col, row, Directions.left);
        prey.anatomy.addDefaultCell(CellStates.mouth, 1, 0);
        prey.anatomy.addDefaultCell(CellStates.mover, 0, 0);
        const preyEye = prey.anatomy.addDefaultCell(CellStates.eye, -1, 0);
        preyEye.direction = Directions.left;
        prey.brain.decisions[CellStates.killer.name] = Brain.Decision.retreat;
        return prey;
    }

    // cross-shaped burrowing prey around a central mover:
    //         mouth
    //  mouth  mover  eye(looking up)
    //         claw
    static createClawPrey(env, col, row) {
        const prey = RandomOrganismGenerator.newPrey(env, col, row, Directions.right);
        prey.anatomy.addDefaultCell(CellStates.mover, 0, 0);
        const preyEye = prey.anatomy.addDefaultCell(CellStates.eye, 1, 0);
        preyEye.direction = Directions.up;
        prey.anatomy.addDefaultCell(CellStates.mouth, 0, -1);
        prey.anatomy.addDefaultCell(CellStates.mouth, -1, 0);
        prey.anatomy.addDefaultCell(CellStates.claw, 0, 1);
        prey.brain.decisions[CellStates.killer.name] = Brain.Decision.retreat;
        return prey;
    }

    static newPrey(env, col, row, direction) {
        const prey = new Organism(col, row, env);
        prey.is_prey = true;
        prey.move_range = 4;
        prey.move_speed = 2;
        prey.direction = direction;
        return prey;
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
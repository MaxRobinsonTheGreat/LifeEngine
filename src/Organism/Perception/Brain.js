const Hyperparams = require("../../Hyperparameters");
const Directions = require("../Directions");
const CellStates = require("../Cell/CellStates");

const Decision = {
    neutral: 0,
    retreat: 1,
    chase: 2,
    getRandom: function(){
        return Math.floor(Math.random() * 3);
    },
    getRandomNonNeutral: function() {
        return Math.floor(Math.random() * 2)+1;
    }
}

class Brain {
    constructor(owner){
        this.owner = owner;
        this.clearObservations();

        // corresponds to CellTypes
        this.decisions = {};
        for (let cell of CellStates.all) {
            this.decisions[cell.name] = Decision.neutral;
        }
        this.decisions[CellStates.food.name] = Decision.chase;
        this.decisions[CellStates.killer.name] = Decision.retreat;
    }

    copy(brain) {
        for (let dec in brain.decisions) {
            this.decisions[dec] = brain.decisions[dec];
        }
    }

    randomizeDecisions(randomize_all=false) {
        // randomize the non obvious decisions
        if (randomize_all) {
            this.decisions[CellStates.food.name] = Decision.getRandom();
            this.decisions[CellStates.killer.name] = Decision.getRandom();
        }
        this.decisions[CellStates.mouth.name] = Decision.getRandom();
        this.decisions[CellStates.producer.name] = Decision.getRandom();
        this.decisions[CellStates.mover.name] = Decision.getRandom();
        this.decisions[CellStates.armor.name] = Decision.getRandom();
        this.decisions[CellStates.eye.name] = Decision.getRandom();
        this.decisions[CellStates.healer.name] = Decision.getRandom();
        this.decisions[CellStates.leaf.name] = Decision.getRandom();
        this.decisions[CellStates.spike.name] = Decision.getRandom();
        this.decisions[CellStates.booster.name] = Decision.getRandom();
        this.decisions[CellStates.poison.name] = Decision.getRandom();
    }

    // Called at the start of every tick. Only what the eyes see this tick should
    // drive the decision; previously sightings piled up while the brain was being
    // ignored (and forever on non-movers) and stale ones could win later.
    clearObservations() {
        this.seen_cell = null;
        this.seen_distance = Infinity;
        this.seen_direction = 0;
    }

    // Keeps only the closest sighting (first one wins ties, as before).
    observe(cell, distance, direction) {
        if (cell === null || cell.owner === this.owner)
            return;
        if (distance < this.seen_distance) {
            this.seen_cell = cell;
            this.seen_distance = distance;
            this.seen_direction = direction;
        }
    }

    decide() {
        var decision = Decision.neutral;
        if (this.seen_cell !== null) {
            decision = this.decisions[this.seen_cell.state.name];
        }
        var move_direction = this.seen_direction;
        this.clearObservations();
        if (decision == Decision.chase) {
            this.owner.changeDirection(move_direction);
            return true;
        }
        else if (decision == Decision.retreat) {
            this.owner.changeDirection(Directions.getOppositeDirection(move_direction));
            return true;
        }
        return false;
    }

    mutate() {
        this.decisions[CellStates.getRandomName()] = Decision.getRandom();
        this.decisions[CellStates.empty.name] = Decision.neutral; // if the empty cell has a decision it gets weird
    }
    
    serialize() {
        return {decisions: this.decisions};
    }
}

Brain.Decision = Decision;

module.exports = Brain;
const CellTypes = require("../Cell/CellTypes");
const Hyperparams = require("../../Hyperparameters");
const Directions = require("../Directions");

const Decision = {
    neutral: 0,
    retreat: 1,
    chase: 2
}

class Brain {
    constructor(owner){
        this.owner = owner;
        this.observations = [];

        // corresponds to CellTypes
        this.decisions = [
            Decision.neutral, // empty
            Decision.chase, // food
            Decision.neutral, // wall
            Decision.neutral, // mouth
            Decision.neutral, // producer
            Decision.neutral, // mover
            Decision.retreat, // killer
            Decision.neutral, // armor
            Decision.neutral, // eye
        ];
    }

    observe(observation){
        this.observations.push(observation);
    }

    decide(){
        var decision = Decision.neutral;
        var closest = Hyperparams.lookRange + 1;
        var move_direction = 0;
        for (var obs of this.observations) {
            if (obs.cell == null || obs.cell.owner == this.owner){
                continue;
            }
            if (obs.distance < closest){
                decision = this.decisions[obs.cell.type];
                move_direction = obs.direction;
                closest = obs.distance;
            }
        }
        this.observations = [];
        if (decision == Decision.chase) {
            this.owner.direction = move_direction;
            this.owner.move_count = 0;
            return true;
        }
        else if (decision == Decision.retreat) {
            this.owner.direction = Directions.getOppositeDirection(move_direction);
            this.owner.move_count = 0;
            return true;
        }
        return false;
    }
}

module.exports = Brain;
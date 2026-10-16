const Hyperparams = require("../../Hyperparameters");
const CellStates = require("../Cell/CellStates");

const Decision = {
    neutral: 0,
    retreat: 1,
    chase: 2,
    move_left: 3,
    move_right: 4,
    stop: 5,
    turn_left: 6,
    turn_right: 7,
    hide: 8, // burrow underground (needs a claw cell); never picked by getRandom
    getRandom: function() {
        const range = Hyperparams.rotationEnabled ? 8 : 6
        return Math.floor(Math.random() * range);
    }
}

// the brain takes eye observations in -> movement decision out
// it operates as a state machine (the brain state), and has independent logic for each eye
// each eye has a list of decision maps, one for each brain state
// each decision map is a map from (observed cell state) -> (movement decision, next brain state)
// (action,next_state) = decisions[eye_index][state_index][observed_cell]
// the nearest eye's observations is the one that determines the action

class Brain {
    constructor(owner) {
        this.owner = owner;
        this.num_states = 1;
        this.state = 0;
        this.observations = [];
        this.decisions = [[ this.newDecisionMap() ]];
        this.eye_cell_count = 0;
        this.independent_eye_decisions = false;
    }

    checkAddedCell(cell) {
        if (cell.state.name == CellStates.eye.name) {
            this.fillEyeDecisions();
            this.eye_cell_count++;
        }
    }

    checkRemovedCell(cell) {
        if (cell.state.name === CellStates.eye.name) {
            if (this.independent_eye_decisions && this.decisions.length > 1) {
                let eye_index = -1;
                for (let c of this.owner.anatomy.cells) {
                    if (c.state.name == CellStates.eye.name) {
                        eye_index++;
                    }
                    if (c === cell) {
                        break;
                    }
                }
                if (eye_index != -1 && this.decisions.length > 1) {
                    this.decisions.splice(eye_index, 1);
                }
            }
            this.eye_cell_count--;
        }
    }

    countCells() {
        this.eye_cell_count = 0;
        for (let cell of this.owner.anatomy.cells) {
            if (cell.state.name == CellStates.eye.name) {
                this.eye_cell_count++;
            }
        }
    }

    fillEyeDecisions() {
        if (!this.independent_eye_decisions) {
            return;
        }
        let last_eye_copy = null;
        if (this.decisions.length > 0) {
            last_eye_copy = deepCopy(this.decisions[this.decisions.length - 1]);
        }
        this.countCells();
        while (this.decisions.length < this.eye_cell_count) {
            if (!last_eye_copy) {
                const eyeStates = [];
                for(let s=0;s<this.num_states;s++) eyeStates.push(this.newDecisionMap());
                this.decisions.push(eyeStates);
                last_eye_copy = deepCopy(eyeStates);
            } else {
                // if there are already eyes, copy the last eye's states/decisions to new eye
                this.decisions.push(last_eye_copy);
            }
        }
    }

    setIndependentEyeDecisions(val) {
        if (this.independent_eye_decisions === val) {
            return;
        }
        this.independent_eye_decisions = val;
        if (!val) {
            this.decisions = [this.decisions[0]];
        } else {
            this.fillEyeDecisions();
        }
    }
    
    newBrainState(randomize_connections=true) {
        if (this.num_states >= 10) {
            return;
        }
        this.num_states++;
        for (let eye of this.decisions) {
            const last_state = eye[eye.length - 1];
            if (last_state) {
                const last_state_copy = deepCopy(last_state);
                eye.push(last_state_copy);
            } else {
                eye.push(this.newDecisionMap());
            }
        }
        if (!randomize_connections)
            return;
        const numMut = Math.max(1, Math.floor(Math.random() * this.decisions.length * this.num_states * 2));
        for (let i = 0; i < numMut; i++) {
            const eyeIdx = Math.floor(Math.random() * this.decisions.length);
            const fromState = Math.floor(Math.random() * (this.num_states - 1));
            const toState = this.num_states - 1;
            const cellType = CellStates.getRandomName();
            this.decisions[eyeIdx][fromState][cellType].state = toState;
        }
    }

    removeBrainState(index=-1) {
        if (index === -1) {
            index = this.num_states - 1;
        }
        if (this.num_states <= 1) {
            return;
        }
        const new_num_states = this.num_states - 1;
        for (let eye of this.decisions) {
            for (let i=0;i<eye.length;i++) {
                if (i === index) {
                    continue;
                }
                const state = eye[i];
                // remove all references to the state to be removed
                for (let cell of CellStates.all) {
                    if (state[cell.name].state === index) {
                        state[cell.name].state = Math.floor(Math.random() * new_num_states);
                    }
                    if (state[cell.name].state > index) {
                        state[cell.name].state--;
                    }
                }
            }
            eye.splice(index, 1);
        }
        this.num_states = new_num_states;
        // ensure current state index is within bounds after removal
        if (this.state >= this.num_states) {
            this.state = this.num_states - 1; // adjust to last valid state index
            if (this.state < 0) this.state = 0;
        }
    }

    newDecisionMap(default_decision=null) {
        const decisions = {};
        for (let cell of CellStates.all) {
            decisions[cell.name] = {
                decision: default_decision || Decision.getRandom(),
                state: Math.floor(Math.random() * this.num_states)
            };
        }
        decisions[CellStates.food.name].decision = Decision.chase;
        decisions[CellStates.killer.name].decision = Decision.retreat;
        return decisions;
    }

    copy(brain) {
        this.decisions = [];
        if (Array.isArray(brain.decisions)) {
            this.decisions = deepCopy(brain.decisions);
            this.independent_eye_decisions = brain.independent_eye_decisions;
            if (this.independent_eye_decisions) {
                this.countCells();
            }
        } else if (brain.decisions && typeof brain.decisions === 'object') {
            // legacy single-map structure
            const decisions_copy = deepCopy(brain.decisions);
            for (let cell of CellStates.all) {
                decisions_copy[cell.name] = {
                    decision: decisions_copy[cell.name],
                    state: 0 // need to add state to legacy decisions
                };
            }
            this.decisions.push([decisions_copy]);
            this.independent_eye_decisions = false;
        }
        if (this.decisions.length > 0) {
            this.num_states = this.decisions[0].length;
        }
    }

    randomizeDecisions() {
        for (let eye of this.decisions) {
            for (let state of eye) {
                for (let cell of CellStates.all) {
                    state[cell.name].decision = Decision.getRandom();
                }
            }
        }
    }

    observe(observation) {
        this.observations.push(observation);
    }

    decide() {
        let decision = {
            decision: Decision.neutral,
            state: 0
        };
        let closest = Hyperparams.lookRange + 1;
        let move_direction = 0;
        let closestPreyDistance = Infinity;
        let preyDirection = 0;
        let closestPredatorDistance = Infinity;
        let predatorDirection = 0;
        let closestFoodDistance = Infinity;
        let foodDirection = 0;
        for (let i = 0; i < this.observations.length; i++) {
            let obs = this.observations[i];
            if (obs.cell == null || obs.cell.owner == this.owner) {
                continue;
            }

            const other = obs.cell.owner;
            if (this.owner.is_predator) {
                if (other && other.is_prey && other.living && !other.isHidden() &&
                    obs.distance < closestPreyDistance) {
                    closestPreyDistance = obs.distance;
                    preyDirection = obs.direction;
                }
                continue;
            }
            if (this.owner.is_prey) {
                if (other && other.is_predator && other.living && !other.isHidden() &&
                    obs.distance < closestPredatorDistance) {
                    closestPredatorDistance = obs.distance;
                    predatorDirection = obs.direction;
                }
                else if (obs.cell.state == CellStates.food && obs.distance < closestFoodDistance) {
                    closestFoodDistance = obs.distance;
                    foodDirection = obs.direction;
                }
                continue;
            }

            if (obs.distance < closest) {
                const eye_index = (i < this.decisions.length) ? i : 0;
                if (this.state >= this.num_states) {
                    console.error('state out of bounds', this.state, this.num_states);
                }
                decision = this.decisions[eye_index][this.state][obs.cell.state.name];
                move_direction = obs.direction;
                closest = obs.distance;
            }
        }
        this.observations = [];
        if (this.owner.is_predator && closestPreyDistance < Infinity) {
            decision = {decision: Decision.chase, state: this.state};
            move_direction = preyDirection;
        }
        else if (this.owner.is_prey) {
            const sees_predator = closestPredatorDistance < Infinity;
            let prey_decision = Decision.neutral;
            if (sees_predator) {
                // prey with a claw burrow instead of running, unless the soil is too depleted
                prey_decision = this.owner.canBurrow() ? Decision.hide : Decision.retreat;
                move_direction = predatorDirection;
            }
            else if (closestFoodDistance < Infinity) {
                // prey go after food when no predator is around
                prey_decision = Decision.chase;
                move_direction = foodDirection;
            }
            decision = {
                decision: prey_decision,
                state: this.state
            };
        }
        this.state = decision.state;
        return {decision: decision.decision, move_direction};
    }

    size() {
        return this.decisions.length * this.num_states * CellStates.all.length;
    }

    mutate() {
        if (Math.random() < 0.25) {
            if (Math.random() < 0.5) {
                this.newBrainState();
            } else {
                this.removeBrainState();
            }
        }
        if (Hyperparams.evolveIndependentEyeDecisions && Math.random() < 0.25) {
            this.setIndependentEyeDecisions(!this.independent_eye_decisions);
        }
        
        let num_mutations = Math.floor(Math.random() * this.size()/2);
        for (let i = 0; i < num_mutations; i++) {
            let eye_index = Math.floor(Math.random() * this.decisions.length);
            let state_index = Math.floor(Math.random() * this.decisions[eye_index].length);
            if (Math.random() < 0.5) {
                this.decisions[eye_index][state_index][CellStates.getRandomName()].decision = Decision.getRandom();
            }
            else {
                this.decisions[eye_index][state_index][CellStates.getRandomName()].state = Math.floor(Math.random() * this.num_states);
            }
        }
    }
    
    serialize() {
        return {
            decisions: this.decisions,
            independent_eye_decisions: this.independent_eye_decisions,
            state: this.state
        };
    }
}

function deepCopy(obj) {
    if (Array.isArray(obj)) {
        return obj.map(deepCopy);
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, deepCopy(value)]));
    }
    return obj;
}


Brain.Decision = Decision;

module.exports = Brain;
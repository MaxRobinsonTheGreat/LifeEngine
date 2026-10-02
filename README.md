This is the readme for my evolution simulator, The Life Engine. 

FOR FEATURE REQUESTS, USE THE DISCUSSIONS TAB. FOR BUG REPORTS, USE THE ISSUES TAB. :)

# The Life Engine
[Play here!](https://thelifeengine.net/)

The life engine is a cellular automaton designed to simulate the long term processes of biological evolution. It allows organisms to eat, reproduce, mutate, and adapt.
Unlike genetic algorithms, the life engine does not manually select the most "fit" organism for some given task, but rather allows true natural selection to 
run its course. Organisms that survive, successfully produce offspring, and out-compete their neighbors naturally propogate througout the environment.

This is the second version of the [original evolution simulator](https://github.com/MaxRobinsonTheGreat/EvolutionSimulator), which I started in high school.


# How to Run and Modify the Code
 - [Install node and npm](https://nodejs.org/en/download/)
 - Download or clone this repository
 - Open a terminal or powershell comand prompt, go to the repository and run `npm install`
 - Run `npm run build` (or `npm run build-watch` for a better developer experience)
   - If you get a `Can't resolve jquery` error message run `npm install --save jquery`
 - Open `dist/index.html` in your browser. The simulation should start running.

To load custom creations (found in `/dist/assets`), you must have a simple web server that serves all files in the dist directory. I do this with python:
 - [Install python](https://www.python.org/downloads/)
 - run `python -m http.server --directory dist` from the repository root
 - Open `http://localhost:8000/` in your browser

### Npm build commands
- Production mode (minified): `npm run build`
- Watch mode (dev mode that auto-builds when you save a file): `npm run build-watch`
- Dev mode (better error messages): `npm run build-dev` 

### Architecture
The simulation is written in Rust (`engine/`), compiled to WebAssembly, and runs in a Web Worker so it never competes
with drawing or input:
- `engine/src/world.rs` holds the world (grid in flat arrays, organisms sharing immutable genomes) and the **exact**
  tick, which reproduces the original JavaScript simulation exactly for the same random seed.
- `engine/src/fast.rs` is the **fast** tick: the grid is split into 32x32 tiles in a 2x2 checkerboard and tiles of one
  color are updated in parallel on several threads (`engine/src/threads.rs`). It only kicks in for populations of
  2500+ organisms; smaller worlds use the exact tick, which is quicker there. Its results differ slightly from run to
  run (see the comment at the top of `fast.rs` for the exact differences).
- `src/Sim/WasmWorld.js` drives the engine from JS: evolution controls, species and fossil record bookkeeping (from
  events the engine reports), and loading/saving in the usual world format.
- `src/Sim/SimHost.js` runs the tick loop in the worker and starts the helper threads; `src/Sim/SimClient.js` is the
  page side. If no worker can be created, the same worker code runs on the page's thread.
- `src/Environments/WorldEnvironment.js` forwards UI actions to the worker and draws the snapshots it sends back.
- The organism editor uses the original object-based classes in `src/Organism`; organisms move between the editor and
  the world in the save format.

Choose the mode and thread count under World Controls -> Simulation Engine.

### Multi-core and cross-origin isolation
Threads share memory through `SharedArrayBuffer`, which browsers only allow on cross-origin isolated pages. Static
hosts (GitHub Pages, `python -m http.server`) can't send the required headers, so `dist/coi-serviceworker.js` adds
them; `index.html` registers it and the page reloads once on the first visit. Where that isn't possible (opened from
`file://`, Safari, service workers disabled) the game uses the single-threaded engine build. If your server can send
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)
itself, the service worker isn't needed.

### Building the engine
The compiled engines are committed (`src/Sim/wasm/engine-mt.wasm`, `engine-st.wasm`), so `npm run build` doesn't need
Rust. To change the engine, install Rust with the nightly toolchain (needed for WebAssembly threads):
```
rustup toolchain install nightly --component rust-src --target wasm32-unknown-unknown
npm run build:engine   # rebuilds both .wasm files
npm run build
```

### Tests
`npm test` runs two suites:
- `bench/compare.js`: the original object-based simulation (kept in `bench/reference`) and the Rust engine's exact mode
  run side by side on the same random seed across several worlds and organisms; both must end in exactly the same state.
- `bench/invariants.js`: fast mode (and exact mode) on several scenarios with multiple threads, checking every 50 ticks
  that the grid, organism list, species populations and counters agree, plus a save/load round trip.

### Headless benchmark
`npm run bench` runs the engine in Node (no browser) with a seeded RNG and prints ticks/second plus a state hash. The
same seed always produces the same hash in exact mode, so a performance change that keeps the hash identical did not
change simulation behavior. `npm run bench:threads` compares exact mode with fast mode on 1..N threads, all starting
from the same grown world.
- `npm run bench -- --ticks 5000 --seed 7 --cols 300 --rows 200`
- `npm run bench -- --world dist/assets/worlds/zoo.json --render` (load a world; `--render` also exercises the renderer)
- `npm run bench -- --org dist/assets/organisms/shark.json` (start from a single organism)
- `npm run bench -- --engine wasm-fast --threads 3` runs fast mode; `--engine object` the original implementation

In the browser, the running engine is exposed as `window.engine` for debugging from the console.


# How the Simulation Works
## The Environment
The environment is a simple grid system made up of cells, which at every tick have a certain type. The environment is populated by organisms, which are structures of multiple cells.

## Cells
A cell can be one of the following types.
### Independent Cells
Independent cells are not part of organisms. 
- Empty - Dark blue, inert.
- Food - Grayish-blue, provides nourishment for organisms.
- Wall - Gray, blocks organisms movement and reproduction.
### Organism Cells
Organism Cells are only found in organisms, and cannot exist on their own in the grid.
- Mouth - Orange, eats food in directly adjacent cells.
- Producer - Green, randomly generates food in directly adjacent empty cells.
- Mover - Light blue, allows the organism to move and rotate randomly.
- Killer - Red, harms organisms in directly adjacent cells (besides itself).
- Armor - Purple, negates the effects of killer cells.
- Eye - Light purple with a slit, allows the organism to see and move intelligently. See further description below.
- Healer - White, each tick has a chance (`Healer repair chance`, default 10%) to repair 1 point of damage on its organism.
- Camo - Olive, makes its organism invisible to other organisms' eyes: they see straight through its body.
- Leaf - Dark green, photosynthesis: each tick a chance (`Leaf feeding chance`, default 1%) to feed its own organism 1 food directly. The food never appears in the world, so it can't be stolen, and leaf organisms don't need a mouth. Like producers, leaves don't work on movers unless `Movers can produce food` is on.
- Spike - Orange, a killer cell that damages a spike takes 1 damage itself.
- Booster - Brown, a moving organism with a booster moves 2 cells per tick.
- Poison - Lime, an organism with poison leaves no food behind when it dies, so killing it gains predators nothing.

These six cell types can be turned off with the `New cell types evolve` evolution control to get the classic six cell types. Worlds saved before healer/camo existed load with them turned off.

## Organisms
Organisms are structures of cells that eat food, reproduce, and die.
When an organism dies, every cell in the grid that was occupied by a cell in its body will be changed to food.
Their lifespan is calculated by multiplying the number of cells they have by the hyperparameter `Lifespan Multiplier`. They will survive for that many ticks unless killed by another organism.
When touched by a killer cell, an organism will take damage. Once it has taken as much damage as it has cells in its body, it will die. If the hyperparameter `One touch kill` is on, an organism will immediatly die when touched by a killer cell.

## Reproduction
Once an organism has eaten as much food as it has cells in its body, it will attempt to reproduce. 
First, offspring is formed by cloning the current organism and possibly mutating it (see below).
The offspring birth location is then chosen a certain number of cells in a random direction (up, down, left, right). This number is calculated programmatically such that it is far enough away that it can't intersect with it's parent.
Additionally, a random value between 1 and 3 is added to the location to introduce a little variance.
Reproduction can fail if the offspring attempts to occupy non-empty cells, like other organisms and food. If reproduction fails, the food required to produce a child is wasted.

## Mutation
Offspring can mutate their anatomies in 3 different ways: change a cell, lose a cell, or add a cell. Changing a cell sets a random cell to a random type. Losing a cell removes a random cell. Note that this can result in organisms with "gaps" and cells disconnected from the rest of its body. I consider this a feature, not a bug.
To add a cell the organism first selects a cell it already has in its body, then grows a new cell with a random type in a location adjacent to the selected cell.

If an organism mutates, there is a 10% chance that mutation will alter the movement patterns of the organism (see below).

## Movement and Rotation
Organisms with mover cells (light blue) are permitted to move freely about the grid. Only a single mover cell is required and adding more doesn't do anything. By default, an organism selects a random direction and moves one cell per tick in that direction for a certain number of ticks. This number is called "Move range", and it can mutate over time.

Organims can also rotate around a central pivot cell. This cell can never be removed by mutation, though it can change type. Movers rotate randomly when they change direction, and their rotation is not necessarily the same as their movement direction, ie, they aren't always facing the direction they are moving. Offspring of all organisms (including static ones) rotate randomly during reproduction. This rotation can be toggled in the simulation controls.

## Eyes and Brains
Any organism can evolve eyes, but when an organism has both eyes and mover cells it is given a brain. The eye, unlike other cells, has a direction, which is denoted by the direction of the slit in the cell. It "looks" forward in this direction and "sees" the first non-empty cell within a certain range. It checks the type of the cell and informs the brain, which then decideds how to move. The brain can either ignore (keep moving in whatever direction), chase (move towards the observed cell), or retreat (move in the opposite direction of the observed cell). The brain maps different observed cell types to different actions. For instance, the brain will chase when it sees food and retreat when it sees a killer cell. These behaviors can mutate over time. 

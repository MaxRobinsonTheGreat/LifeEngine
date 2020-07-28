# The Life Engine
The life engine is a cellular automaton designed to simulate the long term processes of biological evolution. It allows organisms to eat, reproduce, mutate, and adapt.
Unlike genetic algorithms, the life engine does not manually select the most "fit" organism for some given task, but rather allows true natural selection to 
run its course. Organisms that survive, successfully produce offspring, and out-compete their neighbors naturally propogate througout the environment.

This is the second version of the [original evolution simulator](https://github.com/MaxRobinsonTheGreat/EvolutionSimulator), which I started in high school.


# Rules
## The Environment
The environment is a simple grid system made up of cells, which at every tick have a certain type. The environment is populated by organisms, which are structures of multiple cells.

## Cells
A cell can be one of the following types.
### Independent Cells
Independent cells are not part of organisms. 
- Empty - Dark blue, inert.
- Food - Green, provides nourishment for organisms.
- Wall - Gray, blocks organisms movement and reproduction.
### Organism Cells
Organism Cells are only found in organisms, and cannot exist on their own in the grid.
- Mouth - Orange, eats food in directly adjacent cells.
- Producer - White, randomly generates food in directly adjacent empty cells.
- Mover - Light blue, allows the organism to move and rotate randomly.
- Killer - Red, harms organisms in directly adjacent cells (besides itself).
- Armor - Purple, negates the effects of killer cells.

## Organisms
Organisms are structures of cells.
When an organism dies, every cell in the grid that was occupied by a cell in its body will be changed to food.
Their lifespan is calculated by multiplying the number of cells they have by the hyperparameter `Lifespan Multiplier`. They will survive for that many ticks unless killed by another organism.
When touched by a killer cell, and organism will take damage. Once it has taken as much damage as it has cells in its body, it will die. If the hyperparameter `One touch kill` is on, an organism will immediatly die when touched by a killer cell.

## Reproduction
Once an organism has eaten as much food as it has cells in its body, it will attempt to reproduce. 
First, offspring is formed by cloning the current organism and possibly mutating it.
The offspring birth location is then chosen 2 + (number of cells) in a random direction (up, down, left, right). This ensures it will not be intersecting with its parent.
Additionally, a random value between 1 and 3 is added to the location so they are not always failing to reproduce due to intersections.
Finally, the distance between the parent and offspring maxes out at 30 cells.
If reproduction fails, the food required to produce a child is wasted.

## Mutation
Offspring can mutate in 3 different ways: lose a cell, change a cell type, or add a cell. Losing and changing are pretty self explanatory, but adding is a little more complex.
The organism first selects a cell it already has in its body, then randomly grows a cell connected to that original branch cell.

## Food Production and Lifespan Multiplier
To stablize ecosystems, I set up a simple equation to handle the relationship between how likely an organism is to produce food and how much time it has to do so.
Essentially, the equation makes it so that for an organism of any given size, a single producer cell will produce as much food as cells in the organisms body. 
For example, if an organism has 5 cells, it will live long enough so that a single producer cell will (on average) produce 5 food. This works if assuming the organism eats all 
of the food and successfully reproduces. However, this assumtion is very often not the case, and for this reason I added a scalar value to make food production more probable.
This is the final equation:

```
p = probability of producing food (0 - 100)
l = lifespan multiplier (how many ticks per cell an organism is given)
x = scalar

p/100 = x/l
```



# Building and Playing
Requirements to edit and build:
- npm
- webpack

## Playing
Included in this repo is an already built version of the game. You can play it simply by opening `index.html` in your browser.

## Building
If you want to change the source code and then play, use any of the following commands to build the project:
To build minified: `npm run build`
To build in dev mode: `npm run build-dev`
To build in dev/watch mode: `npm run build-watch`
You can then open `index.html` in your browser.

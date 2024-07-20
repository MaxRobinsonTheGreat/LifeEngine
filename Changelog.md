# Changelog

## 1.0.6 (ongoing)

### UI Enhancements:
- Added ability to change species name via UI

### Simulation Enhancements:
- 

## 1.0.5 (4/23/2023)

### UI Enhancements:
- Improved "Community Creations" list panel
- Added Mod list to Community Creations
- Added brush size slider
- Added unnatural organism warning

### Simulation Enhancements:
- Added links to community mods
- Added more worlds and organisms to community creations

## 1.0.4 (9/17/2022)

### UI Enhancements:
- Added "Community Creations" button
- Updated icons
- Standardized Colors

### Simulation Enhancements:
- Added ability to load premade organisms and worlds from backend
- Added SeeThroughSelf param that allows eyes to see through their own cells

### Bug Fixes:
- Mutation rate now properly saves and loads with world


## 1.0.3 (4/15/2022)

### UI Enhancements:
- Improved styling

### Simulation Enhancements:
- Added ability to save/load organisms
- Added ability to save/load worlds

### Bug Fixes:
- charste changed to charset
- Fixed species tracking


Thanks to contributors: @TerraMaster85

## 1.0.2 (12/21/2021)

### UI Enhancements:
- New tab "World Controls"
    - Relocated grid controls and auto reset to this tab
    - Button to generate random walls with perlin noise
    - Button to reset the environment with many randomly generated organisms
    - Option to not clear walls on reset
    - Option to pause on total extinction
- "Simulation controls" tab renamed to "Evolution Controls"
- Button to save/load Evolution Controls in a `.json` file
- Button to randomize the organism in the editor window
- Can now use drag view tool while rendering is off
- Reorganized "About" tab and left panel, embedded explanation video

### Simulation Enhancements:
- New evolution control `Extra Mover Reproduction Cost`, which adds additional food cost for movers to reproduce
- Combined `Movers can rotate` and `Offspring rotate` evolution controls into `Rotation enabled`
- Fully max out simulation speed when slider is all the way to the right

### Bug Fixes:
- Armor is no longer ignored when checking for clear reproduction space
- Chart data is now properly loaded/discarded when paused


Thanks to contributors: @Chrispykins @M4YX0R

## 1.0.1 (12/4/2021)

### UI Enhancements:
- Hotkeys/improved zoom controls: [#47](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/47)
  - `A` reset view
  - `S/middle mouse button` pan
  - `D` drop walls
  - `F` drop food
  - `G` click to kill
  - `H` headless rendering toggle
  - `Spacebar/J` pause/play toggle
  - `Z` select organism
  - `X` edit organism
  - `C` drop organism
  - `V` toggle hud
  - `B` destroy all walls
  - `Q` min/max control panel
- Improved mutation probability controls: [#43](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/43)
- Ability to edit individual organism's mutability: [#46](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/46)
- Added clear button and improved reset warnings: [#64](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/64)
- Control Panel is minimized by default: [#64](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/64)

### Simulation Enhancements:
- Default food prodcution probability increased from 4->5

### Bug Fixes:
- Fixed actual FPS display: [#45](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/45)
- Fixed slow down/crash on very long runs: [#63](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/63)
- Spelling Fix: [#31](https://github.com/MaxRobinsonTheGreat/LifeEngine/pull/31)


Thanks to contributors: @TrevorSayre @EvaisaGiac @Chrispykins

## 1.0.0
Initial release.

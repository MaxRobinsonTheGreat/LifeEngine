/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/Cell.js":
/*!*********************!*\
  !*** ./src/Cell.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\nvar Hyperparams = __webpack_require__(/*! ./Hyperparameters */ \"./src/Hyperparameters.js\");\r\n\r\n// A cell exists in a grid system.\r\nclass Cell{\r\n    constructor(type, col, row, x, y){\r\n        this.owner = null;\r\n        this.setType(type);\r\n        this.col = col;\r\n        this.row = row;\r\n        this.x = x;\r\n        this.y = y;\r\n    }\r\n\r\n    setType(type) {\r\n        this.type = type;\r\n    }\r\n\r\n    performFunction(env) {\r\n        switch(this.type){\r\n            case CellTypes.mouth:\r\n                eatFood(this, env);\r\n                break;\r\n            case CellTypes.producer:\r\n                growFood(this, env);\r\n                break;\r\n            case CellTypes.killer:\r\n                killNeighbors(this, env);\r\n                break;\r\n        }\r\n    }\r\n\r\n    getColor() {\r\n        return CellTypes.colors[this.type];\r\n    }\r\n\r\n    isLiving() {\r\n        return  this.type != CellTypes.empty && \r\n                this.type != CellTypes.food && \r\n                this.type != CellTypes.wall;\r\n    }\r\n}\r\n\r\nfunction eatFood(self, env){\r\n    for (var loc of Hyperparams.edibleNeighbors){\r\n        var cell = env.grid_map.cellAt(self.col+loc[0], self.row+loc[1]);\r\n        eatNeighborFood(self, cell, env);\r\n    }\r\n}\r\n\r\nfunction eatNeighborFood(self, n_cell, env){\r\n    if (n_cell == null)\r\n        return;\r\n    if (n_cell.type == CellTypes.food){\r\n        env.changeCell(n_cell.col, n_cell.row, CellTypes.empty, null);\r\n        self.owner.food_collected++;\r\n    }\r\n}\r\n\r\nfunction growFood(self, env){\r\n    if (self.owner.is_mover)\r\n        return;\r\n    var prob = Hyperparams.foodProdProb;\r\n    // console.log(prob)\r\n    for (var loc of Hyperparams.growableNeighbors){\r\n        var c=loc[0];\r\n        var r=loc[1];\r\n        var cell = env.grid_map.cellAt(self.col+c, self.row+r);\r\n        if (cell != null && cell.type == CellTypes.empty && Math.random() * 100 <= prob){\r\n            env.changeCell(self.col+c, self.row+r, CellTypes.food, null);\r\n            return;\r\n        }\r\n    }\r\n}\r\n\r\nfunction killNeighbors(self, env) {\r\n    for (var loc of Hyperparams.killableNeighbors){\r\n        var cell = env.grid_map.cellAt(self.col+loc[0], self.row+loc[1]);\r\n        killNeighbor(self, cell);\r\n    }\r\n}\r\n\r\nfunction killNeighbor(self, n_cell) {\r\n    if(n_cell == null || n_cell.owner == null || n_cell.owner == self.owner || !n_cell.owner.living || n_cell.type == CellTypes.armor) \r\n        return;\r\n    var should_die = n_cell.type == CellTypes.killer; // has to be calculated before death\r\n    n_cell.owner.die();\r\n    if (should_die){\r\n        self.owner.die();\r\n    }\r\n}\r\n\r\nmodule.exports = Cell;\r\n\n\n//# sourceURL=webpack:///./src/Cell.js?");

/***/ }),

/***/ "./src/CellTypes.js":
/*!**************************!*\
  !*** ./src/CellTypes.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("const CellTypes = {\r\n    empty: 0,\r\n    food: 1,\r\n    wall: 2,\r\n    mouth: 3,\r\n    producer: 4,\r\n    mover: 5,\r\n    killer: 6,\r\n    armor: 7,\r\n    colors: ['#121D29', 'green', 'gray', 'orange', 'white', 'blue', 'red', 'purple'],\r\n    getRandomLivingType: function(){\r\n        return Math.floor(Math.random() * 5) + 3;\r\n    }\r\n}\r\n\r\nmodule.exports = CellTypes;\r\n\n\n//# sourceURL=webpack:///./src/CellTypes.js?");

/***/ }),

/***/ "./src/ControlModes.js":
/*!*****************************!*\
  !*** ./src/ControlModes.js ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("const Modes = {\r\n    None: 0,\r\n    FoodDrop: 1,\r\n    WallDrop: 2,\r\n    ClickKill: 3\r\n}\r\n\r\nmodule.exports = Modes;\n\n//# sourceURL=webpack:///./src/ControlModes.js?");

/***/ }),

/***/ "./src/ControlPanel.js":
/*!*****************************!*\
  !*** ./src/ControlPanel.js ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("var Hyperparams = __webpack_require__(/*! ./Hyperparameters */ \"./src/Hyperparameters.js\");\r\nvar Modes = __webpack_require__(/*! ./ControlModes */ \"./src/ControlModes.js\");\r\nconst CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\n\r\nclass ControlPanel {\r\n    constructor(engine) {\r\n        this.engine = engine;\r\n        this.defineEngineSpeedControls();\r\n        this.defineHyperparameterControls();\r\n        this.defineModeControls();\r\n        this.fps = engine.fps;\r\n        this.organism_record=0;\r\n        this.env_controller = this.engine.env.controller;\r\n    }\r\n\r\n    defineEngineSpeedControls(){\r\n        this.slider = document.getElementById(\"slider\");\r\n        this.slider.oninput = function() {\r\n            this.fps = this.slider.value\r\n            if (this.engine.running) {\r\n                this.changeEngineSpeed(this.fps);\r\n                \r\n            }\r\n            $('#fps').text(\"Target FPS: \"+this.fps);\r\n        }.bind(this);\r\n        $('#pause-button').click(function() {\r\n            if ($('#pause-button').text() == \"Pause\" && this.engine.running) {\r\n                $('#pause-button').text(\"Play\");\r\n                this.engine.stop();\r\n            }\r\n            else if (!this.engine.running){\r\n                $('#pause-button').text(\"Pause\");\r\n                console.log(this.fps)\r\n                this.engine.start(this.fps);\r\n            }\r\n        }.bind(this));\r\n    }\r\n\r\n    defineHyperparameterControls() {\r\n        $('#food-prod-prob').change(function() {\r\n            var food_prob = $('#food-prod-prob').val();\r\n            if ($('#fixed-ratio').is(\":checked\")) {\r\n                Hyperparams.foodProdProb = food_prob;\r\n                Hyperparams.calcProducerFoodRatio(false);\r\n                $('#lifespan-multiplier').val(Hyperparams.lifespanMultiplier);\r\n            }\r\n            else{\r\n                Hyperparams.foodProdProb = food_prob;\r\n            }\r\n        }.bind(this));\r\n        $('#lifespan-multiplier').change(function() {\r\n            var lifespan = $('#lifespan-multiplier').val();\r\n            if ($('#fixed-ratio').is(\":checked\")) {\r\n                Hyperparams.lifespanMultiplier = lifespan;\r\n                Hyperparams.calcProducerFoodRatio(true);\r\n                $('#food-prod-prob').val(Hyperparams.foodProdProb);\r\n            }\r\n            else {\r\n                Hyperparams.lifespanMultiplier = lifespan;\r\n            }\r\n        }.bind(this));\r\n    }\r\n\r\n    defineModeControls() {\r\n        var self = this;\r\n        $('.control-mode-button').click( function() {\r\n            switch(this.id){\r\n                case \"food-button\":\r\n                    self.env_controller.mode = Modes.FoodDrop;\r\n                    break;\r\n                case \"wall-button\":\r\n                    self.env_controller.mode = Modes.WallDrop;\r\n                    break;\r\n                case \"kill-button\":\r\n                    self.env_controller.mode = Modes.ClickKill;\r\n                    break;\r\n                case \"none-button\":\r\n                    self.env_controller.mode = Modes.None;\r\n                    break;\r\n            }\r\n            $(\".control-mode-button\" ).css( \"background-color\", \"lightgray\" );\r\n            $(\"#\"+this.id).css(\"background-color\", \"darkgray\");\r\n        });\r\n    }\r\n\r\n    changeEngineSpeed(change_val) {\r\n        this.engine.stop();\r\n        this.engine.start(change_val)\r\n        this.fps = this.engine.fps;\r\n    }\r\n\r\n    update() {\r\n        $('#fps-actual').text(\"Actual FPS: \" + Math.floor(this.engine.actual_fps));\r\n        var org_count = this.engine.env.organisms.length;\r\n        $('#org-count').text(\"Organism count:  \" + org_count);\r\n        if (org_count > this.organism_record) \r\n            this.organism_record = org_count;\r\n        $('#org-record').text(\"Highest count: \" + this.organism_record);\r\n        // this.env_controller.performModeAction();\r\n    }\r\n\r\n}\r\n\r\n\r\nmodule.exports = ControlPanel;\n\n//# sourceURL=webpack:///./src/ControlPanel.js?");

/***/ }),

/***/ "./src/Engine.js":
/*!***********************!*\
  !*** ./src/Engine.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Environment = __webpack_require__(/*! ./Environment */ \"./src/Environment.js\");\r\nconst ControlPanel = __webpack_require__(/*! ./ControlPanel */ \"./src/ControlPanel.js\");\r\n\r\nconst render_speed = 60;\r\n\r\nclass Engine{\r\n    constructor(){\r\n        this.fps = 60;\r\n        this.env = new Environment(5);\r\n        this.controlpanel = new ControlPanel(this);\r\n        this.env.OriginOfLife();\r\n        this.last_update = Date.now();\r\n        this.delta_time = 0;\r\n        this.actual_fps = 0;\r\n        this.running = false;\r\n    }\r\n\r\n    start(fps=60) {\r\n        if (fps <= 0)\r\n            fps = 1;\r\n        if (fps > 300)\r\n            fps = 300;\r\n        this.fps = fps;\r\n        this.game_loop = setInterval(function(){this.update();}.bind(this), 1000/fps);\r\n        this.running = true;\r\n        if (this.fps >= render_speed) {\r\n            if (this.render_loop != null) {\r\n                clearInterval(this.render_loop);\r\n                this.render_loop = null;\r\n            }\r\n        }\r\n        else\r\n            this.setRenderLoop();\r\n    }\r\n    \r\n    stop() {\r\n        clearInterval(this.game_loop);\r\n        this.running = false;\r\n        this.setRenderLoop();\r\n    }\r\n\r\n    setRenderLoop() {\r\n        if (this.render_loop == null) {\r\n            this.render_loop = setInterval(function(){this.env.render();this.controlpanel.update();}.bind(this), 1000/render_speed);\r\n        }\r\n    }\r\n\r\n\r\n    update() {\r\n        this.delta_time = Date.now() - this.last_update;\r\n        this.last_update = Date.now();\r\n        this.env.update(this.delta_time);\r\n        this.actual_fps = 1/this.delta_time*1000;\r\n        if(this.render_loop == null){\r\n            this.env.render();\r\n            this.controlpanel.update();\r\n        }\r\n            \r\n    }\r\n\r\n}\r\n\r\nmodule.exports = Engine;\r\n\n\n//# sourceURL=webpack:///./src/Engine.js?");

/***/ }),

/***/ "./src/Environment.js":
/*!****************************!*\
  !*** ./src/Environment.js ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Grid = __webpack_require__(/*! ./GridMap */ \"./src/GridMap.js\");\r\nconst Renderer = __webpack_require__(/*! ./Rendering/Renderer */ \"./src/Rendering/Renderer.js\");\r\nconst GridMap = __webpack_require__(/*! ./GridMap */ \"./src/GridMap.js\");\r\nconst Organism = __webpack_require__(/*! ./Organism */ \"./src/Organism.js\");\r\nconst CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\nconst Cell = __webpack_require__(/*! ./Cell */ \"./src/Cell.js\");\r\nconst EnvironmentController = __webpack_require__(/*! ./EnvironmentController */ \"./src/EnvironmentController.js\");\r\n\r\nclass Environment{\r\n    constructor(cell_size) {\r\n        this.renderer = new Renderer('canvas', this, cell_size);\r\n        this.controller = new EnvironmentController(this, this.renderer.canvas);\r\n        this.grid_rows = Math.floor(this.renderer.height / cell_size);\r\n        this.grid_cols = Math.floor(this.renderer.width / cell_size);\r\n        this.grid_map = new GridMap(this.grid_cols, this.grid_rows, cell_size);\r\n        this.renderer.renderFullGrid();\r\n        this.organisms = [];\r\n    }\r\n\r\n    update(delta_time) {\r\n        var to_remove = [];\r\n        for (var i in this.organisms) {\r\n            var org = this.organisms[i];\r\n            if (!org.living || !org.update()) {\r\n                to_remove.push(i);\r\n            }\r\n        }\r\n        this.removeOrganisms(to_remove);\r\n    }\r\n\r\n    render() {\r\n        this.renderer.renderCells();\r\n        this.renderer.renderHighlights();\r\n    }\r\n\r\n    removeOrganisms(org_indeces) {\r\n        for (var i of org_indeces.reverse()){\r\n            this.organisms.splice(i, 1);\r\n        }\r\n    }\r\n\r\n    OriginOfLife() {\r\n        var center = this.grid_map.getCenter();\r\n        var org = new Organism(center[0], center[1], this);\r\n        org.addCell(CellTypes.mouth, 1, 1);\r\n        org.addCell(CellTypes.producer, 0, 0);\r\n        // org.addCell(CellTypes.mouth, 1, -1);\r\n        this.addOrganism(org);\r\n    }\r\n\r\n    addOrganism(organism) {\r\n        organism.updateGrid();\r\n        this.organisms.push(organism);\r\n    }\r\n\r\n    changeCell(c, r, type, owner) {\r\n        this.grid_map.setCellType(c, r, type);\r\n        this.grid_map.setCellOwner(c, r, owner);\r\n        this.renderer.addToRender(this.grid_map.cellAt(c, r));\r\n    }\r\n}\r\n\r\nmodule.exports = Environment;\r\n\r\n\n\n//# sourceURL=webpack:///./src/Environment.js?");

/***/ }),

/***/ "./src/EnvironmentController.js":
/*!**************************************!*\
  !*** ./src/EnvironmentController.js ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("var Modes = __webpack_require__(/*! ./ControlModes */ \"./src/ControlModes.js\");\r\nconst CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\n\r\nclass EnvironmentController{\r\n    constructor(env, canvas) {\r\n        this.env = env;\r\n        this.canvas = canvas;\r\n        this.mouse_x;\r\n        this.mouse_y;\r\n        this.mouse_c;\r\n        this.mouse_r;\r\n        this.left_click = false;\r\n        this.right_click = false;\r\n        this.cur_cell = null;\r\n        this.cur_org = null;\r\n        this.mode = Modes.None;\r\n        this.defineEvents();\r\n    }\r\n\r\n    defineEvents() {\r\n        this.canvas.addEventListener('mousemove', e => {\r\n            var prev_cell = this.cur_cell;\r\n            var prev_org = this.cur_org;\r\n\r\n            this.mouse_x = e.offsetX;\r\n            this.mouse_y = e.offsetY;\r\n            var colRow = this.env.grid_map.xyToColRow(this.mouse_x, this.mouse_y);\r\n            this.mouse_c = colRow[0];\r\n            this.mouse_r = colRow[1];\r\n            this.cur_cell = this.env.grid_map.cellAt(this.mouse_c, this.mouse_r);\r\n            this.cur_org = this.cur_cell.owner;\r\n\r\n            if (this.cur_org != prev_org || this.cur_cell != prev_cell) {\r\n                this.env.renderer.clearAllHighlights(true);\r\n                if (this.cur_org != null) {\r\n                    this.env.renderer.highlightOrganism(this.cur_org);\r\n                }\r\n                else if (this.cur_cell != null) {\r\n                    this.env.renderer.highlightCell(this.cur_cell, true);\r\n                }\r\n            }\r\n            this.performModeAction();\r\n        });\r\n\r\n        this.canvas.addEventListener('mouseup', function(evt) {\r\n            evt.preventDefault();\r\n            this.left_click=false;\r\n            this.right_click=false;\r\n        }.bind(this));\r\n\r\n        this.canvas.addEventListener('mousedown', function(evt) {\r\n            evt.preventDefault();\r\n            if (evt.button == 0) {\r\n                this.left_click = true;\r\n            }\r\n            if (evt.button == 2) \r\n                this.right_click = true;\r\n            this.performModeAction();\r\n        }.bind(this));\r\n\r\n        this.canvas.addEventListener('contextmenu', function(evt) {\r\n            evt.preventDefault();\r\n        });\r\n\r\n        this.canvas.addEventListener('mouseleave', function(){\r\n            this.right_click = false;\r\n            this.left_click = false;\r\n        }.bind(this));\r\n\r\n    }\r\n\r\n    performModeAction() {\r\n        var mode = this.mode;\r\n        var right_click = this.right_click;\r\n        var left_click = this.left_click;\r\n        if (mode != Modes.None && (right_click || left_click)) {\r\n            var cell = this.cur_cell;\r\n            if (cell == null){\r\n                return;\r\n            }\r\n            switch(mode) {\r\n                case Modes.FoodDrop:\r\n                    if (left_click && cell.type == CellTypes.empty){\r\n                        this.env.changeCell(cell.col, cell.row, CellTypes.food, null);\r\n                    }\r\n                    else if (right_click && cell.type == CellTypes.food){\r\n                        this.env.changeCell(cell.col, cell.row, CellTypes.empty, null);\r\n                    }\r\n                    break;\r\n                case Modes.WallDrop:\r\n                        if (left_click && (cell.type == CellTypes.empty || cell.type == CellTypes.food)){\r\n                            this.env.changeCell(cell.col, cell.row, CellTypes.wall, null);\r\n                        }\r\n                        else if (right_click && cell.type == CellTypes.wall){\r\n                            this.env.changeCell(cell.col, cell.row, CellTypes.empty, null);\r\n                        }\r\n                        break;\r\n                case Modes.ClickKill:\r\n                    if (this.cur_org != null)\r\n                        this.cur_org.die();\r\n            }\r\n        }\r\n    }\r\n\r\n\r\n}\r\n\r\nmodule.exports = EnvironmentController;\r\n\n\n//# sourceURL=webpack:///./src/EnvironmentController.js?");

/***/ }),

/***/ "./src/GridMap.js":
/*!************************!*\
  !*** ./src/GridMap.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Cell = __webpack_require__(/*! ./Cell */ \"./src/Cell.js\");\r\nconst CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\n\r\nclass GridMap {\r\n    constructor(cols, rows, cell_size, filltype=CellTypes.empty) {\r\n        this.grid = [];\r\n        this.cols = cols;\r\n        this.rows = rows;\r\n        this.cell_size = cell_size;\r\n        for(var c=0; c<cols; c++) {\r\n            var row = [];\r\n            for(var r=0; r<rows; r++) {\r\n                var cell = new Cell(filltype, c, r, c*cell_size, r*cell_size);\r\n\r\n                row.push(cell);\r\n            }            \r\n            this.grid.push(row);\r\n        }\r\n    }\r\n\r\n    fillGrid(type) {\r\n        for (var col of grid) {\r\n            for (var cell of col){\r\n                cell.setType(type);\r\n            }\r\n        }\r\n    }\r\n\r\n    cellAt(col, row) {\r\n        if (!this.isValidLoc(col, row)) {\r\n            return null;\r\n        }\r\n        return this.grid[col][row];\r\n    }\r\n\r\n    setCellType(col, row, type) {\r\n        if (!this.isValidLoc(col, row)) {\r\n            return;\r\n        }\r\n        this.grid[col][row].setType(type);\r\n    }\r\n\r\n    setCellOwner(col, row, owner) {\r\n        if (!this.isValidLoc(col, row)) {\r\n            return;\r\n        }\r\n        this.grid[col][row].owner = owner;\r\n    }\r\n\r\n    isValidLoc(col, row){\r\n        return col<this.cols && row<this.rows && col>=0 && row>=0;\r\n    }\r\n\r\n    getCenter(){\r\n        return [Math.floor(this.cols/2), Math.floor(this.rows/2)]\r\n    }\r\n\r\n    xyToColRow(x, y) {\r\n        var c = Math.floor(x/this.cell_size);\r\n        var r = Math.floor(y/this.cell_size);\r\n        if (c >= this.cols)\r\n            c = this.cols-1;\r\n        else if (c < 0)\r\n            c = 0;\r\n        if (r >= this.rows)\r\n            r = this.rows-1;\r\n        else if (r < 0)\r\n            r = 0;\r\n        return [c, r];\r\n    }\r\n}\r\n\r\nmodule.exports = GridMap;\r\n\n\n//# sourceURL=webpack:///./src/GridMap.js?");

/***/ }),

/***/ "./src/Hyperparameters.js":
/*!********************************!*\
  !*** ./src/Hyperparameters.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const Neighbors = __webpack_require__(/*! ./Neighbors */ \"./src/Neighbors.js\");\r\n\r\nvar Hyperparams = {\r\n    lifespanMultiplier: 100,\r\n    foodProdProb: 1,\r\n    killableNeighbors: Neighbors.adjacent,\r\n    edibleNeighbors: Neighbors.adjacent,\r\n    growableNeighbors: Neighbors.adjacent,\r\n\r\n\r\n    // calculates the optimal ratio where a producer cell is most likely to produce 1 food in its lifespan.\r\n    calcProducerFoodRatio : function(lifespan_fixed=true) {\r\n        if (lifespan_fixed) {\r\n            // change the foodProdProb\r\n            this.foodProdProb = 100 / this.lifespanMultiplier;\r\n        }\r\n        else {\r\n            // change the lifespanMultiplier\r\n            this.lifespanMultiplier = Math.floor(100 / this.foodProdProb);\r\n        }\r\n    }\r\n}\r\n\r\nmodule.exports = Hyperparams;\n\n//# sourceURL=webpack:///./src/Hyperparameters.js?");

/***/ }),

/***/ "./src/LocalCell.js":
/*!**************************!*\
  !*** ./src/LocalCell.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\n\r\n// A local cell is a lightweight container for a cell in an organism. It does not directly exist in the grid \r\nclass LocalCell{\r\n    constructor(type, loc_col, loc_row){\r\n        this.type = type;\r\n        this.loc_col = loc_col;\r\n        this.loc_row = loc_row;\r\n    }\r\n}\r\n\r\nmodule.exports = LocalCell;\r\n\n\n//# sourceURL=webpack:///./src/LocalCell.js?");

/***/ }),

/***/ "./src/Neighbors.js":
/*!**************************!*\
  !*** ./src/Neighbors.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// contains local cell values for the following:\r\n\r\n//all       ...\r\n//          .x.\r\n//          ...\r\n\r\n//adjacent   .\r\n//          .x.\r\n//           .\r\n\r\n//corners   . .\r\n//           x\r\n//          . .\r\n\r\nconst Neighbors = {\r\n    all: [[0, 1],[0, -1],[1, 0],[-1, 0],[-1, -1],[1, 1],[-1, 1],[1, -1]],\r\n    adjacent: [[0, 1],[0, -1],[1, 0],[-1, 0]],\r\n    corners: [[-1, -1],[1, 1],[-1, 1],[1, -1]]\r\n}\r\n\r\nmodule.exports = Neighbors;\n\n//# sourceURL=webpack:///./src/Neighbors.js?");

/***/ }),

/***/ "./src/Organism.js":
/*!*************************!*\
  !*** ./src/Organism.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const CellTypes = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\nconst Cell = __webpack_require__(/*! ./Cell */ \"./src/Cell.js\");\r\nconst GridMap = __webpack_require__(/*! ./GridMap */ \"./src/GridMap.js\");\r\nconst LocalCell = __webpack_require__(/*! ./LocalCell */ \"./src/LocalCell.js\");\r\nconst { producer } = __webpack_require__(/*! ./CellTypes */ \"./src/CellTypes.js\");\r\nconst Neighbors = __webpack_require__(/*! ./Neighbors */ \"./src/Neighbors.js\");\r\nvar Hyperparams = __webpack_require__(/*! ./Hyperparameters */ \"./src/Hyperparameters.js\");\r\n\r\nconst directions = [[0,1],[0,-1],[1,0],[-1,0]]\r\n\r\nclass Organism {\r\n    constructor(col, row, env, parent=null) {\r\n        this.c = col;\r\n        this.r = row;\r\n        this.env = env;\r\n        this.lifetime = 0;\r\n        this.food_collected = 0;\r\n        this.living = true;\r\n        this.cells = [];\r\n        this.is_producer = false;\r\n        this.is_mover = false;\r\n        this.direction = this.getRandomDirection();\r\n        this.move_count = 0;\r\n        this.move_range = 5;\r\n        this.mutability = 5;\r\n        if (parent != null) {\r\n            this.inherit(parent);\r\n        }\r\n    }\r\n\r\n    addCell(type, c, r) {\r\n        for (var cell of this.cells) {\r\n            if (cell.loc_col == c && cell.loc_row == r)\r\n                return false;\r\n        }\r\n        this.checkProducerMover(type);\r\n        this.cells.push(new LocalCell(type, c, r));\r\n        return true;\r\n    }\r\n\r\n    removeCell(c, r) {\r\n        var check_change = false;\r\n        for (var i=0; i<this.cells.length; i++) {\r\n            var cell = this.cells[i];\r\n            if (cell.loc_col == c && cell.loc_row == r){\r\n                if (cell.type == CellTypes.producer || cell.type == CellTypes.mover) {\r\n                    check_change = true;\r\n                }\r\n                this.cells.splice(i, 1);\r\n                break;\r\n            }\r\n        }\r\n        if (check_change) {\r\n            this.is_producer = false;\r\n            this.is_producer = false;\r\n            for (var cell of this.cells) {\r\n                this.checkProducerMover(cell.type);\r\n            }\r\n        }\r\n    }\r\n\r\n    checkProducerMover(type) {\r\n        if (type == CellTypes.producer)\r\n            this.is_producer = true;\r\n        if (type == CellTypes.mover)\r\n            this.is_mover = true;\r\n    }\r\n\r\n    inherit(parent) {\r\n        this.move_range = parent.move_range;\r\n        this.mutability = parent.mutability;\r\n        for (var c of parent.cells){\r\n            //deep copy parent cells\r\n            this.addCell(c.type, c.loc_col, c.loc_row);\r\n        }\r\n    }\r\n\r\n    // amount of food required before it can reproduce\r\n    foodNeeded() {\r\n        return this.cells.length;\r\n    }\r\n\r\n    lifespan() {\r\n        // console.log(Hyperparams.lifespanMultiplier)\r\n        return this.cells.length * Hyperparams.lifespanMultiplier;\r\n    }\r\n\r\n    reproduce() {\r\n        //produce mutated child\r\n        //check nearby locations (is there room and a direct path)\r\n        var org = new Organism(0, 0, this.env, this);\r\n        if (Math.random() * 100 <= 3) { \r\n            org.mutate();\r\n        }\r\n        if (Math.random() <= 0.5)\r\n            org.mutability++;\r\n        else{ \r\n            org.mutability--;\r\n            if (org.mutability < 1)\r\n                org.mutability = 1;\r\n        }\r\n\r\n        var direction = this.getRandomDirection();\r\n        var direction_c = direction[0];\r\n        var direction_r = direction[1];\r\n        var offset = (Math.floor(Math.random() * 2)) * 2;\r\n\r\n        var new_c = this.c + (direction_c*this.cells.length*2) + (direction_c*offset);\r\n        var new_r = this.r + (direction_r*this.cells.length*2) + (direction_r*offset);\r\n        if (org.isClear(new_c, new_r) && org.isStraightPath(new_c, new_r, this.c, this.r, this)){\r\n            org.c = new_c;\r\n            org.r = new_r;\r\n            this.env.addOrganism(org);\r\n            org.updateGrid();\r\n        }\r\n\r\n        this.food_collected -= this.foodNeeded();\r\n        \r\n\r\n    }\r\n\r\n    mutate() {\r\n        var choice = Math.floor(Math.random() * 3);\r\n        if (choice == 0) {\r\n            // add cell\r\n            var type = CellTypes.getRandomLivingType();\r\n            var num_to_add = Math.floor(Math.random() * 3) + 1;\r\n            // for (var i=0; i<num_to_add; i++){\r\n                var branch = this.cells[Math.floor(Math.random() * this.cells.length)];\r\n                var growth_direction = Neighbors.all[Math.floor(Math.random() * Neighbors.all.length)]\r\n                var c = branch.loc_col+growth_direction[0];\r\n                var r = branch.loc_row+growth_direction[1];\r\n                return this.addCell(type, c, r);\r\n            // }\r\n        }\r\n        else if (choice == 1){\r\n            // change cell\r\n            var cell = this.cells[Math.floor(Math.random() * this.cells.length)];\r\n            cell.type = CellTypes.getRandomLivingType();\r\n            this.checkProducerMover(cell.type);\r\n            return true;\r\n        }\r\n        else {\r\n            // remove cell\r\n            if(this.cells.length > 1) {\r\n                this.cells.splice(Math.floor(Math.random() * this.cells.length), 1);\r\n                return true;\r\n            }\r\n        }\r\n\r\n        if (this.is_mover) {\r\n            this.move_range += Math.floor(Math.random() * 4) - 2;\r\n        }\r\n        return false;\r\n    }\r\n\r\n    attemptMove(direction) {\r\n        var direction_c = direction[0];\r\n        var direction_r = direction[1];\r\n        var new_c = this.c + direction_c;\r\n        var new_r = this.r + direction_r;\r\n        if (this.isClear(new_c, new_r)) {\r\n            for (var cell of this.cells) {\r\n                var real_c = this.c + cell.loc_col;\r\n                var real_r = this.r + cell.loc_row;\r\n                this.env.changeCell(real_c, real_r, CellTypes.empty, null);\r\n            }\r\n            this.c = new_c;\r\n            this.r = new_r;\r\n            this.updateGrid();\r\n            return true;\r\n        }\r\n        return false;\r\n    }\r\n\r\n    getRandomDirection(){\r\n        return directions[Math.floor(Math.random() * directions.length)];\r\n    }\r\n\r\n    // assumes either c1==c2 or r1==r2, returns true if there is a clear path from point a to b\r\n    isStraightPath(c1, r1, c2, r2, parent){\r\n        // TODO FIX!!!\r\n        if (c1 == c2) {\r\n            if (r1 > r2){\r\n                var temp = r2;\r\n                r2 = r1;\r\n                r1 = temp;\r\n            }\r\n            for (var i=r1; i!=r2; i++) {\r\n                var cell = this.env.grid_map.cellAt(c1, i)\r\n                if (!this.isPassableCell(cell, parent)){\r\n                    return false;\r\n                }\r\n            }\r\n            return true;\r\n        }\r\n        else {\r\n            if (c1 > c2){\r\n                var temp = c2;\r\n                c2 = c1;\r\n                c1 = temp;\r\n            }\r\n            for (var i=c1; i!=c2; i++) {\r\n                var cell = this.env.grid_map.cellAt(i, r1);\r\n                if (!this.isPassableCell(cell, parent)){\r\n                    return false;\r\n                }\r\n            }\r\n            return true;\r\n        }\r\n    }\r\n\r\n    isPassableCell(cell, parent){\r\n        return cell != null && (cell.type == CellTypes.empty || cell.owner == this || cell.owner == parent || cell.type == CellTypes.food);\r\n    }\r\n\r\n    isClear(col, row) {\r\n        for(var loccell of this.cells) {\r\n            var cell = this.getRealCell(loccell, col, row);\r\n            if(cell == null || cell.type != CellTypes.empty && cell.owner != this) {\r\n                return false;\r\n            }\r\n        }\r\n        return true;\r\n    }\r\n\r\n    die() {\r\n        for (var cell of this.cells) {\r\n            var real_c = this.c + cell.loc_col;\r\n            var real_r = this.r + cell.loc_row;\r\n            this.env.changeCell(real_c, real_r, CellTypes.food, null);\r\n        }\r\n        this.living = false;\r\n    }\r\n\r\n    updateGrid() {\r\n        for (var cell of this.cells) {\r\n            var real_c = this.c + cell.loc_col;\r\n            var real_r = this.r + cell.loc_row;\r\n            this.env.changeCell(real_c, real_r, cell.type, this);\r\n        }\r\n    }\r\n\r\n    update() {\r\n        // this.food_collected++;\r\n        this.lifetime++;\r\n        if (this.lifetime > this.lifespan()) {\r\n            this.die();\r\n            return this.living;\r\n        }\r\n        if (this.food_collected >= this.foodNeeded()) {\r\n            this.reproduce();\r\n        }\r\n        for (var cell of this.cells) {\r\n            this.getRealCell(cell).performFunction(this.env);\r\n        }\r\n        if (!this.living){\r\n            return this.living\r\n        }\r\n        if (this.is_mover) {\r\n            this.move_count++;\r\n            var success = this.attemptMove(this.direction);\r\n            if (this.move_count > this.move_range || !success){\r\n                this.move_count = 0;\r\n                this.direction = this.getRandomDirection()\r\n            }\r\n        }\r\n\r\n        return this.living;\r\n    }\r\n\r\n    getRealCell(local_cell, c=this.c, r=this.r){\r\n        var real_c = c + local_cell.loc_col;\r\n        var real_r = r + local_cell.loc_row;\r\n        return this.env.grid_map.cellAt(real_c, real_r);\r\n    }\r\n\r\n}\r\n\r\nmodule.exports = Organism;\r\n\n\n//# sourceURL=webpack:///./src/Organism.js?");

/***/ }),

/***/ "./src/Rendering/Renderer.js":
/*!***********************************!*\
  !*** ./src/Rendering/Renderer.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("\r\n// Renderer controls access to a canvas. There is one renderer for each canvas\r\nclass Renderer {\r\n    constructor(canvas_id, env, cell_size) {\r\n        this.cell_size = cell_size;\r\n        this.env = env;\r\n        this.canvas = document.getElementById(canvas_id);\r\n        this.ctx = this.canvas.getContext(\"2d\");\r\n        this.canvas.width = $('.env').width();\r\n        this.canvas.height = $('.env').height();\r\n\t\tthis.height = canvas.height;\r\n        this.width = canvas.width;\r\n        this.cells_to_render = new Set();\r\n        this.cells_to_highlight = new Set();\r\n        this.highlighted_cells = new Set();\r\n    }\r\n\r\n    clear() {\r\n        this.ctx.fillStyle = 'white';\r\n        this.ctx.fillRect(0, 0, this.height, this.width);\r\n    }\r\n\r\n    renderFullGrid() {\r\n        var grid = this.env.grid_map.grid;\r\n        for (var col of grid) {\r\n            for (var cell of col){\r\n                this.ctx.fillStyle = cell.getColor();\r\n                this.ctx.fillRect(cell.x, cell.y, this.cell_size, this.cell_size);\r\n            }\r\n        }\r\n    }\r\n\r\n    renderCells() {\r\n        for (var cell of this.cells_to_render) {\r\n            this.renderCell(cell);\r\n        }\r\n        this.cells_to_render.clear();\r\n    }\r\n\r\n    renderCell(cell) {\r\n        this.ctx.fillStyle = cell.getColor();\r\n        this.ctx.fillRect(cell.x, cell.y, this.cell_size, this.cell_size);\r\n    }\r\n\r\n    renderOrganism(org) {\r\n        for(var org_cell of org.cells) {\r\n            var cell = org.getRealCell(org_cell);\r\n            this.renderCell(cell);\r\n        }\r\n    }\r\n\r\n    addToRender(cell) {\r\n        if (this.highlighted_cells.has(cell)){\r\n            this.cells_to_highlight.add(cell);\r\n        }\r\n        this.cells_to_render.add(cell);\r\n    }\r\n\r\n    renderHighlights() {\r\n        for (var cell of this.cells_to_highlight) {\r\n            this.renderCellHighlight(cell);\r\n            this.highlighted_cells.add(cell);\r\n        }\r\n        this.cells_to_highlight.clear();\r\n        \r\n    }\r\n\r\n    highlightOrganism(org) {\r\n        for(var org_cell of org.cells) {\r\n            var cell = org.getRealCell(org_cell);\r\n            this.cells_to_highlight.add(cell);\r\n        }\r\n    }\r\n\r\n    highlightCell(cell) {\r\n        this.cells_to_highlight.add(cell);\r\n    }\r\n\r\n    renderCellHighlight(cell, color=\"yellow\") {\r\n        this.renderCell(cell);\r\n        this.ctx.fillStyle = color;\r\n        this.ctx.globalAlpha = 0.5;\r\n        this.ctx.fillRect(cell.x, cell.y, this.cell_size, this.cell_size);\r\n        this.ctx.globalAlpha = 1;\r\n        this.highlighted_cells.add(cell);\r\n    }\r\n\r\n    clearAllHighlights(clear_to_highlight=false) {\r\n        for (var cell of this.highlighted_cells) {\r\n            this.renderCell(cell);\r\n        }\r\n        this.highlighted_cells.clear();\r\n        if (clear_to_highlight) {\r\n            this.cells_to_highlight.clear();\r\n        }\r\n    }\r\n}\r\n\r\n// $(\"body\").mousemove(function(e) {\r\n//     console.log(\"hello\");\r\n// });\r\n\r\nmodule.exports = Renderer;\r\n\n\n//# sourceURL=webpack:///./src/Rendering/Renderer.js?");

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _Engine__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Engine */ \"./src/Engine.js\");\n/* harmony import */ var _Engine__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_Engine__WEBPACK_IMPORTED_MODULE_0__);\n'user strict';\r\n\r\n\r\n\r\n$('document').ready(function(){\r\n    var engine = new _Engine__WEBPACK_IMPORTED_MODULE_0___default.a();\r\n    engine.start(60);\r\n});\r\n\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ })

/******/ });
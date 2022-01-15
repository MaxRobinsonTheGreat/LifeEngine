const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Brain = require("./BrainCell.js);
const hyperperams = require('./Hyperparameters.js);

class HealCell extends BodyCell{
                      constructor(org, loc_col, loc_row){
                        super(CellStates.HealCell,org,loc_col,loc_row)
                        if(this.healing_enabled)
                          this.org.anatomy.Can_Heal = True;
                      }
                      performFunction() {
                         var env = this.org.env;
                         var Helth = this.damage 
                         if Helth > 0 {
                         Heal(this);
                         }
                       heal(this){
                         if this.food_collected > 2 {
                          this.damage = this.damage - 1;
                          this.food_collected = this.food_collected - 2 ;
                         }
                       }
                         
                      
                      
                      }
module.exports = HealCell;

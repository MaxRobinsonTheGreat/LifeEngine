import { Neighbors } from "./Grid/Neighbors";

export class Hyperparams {
  static globalMutability: number;
  static lifespanMultiplier: number;
  static foodProdProb: number;
  static killableNeighbors: number[][];
  static edibleNeighbors: number[][];
  static growableNeighbors: number[][];
  static useGlobalMutability: boolean;
  static addProb: number;
  static changeProb: number;
  static removeProb: number;
  static rotationEnabled: boolean;
  static foodBlocksReproduction: boolean;
  static moversCanProduce: boolean;
  static instaKill: boolean;
  static lookRange: number;
  static foodDropProb: number;
  static extraMoverFoodCost: number;
  
  static setDefaults() {
    this.lifespanMultiplier = 100;
    this.foodProdProb = 5;
    this.killableNeighbors = Neighbors.adjacent;
    this.edibleNeighbors = Neighbors.adjacent;
    this.growableNeighbors = Neighbors.adjacent;

    this.useGlobalMutability = false;
    this.globalMutability = 5;
    this.addProb = 33;
    this.changeProb = 33;
    this.removeProb = 33;
        
    this.rotationEnabled = true;

    this.foodBlocksReproduction = true;
    this.moversCanProduce = false;

    this.instaKill = false;

    this.lookRange = 20;

    this.foodDropProb = 0;

    this.extraMoverFoodCost = 0;
  }

  static loadJsonObj( obj ) {
    for ( const key in obj ) 
      this[ key ] = obj[ key ];
        
  }
}

Hyperparams.setDefaults();
/** An evironment has a grid_map, controller, and renderer */
export class Environment{
  grid_map: any;

  update(){}

  changeCell( c, r, state, owner ) {
    this.grid_map.setCellType( c, r, state );
    this.grid_map.setCellOwner( c, r, owner );
  }
}
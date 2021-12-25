

export class CanvasController{
  env;
  canvas;
  left_click;
  middle_click;
  right_click;
  cur_cell;
  cur_org;
  highlight_org;
  control_panel;
  start_x;
  start_y;
  mouse_x;
  mouse_y;
  mouse_c;
  mouse_r;
  
  constructor( env, canvas ) {
    this.env = env;
    this.canvas = canvas;
    this.left_click = false;
    this.middle_click = false;
    this.right_click = false;
    this.cur_cell = null;
    this.cur_org = null;
    this.highlight_org = true;
    this.defineEvents();
  }

  setControlPanel( panel ){
    this.control_panel = panel;
  }

  defineEvents() {
    this.canvas.addEventListener( "mousemove", e => {
      this.updateMouseLocation( e.offsetX, e.offsetY );
      this.mouseMove();
    } );

    this.canvas.addEventListener( "mouseup", evt => {
      evt.preventDefault();
      this.updateMouseLocation( evt.offsetX, evt.offsetY );
      this.mouseUp();
      if ( evt.button == 0 ) 
        this.left_click = false;
      if ( evt.button == 1 ) 
        this.middle_click = false;
      if ( evt.button == 2 ) 
        this.right_click = false;
    } );

    this.canvas.addEventListener( "mousedown", evt => {
      evt.preventDefault();
      this.updateMouseLocation( evt.offsetX, evt.offsetY );
      if ( evt.button == 0 ) 
        this.left_click = true;
      if ( evt.button == 1 ) 
        this.middle_click = true;
      if ( evt.button == 2 ) 
        this.right_click = true;
      this.mouseDown();
    } );

    this.canvas.addEventListener( "contextmenu", evt => {
      evt.preventDefault();
    } );

    this.canvas.addEventListener( "mouseleave", () => {
      this.left_click   = false;
      this.middle_click = false;
      this.right_click  = false;
      this.env.renderer.clearAllHighlights( true );
    } );

    this.canvas.addEventListener( "mouseenter", evt => {

      this.left_click   = !!( evt.buttons & 1 );
      this.right_click  = !!( evt.buttons & 2 );
      this.middle_click = !!( evt.buttons & 4 );

      this.updateMouseLocation( evt.offsetX, evt.offsetY );
      this.start_x = this.mouse_x;
      this.start_y = this.mouse_y;


    } );

  }

  updateMouseLocation( offsetX, offsetY ) {
    var prev_cell = this.cur_cell,
        prev_org = this.cur_org;

    this.mouse_x = offsetX;
    this.mouse_y = offsetY;
    var colRow = this.env.grid_map.xyToColRow( this.mouse_x, this.mouse_y );

    this.mouse_c = colRow[ 0 ];
    this.mouse_r = colRow[ 1 ];
    this.cur_cell = this.env.grid_map.cellAt( this.mouse_c, this.mouse_r );
    this.cur_org = this.cur_cell.owner;

    if ( this.cur_org != prev_org || this.cur_cell != prev_cell ) {
      this.env.renderer.clearAllHighlights( true );
      if ( this.cur_org != null && this.highlight_org ) 
        this.env.renderer.highlightOrganism( this.cur_org );
            
      else if ( this.cur_cell != null ) 
        this.env.renderer.highlightCell( this.cur_cell, true );
            
    }
  }

  mouseMove() {}

  mouseDown() {}

  mouseUp() {}
}
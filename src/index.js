'use strict';

import Engine from './Engine';

$('document').ready(function(){
    let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

    console.log(isMobile)
    if (isMobile) {
        alert("Though the simulation still works on mobile, most features are disabled. Try it on desktop for the full experience!");
        $('.control-panel').css('display', 'none');
    }
    var engine = new Engine();
    engine.start(60);
});

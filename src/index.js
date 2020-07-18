'use strict';

import Engine from './Engine';

$('document').ready(function(){
    var engine = new Engine();
    engine.start(60);
});

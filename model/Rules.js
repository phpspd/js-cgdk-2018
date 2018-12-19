/**
 * Created by Quake on 18.12.2018
 */
'use strict';

let Arena = require('./Arena')
    ;

function Rules() {
    this.arena = new Arena();
}

Rules.prototype.read = function(json) {
    if (typeof json == 'string') {
        json = JSON.parse(json);
    }

    this.max_tick_count = json.max_tick_count;
    this.arena.read(json.arena);
}

module.exports = Rules;
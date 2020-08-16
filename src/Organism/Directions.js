const Directions = {
    up:0,
    right:1,
    down:2,
    left:3,
    scalars:[[0,-1],[1,0],[0,1],[-1,0]],
    getRandomDirection: function() {
        return Math.floor(Math.random() * 4);
    },
    getRandomScalar: function() {
        return this.scalars[Math.floor(Math.random() * this.scalars.length)];
    },
    getOppositeDirection: function(dir) {
        switch(dir){
            case this.up:
                return this.down;
            case this.down:
                return this.up;
            case this.left:
                return this.right;
            case this.right:
                return this.left;
        }
    },
    rotateRight: function(dir) {
        dir++;
        if (dir > 3){
            dir = 0;
        }
        return dir;
    }
}

module.exports = Directions;
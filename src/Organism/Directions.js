const Directions = {
    up:0,
    right:1,
    down:2,
    left:3,
    scalars:[[0,-1],[0,1],[-1,0],[1,0]],
    getRandomDirection: function() {
        return Math.floor(Math.random() * 4);
    },
    getRandomScalar: function() {
        return this.scalars[Math.floor(Math.random() * this.scalars.length)];
    }
}

module.exports = Directions;
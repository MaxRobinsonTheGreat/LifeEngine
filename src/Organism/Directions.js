const Directions = {
    up:0,
    down:1,
    left:2,
    right:3,
    scalars:[[0,-1],[0,1],[-1,0],[1,0]],
    getRandomDirection: function() {
        return Math.floor(Math.random() * 4);
    },
    getRandomScalar: function() {
        return this.scalars[Math.floor(Math.random() * this.scalars.length)];
    }
}

module.exports = Directions;
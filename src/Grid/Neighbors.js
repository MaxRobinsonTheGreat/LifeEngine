// contains local cell values for the following:

//all       ...
//          .x.
//          ...

//adjacent   .
//          .x.
//           .

//corners   . .
//           x
//          . .

//allSelf   ...
//          ...
//          ...

const Neighbors = {
    all: [[0, 1],[0, -1],[1, 0],[-1, 0],[-1, -1],[1, 1],[-1, 1],[1, -1]],
    adjacent: [[0, 1],[0, -1],[1, 0],[-1, 0]],
    corners: [[-1, -1],[1, 1],[-1, 1],[1, -1]],
    allSelf: [[0, 0],[0, 1],[0, -1],[1, 0],[-1, 0],[-1, -1],[1, 1],[-1, 1],[1, -1]],
    inRange: function (range) {
        var neighbors = [];
        for (var i = -range; i <= range; i++) {
            for (var j = -range; j <= range; j++) {
                neighbors.push([i, j]);
            }
        }
        return neighbors;
    }
}

module.exports = Neighbors;
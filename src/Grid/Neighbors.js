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
    allSelf: [[0, 0],[0, 1],[0, -1],[1, 0],[-1, 0],[-1, -1],[1, 1],[-1, 1],[1, -1]]
}

module.exports = Neighbors;
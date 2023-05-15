import exp from 'constants';
import GridMap from '../src/Grid/GridMap';
import CellStates from '../src/Organism/Cell/CellStates';

/* xyToColRow */

test('access size-1 grid in middle', () => {
    expect(new GridMap(20, 10, 1).xyToColRow(5, 5)).toStrictEqual([5, 5]);
});

test('access size-1 grid outside to the left', () => {
    expect(new GridMap(20, 10, 1).xyToColRow(-1, 5)).toStrictEqual([0, 5]);
});

test('access size-1 grid outside to the right', () => {
    expect(new GridMap(20, 10, 1).xyToColRow(20, 5)).toStrictEqual([19, 5]);
});

test('access size-1 grid outside to the top', () => {
    expect(new GridMap(20, 10, 1).xyToColRow(8, -1)).toStrictEqual([8, 0]);
});

test('access size-1 grid outside to the bottom', () => {
    expect(new GridMap(20, 10, 1).xyToColRow(8, 10)).toStrictEqual([8, 9]);
});

/* isValidLoc */

(
    [
        [[10, 15], [0, 0], true],
        [[17, 56], [0, 56], false],
        [[25, 4], [24, 3], true],
        [[9, 4], [9, 4], false],
        [[50, 19], [49, 7], true],
        [[23, 43], [-1, 23], false],
        [[19, 34], [-6, -9], false],
        [[99, 15], [98, 12], true],
        [[67, 9], [67, 7], false],
        [[90, 7], [89, 3], true],
        [[10, 67], [-5, 80], false],
    ] as const
).map(([[w, h], [x, y], valid]) => {
    test(`${x}, ${y} should be ${
        valid ? 'valid' : 'invalid'
    } location for ${w} x ${h} grid`, () => {
        expect(new GridMap(w, h, 89).isValidLoc(x, y)).toBe(valid);
    });
});

/* getCenter */

(
    [
        [
            [9, 9],
            [4, 4],
        ],
        [
            [16, 16],
            [8, 8],
        ],
        [
            [50, 30],
            [25, 15],
        ],
        [
            [8, 11],
            [4, 5],
        ],
        [
            [1, 1],
            [0, 0],
        ],
        [
            [9, 10],
            [4, 5],
        ],
        [
            [6, 5],
            [3, 2],
        ],
    ] as const
).map(([[w, h], [x, y]]) => {
    test(`center of ${w} x ${h} grid should be ${x} ${y}`, () => {
        expect(new GridMap(w, h, 27).getCenter()).toStrictEqual([x, y]);
    });
});

/* resize */

(
    [
        [
            [80, 40, 8],
            [81, 30, 9],
        ],
        [
            [5, 90, 7],
            [59, 82, 57],
        ],
        [
            [91, 12, 1],
            [46, 65, 29],
        ],
        [
            [55, 3, 44],
            [66, 84, 92],
        ],
        [
            [45, 51, 17],
            [71, 46, 47],
        ],
        [
            [7, 2, 75],
            [14, 8, 9],
        ],
        [
            [88, 100, 22],
            [14, 9, 50],
        ],
    ] as const
).map(([[w, h, c], [nw, nh, nc]]) => {
    test(`${w} x ${h} [${c}] grid resizes to ${nh} x ${nw} [${nc}]`, () => {
        const grid = new GridMap(w, h, c);
        grid.resize(nh, nw, nc);

        expect(grid.grid?.length).toBe(nh);
        grid.grid?.forEach(row => {
            expect(row.length).toBe(nw);
        });

        expect(grid.cell_size).toBe(nc);
    });
});

/* 
 invalid loc case

 cell owner null case
 cell owner is org case

*/
(
    [
        [[10, 90], [6, 8], { org: 3 }, true],
        [[17, 30], [-1, 8], { org: 34 }, false],
        [[56, 10], [10, 9], null, true],
        [[17, 90], [6, 8], { org: 3829 }, true],
        [[70, 70], [9, 9], { org: 30 }, true],
        [[40, 45], [41, 34], null, false],
    ] as const
).map(([[w, h], [x, y], owner, shouldBe]) => {
    const grid = new GridMap(w, h, 67);

    if (shouldBe) {
        grid.grid!![x][y].owner = undefined;
        grid.grid!![x][y].cell_owner = undefined;
    }

    grid.setCellOwner(x, y, owner);

    if (shouldBe) {
        expect(grid.grid!![x][y].owner).toBe(
            owner == null ? null : owner!!.org,
        );
        expect(grid.grid!![x][y].cell_owner).toBe(owner == null ? null : owner);
    }
});

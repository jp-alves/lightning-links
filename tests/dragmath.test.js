const test = require('node:test');
const assert = require('node:assert');
const { zone, insertIndex } = require('../lib/dragmath.js');

// 3 columns x 2 rows of 100x77 cells with 20px gaps
const rect = (col, row) => {
    const left = col * 120, top = row * 97;
    return { left, top, right: left + 100, bottom: top + 77, width: 100, height: 77 };
};
const grid = [rect(0, 0), rect(1, 0), rect(2, 0), rect(0, 1), rect(1, 1), rect(2, 1)];

test('zone: exact centre is a group zone', () => {
    assert.strictEqual(zone(grid[0], 50, 38), 'centre');
});

test('zone: near the edge is a reorder zone', () => {
    assert.strictEqual(zone(grid[0], 10, 38), 'reorder');
    assert.strictEqual(zone(grid[0], 50, 5), 'reorder');
});

test('insertIndex: left of the first item is 0', () => {
    assert.strictEqual(insertIndex(grid, 5, 38), 0);
});

test('insertIndex: between items 1 and 2 on row 0 is 2', () => {
    assert.strictEqual(insertIndex(grid, 230, 38), 2);
});

test('insertIndex: right of the last item on row 0 is 3', () => {
    assert.strictEqual(insertIndex(grid, 340, 38), 3);
});

test('insertIndex: below all rows is the end', () => {
    assert.strictEqual(insertIndex(grid, 50, 400), 6);
});

test('insertIndex: in the gap between rows picks the nearer row', () => {
    assert.strictEqual(insertIndex(grid, 5, 80), 0);
    assert.strictEqual(insertIndex(grid, 5, 95), 3);
});

test('insertIndex: empty list is 0', () => {
    assert.strictEqual(insertIndex([], 10, 10), 0);
});

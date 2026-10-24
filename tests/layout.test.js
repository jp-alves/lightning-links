const test = require('node:test');
const assert = require('node:assert');
const { computeFit } = require('../lib/layout.js');

const base = { cols: 6, dialSize: 160, colGap: 20, rowGap: 20, autoFit: true };
const gridWidth = (r) => r.cols * r.dialSize + (r.cols - 1) * r.colGap;

test('fits at full size when there is room', () => {
    const r = computeFit({ ...base, availW: 1600, availH: 800, count: 7 });
    assert.deepStrictEqual(r, { cols: 6, dialSize: 160, colGap: 20, rowGap: 20, scroll: false });
});

test('shrinks first, keeping the column count', () => {
    const r = computeFit({ ...base, availW: 800, availH: 800, count: 12 });
    assert.strictEqual(r.cols, 6);
    assert.strictEqual(r.dialSize, 120);
    assert.strictEqual(r.colGap, 15);
    assert.strictEqual(r.scroll, false);
});

test('reflows to the most columns that still fit at 60% or more', () => {
    const r = computeFit({ ...base, availW: 500, availH: 900, count: 12 });
    assert.strictEqual(r.cols, 4);
    assert.strictEqual(r.dialSize, 114);
    assert.strictEqual(r.scroll, false);
});

test('falls back to scrolling at the user column count when nothing fits', () => {
    const r = computeFit({ ...base, availW: 600, availH: 400, count: 120 });
    assert.strictEqual(r.cols, 6);
    assert.ok(r.dialSize <= 96);
    assert.strictEqual(r.scroll, true);
    assert.ok(gridWidth(r) <= 600);
});

test('empty workspace (only the + button) stays full size', () => {
    const r = computeFit({ ...base, availW: 1600, availH: 800, count: 1 });
    assert.strictEqual(r.dialSize, 160);
    assert.strictEqual(r.scroll, false);
});

test('auto-fit off keeps columns, shrinks only to the width, and scrolls', () => {
    const r = computeFit({ ...base, autoFit: false, availW: 800, availH: 200, count: 12 });
    assert.strictEqual(r.cols, 6);
    assert.strictEqual(r.dialSize, 120);
    assert.strictEqual(r.scroll, true);
});

test('auto-fit off never grows dials beyond the setting', () => {
    const r = computeFit({ ...base, autoFit: false, availW: 3000, availH: 2000, count: 3 });
    assert.strictEqual(r.dialSize, 160);
    assert.strictEqual(r.scroll, false);
});

test('string settings from v1.0 behave like numbers', () => {
    const a = computeFit({ ...base, cols: '6', dialSize: '160', colGap: '20', rowGap: '20', availW: 800, availH: 800, count: 12 });
    const b = computeFit({ ...base, availW: 800, availH: 800, count: 12 });
    assert.deepStrictEqual(a, b);
});

test('tiny window with one column still never exceeds the width', () => {
    const r = computeFit({ ...base, availW: 120, availH: 300, count: 40 });
    assert.ok(gridWidth(r) <= 120);
    assert.strictEqual(r.scroll, true);
});

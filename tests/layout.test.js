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

test('few items in a narrow window: the full column count fits the width', () => {
    for (const availW of [560, 920]) {
        for (const count of [1, 3]) {
            const r = computeFit({ ...base, availW, availH: 800, count });
            assert.ok(gridWidth(r) <= availW, `count ${count} @ ${availW}: ${gridWidth(r)}px`);
        }
    }
});

test('when nothing fits, dials keep their size (only shrunk to the width) and scroll', () => {
    const r = computeFit({ ...base, availW: 1880, availH: 900, count: 61 });
    assert.strictEqual(r.cols, 6);
    assert.strictEqual(r.dialSize, 160);
    assert.strictEqual(r.scroll, true);
});

test('cellAspect: an icon cell is the icon (60% of the width) plus its label', () => {
    const { cellAspect } = require('../lib/layout.js');
    // 160px wide: 96px icon + 26px label block = 122px tall
    assert.strictEqual(cellAspect(160), 160 / 122);
    assert.ok(cellAspect(80) < cellAspect(300), 'the label is a bigger share of small cells');
});

test('negative horizontal spacing makes the grid narrower than the cells alone', () => {
    // 6 cells of 160 with -40 spacing: cells shrink to 120 each → 720px wide
    const r = computeFit({ ...base, colGap: -40, availW: 1600, availH: 800, count: 7 });
    assert.strictEqual(r.colGap, -40);
    assert.strictEqual(r.dialSize, 160);
    // Exactly 720px of cells fits in 730px: no shrinking
    const exact = computeFit({ ...base, colGap: -40, availW: 730, availH: 800, count: 7 });
    assert.strictEqual(exact.dialSize, 160);
    const narrow = computeFit({ ...base, colGap: -40, availW: 700, availH: 800, count: 7 });
    assert.ok(narrow.cols * (narrow.dialSize + narrow.colGap) <= 700, 'shrunk to the width');
});

test('cellAspect grows the label block with the name size', () => {
    const { cellAspect } = require('../lib/layout.js');
    assert.strictEqual(cellAspect(160, 100), cellAspect(160));
    assert.ok(cellAspect(160, 200) < cellAspect(160, 100), 'bigger names make cells taller');
});

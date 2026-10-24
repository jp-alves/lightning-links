const test = require('node:test');
const assert = require('node:assert');
const model = require('../lib/model.js');

const A = { name: 'A', url: 'a', img: 'a.png' };
const B = { name: 'B', url: 'b', img: 'b.png' };
const C = { name: 'C', url: 'c', img: 'c.png' };
const X = { name: 'X', url: 'x', img: 'x.png' };
const Y = { name: 'Y', url: 'y', img: 'y.png' };
const folder = (items) => ({ type: 'folder', id: 'f', name: 'F', items });

test('isFolder distinguishes folders from dials', () => {
    assert.strictEqual(model.isFolder(folder([])), true);
    assert.strictEqual(model.isFolder(A), false);
});

test('createFolder: dragging earlier item onto later one', () => {
    const items = [A, B, C];
    const f = model.createFolder(items, 0, 2, 'id1');
    assert.deepStrictEqual(items, [B, f]);
    assert.deepStrictEqual(f, { type: 'folder', id: 'id1', name: 'Folder', items: [C, A] });
});

test('createFolder: dragging later item onto earlier one', () => {
    const items = [A, B, C];
    const f = model.createFolder(items, 2, 0, 'id1');
    assert.deepStrictEqual(items, [f, B]);
    assert.deepStrictEqual(f.items, [A, C]);
});

test('addToFolder appends the dragged dial', () => {
    const items = [A, folder([X])];
    model.addToFolder(items, 0, 1);
    assert.deepStrictEqual(items, [folder([X, A])]);
});

test('removeFromFolder moves child out and dissolves a 1-item folder', () => {
    const items = [folder([X, Y]), B];
    model.removeFromFolder(items, 0, 0, 1);
    assert.deepStrictEqual(items, [Y, X, B]);
});

test('ungroup spreads folder items in place', () => {
    const items = [A, folder([X, Y]), B];
    model.ungroup(items, 1);
    assert.deepStrictEqual(items, [A, X, Y, B]);
});

test('normalize removes empty folders and unwraps single-item folders', () => {
    const items = [folder([]), folder([X]), A];
    model.normalize(items);
    assert.deepStrictEqual(items, [X, A]);
});

test('moveItem reorders in place', () => {
    const items = [A, B, C];
    model.moveItem(items, 0, 2);
    assert.deepStrictEqual(items, [B, C, A]);
});

test('forEachDial visits dials inside folders with workspace names', () => {
    const seen = [];
    model.forEachDial({ Home: [A, folder([X])], Work: [B] }, (d, ws) => seen.push(d.name + '@' + ws));
    assert.deepStrictEqual(seen, ['A@Home', 'X@Home', 'B@Work']);
});

test('normalizeImport accepts v1.0 dials format and coerces numbers', () => {
    const r = model.normalizeImport({ dials: [A], settings: { colCount: '6', dialSize: '160', colGap: '20', rowGap: '20' } });
    assert.deepStrictEqual(r.workspaces, { Home: [A] });
    assert.strictEqual(r.lastActiveWorkspace, 'Home');
    assert.strictEqual(r.settings.colCount, 6);
    assert.strictEqual(r.settings.dialSize, 160);
});

test('normalizeImport passes workspaces format through', () => {
    const r = model.normalizeImport({ workspaces: { W: [A] }, settings: {}, lastActiveWorkspace: 'W' });
    assert.deepStrictEqual(r.workspaces, { W: [A] });
    assert.strictEqual(r.lastActiveWorkspace, 'W');
});

test('normalizeImport carries iconCache and bgImage', () => {
    const r = model.normalizeImport({ workspaces: { W: [A] }, settings: {}, iconCache: { a: 'data:x' }, bgImage: 'data:bg' });
    assert.deepStrictEqual(r.iconCache, { a: 'data:x' });
    assert.strictEqual(r.bgImage, 'data:bg');
});

test('normalizeImport rejects unknown shapes', () => {
    assert.strictEqual(model.normalizeImport({ foo: 1 }), null);
    assert.strictEqual(model.normalizeImport(null), null);
});

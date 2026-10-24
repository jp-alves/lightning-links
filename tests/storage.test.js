const test = require('node:test');
const assert = require('node:assert');
const { writeAll } = require('../lib/storage.js');

// In-memory localStorage with a character budget, like the real 5M-char quota
function fakeStorage(budget, initial = {}) {
    const data = { ...initial };
    const used = () => Object.entries(data).reduce((n, [k, v]) => n + k.length + v.length, 0);
    return {
        data,
        getItem: (k) => (k in data ? data[k] : null),
        removeItem: (k) => { delete data[k]; },
        setItem(k, v) {
            const old = data[k];
            data[k] = String(v);
            if (used() > budget) {
                if (old === undefined) delete data[k]; else data[k] = old;
                throw new Error('QuotaExceededError');
            }
        }
    };
}

test('writes every entry when there is room', () => {
    const s = fakeStorage(1000);
    assert.strictEqual(writeAll(s, [['a', '1'], ['b', '2']]), 'ok');
    assert.deepStrictEqual(s.data, { a: '1', b: '2' });
});

test('evicts expendable keys and retries when full', () => {
    const s = fakeStorage(50, { iconCache: 'x'.repeat(30), ws: 'old' });
    assert.strictEqual(writeAll(s, [['ws', 'y'.repeat(20)]], ['iconCache']), 'evicted');
    assert.strictEqual(s.data.ws, 'y'.repeat(20));
    assert.strictEqual(s.data.iconCache, undefined);
});

test('when still full, restores every key it touched and reports full', () => {
    const s = fakeStorage(30, { a: 'old-a', b: 'old-b' });
    assert.strictEqual(writeAll(s, [['a', 'new'], ['b', 'z'.repeat(40)]]), 'full');
    assert.deepStrictEqual(s.data, { a: 'old-a', b: 'old-b' });
});

test('a key that did not exist before is removed again on failure', () => {
    const s = fakeStorage(20, { a: 'old' });
    assert.strictEqual(writeAll(s, [['n', 'ok'], ['b', 'z'.repeat(40)]]), 'full');
    assert.deepStrictEqual(s.data, { a: 'old' });
});

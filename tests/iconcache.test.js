const test = require('node:test');
const assert = require('node:assert');
const iconcache = require('../lib/iconcache.js');

const imageResponse = { ok: true, headers: { get: () => 'image/png' }, blob: async () => 'B' };
const htmlResponse = { ok: true, headers: { get: () => 'text/html' }, blob: async () => 'H' };

test('cacheIcons saves images and counts every failure kind', async () => {
    const responses = {
        'https://a': imageResponse,
        'https://b': { ok: false },
        'https://c': htmlResponse
    };
    const fetchFn = async (url) => {
        if (url === 'https://d') throw new Error('network');
        return responses[url];
    };
    const cache = {};
    const progress = [];
    const result = await iconcache.cacheIcons(
        ['https://a', 'https://b', 'https://c', 'https://d'],
        cache,
        { fetchFn, encodeFn: async () => 'data:x', onProgress: (s, f, t) => progress.push([s, f, t]) }
    );
    assert.deepStrictEqual(result, { saved: 1, failed: 3, total: 4 });
    assert.deepStrictEqual(cache, { 'https://a': 'data:x' });
    assert.deepStrictEqual(progress[progress.length - 1], [1, 3, 4]);
});

test('cacheIcons skips data URLs, already-cached and duplicate urls', async () => {
    let calls = 0;
    const cache = { 'https://cached': 'data:old' };
    const result = await iconcache.cacheIcons(
        ['data:image/png;base64,xx', 'https://cached', 'https://new', 'https://new', 'icons/icon128.png'],
        cache,
        { fetchFn: async () => { calls++; return imageResponse; }, encodeFn: async () => 'data:new' }
    );
    assert.deepStrictEqual(result, { saved: 1, failed: 0, total: 1 });
    assert.strictEqual(calls, 1);
    assert.strictEqual(cache['https://cached'], 'data:old');
});

test('cacheIcons counts an encode failure as failed', async () => {
    const result = await iconcache.cacheIcons(['https://a'], {}, {
        fetchFn: async () => imageResponse,
        encodeFn: async () => { throw new Error('decode'); }
    });
    assert.deepStrictEqual(result, { saved: 0, failed: 1, total: 1 });
});

test('saveCache returns false on quota error instead of throwing', () => {
    const storage = { setItem() { throw new Error('QuotaExceededError'); } };
    assert.strictEqual(iconcache.saveCache(storage, { a: 'data:x' }), false);
});

test('saveCache writes JSON under the iconCache key', () => {
    const written = {};
    const storage = { setItem(k, v) { written[k] = v; } };
    assert.strictEqual(iconcache.saveCache(storage, { a: 'data:x' }), true);
    assert.deepStrictEqual(JSON.parse(written[iconcache.KEY]), { a: 'data:x' });
});

test('loadCache returns {} for missing or corrupt data', () => {
    assert.deepStrictEqual(iconcache.loadCache({ getItem: () => null }), {});
    assert.deepStrictEqual(iconcache.loadCache({ getItem: () => '{not json' }), {});
    assert.deepStrictEqual(iconcache.loadCache({ getItem: () => '{"a":"data:x"}' }), { a: 'data:x' });
});

test('resolveIcon prefers the cached copy', () => {
    assert.strictEqual(iconcache.resolveIcon({ a: 'data:x' }, 'a'), 'data:x');
    assert.strictEqual(iconcache.resolveIcon({}, 'b'), 'b');
});

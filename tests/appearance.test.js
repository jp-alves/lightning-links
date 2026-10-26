const test = require('node:test');
const assert = require('node:assert');
const { resolveTheme } = require('../lib/appearance.js');

test('an explicit choice is used', () => {
    assert.strictEqual(resolveTheme('light'), 'light');
    assert.strictEqual(resolveTheme('dark'), 'dark');
});

test('a missing or old "auto" setting means light', () => {
    assert.strictEqual(resolveTheme(undefined), 'light');
    assert.strictEqual(resolveTheme(null), 'light');
    assert.strictEqual(resolveTheme('auto'), 'light');
});

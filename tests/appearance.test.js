const test = require('node:test');
const assert = require('node:assert');
const { resolveTheme } = require('../lib/appearance.js');

test('automatic follows the system appearance', () => {
    assert.strictEqual(resolveTheme('auto', true), 'dark');
    assert.strictEqual(resolveTheme('auto', false), 'light');
});

test('a missing setting means automatic', () => {
    assert.strictEqual(resolveTheme(undefined, true), 'dark');
    assert.strictEqual(resolveTheme(null, false), 'light');
});

test('an explicit choice wins over the system', () => {
    assert.strictEqual(resolveTheme('light', true), 'light');
    assert.strictEqual(resolveTheme('dark', false), 'dark');
});

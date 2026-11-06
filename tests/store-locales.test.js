const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

// The app's own languages (locales/pt-BR.js) and Chrome's code for each (_locales/pt_BR)
const CHROME_CODES = { 'es-MX': 'es_419', 'pt-BR': 'pt_BR', 'zh-CN': 'zh_CN' };
const expected = ['en', ...fs.readdirSync(path.join(root, 'locales')).map(f => {
    const code = f.replace(/\.js$/, '');
    return CHROME_CODES[code] || code;
})].sort();

test('manifest takes its name and description from _locales', () => {
    assert.strictEqual(manifest.default_locale, 'en');
    assert.strictEqual(manifest.name, '__MSG_appName__');
    assert.strictEqual(manifest.description, '__MSG_appDesc__');
});

test('every app language has a store locale, and nothing else', () => {
    assert.deepStrictEqual(fs.readdirSync(path.join(root, '_locales')).sort(), expected);
});

for (const code of expected) {
    test(`_locales/${code} has a name and description within the store limits`, () => {
        const messages = JSON.parse(fs.readFileSync(path.join(root, '_locales', code, 'messages.json'), 'utf8'));
        const name = messages.appName && messages.appName.message;
        const desc = messages.appDesc && messages.appDesc.message;
        assert.ok(name && name.startsWith('Lightning Links'), `name: ${name}`);
        assert.ok(name.length <= 75, `name is ${name.length} chars`);
        assert.ok(desc, 'description missing');
        assert.ok(desc.length <= 132, `description is ${desc.length} chars`);
    });
}

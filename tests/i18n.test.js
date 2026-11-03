const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const i18n = require('../lib/i18n.js');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

// Text in the markup that stays as it is in every language
const UNTRANSLATED = new Set(['example.com', 'squoosh.app', '&nbsp;', '20px']);

// Every string the page can show: static text and attributes in the markup, t('...') in the code
function collectKeys() {
    const keys = new Set(['Enter a name.', 'A workspace with this name already exists.']); // from lib/model.js, through t()
    const html = read('newtab.html').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ');
    for (const [, text] of html.matchAll(/>([^<>]+)</g)) keys.add(text.trim());
    for (const [, text] of html.matchAll(/\b(?:title|aria-label|placeholder)="([^"]+)"/g)) keys.add(text);
    for (const file of ['script.js', 'ui/folder-panel.js', 'ui/onboarding.js']) {
        for (const [, text] of read(file).matchAll(/'((?:[^'\\\n])+)'/g)) {
            // Only strings inside a t(...) call: t('x'), t(n ? 'x' : 'y'), confirmLabel = t('x')
            if (new RegExp(`\\bt\\((?:[^()']*\\? )?(?:'[^']*' : )?'${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(read(file))) keys.add(text);
        }
    }
    return [...keys].filter(key => /\p{L}/u.test(key) && !UNTRANSLATED.has(key));
}

function loadLocale(code) {
    let table = null;
    vm.runInNewContext(read(`locales/${code}.js`), { LL: { i18n: { setStrings: (s) => { table = s; } } } });
    return table;
}

const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort();

test('t falls back to the English text and fills in values', () => {
    i18n.setStrings({});
    assert.strictEqual(i18n.t('Hello'), 'Hello');
    assert.strictEqual(i18n.t('{n} selected', { n: 3 }), '3 selected');
    i18n.setStrings({ Hello: 'Olá', '{n} selected': '{n} selecionados' });
    assert.strictEqual(i18n.t('Hello'), 'Olá');
    assert.strictEqual(i18n.t('{n} selected', { n: 3 }), '3 selecionados');
    i18n.setStrings({});
});

test('t does not re-expand values or treat $ patterns specially', () => {
    i18n.setStrings({});
    assert.strictEqual(i18n.t('Delete “{name}”?', { name: '{n} $& x' }), 'Delete “{n} $& x”?');
});

test('resolve only accepts known languages, so a backup cannot choose a script path', () => {
    assert.strictEqual(i18n.resolve('fr'), 'fr');
    assert.strictEqual(i18n.resolve(undefined), 'en');
    assert.strictEqual(i18n.resolve('../../evil'), 'en');
});

test('English comes first and all 13 languages are listed', () => {
    assert.strictEqual(i18n.LANGUAGES[0][0], 'en');
    assert.strictEqual(i18n.LANGUAGES.length, 13);
});

test('collects the strings in use', () => {
    const keys = collectKeys();
    ['Add Website', 'Filled in from the URL', 'Link copied', 'Next', 'Add website to this folder', '{n} selected', 'Rename Workspace', 'Solid color'].forEach(key => {
        assert.ok(keys.includes(key), key);
    });
});

for (const [code] of i18n.LANGUAGES.slice(1)) {
    test(`${code}: translates every string, and nothing stale`, () => {
        const table = loadLocale(code);
        const keys = collectKeys();
        assert.deepStrictEqual(keys.filter(key => !table[key]), [], 'missing');
        assert.deepStrictEqual(Object.keys(table).filter(key => !keys.includes(key)), [], 'stale');
    });

    test(`${code}: keeps every {placeholder}`, () => {
        const table = loadLocale(code);
        Object.keys(table).forEach(key => assert.deepStrictEqual(placeholders(table[key]), placeholders(key), key));
    });
}

if (require.main === module) console.log(JSON.stringify(collectKeys(), null, 1));

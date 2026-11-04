const test = require('node:test');
const assert = require('node:assert');
const storage = require('../lib/storage.js');
const onboarding = require('../ui/onboarding.js');
const { LANGUAGES } = require('../lib/i18n.js');
const model = require('../lib/model.js');

function fakeStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return { getItem: (k) => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, String(v)) };
}

test('a new install is pending, on every new tab, until finished', () => {
    const s = fakeStorage();
    assert.strictEqual(storage.onboardingPending(s), true);
    // Later tabs store things of their own (bgColor, settings): still pending
    s.setItem('bgColor', 'rgb(1, 2, 3)');
    s.setItem('mySettings', '{"language":"fr"}');
    assert.strictEqual(storage.onboardingPending(s), true);
    storage.finishOnboarding(s);
    assert.strictEqual(storage.onboardingPending(s), false);
});

for (const key of ['myWorkspaces', 'myDials', 'mySettings', 'bgColor']) {
    test(`an update never sees it: ${key} is already stored`, () => {
        const s = fakeStorage({ [key]: 'x' });
        assert.strictEqual(storage.onboardingPending(s), false);
        assert.strictEqual(s.getItem('onboarding'), 'done');
    });
}

for (const [code] of LANGUAGES) {
    test(`${code}: offers 50 to 100 sites with no repeats`, () => {
        const sites = onboarding.sitesFor(code);
        assert.ok(sites.length >= 50 && sites.length <= 100, String(sites.length));
        assert.strictEqual(new Set(sites.map(s => s[1])).size, sites.length);
        assert.strictEqual(new Set(sites.map(s => s[0])).size, sites.length);
    });
}

test('local sites are only for known languages', () => {
    const codes = LANGUAGES.map(l => l[0]);
    Object.keys(onboarding.LOCAL_SITES).forEach(code => assert.ok(codes.includes(code), code));
});

test('solidColor accepts only #rrggbb', () => {
    assert.strictEqual(model.solidColor({ bgSolid: '#AABBCC' }), '#AABBCC');
    assert.strictEqual(model.solidColor({ bgSolid: 'red;x' }), '#f0efe9');
    assert.strictEqual(model.solidColor(null), '#f0efe9');
});

test('names follow the background: dark on bright photos and colors, light on the rest', () => {
    ['bg2', 'bg6'].forEach(n => assert.strictEqual(model.labelColorFor(`backgrounds/${n}.jpg`), 'dark', n));
    ['bg3', 'bg4', 'bg5', 'bg7', 'bg8'].forEach(n => assert.strictEqual(model.labelColorFor(`backgrounds/${n}.jpg`), 'light', n));
    assert.strictEqual(model.labelColorFor('#f0efe9'), 'dark');
    assert.strictEqual(model.labelColorFor('#1f2933'), 'light');
});

test('settings still pointing at the removed bg1.jpg become the same solid color', () => {
    const migrated = model.migrateSettings({ bgImage: 'backgrounds/bg1.jpg', bgSolid: '#123456' });
    assert.strictEqual(migrated.bgImage, 'color');
    assert.strictEqual(migrated.bgSolid, '#f0efe9');
    assert.strictEqual(model.migrateSettings({ bgImage: 'backgrounds/bg2.jpg' }).bgImage, 'backgrounds/bg2.jpg');
    assert.strictEqual(model.normalizeImport({ workspaces: { W: [] }, settings: { bgImage: 'backgrounds/bg1.jpg' } }).settings.bgImage, 'color');
});

// lib/appearance.js - Light/dark appearance: "auto" (the default) follows the system, as Apple recommends
(function (root) {
    'use strict';

    function resolveTheme(setting, prefersDark) {
        if (setting === 'light' || setting === 'dark') return setting;
        return prefersDark ? 'dark' : 'light';
    }

    const api = { resolveTheme };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).appearance = api;
})(typeof self !== 'undefined' ? self : this);

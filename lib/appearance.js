// lib/appearance.js - Light/dark appearance: light is the default; older "auto" settings become light
(function (root) {
    'use strict';

    function resolveTheme(setting) {
        return setting === 'dark' ? 'dark' : 'light';
    }

    const api = { resolveTheme };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).appearance = api;
})(typeof self !== 'undefined' ? self : this);

// lib/layout.js - Auto-fit: shrink the grid first, then drop columns, so every item fits the window
(function (root) {
    'use strict';

    function computeFit({ availW, availH, count, cols, dialSize, colGap, rowGap, autoFit, minScale = 0.6, aspect = 1.3 }) {
        cols = Number(cols);
        const dial = Number(dialSize);
        const cGap = Number(colGap);
        const rGap = Number(rowGap);

        const widthScale = (c) => {
            const e = Math.min(c, count);
            return availW / (e * dial + (e - 1) * cGap);
        };
        const heightScale = (c) => {
            const r = Math.ceil(count / c);
            return availH / (r * dial / aspect + (r - 1) * rGap);
        };
        const result = (c, s, scroll) => ({
            cols: c,
            dialSize: Math.floor(dial * s),
            colGap: Math.floor(cGap * s),
            rowGap: Math.floor(rGap * s),
            scroll
        });

        if (!autoFit) {
            const s = Math.min(1, widthScale(cols));
            return result(cols, s, heightScale(cols) < s);
        }

        // Keep as many columns as possible: the first count, stepping down, that fits at >= minScale
        for (let c = cols; c >= 1; c--) {
            const s = Math.min(1, widthScale(c), heightScale(c));
            if (s >= minScale) return result(c, s, false);
        }
        return result(cols, Math.min(minScale, widthScale(cols)), true);
    }

    const api = { computeFit };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).layout = api;
})(typeof self !== 'undefined' ? self : this);

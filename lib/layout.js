// lib/layout.js - Auto-fit: shrink the grid first, then drop columns, so every item fits the window
(function (root) {
    'use strict';

    function computeFit({ availW, availH, count, cols, dialSize, colGap, rowGap, autoFit, minScale = 0.6, aspect = 1.3 }) {
        cols = Number(cols);
        const dial = Number(dialSize);
        const cGap = Number(colGap);
        const rGap = Number(rowGap);

        // The grid always draws `c` tracks, even when fewer items fill them
        const widthScale = (c) => availW / (c * dial + (c - 1) * cGap);
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
        // Nothing fits: shrinking wouldn't avoid scrolling, so keep the user's size (fitted to the width)
        return result(cols, Math.min(1, widthScale(cols)), true);
    }

    // Width / height of one grid cell: an app icon (60% of the cell width) above a one-line label
    const ICON_RATIO = 0.6;
    const LABEL_BLOCK = 26;
    function cellAspect(dialSize) {
        const w = Number(dialSize);
        return w / (w * ICON_RATIO + LABEL_BLOCK);
    }

    const api = { computeFit, cellAspect, ICON_RATIO };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).layout = api;
})(typeof self !== 'undefined' ? self : this);

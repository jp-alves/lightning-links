// lib/layout.js - Auto-fit: shrink the grid first, then drop columns, so every item fits the window
(function (root) {
    'use strict';

    function computeFit({ availW, availH, count, cols, dialSize, colGap, rowGap, autoFit, minScale = 0.6, aspect = 1.3 }) {
        cols = Number(cols);
        const dial = Number(dialSize);
        const cGap = Number(colGap);
        const rGap = Number(rowGap);

        // The grid always draws `c` tracks, even when fewer items fill them. A negative
        // horizontal spacing shrinks every cell instead (icons move closer, then overlap)
        const widthScale = (c) => availW / (cGap >= 0 ? c * dial + (c - 1) * cGap : c * (dial + cGap));
        // A negative vertical spacing pulls every row up (rows move closer, then overlap)
        const heightScale = (c) => {
            const r = Math.ceil(count / c);
            const h = dial / aspect;
            return availH / (rGap >= 0 ? r * h + (r - 1) * rGap : r * (h + rGap));
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
    // The label block is the 8px gap plus one line of name text (13px at 100%, line-height 1.25)
    const ICON_RATIO = 0.6;
    const LABEL_GAP = 8;
    const LABEL_LINE = 18;
    function cellAspect(dialSize, labelScale = 100) {
        const w = Number(dialSize);
        return w / (w * ICON_RATIO + LABEL_GAP + LABEL_LINE * Number(labelScale) / 100);
    }

    const api = { computeFit, cellAspect, ICON_RATIO };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).layout = api;
})(typeof self !== 'undefined' ? self : this);

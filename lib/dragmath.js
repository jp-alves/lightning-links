// lib/dragmath.js - Geometry for drag & drop: group vs reorder zones, and where a dragged item lands
(function (root) {
    'use strict';

    // The middle 50% of an item (both axes) means "group with it"; anywhere else means "reorder"
    function zone(rect, x, y) {
        const inX = x > rect.left + rect.width * 0.25 && x < rect.right - rect.width * 0.25;
        const inY = y > rect.top + rect.height * 0.25 && y < rect.bottom - rect.height * 0.25;
        return inX && inY ? 'centre' : 'reorder';
    }

    // rects: item rects in DOM order, excluding the dragged item
    function insertIndex(rects, x, y) {
        if (!rects.length) return 0;
        if (y > rects[rects.length - 1].bottom) return rects.length;

        // Rows are runs of rects sharing a top edge; pick the row nearest to y
        let best = null;
        let bestDist = Infinity;
        rects.forEach(r => {
            const dist = Math.abs(y - (r.top + r.height / 2));
            if (dist < bestDist - 0.5) {
                bestDist = dist;
                best = r.top;
            }
        });

        let lastInRow = -1;
        for (let i = 0; i < rects.length; i++) {
            if (Math.abs(rects[i].top - best) > 1) continue;
            if (x < rects[i].left + rects[i].width / 2) return i;
            lastInRow = i;
        }
        return lastInRow + 1;
    }

    const api = { zone, insertIndex };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).dragmath = api;
})(typeof self !== 'undefined' ? self : this);

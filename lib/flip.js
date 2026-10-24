// lib/flip.js - FLIP animation: elements glide from their old spot to their new one after a re-render
(function (root) {
    'use strict';

    const DURATION = 220;
    const EASING = 'cubic-bezier(.2, .7, .3, 1)';

    function reducedMotion() {
        return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Elements are matched across the re-render by data-key
    function flip(container, selector, mutate) {
        if (reducedMotion()) {
            mutate();
            return;
        }
        const before = new Map();
        container.querySelectorAll(selector).forEach(el => {
            before.set(el.dataset.key, el.getBoundingClientRect());
        });
        mutate();
        container.querySelectorAll(selector).forEach(el => {
            const old = before.get(el.dataset.key);
            if (!old) return;
            const now = el.getBoundingClientRect();
            const dx = old.left - now.left;
            const dy = old.top - now.top;
            if (!dx && !dy) return;
            el.animate(
                [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                { duration: DURATION, easing: EASING }
            );
        });
    }

    const api = { flip, reducedMotion, DURATION, EASING };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).flip = api;
})(typeof self !== 'undefined' ? self : this);

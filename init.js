// init.js - Smooth reveal implementation
(function() {
    'use strict';
    
    try {
        const saved = localStorage.getItem('mySettings');
        const settings = saved ? JSON.parse(saved) : null;

        // Apply background immediately
        const bg = (settings && settings.bgImage) ? settings.bgImage : 'backgrounds/bg1.jpg';
        document.documentElement.style.setProperty('--bg-image', `url('${bg}')`);

        // Apply layout settings
        if (settings) {
            if (settings.colCount) {
                document.documentElement.style.setProperty('--col-count', settings.colCount);
            }
            if (settings.dialSize) {
                document.documentElement.style.setProperty('--dial-width', settings.dialSize + 'px');
            }
            if (settings.colGap) {
                document.documentElement.style.setProperty('--col-gap', settings.colGap + 'px');
            }
            if (settings.rowGap) {
                document.documentElement.style.setProperty('--row-gap', settings.rowGap + 'px');
            }
        }
    } catch (e) {
        console.error("Settings load error:", e);
    }

    // SMOOTH REVEAL: Show page when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', revealPage);
    } else {
        revealPage();
    }

    function revealPage() {
        // Small delay ensures background is painted before reveal
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.add('ready');
            });
        });
    }
})();
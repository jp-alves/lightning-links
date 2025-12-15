// init.js - Smart Preload Implementation
(function () {
    'use strict';

    let bgImageURL = 'backgrounds/bg1.jpg'; // Default
    let settings = null;

    try {
        const saved = localStorage.getItem('mySettings');
        settings = saved ? JSON.parse(saved) : null;

        // 1. Determine the correct background immediately
        if (settings && settings.bgImage) {
            bgImageURL = settings.bgImage;
        }

        // 2. Apply CSS Variable immediately (Instant visual update)
        document.documentElement.style.setProperty('--bg-image', `url('${bgImageURL}')`);

        // 3. Apply Layout Settings
        if (settings) {
            if (settings.colCount) document.documentElement.style.setProperty('--col-count', settings.colCount);
            if (settings.dialSize) document.documentElement.style.setProperty('--dial-width', settings.dialSize + 'px');
            if (settings.colGap) document.documentElement.style.setProperty('--col-gap', settings.colGap + 'px');
            if (settings.rowGap) document.documentElement.style.setProperty('--row-gap', settings.rowGap + 'px');
        }

    } catch (e) {
        console.error("Settings load error:", e);
    }

    // 4. SMART REVEAL: Wait for BOTH DOM readiness AND Image Loading
    // This ensures no white flash if the image is heavy

    let domReady = false;
    let imgReady = false;

    // A. Check DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            domReady = true;
            checkReveal();
        });
    } else {
        domReady = true;
    }

    // B. Preload the specific image
    const imgLoader = new Image();
    imgLoader.onload = () => {
        imgReady = true;
        checkReveal();
    };
    imgLoader.onerror = () => {
        // If image fails, reveal anyway so user isn't stuck on black screen
        imgReady = true;
        checkReveal();
    };
    imgLoader.src = bgImageURL;

    // Fallback: If image takes too long (e.g. 1 sec), reveal anyway
    setTimeout(() => {
        if (!imgReady) {
            imgReady = true;
            checkReveal();
        }
    }, 500);

    function checkReveal() {
        if (domReady && imgReady) {
            requestAnimationFrame(() => {
                document.body.classList.add('ready');
            });
        }
    }
})();
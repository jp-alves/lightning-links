// init.js - Handles immediate background loading and layout
(function() {
    'use strict';
    let bgImageURL = 'backgrounds/bg1.jpg';
    let settings = null;
    try {
        const saved = localStorage.getItem('mySettings');
        settings = saved ? JSON.parse(saved) : null;
        if (settings && settings.bgImage) bgImageURL = settings.bgImage;

        document.documentElement.style.setProperty('--bg-image', `url('${bgImageURL}')`);
        if (settings) {
            if (settings.colCount) document.documentElement.style.setProperty('--col-count', settings.colCount);
            if (settings.dialSize) document.documentElement.style.setProperty('--dial-width', settings.dialSize + 'px');
            if (settings.colGap) document.documentElement.style.setProperty('--col-gap', settings.colGap + 'px');
            if (settings.rowGap) document.documentElement.style.setProperty('--row-gap', settings.rowGap + 'px');
        }
    } catch (e) { console.error("Settings load error:", e); }

    let domReady = false, imgReady = false;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { domReady = true; checkReveal(); });
    } else { domReady = true; }

    const imgLoader = new Image();
    imgLoader.onload = () => { imgReady = true; checkReveal(); };
    imgLoader.onerror = () => { imgReady = true; checkReveal(); };
    imgLoader.src = bgImageURL;

    setTimeout(() => { if (!imgReady) { imgReady = true; checkReveal(); } }, 500);

    function checkReveal() {
        if (domReady && imgReady) {
            requestAnimationFrame(() => document.body.classList.add('ready'));
        }
    }
})();
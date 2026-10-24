// init.js - Smart Preload Implementation
(function () {
    'use strict';

    const root = document.documentElement;
    let bgImageURL = 'backgrounds/bg1.jpg'; // Default
    let settings = null;
    let customBg = null;

    try {
        const saved = localStorage.getItem('mySettings');
        settings = saved ? JSON.parse(saved) : null;
        customBg = localStorage.getItem('bgImage');

        // One-time move: custom backgrounds used to live inside mySettings, making it heavy to parse
        if (settings && settings.bgImage && settings.bgImage.startsWith('data:')) {
            customBg = settings.bgImage;
            settings.bgImage = 'custom';
            localStorage.setItem('bgImage', customBg);
            localStorage.setItem('mySettings', JSON.stringify(settings));
        }

        // 1. Determine the correct background immediately
        if (settings && settings.bgImage) {
            bgImageURL = settings.bgImage === 'custom' ? (customBg || bgImageURL) : settings.bgImage;
        }

        // 2. Apply CSS Variable immediately (Instant visual update)
        root.style.setProperty('--bg-image', `url('${bgImageURL}')`);

        // 3. Apply Layout Settings
        if (settings) {
            if (settings.colCount) root.style.setProperty('--col-count', settings.colCount);
            if (settings.dialSize) root.style.setProperty('--dial-width', settings.dialSize + 'px');
            if (settings.colGap) root.style.setProperty('--col-gap', settings.colGap + 'px');
            if (settings.rowGap) root.style.setProperty('--row-gap', settings.rowGap + 'px');
        }

    } catch (e) {
        console.error("Settings load error:", e);
    }

    // Parsed once here; script.js reuses it instead of parsing again
    window.__LL_BOOT = { settings, bgImage: customBg };

    // 4. Dials show as soon as the DOM is ready (no waiting on the image).
    // The background layer appears once decoded: instantly if that happens before
    // first paint, otherwise with a short fade over the dark fallback colour.
    const imgLoader = new Image();
    imgLoader.onload = imgLoader.onerror = () => {
        root.classList.add('bg-ready');
        performance.mark('ll-bg');
    };
    imgLoader.src = bgImageURL;
})();

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

        // One-time move: custom backgrounds used to live inside mySettings, making it heavy to parse.
        // Settings only switch to 'custom' once both writes succeeded; on a full storage the
        // background simply stays where it was (and still works).
        if (settings && settings.bgImage && settings.bgImage.startsWith('data:')) {
            const dataUrl = settings.bgImage;
            const previous = localStorage.getItem('bgImage');
            try {
                localStorage.setItem('bgImage', dataUrl);
                localStorage.setItem('mySettings', JSON.stringify(Object.assign({}, settings, { bgImage: 'custom' })));
                settings.bgImage = 'custom';
                customBg = dataUrl;
            } catch (e) {
                try {
                    if (previous === null) localStorage.removeItem('bgImage');
                    else localStorage.setItem('bgImage', previous);
                } catch (e2) { }
            }
        }

        // 1. Determine the correct background immediately
        if (settings && settings.bgImage) {
            bgImageURL = settings.bgImage === 'custom' ? (customBg || bgImageURL) : settings.bgImage;
        }

        // 2. Apply CSS Variable immediately (Instant visual update)
        root.style.setProperty('--bg-image', `url('${bgImageURL}')`);

        // Until the picture is ready, show its average colour (saved last time) instead of black
        const bgColor = localStorage.getItem('bgColor');
        if (bgColor) root.style.setProperty('--bg-color', bgColor);

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

    // Appearance before first paint, so menus and sheets never flash the wrong colours
    root.dataset.theme = LL.appearance.resolveTheme(settings && settings.theme,
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.labelColor = (settings && settings.labelColor) || 'light';

    // Parsed once here; script.js reuses it instead of parsing again
    window.__LL_BOOT = { settings, bgImage: customBg };

    // 4. Dials show as soon as the DOM is ready (no waiting on the image).
    // The background layer appears once fully decoded (so it never paints in strips from
    // top to bottom): instantly if that happens before first paint, otherwise with a short
    // fade over the picture's average colour.
    const imgLoader = new Image();
    imgLoader.src = bgImageURL;
    imgLoader.decode().catch(() => { }).then(() => {
        root.classList.add('bg-ready');
        performance.mark('ll-bg');
        // Off the critical path: remember the average colour for the next new tab
        setTimeout(() => {
            try {
                const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
                ctx.canvas.width = ctx.canvas.height = 8;
                ctx.drawImage(imgLoader, 0, 0, 8, 8);
                const px = ctx.getImageData(0, 0, 8, 8).data;
                const avg = [0, 1, 2].map(c => {
                    let sum = 0;
                    for (let i = c; i < px.length; i += 4) sum += px[i];
                    return Math.round(sum / 64);
                });
                localStorage.setItem('bgColor', `rgb(${avg.join(', ')})`);
            } catch (e) { }
        }, 500);
    });
})();

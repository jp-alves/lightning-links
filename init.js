// init.js - Smart Preload Implementation
(function () {
    'use strict';

    const root = document.documentElement;
    let bgImageURL = null;
    let settings = null;
    let customBg = null;
    let solid = true; // The default wallpaper is a solid color
    let browserLanguage = null;

    try {
        const saved = localStorage.getItem('mySettings');
        settings = saved ? LL.model.migrateSettings(JSON.parse(saved)) : null;
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
        const choice = settings && settings.bgImage;
        if (choice && choice !== 'color') {
            bgImageURL = choice === 'custom' ? customBg : choice;
            solid = !bgImageURL;
        }

        // 2. Apply CSS Variable immediately (Instant visual update)
        root.style.setProperty('--bg-image', solid ? 'none' : `url('${bgImageURL}')`);

        // Until the picture is ready, show its average color (saved last time) instead of black
        const bgColor = solid ? LL.model.solidColor(settings) : localStorage.getItem('bgColor');
        if (bgColor) root.style.setProperty('--bg-color', bgColor);

        // A new install starts in the browser's language; updates keep what they had
        if (!(settings && settings.language) && LL.storage.onboardingPending(localStorage)) {
            browserLanguage = LL.i18n.fromBrowser(navigator.language);
        }

        // 3. Apply Layout Settings
        if (settings) {
            if (settings.colCount) root.style.setProperty('--col-count', settings.colCount);
            if (settings.lightningSize) root.style.setProperty('--lightning-width', settings.lightningSize + 'px');
            if (settings.colGap) root.style.setProperty('--col-gap', settings.colGap + 'px');
            if (settings.rowGap) root.style.setProperty('--row-gap', settings.rowGap + 'px');
        }

    } catch (e) {
        console.error("Settings load error:", e);
    }

    // Appearance before first paint, so menus and sheets never flash the wrong colors
    root.dataset.theme = LL.appearance.resolveTheme(settings && settings.theme);
    // Dark names suit the light default background. Older settings got theirs in migrateSettings;
    // someone who never changed a setting has none saved, and keeps the old default.
    const labelColor = (settings && settings.labelColor) || (browserLanguage ? 'dark' : 'light');
    root.dataset.labelColor = labelColor;

    // Language before first paint. English is what the page is written in: nothing to load.
    const language = LL.i18n.resolve((settings && settings.language) || browserLanguage);
    if (language !== 'en') {
        root.lang = language;
        if (language === 'ar') root.dir = 'rtl';
        document.write(`<script src="locales/${language}.js"><\/script>`);
    }

    // Parsed once here; script.js reuses it instead of parsing again
    window.__LL_BOOT = { settings, bgImage: customBg, language, labelColor };

    // A solid color has no picture to wait for
    if (solid) {
        root.classList.add('bg-ready');
        return;
    }

    // 4. Lightnings show as soon as the DOM is ready (no waiting on the image).
    // The background layer appears once fully decoded (so it never paints in strips from
    // top to bottom): instantly if that happens before first paint, otherwise with a short
    // fade over the picture's average color.
    const imgLoader = new Image();
    imgLoader.src = bgImageURL;
    imgLoader.decode().catch(() => { }).then(() => {
        root.classList.add('bg-ready');
        performance.mark('ll-bg');
        // Off the critical path: remember the average color for the next new tab
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

// init.js - Instant Load Version
(function() {
    'use strict';
    
    // 1. Load Settings Immediately
    try {
        const saved = localStorage.getItem('mySettings');
        const settings = saved ? JSON.parse(saved) : null;
        
        let bgImageURL = 'backgrounds/bg1.jpg'; // Default
        
        if (settings) {
            if (settings.bgImage) bgImageURL = settings.bgImage;
            
            // Apply Layout Settings
            if (settings.colCount) document.documentElement.style.setProperty('--col-count', settings.colCount);
            if (settings.dialSize) document.documentElement.style.setProperty('--dial-width', settings.dialSize + 'px');
            if (settings.colGap) document.documentElement.style.setProperty('--col-gap', settings.colGap + 'px');
            if (settings.rowGap) document.documentElement.style.setProperty('--row-gap', settings.rowGap + 'px');
        }
        
        // 2. Apply Background Immediately
        document.documentElement.style.setProperty('--bg-image', `url('${bgImageURL}')`);

    } catch (e) {
        console.error("Settings load error:", e);
    }
})();
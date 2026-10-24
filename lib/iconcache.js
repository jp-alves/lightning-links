// lib/iconcache.js - Offline icon cache: icon URL -> data URL, stored under its own localStorage key
(function (root) {
    'use strict';

    const KEY = 'iconCache';
    const MAX_ICON_SIZE = 128;

    function loadCache(storage) {
        try {
            return JSON.parse(storage.getItem(KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function saveCache(storage, cache) {
        try {
            storage.setItem(KEY, JSON.stringify(cache));
            return true;
        } catch (e) {
            return false; // Quota exceeded: keep what was there before
        }
    }

    function resolveIcon(cache, img) {
        return cache[img] ?? img;
    }

    async function cacheIcons(urls, cache, { fetchFn, encodeFn, onProgress }) {
        const pending = [...new Set(urls)].filter(u => /^https?:/.test(u) && !(u in cache));
        let saved = 0, failed = 0;
        for (const url of pending) {
            // Yield so the page stays responsive between icons
            await new Promise(r => setTimeout(r, 0));
            try {
                const res = await fetchFn(url);
                const type = res && res.ok ? res.headers.get('content-type') || '' : '';
                if (!type.startsWith('image/')) throw new Error('Not an image');
                cache[url] = await encodeFn(await res.blob());
                saved++;
            } catch (e) {
                failed++;
            }
            if (onProgress) onProgress(saved, failed, pending.length);
        }
        return { saved, failed, total: pending.length };
    }

    // Browser only: shrink to at most 128px and keep the smaller of WebP/PNG
    async function encodeBlob(blob) {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, MAX_ICON_SIZE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const webp = canvas.toDataURL('image/webp', 0.9);
        const png = canvas.toDataURL('image/png');
        return webp.length < png.length ? webp : png;
    }

    const api = { KEY, loadCache, saveCache, resolveIcon, cacheIcons, encodeBlob };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).iconcache = api;
})(typeof self !== 'undefined' ? self : this);

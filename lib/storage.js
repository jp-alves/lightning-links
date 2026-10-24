// lib/storage.js - All-or-nothing localStorage writes that free expendable data (icon cache) when full
(function (root) {
    'use strict';

    function tryWrite(storage, entries) {
        const previous = entries.map(([key]) => [key, storage.getItem(key)]);
        try {
            entries.forEach(([key, value]) => storage.setItem(key, value));
            return true;
        } catch (e) {
            // Put back what was there so nothing is left half-written
            previous.forEach(([key, value]) => {
                if (value === null) storage.removeItem(key);
                else storage.setItem(key, value);
            });
            return false;
        }
    }

    // entries: [[key, string]]; evict: keys that may be dropped to make room
    // Returns 'ok', 'evicted' (written after dropping `evict`), or 'full' (nothing changed)
    function writeAll(storage, entries, evict = []) {
        if (tryWrite(storage, entries)) return 'ok';
        const evictable = evict.filter(key => storage.getItem(key) !== null);
        if (!evictable.length) return 'full';
        evictable.forEach(key => storage.removeItem(key));
        return tryWrite(storage, entries) ? 'evicted' : 'full';
    }

    const api = { writeAll };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).storage = api;
})(typeof self !== 'undefined' ? self : this);

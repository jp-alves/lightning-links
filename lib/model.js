// lib/model.js - Pure operations on a workspace's item list (lightnings and folders)
(function (root) {
    'use strict';

    const NUMERIC_SETTINGS = ['colCount', 'lightningSize', 'colGap', 'rowGap', 'labelScale'];

    function isFolder(item) {
        return !!item && item.type === 'folder';
    }

    function forEachLightning(workspaces, fn) {
        Object.keys(workspaces).forEach(name => {
            (workspaces[name] || []).forEach(item => {
                if (isFolder(item)) item.items.forEach(d => fn(d, name));
                else fn(item, name);
            });
        });
    }

    function moveItem(items, from, to) {
        const [item] = items.splice(from, 1);
        items.splice(to, 0, item);
    }

    // Drop lightning `dragIdx` onto lightning `targetIdx`: both become a folder at the target's spot
    function createFolder(items, dragIdx, targetIdx, id) {
        const [dragged] = items.splice(dragIdx, 1);
        const at = dragIdx < targetIdx ? targetIdx - 1 : targetIdx;
        const folder = { type: 'folder', id, name: 'Folder', items: [items[at], dragged] };
        items[at] = folder;
        return folder;
    }

    function addToFolder(items, dragIdx, folderIdx) {
        const [dragged] = items.splice(dragIdx, 1);
        const at = dragIdx < folderIdx ? folderIdx - 1 : folderIdx;
        items[at].items.push(dragged);
    }

    // Move a folder's child to the top level at `insertAt`, then tidy up the folder
    function removeFromFolder(items, folderIdx, childIdx, insertAt) {
        const [child] = items[folderIdx].items.splice(childIdx, 1);
        items.splice(insertAt, 0, child);
        normalize(items);
    }

    function ungroup(items, folderIdx) {
        items.splice(folderIdx, 1, ...items[folderIdx].items);
    }

    // A folder with one lightning becomes that lightning; an empty folder disappears
    function normalize(items) {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (!isFolder(item)) continue;
            if (item.items.length === 0) items.splice(i, 1);
            else if (item.items.length === 1) items[i] = item.items[0];
        }
    }

    // Up to v1.2 the icon size was saved as dialSize: carry it over to lightningSize
    function migrateSettings(settings) {
        if (settings && settings.dialSize !== undefined) {
            if (settings.lightningSize === undefined) settings.lightningSize = settings.dialSize;
            delete settings.dialSize;
        }
        return settings;
    }

    const isLightning = (d) => !!d && typeof d === 'object' && typeof d.url === 'string' && !isFolder(d);
    const isValidItem = (item) => isLightning(item) ||
        (isFolder(item) && Array.isArray(item.items) && item.items.every(isLightning));

    // Accepts v1.0 ({dials, settings}) and v1.0/v1.1 ({workspaces, settings}) backups
    function normalizeImport(data) {
        if (!data || !data.settings) return null;
        let workspaces, lastActiveWorkspace;
        if (data.workspaces) {
            workspaces = data.workspaces;
            lastActiveWorkspace = data.lastActiveWorkspace || Object.keys(workspaces)[0] || 'Home';
        } else if (data.dials) {
            workspaces = { Home: data.dials };
            lastActiveWorkspace = 'Home';
        } else {
            return null;
        }
        // A malformed list would be saved and then break every new tab: reject the file instead
        const lists = Object.values(workspaces || {});
        if (!lists.every(list => Array.isArray(list) && list.every(isValidItem))) return null;
        const settings = migrateSettings(Object.assign({}, data.settings));
        NUMERIC_SETTINGS.forEach(k => {
            if (settings[k] !== undefined) settings[k] = Number(settings[k]);
        });
        return { workspaces, lastActiveWorkspace, settings, iconCache: data.iconCache, bgImage: data.bgImage };
    }

    // Why a workspace name can't be used, or null when it can. `current` is the name being renamed
    function workspaceNameError(name, existing, current = null) {
        const trimmed = String(name || '').trim();
        if (!trimmed) return 'Enter a name.';
        const lower = trimmed.toLowerCase();
        const taken = existing.some(n => n !== current && n.toLowerCase() === lower);
        return taken ? 'A workspace with this name already exists.' : null;
    }

    // Workspaces keep their order as object key order; these rebuild the object in a new order
    function reorderKeys(obj, from, to) {
        const keys = Object.keys(obj);
        const [key] = keys.splice(from, 1);
        keys.splice(to, 0, key);
        return Object.fromEntries(keys.map(k => [k, obj[k]]));
    }

    function renameKey(obj, oldKey, newKey) {
        return Object.fromEntries(Object.keys(obj).map(k => [k === oldKey ? newKey : k, obj[k]]));
    }

    const api = { reorderKeys, renameKey, workspaceNameError, isFolder, forEachLightning, moveItem, createFolder, addToFolder, removeFromFolder, ungroup, normalize, normalizeImport, migrateSettings };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).model = api;
})(typeof self !== 'undefined' ? self : this);

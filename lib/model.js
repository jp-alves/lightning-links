// lib/model.js - Pure operations on a workspace's item list (dials and folders)
(function (root) {
    'use strict';

    const NUMERIC_SETTINGS = ['colCount', 'dialSize', 'colGap', 'rowGap'];

    function isFolder(item) {
        return !!item && item.type === 'folder';
    }

    function forEachDial(workspaces, fn) {
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

    // Drop dial `dragIdx` onto dial `targetIdx`: both become a folder at the target's spot
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

    // A folder with one dial becomes that dial; an empty folder disappears
    function normalize(items) {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (!isFolder(item)) continue;
            if (item.items.length === 0) items.splice(i, 1);
            else if (item.items.length === 1) items[i] = item.items[0];
        }
    }

    const isDial = (d) => !!d && typeof d === 'object' && typeof d.url === 'string' && !isFolder(d);
    const isValidItem = (item) => isDial(item) ||
        (isFolder(item) && Array.isArray(item.items) && item.items.every(isDial));

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
        const settings = Object.assign({}, data.settings);
        NUMERIC_SETTINGS.forEach(k => {
            if (settings[k] !== undefined) settings[k] = Number(settings[k]);
        });
        return { workspaces, lastActiveWorkspace, settings, iconCache: data.iconCache, bgImage: data.bgImage };
    }

    const api = { isFolder, forEachDial, moveItem, createFolder, addToFolder, removeFromFolder, ungroup, normalize, normalizeImport };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).model = api;
})(typeof self !== 'undefined' ? self : this);

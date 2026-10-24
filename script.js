// Optimized script.js - Performance focused

(function () {

    'use strict';

    // Cache all DOM elements once

    const DOM = {

        grid: null,

        addBtn: null,

        addModal: null,

        modalTitle: null,

        nameInput: null,

        urlInput: null,

        imgInput: null,

        saveBtn: null,

        cancelBtn: null,

        contextMenu: null,

        ctxNewTab: null,
        ctxIncognito: null,
        ctxCopy: null,
        toast: null,

        ctxEdit: null,

        ctxDelete: null,

        workspaceContextMenu: null,
        folderContextMenu: null,
        ctxFolderRename: null,
        ctxFolderOpenAll: null,
        ctxFolderUngroup: null,
        ctxFolderDelete: null,

        ctxEditWorkspace: null,

        ctxDeleteWorkspace: null,

        settingsBtn: null,

        settingsModal: null,

        closeSettingsBtn: null,

        colRange: null,

        colVal: null,

        sizeRange: null,

        sizeVal: null,

        hGapRange: null,

        hGapVal: null,

        vGapRange: null,

        vGapVal: null,

        bgGrid: null,

        tabs: null,

        exportBtn: null,

        importTrigger: null,

        importFile: null,

        bgUpload: null,

        themeOptions: null,

        cacheIconsToggle: null,
        autoFitToggle: null,
        workspacesContainer: null,
        iconCacheStatus: null

    };

    // State

    // Which dial the add/edit modal and the context menu act on:
    // { index, childIndex } where childIndex > -1 means inside the folder at `index`
    let editingTarget = null;

    let contextTarget = null;
    let contextFolderIndex = -1;
    let openFolderId = null;
    let addFolderId = null; // folder the add modal was opened from, if any

    let contextWorkspaceName = null;



    const defaultDials = [

        { name: "Google", url: "https://www.google.com", img: "https://www.google.com/s2/favicons?domain=google.com&sz=128" },

        { name: "YouTube", url: "https://www.youtube.com", img: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128" }

    ];

    const backgrounds = [

        'backgrounds/bg1.jpg', 'backgrounds/bg2.jpg', 'backgrounds/bg3.jpg',

        'backgrounds/bg4.jpg', 'backgrounds/bg5.jpg'

    ];

    let workspaces = {};
    let iconCache = LL.iconcache.loadCache(localStorage);

    let lastActiveWorkspace = 'Home';

    const BOOT = window.__LL_BOOT || {};

    let customBg = BOOT.bgImage || null;

    let settings = BOOT.settings || {

        colCount: 6,

        dialSize: 160,

        colGap: 20,

        rowGap: 20,

        bgImage: 'backgrounds/bg1.jpg',

        theme: 'light',

        cacheIcons: false,
        autoFit: true

    };

    // Data Migration from old version

    function migrateData() {

        const oldDials = localStorage.getItem('myDials');

        if (oldDials) {

            try {

                workspaces['Home'] = JSON.parse(oldDials);

                localStorage.removeItem('myDials');

                saveWorkspaces();

            } catch (e) {

                console.error("Error migrating old data:", e);

                // If migration fails, start with default

                workspaces['Home'] = defaultDials;

            }

        } else {

            const savedWorkspaces = localStorage.getItem('myWorkspaces');

            if (savedWorkspaces) {

                workspaces = JSON.parse(savedWorkspaces);

                lastActiveWorkspace = localStorage.getItem('lastActiveWorkspace') || 'Home';

            } else {

                workspaces['Home'] = defaultDials;

            }

        }

    }

    function getActiveDials() {

        return workspaces[lastActiveWorkspace] || [];

    }

    function saveWorkspaces() {

        localStorage.setItem('myWorkspaces', JSON.stringify(workspaces));

        localStorage.setItem('lastActiveWorkspace', lastActiveWorkspace);

    }

    // Initialize on DOM ready

    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', init);

    } else {

        init();

    }

    function init() {

        migrateData();

        cacheDOMElements();

        applySettings();

        renderDials();

        performance.mark('ll-dials');

        renderBackgroundOptions();

        renderWorkspacesTabs();

        attachEventListeners();

        if (settings.cacheIcons) {
            requestIdleCallback(refreshIconCache);
        }

    }

    // Every unique remote icon URL across all workspaces and folders
    function collectIconUrls() {
        const urls = new Set();
        LL.model.forEachDial(workspaces, dial => {
            if (dial.img && /^https?:/.test(dial.img)) urls.add(dial.img);
        });
        return [...urls];
    }

    function updateIconCacheStatus(storageFull = false, failed = 0) {
        if (!settings.cacheIcons) {
            DOM.iconCacheStatus.textContent = '';
            return;
        }
        if (storageFull) {
            DOM.iconCacheStatus.textContent = 'Storage full — some icons not saved';
            return;
        }
        const urls = collectIconUrls();
        const saved = urls.filter(u => u in iconCache).length;
        let text = `${saved} of ${urls.length} icons saved for offline`;
        if (failed) text += ` · ${failed} couldn't be saved`;
        DOM.iconCacheStatus.textContent = text;
    }

    async function refreshIconCache() {
        if (!settings.cacheIcons) return;
        const result = await LL.iconcache.cacheIcons(collectIconUrls(), iconCache, {
            fetchFn: (url) => fetch(url),
            encodeFn: LL.iconcache.encodeBlob,
            onProgress: (saved, failed) => updateIconCacheStatus(false, failed)
        });
        let storageFull = false;
        if (result.saved) {
            storageFull = !LL.iconcache.saveCache(localStorage, iconCache);
            renderDials();
        }
        updateIconCacheStatus(storageFull, result.failed);
    }

    // Cache all DOM elements at once

    function cacheDOMElements() {

        DOM.grid = document.getElementById('dial-grid');

        DOM.addBtn = document.getElementById('add-btn');

        DOM.addModal = document.getElementById('modal');

        DOM.modalTitle = document.getElementById('modal-title');

        DOM.nameInput = document.getElementById('site-name');

        DOM.urlInput = document.getElementById('site-url');

        DOM.imgInput = document.getElementById('site-img');

        DOM.saveBtn = document.getElementById('save-btn');

        DOM.cancelBtn = document.getElementById('cancel-btn');

        DOM.contextMenu = document.getElementById('context-menu');

        DOM.ctxNewTab = document.getElementById('ctx-newtab');
        DOM.ctxIncognito = document.getElementById('ctx-incognito');
        DOM.ctxCopy = document.getElementById('ctx-copy');
        DOM.toast = document.getElementById('toast');

        DOM.ctxEdit = document.getElementById('ctx-edit');

        DOM.ctxDelete = document.getElementById('ctx-delete');

        DOM.workspaceContextMenu = document.getElementById('workspace-context-menu');
        DOM.folderContextMenu = document.getElementById('folder-context-menu');
        DOM.ctxFolderRename = document.getElementById('ctx-folder-rename');
        DOM.ctxFolderOpenAll = document.getElementById('ctx-folder-openall');
        DOM.ctxFolderUngroup = document.getElementById('ctx-folder-ungroup');
        DOM.ctxFolderDelete = document.getElementById('ctx-folder-delete');

        DOM.ctxEditWorkspace = document.getElementById('ctx-edit-workspace');

        DOM.ctxDeleteWorkspace = document.getElementById('ctx-delete-workspace');

        DOM.settingsBtn = document.getElementById('settings-trigger');

        DOM.settingsModal = document.getElementById('settings-modal');

        DOM.closeSettingsBtn = document.getElementById('close-settings');

        DOM.colRange = document.getElementById('col-range');

        DOM.colVal = document.getElementById('col-val');

        DOM.sizeRange = document.getElementById('size-range');

        DOM.sizeVal = document.getElementById('size-val');

        DOM.hGapRange = document.getElementById('h-gap-range');

        DOM.hGapVal = document.getElementById('h-gap-val');

        DOM.vGapRange = document.getElementById('v-gap-range');

        DOM.vGapVal = document.getElementById('v-gap-val');

        DOM.bgGrid = document.getElementById('bg-grid');

        DOM.tabs = document.querySelectorAll('.tab');

        DOM.exportBtn = document.getElementById('export-btn');

        DOM.importTrigger = document.getElementById('import-trigger');

        DOM.importFile = document.getElementById('import-file');

        DOM.bgUpload = document.getElementById('bg-upload');

        DOM.workspacesTabs = document.getElementById('workspaces-tabs');
        DOM.themeOptions = document.getElementById('theme-options');
        DOM.cacheIconsToggle = document.getElementById('cache-icons-toggle');
        DOM.autoFitToggle = document.getElementById('autofit-toggle');
        DOM.workspacesContainer = document.getElementById('workspaces-container');
        DOM.iconCacheStatus = document.getElementById('icon-cache-status');

    }

    function renderWorkspacesTabs() {

        DOM.workspacesTabs.innerHTML = '';

        const workspaceNames = Object.keys(workspaces);

        workspaceNames.forEach(name => {

            const li = document.createElement('li');

            li.className = 'workspace-tab';

            li.textContent = name;

            li.dataset.name = name;

            if (name === lastActiveWorkspace) {

                li.classList.add('active');

            }

            DOM.workspacesTabs.appendChild(li);

        });

        if (workspaceNames.length < 5) {

            const addButton = document.createElement('li');

            addButton.className = 'workspace-tab';

            addButton.id = 'add-workspace-btn';

            addButton.textContent = '+';

            DOM.workspacesTabs.appendChild(addButton);

        }

    }

    function applySettings() {

        const root = document.documentElement;

        applyLayoutVars();

        root.style.setProperty('--bg-image', `url('${bgUrl()}')`);

        DOM.colVal.textContent = DOM.colRange.value = settings.colCount;

        DOM.sizeVal.textContent = Math.round((settings.dialSize / 160) * 100) + '%';

        DOM.sizeRange.value = settings.dialSize;

        DOM.hGapRange.value = settings.colGap;
        DOM.hGapVal.textContent = settings.colGap + 'px';

        DOM.vGapRange.value = settings.rowGap;
        DOM.vGapVal.textContent = settings.rowGap + 'px';

        // Apply theme

        if (settings.theme === 'dark') {

            document.body.classList.add('dark-mode');

            DOM.themeOptions.querySelector('input[value="dark"]').checked = true;

        } else {

            document.body.classList.remove('dark-mode');

            DOM.themeOptions.querySelector('input[value="light"]').checked = true;

        }

        // Apply cache icons toggle

        DOM.cacheIconsToggle.checked = settings.cacheIcons;
        DOM.autoFitToggle.checked = settings.autoFit !== false;

    }

    // Writes the grid's layout variables from the settings, fitted to the window (lib/layout.js)
    function applyLayoutVars() {
        const barBottom = DOM.workspacesContainer.getBoundingClientRect().bottom;
        const fit = LL.layout.computeFit({
            availW: window.innerWidth - 40,
            availH: Math.min(window.innerHeight * 0.9, window.innerHeight - 2 * (barBottom + 10)) - 40,
            count: getActiveDials().length + 1, // + the add button
            cols: settings.colCount,
            dialSize: settings.dialSize,
            colGap: settings.colGap,
            rowGap: settings.rowGap,
            autoFit: settings.autoFit !== false
        });
        const style = DOM.grid.style;
        style.setProperty('--col-count', fit.cols);
        style.setProperty('--dial-width', fit.dialSize + 'px');
        style.setProperty('--col-gap', fit.colGap + 'px');
        style.setProperty('--row-gap', fit.rowGap + 'px');
    }

    let resizeFrame = 0;
    let resizeTimer = 0;
    function onResize() {
        DOM.grid.classList.add('resizing');
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(applyLayoutVars);
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => DOM.grid.classList.remove('resizing'), 250);
    }

    function bgUrl() {
        return settings.bgImage === 'custom' ? customBg : settings.bgImage;
    }

    function persistSettings() {
        localStorage.setItem('mySettings', JSON.stringify(settings));
    }

    function saveSettings() {

        localStorage.setItem('mySettings', JSON.stringify(settings));

        applySettings();

    }

    // Optimized render using DocumentFragment

    function buildDialEl(dial, index, key) {
        const div = document.createElement('a');
        div.className = 'dial';
        div.href = dial.url;
        div.draggable = false;
        div.dataset.index = index;
        div.dataset.key = key;
        const img = document.createElement('img');
        img.src = LL.iconcache.resolveIcon(iconCache, dial.img);
        img.decoding = 'async';
        img.alt = dial.name;
        img.onerror = () => { img.onerror = null; img.src = 'icons/icon128.png'; };
        const label = document.createElement('span');
        label.textContent = dial.name;
        div.append(img, label);
        return div;
    }

    function buildFolderEl(folder, index) {
        const div = document.createElement('div');
        div.className = 'dial folder';
        div.dataset.index = index;
        div.dataset.key = 'folder:' + folder.id;
        div.tabIndex = 0;
        const preview = document.createElement('div');
        preview.className = 'folder-preview';
        folder.items.slice(0, 4).forEach(dial => {
            const img = document.createElement('img');
            img.src = LL.iconcache.resolveIcon(iconCache, dial.img);
            img.decoding = 'async';
            img.alt = '';
            img.onerror = () => { img.onerror = null; img.src = 'icons/icon128.png'; };
            preview.appendChild(img);
        });
        const label = document.createElement('span');
        label.textContent = folder.name;
        div.append(preview, label);
        return div;
    }

    // Stable identity across re-renders (for FLIP): url plus occurrence count
    function keyMaker() {
        const seen = {};
        return (dial) => {
            seen[dial.url] = (seen[dial.url] || 0) + 1;
            return dial.url + '#' + seen[dial.url];
        };
    }

    // Optimized render using DocumentFragment
    function renderDials() {
        DOM.grid.querySelectorAll('.dial:not(#add-btn)').forEach(el => el.remove());
        const fragment = document.createDocumentFragment();
        const key = keyMaker();
        getActiveDials().forEach((item, index) => {
            fragment.appendChild(LL.model.isFolder(item) ? buildFolderEl(item, index) : buildDialEl(item, index, key(item)));
        });
        DOM.grid.insertBefore(fragment, DOM.addBtn);
        applyLayoutVars();
        renderFolderPanel();
    }

    // --- Folders ---

    function getOpenFolder() {
        if (!openFolderId) return null;
        const items = getActiveDials();
        const index = items.findIndex(item => LL.model.isFolder(item) && item.id === openFolderId);
        return index > -1 ? { folder: items[index], index } : null;
    }

    function folderPanelOptions(folder) {
        const style = DOM.grid.style;
        return {
            renderItem: (() => { const key = keyMaker(); return (dial, i) => buildDialEl(dial, i, key(dial)); })(),
            onRename: (name) => {
                folder.name = name;
                saveWorkspaces();
                renderDials();
            },
            onAdd: () => openAddModal(),
            onClose: () => { openFolderId = null; },
            getFolderEl: () => DOM.grid.querySelector(`[data-key="${CSS.escape('folder:' + folder.id)}"]`),
            layout: {
                cols: Number(style.getPropertyValue('--col-count')),
                dialWidth: style.getPropertyValue('--dial-width'),
                colGap: style.getPropertyValue('--col-gap'),
                rowGap: style.getPropertyValue('--row-gap')
            }
        };
    }

    function openFolder(index) {
        const folder = getActiveDials()[index];
        const el = DOM.grid.querySelector(`.dial[data-index="${index}"]`);
        openFolderId = folder.id;
        LL.folderPanel.open(el, folder, folderPanelOptions(folder));
    }

    // Keep the open panel in sync after any change; close it if its folder dissolved
    function renderFolderPanel() {
        if (!LL.folderPanel.isOpen()) return;
        const open = getOpenFolder();
        if (!open) {
            LL.folderPanel.close(true);
            return;
        }
        LL.folderPanel.refresh(open.folder);
    }

    // The list holding a target dial (top level or a folder's items) and its position in it
    function targetList(target) {
        const items = getActiveDials();
        return target.childIndex > -1 ? [items[target.index].items, target.childIndex] : [items, target.index];
    }

    function targetDial(target) {
        const [list, i] = targetList(target);
        return list[i];
    }

    let toastTimer = 0;
    function showToast(text) {
        DOM.toast.textContent = text;
        DOM.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => DOM.toast.classList.remove('show'), 1500);
    }

    // Context menu logic

    function showContextMenu(e, target) {
        contextTarget = target;

        DOM.contextMenu.style.display = 'block';

        DOM.contextMenu.style.left = e.pageX + 'px';

        DOM.contextMenu.style.top = e.pageY + 'px';

    }

    function showFolderContextMenu(e, index) {
        contextFolderIndex = index;
        DOM.folderContextMenu.style.display = 'block';
        DOM.folderContextMenu.style.left = e.pageX + 'px';
        DOM.folderContextMenu.style.top = e.pageY + 'px';
    }

    function showWorkspaceContextMenu(e, workspaceName) {

        if (workspaceName === 'Home') return; // Don't allow context menu on Home

        contextWorkspaceName = workspaceName;

        DOM.workspaceContextMenu.style.display = 'block';

        DOM.workspaceContextMenu.style.left = e.pageX + 'px';

        DOM.workspaceContextMenu.style.top = e.pageY + 'px';

    }

    // Background options rendering

    function renderBackgroundOptions() {

        DOM.bgGrid.innerHTML = '';

        backgrounds.forEach(bg => createBgThumb(bg));

        if (customBg) {
            createBgThumb(customBg, true);

        }

    }

    function createBgThumb(src, isCustom = false) {

        const wrapper = document.createElement('div');

        wrapper.className = 'bg-wrapper';

        const img = document.createElement('img');

        img.src = src;

        img.className = 'bg-option';

        const value = isCustom ? 'custom' : src;
        if (value === settings.bgImage) img.classList.add('selected');
        img.onclick = () => {
            settings.bgImage = value;

            saveSettings();

            document.querySelectorAll('.bg-option').forEach(i => i.classList.remove('selected'));

            img.classList.add('selected');

        };

        wrapper.appendChild(img);

        if (isCustom) {

            const delBtn = document.createElement('div');

            delBtn.className = 'bg-delete-btn';

            delBtn.textContent = 'X';

            delBtn.title = 'Remove custom background';

            delBtn.onclick = (e) => {

                e.stopPropagation();

                if (confirm('Remove this custom background?')) {
                    localStorage.removeItem('bgImage');
                    customBg = null;
                    settings.bgImage = 'backgrounds/bg1.jpg';

                    saveSettings();

                    renderBackgroundOptions();

                }

            };

            wrapper.appendChild(delBtn);

        }

        DOM.bgGrid.appendChild(wrapper);

    }

    // Attach all event listeners

    function attachEventListeners() {

        // Workspace Tabs

        DOM.workspacesTabs.addEventListener('click', (e) => {

            const target = e.target;

            if (target.id === 'add-workspace-btn') {

                const name = prompt('Enter new workspace name:');

                if (name && name.trim()) {

                    if (Object.keys(workspaces).length >= 5) {

                        alert('Maximum of 5 workspaces allowed.');

                        return;

                    }

                    if (workspaces[name.trim()]) {

                        alert('Workspace name already exists.');

                        return;

                    }

                    workspaces[name.trim()] = [];

                    lastActiveWorkspace = name.trim();

                    saveWorkspaces();

                    renderWorkspacesTabs();

                    renderDials();

                }

            } else if (target.classList.contains('workspace-tab')) {

                const workspaceName = target.dataset.name;

                if (workspaceName) {

                    lastActiveWorkspace = workspaceName;

                    saveWorkspaces();

                    renderWorkspacesTabs();

                    renderDials();

                }

            }

        });

        DOM.workspacesTabs.addEventListener('contextmenu', (e) => {

            const target = e.target;

            if (target.classList.contains('workspace-tab') && target.id !== 'add-workspace-btn') {

                e.preventDefault();

                showWorkspaceContextMenu(e, target.dataset.name);

            }

        });

        // Modal controls

        DOM.addBtn.onclick = openAddModal;

        DOM.cancelBtn.onclick = () => {

            DOM.addModal.style.display = 'none';

            clearInputs();

        };

        DOM.saveBtn.onclick = handleSave;

        // Any press outside a menu closes it (clicks swallowed after a drag never reach 'click')
        document.addEventListener('pointerdown', (e) => {
            [DOM.contextMenu, DOM.workspaceContextMenu, DOM.folderContextMenu].forEach(menu => {
                if (!menu.contains(e.target)) menu.style.display = 'none';
            });
        });

        // Context menu - hide on outside click

        document.addEventListener('click', (e) => {

            if (!DOM.contextMenu.contains(e.target)) {

                DOM.contextMenu.style.display = 'none';

            }

            if (!DOM.workspaceContextMenu.contains(e.target)) {
                DOM.workspaceContextMenu.style.display = 'none';
            }
            if (!DOM.folderContextMenu.contains(e.target)) {
                DOM.folderContextMenu.style.display = 'none';
            }

        });

        // Workspace Context Menu Actions

        DOM.ctxEditWorkspace.onclick = () => {

            if (!contextWorkspaceName) return;

            const newName = prompt(`Enter new name for "${contextWorkspaceName}":`, contextWorkspaceName);

            if (newName && newName.trim() && newName.trim() !== contextWorkspaceName) {

                if (workspaces[newName.trim()]) {

                    alert('Workspace name already exists.');

                    return;

                }

                // Update the workspace name

                workspaces[newName.trim()] = workspaces[contextWorkspaceName];

                delete workspaces[contextWorkspaceName];

                // If the active workspace was renamed, update it

                if (lastActiveWorkspace === contextWorkspaceName) {

                    lastActiveWorkspace = newName.trim();

                }

                saveWorkspaces();

                renderWorkspacesTabs();

            }

            DOM.workspaceContextMenu.style.display = 'none';

        };

        DOM.ctxDeleteWorkspace.onclick = () => {

            if (!contextWorkspaceName) return;

            if (Object.keys(workspaces).length <= 1) {

                alert("You cannot delete the last workspace.");

                DOM.workspaceContextMenu.style.display = 'none';

                return;

            }

            if (confirm(`Are you sure you want to delete the "${contextWorkspaceName}" workspace and all its links?`)) {

                delete workspaces[contextWorkspaceName];

                // If we deleted the active workspace, switch to Home

                if (lastActiveWorkspace === contextWorkspaceName) {

                    lastActiveWorkspace = 'Home';

                }

                saveWorkspaces();

                renderWorkspacesTabs();

                renderDials();

            }

            DOM.workspaceContextMenu.style.display = 'none';

        };

        // Context menu: Open in New Tab

        DOM.ctxNewTab.onclick = () => {

            if (contextTarget) {
                window.open(targetDial(contextTarget).url, '_blank');
            }

            DOM.contextMenu.style.display = 'none';

        };

        DOM.ctxIncognito.onclick = () => {
            if (contextTarget && typeof chrome !== 'undefined' && chrome.windows) {
                chrome.windows.create({ url: targetDial(contextTarget).url, incognito: true });
            }
            DOM.contextMenu.style.display = 'none';
        };

        DOM.ctxCopy.onclick = async () => {
            DOM.contextMenu.style.display = 'none';
            if (!contextTarget) return;
            try {
                await navigator.clipboard.writeText(targetDial(contextTarget).url);
                showToast('Link copied');
            } catch (err) {
                showToast("Couldn't copy link");
            }
        };

        // Context menu actions

        DOM.ctxEdit.onclick = () => {

            if (contextTarget) {
                const dial = targetDial(contextTarget);
                editingTarget = contextTarget;

                DOM.modalTitle.textContent = "Edit Website";

                DOM.urlInput.value = dial.url;

                DOM.nameInput.value = dial.name;

                DOM.imgInput.value = dial.img;

                DOM.addModal.style.display = 'flex';

            }

            DOM.contextMenu.style.display = 'none';

        };

        DOM.ctxDelete.onclick = () => {

            if (contextTarget && confirm(`Delete ${targetDial(contextTarget).name}?`)) {
                const target = contextTarget;
                const container = target.childIndex > -1 ? LL.folderPanel.gridEl() : DOM.grid;
                const el = container.querySelector(`.dial[data-index="${target.childIndex > -1 ? target.childIndex : target.index}"]`);
                const remove = () => {
                    const [list, i] = targetList(target);
                    list.splice(i, 1);
                    LL.model.normalize(getActiveDials());
                    saveWorkspaces();
                    if (target.childIndex > -1) LL.flip.flip(container, '.dial', renderDials);
                    else LL.flip.flip(DOM.grid, '.dial', renderDials);
                };
                if (el && !LL.flip.reducedMotion()) {
                    el.style.pointerEvents = 'none';
                    el.animate(
                        [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.9)' }],
                        { duration: 160, easing: 'ease-out', fill: 'forwards' }
                    ).onfinish = remove;
                } else {
                    remove();
                }
            }

            DOM.contextMenu.style.display = 'none';

        };

        // Settings modal

        DOM.settingsBtn.onclick = () => DOM.settingsModal.style.display = 'flex';

        DOM.closeSettingsBtn.onclick = () => DOM.settingsModal.style.display = 'none';

        // Range inputs

        const ranges = [
            [DOM.colRange, 'colCount'],
            [DOM.sizeRange, 'dialSize'],
            [DOM.hGapRange, 'colGap'],
            [DOM.vGapRange, 'rowGap']
        ];
        ranges.forEach(([input, key]) => {
            // Apply live while dragging; persist once on release
            input.oninput = (e) => {
                settings[key] = Number(e.target.value);
                applySettings();
            };
            input.onchange = persistSettings;
        });

        window.addEventListener('resize', onResize);

        DOM.autoFitToggle.onchange = (e) => {
            settings.autoFit = e.target.checked;
            saveSettings();
        };

        // Theme options

        DOM.themeOptions.onchange = (e) => {

            settings.theme = e.target.value;

            saveSettings();

        };

        // Cache icons toggle

        DOM.cacheIconsToggle.onchange = async (e) => {
            const enabled = e.target.checked;
            if (enabled && typeof chrome !== 'undefined' && chrome.permissions) {
                // Lets custom icons from any site be saved; Google icons work without it
                try {
                    await chrome.permissions.request({ origins: ['<all_urls>'] });
                } catch (err) { }
            }
            settings.cacheIcons = enabled;
            saveSettings();
            if (enabled) {
                refreshIconCache();
            } else {
                iconCache = {};
                localStorage.removeItem(LL.iconcache.KEY);
                updateIconCacheStatus();
            }
        };

        // Tabs

        DOM.tabs.forEach(tab => {

            tab.onclick = () => {

                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                tab.classList.add('active');

                document.getElementById(tab.dataset.target).classList.add('active');

            };

        });

        // Auto-generate name from URL

        DOM.urlInput.oninput = function () {

            const val = this.value;

            if (!val) return;

            try {

                const urlObj = new URL(val.startsWith('http') ? val : `https://${val}`);

                let domain = urlObj.hostname.replace('www.', '');

                let name = domain.split('.')[0];

                name = name.charAt(0).toUpperCase() + name.slice(1);

                if (document.activeElement !== DOM.nameInput) {

                    DOM.nameInput.value = name;

                }

            } catch (e) { }

        };

        // Import/Export

        DOM.exportBtn.onclick = handleExport;

        DOM.importTrigger.onclick = () => DOM.importFile.click();

        DOM.importFile.onchange = handleImport;

        // Background upload

        DOM.bgUpload.onchange = handleBgUpload;

        // Close modals on outside click

        window.onclick = (e) => {

            if (e.target === DOM.addModal) DOM.addModal.style.display = 'none';

            if (e.target === DOM.settingsModal) DOM.settingsModal.style.display = 'none';

        };

        // Drag & drop: dials slide aside to open the landing gap; holding on a
        // dial's centre makes a folder (ui/drag.js)
        const gridDrag = LL.drag.attach(DOM.grid, {
            itemSelector: '.dial:not(#add-btn)',
            onReorder: (from, to) => {
                LL.model.moveItem(getActiveDials(), from, to);
                saveWorkspaces();
                renderDials();
            },
            // Folders can't go inside folders
            canGroup: (from) => !LL.model.isFolder(getActiveDials()[from]),
            onGroup: (from, target) => {
                const items = getActiveDials();
                LL.flip.flip(DOM.grid, '.dial', () => {
                    if (LL.model.isFolder(items[target])) LL.model.addToFolder(items, from, target);
                    else LL.model.createFolder(items, from, target, 'f' + Date.now().toString(36));
                    saveWorkspaces();
                    renderDials();
                });
            }
        });

        // Inside an open folder: reorder, or drag a dial out to put it back on the grid
        LL.drag.attach(LL.folderPanel.gridEl(), {
            itemSelector: '.dial:not(.add-btn)',
            boundsEl: LL.folderPanel.panelEl(),
            canGroup: () => false,
            onReorder: (from, to) => {
                const open = getOpenFolder();
                if (!open) return;
                LL.model.moveItem(open.folder.items, from, to);
                saveWorkspaces();
                renderDials();
            },
            onDragOutside: (from, x, y, e) => {
                const open = getOpenFolder();
                if (!open) return false;
                const items = getActiveDials();
                const dial = open.folder.items[from];
                LL.model.removeFromFolder(items, open.index, from, open.index + 1);
                saveWorkspaces();
                LL.folderPanel.close();
                renderDials();
                const el = DOM.grid.querySelector(`.dial[data-index="${items.indexOf(dial)}"]`);
                if (el) gridDrag.begin(el, e);
                return true;
            }
        });

        // 5. Context Menu
        DOM.grid.addEventListener('contextmenu', (e) => {
            const dial = e.target.closest('.dial:not(#add-btn)');
            if (!dial) return;
            e.preventDefault();
            const index = parseInt(dial.dataset.index);
            if (dial.classList.contains('folder')) showFolderContextMenu(e, index);
            else showContextMenu(e, { index, childIndex: -1 });
        });

        LL.folderPanel.gridEl().addEventListener('contextmenu', (e) => {
            const dial = e.target.closest('.dial:not(.folder-add)');
            const open = getOpenFolder();
            if (!dial || !open) return;
            e.preventDefault();
            showContextMenu(e, { index: open.index, childIndex: parseInt(dial.dataset.index) });
        });

        // Folders open on click (a drag never reaches here: ui/drag.js swallows that click)
        DOM.grid.addEventListener('click', (e) => {
            const folder = e.target.closest('.folder');
            if (folder) openFolder(parseInt(folder.dataset.index));
        });
        DOM.grid.addEventListener('keydown', (e) => {
            const folder = e.target.closest('.folder');
            if (folder && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                openFolder(parseInt(folder.dataset.index));
            }
        });

        // Folder context menu
        const hideFolderMenu = () => { DOM.folderContextMenu.style.display = 'none'; };
        DOM.ctxFolderRename.onclick = () => {
            hideFolderMenu();
            openFolder(contextFolderIndex);
            LL.folderPanel.focusName();
        };
        DOM.ctxFolderOpenAll.onclick = () => {
            hideFolderMenu();
            getActiveDials()[contextFolderIndex].items.forEach(dial => {
                if (typeof chrome !== 'undefined' && chrome.tabs) chrome.tabs.create({ url: dial.url, active: false });
                else window.open(dial.url, '_blank');
            });
        };
        DOM.ctxFolderUngroup.onclick = () => {
            hideFolderMenu();
            LL.flip.flip(DOM.grid, '.dial', () => {
                LL.model.ungroup(getActiveDials(), contextFolderIndex);
                saveWorkspaces();
                renderDials();
            });
        };
        DOM.ctxFolderDelete.onclick = () => {
            hideFolderMenu();
            const folder = getActiveDials()[contextFolderIndex];
            const n = folder.items.length;
            if (!confirm(`Delete folder "${folder.name}" and its ${n} link${n === 1 ? '' : 's'}?`)) return;
            LL.flip.flip(DOM.grid, '.dial', () => {
                getActiveDials().splice(contextFolderIndex, 1);
                saveWorkspaces();
                renderDials();
            });
        };

    }

    function openAddModal() {
        editingTarget = null;
        addFolderId = openFolderId;
        DOM.modalTitle.textContent = "Add New Website";
        clearInputs();
        DOM.addModal.style.display = 'flex';
    }

    function clearInputs() {

        DOM.nameInput.value = '';

        DOM.urlInput.value = '';

        DOM.imgInput.value = '';

    }

    async function handleSave() {

        const name = DOM.nameInput.value;

        let url = DOM.urlInput.value;

        let img = DOM.imgInput.value;

        if (!name || !url) return alert("Name and URL required!");

        if (!url.startsWith('http')) url = 'https://' + url;

        if (!img) {

            try {

                const domain = new URL(url).hostname;

                img = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

            } catch (e) {

                img = "icons/icon128.png";

            }

        }

        const dialData = { name, url, img };
        const open = addFolderId && getActiveDials().find(item => LL.model.isFolder(item) && item.id === addFolderId);
        if (editingTarget) {
            const [list, i] = targetList(editingTarget);
            list[i] = dialData;
            saveWorkspaces();
            renderDials();
        } else if (open) {
            // "+" inside an open folder adds into that folder
            open.items.push(dialData);
            saveWorkspaces();
            LL.flip.flip(LL.folderPanel.gridEl(), '.dial', renderDials);
            const added = LL.folderPanel.gridEl().querySelector(`.dial[data-index="${open.items.length - 1}"]`);
            if (added) added.classList.add('entering');
        } else {
            const activeDials = getActiveDials();
            activeDials.push(dialData);
            saveWorkspaces();
            LL.flip.flip(DOM.grid, '.dial', renderDials);
            const added = DOM.grid.querySelector(`.dial[data-index="${activeDials.length - 1}"]`);
            if (added) added.classList.add('entering');
        }
        DOM.addModal.style.display = 'none';

        clearInputs();

        refreshIconCache();

    }

    function handleExport() {

        const data = { workspaces, lastActiveWorkspace, settings, iconCache, bgImage: customBg };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = 'lightning-links-backup.json';

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        URL.revokeObjectURL(url); // Clean up memory

    }

    function handleImport(e) {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (event) {

            try {

                const data = JSON.parse(event.target.result);
                const imported = LL.model.normalizeImport(data);
                if (!imported) throw new Error('Unrecognised backup');
                if (data.workspaces) workspaces = imported.workspaces;
                else workspaces['Home'] = imported.workspaces.Home; // v1.0 single-list backup goes into Home
                lastActiveWorkspace = imported.lastActiveWorkspace;
                settings = imported.settings;
                // v1.0 backups carry the custom background inside settings
                const importedBg = imported.bgImage ||
                    (settings.bgImage && settings.bgImage.startsWith('data:') ? settings.bgImage : null);
                if (importedBg) {
                    try {
                        localStorage.setItem('bgImage', importedBg);
                        customBg = importedBg;
                        settings.bgImage = 'custom';
                    } catch (err) {
                        settings.bgImage = 'backgrounds/bg1.jpg';
                    }
                } else if (settings.bgImage === 'custom' && !customBg) {
                    settings.bgImage = 'backgrounds/bg1.jpg';
                }
                if (imported.iconCache) {
                    iconCache = imported.iconCache;
                    LL.iconcache.saveCache(localStorage, iconCache);
                }
                saveWorkspaces();
                saveSettings();
                renderDials();
                renderBackgroundOptions();
                renderWorkspacesTabs();
                alert("Import successful!");
            } catch (err) {

                alert("Error reading file.");

            }

        };

        reader.readAsText(file);

    }

    function handleBgUpload(e) {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (event) {

            const img = new Image();

            img.onload = function () {

                const canvas = document.createElement('canvas');

                const ctx = canvas.getContext('2d');

                const MAX_DIMENSION = 1920;

                const MAX_HEIGHT = 1080;

                let width = img.width, height = img.height;

                if (width > height) {

                    if (width > MAX_DIMENSION) {

                        height *= MAX_DIMENSION / width;

                        width = MAX_DIMENSION;

                    }

                } else {

                    if (height > MAX_HEIGHT) {

                        width *= MAX_HEIGHT / height;

                        height = MAX_HEIGHT;

                    }

                }

                canvas.width = width;

                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);

                const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

                try {
                    localStorage.setItem('bgImage', optimizedDataUrl);
                } catch (err) {
                    alert("Storage full — image too large");
                    return;
                }
                customBg = optimizedDataUrl;
                settings.bgImage = 'custom';

                saveSettings();

                renderBackgroundOptions();

                applySettings();

            };

            img.src = event.target.result;

        };

        reader.readAsDataURL(file);

    }

})();
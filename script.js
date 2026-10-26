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
        labelColorOptions: null,

        cacheIconsToggle: null,
        labelRange: null,
        labelVal: null,
        workspaceModal: null,
        workspaceForm: null,
        workspaceTitle: null,
        workspaceName: null,
        workspaceError: null,
        siteError: null,
        workspaceSave: null,
        workspaceCancel: null,
        confirmModal: null,
        confirmTitle: null,
        confirmMessage: null,
        confirmOk: null,
        confirmCancel: null,
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

    // Settings saved by older versions lack the newer keys: fill them in, so they always
    // carry the full layout (and backups do too)
    const DEFAULT_SETTINGS = {

        colCount: 6,

        dialSize: 160,

        colGap: 20,

        rowGap: 20,

        bgImage: 'backgrounds/bg1.jpg',

        theme: 'auto',
        labelScale: 100,
        labelColor: 'light',

        cacheIcons: false,
        autoFit: true

    };

    let settings = Object.assign({}, DEFAULT_SETTINGS, BOOT.settings);

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
        // Home can be renamed or deleted: fall back to the first workspace there is
        if (!workspaces[lastActiveWorkspace]) lastActiveWorkspace = Object.keys(workspaces)[0];

    }

    function getActiveDials() {

        return workspaces[lastActiveWorkspace] || [];

    }

    // Links matter more than cached icons: when storage is full, the icon cache makes room
    function saveWorkspaces() {
        const result = LL.storage.writeAll(localStorage, [
            ['myWorkspaces', JSON.stringify(workspaces)],
            ['lastActiveWorkspace', lastActiveWorkspace]
        ], [LL.iconcache.KEY]);
        if (result === 'evicted') {
            iconCache = {};
            if (DOM.iconCacheStatus) updateIconCacheStatus(true);
        } else if (result === 'full') {
            showNotice({ title: 'Change not saved', message: 'There isn’t enough storage space for your last change.' });
            // Show what is actually stored
            try {
                workspaces = JSON.parse(localStorage.getItem('myWorkspaces')) || workspaces;
            } catch (e) { }
            if (DOM.grid) {
                renderWorkspacesTabs();
                renderDials();
            }
        }
        return result !== 'full';
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
        // Uploaded icons (data: URLs) and bundled ones are already stored, so they count as saved
        const icons = new Set();
        LL.model.forEachDial(workspaces, dial => { if (dial.img) icons.add(dial.img); });
        const saved = [...icons].filter(img => !/^https?:/.test(img) || img in iconCache).length;
        let text = `${saved} of ${icons.size} icons saved for offline`;
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
        DOM.labelColorOptions = document.getElementById('label-color-options');
        DOM.cacheIconsToggle = document.getElementById('cache-icons-toggle');
        DOM.labelRange = document.getElementById('label-range');
        DOM.labelVal = document.getElementById('label-val');
        DOM.workspaceModal = document.getElementById('workspace-modal');
        DOM.workspaceForm = document.getElementById('workspace-form');
        DOM.workspaceTitle = document.getElementById('workspace-title');
        DOM.workspaceName = document.getElementById('workspace-name');
        DOM.workspaceError = document.getElementById('workspace-error');
        DOM.siteError = document.getElementById('site-error');
        DOM.workspaceSave = document.getElementById('workspace-save');
        DOM.workspaceCancel = document.getElementById('workspace-cancel');
        DOM.confirmModal = document.getElementById('confirm-modal');
        DOM.confirmTitle = document.getElementById('confirm-title');
        DOM.confirmMessage = document.getElementById('confirm-message');
        DOM.confirmOk = document.getElementById('confirm-ok');
        DOM.confirmCancel = document.getElementById('confirm-cancel');
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
            li.tabIndex = 0;
            li.setAttribute('role', 'tab');
            li.setAttribute('aria-selected', String(name === lastActiveWorkspace));

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
            addButton.tabIndex = 0;
            addButton.setAttribute('role', 'button');
            addButton.setAttribute('aria-label', 'Add workspace');
            addButton.title = 'Add workspace';

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

        DOM.labelRange.value = labelScale();
        DOM.labelVal.textContent = labelScale() + '%';

        // Appearance: "auto" follows the system light/dark setting
        applyTheme();
        const themeInput = DOM.themeOptions.querySelector(`input[value="${settings.theme || 'auto'}"]`);
        if (themeInput) themeInput.checked = true;

        // Name color: light (white) or dark names under the icons
        root.dataset.labelColor = settings.labelColor === 'dark' ? 'dark' : 'light';
        DOM.labelColorOptions.querySelector(`input[value="${root.dataset.labelColor}"]`).checked = true;

        // Filled part of each slider track
        [DOM.colRange, DOM.sizeRange, DOM.hGapRange, DOM.vGapRange, DOM.labelRange].forEach(input => {
            const pct = (input.value - input.min) / (input.max - input.min) * 100;
            input.style.setProperty('--pct', pct + '%');
        });

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
            autoFit: settings.autoFit !== false,
            aspect: LL.layout.cellAspect(settings.dialSize, labelScale())
        });
        // Negative horizontal spacing narrows the cells (icons move closer, then overlap);
        // a cell never gets narrower than 30% of the icon cell, so icons stay distinct
        const cellWidth = Math.max(Math.round(fit.dialSize * 0.3), fit.dialSize + Math.min(fit.colGap, 0));
        const style = DOM.grid.style;
        style.setProperty('--col-count', fit.cols);
        style.setProperty('--dial-width', fit.dialSize + 'px');
        style.setProperty('--cell-width', cellWidth + 'px');
        style.setProperty('--col-gap', Math.max(fit.colGap, 0) + 'px');
        // Negative vertical spacing pulls each row up, at most 70% of a row, so icons stay distinct
        const rowHeight = fit.dialSize / LL.layout.cellAspect(fit.dialSize, labelScale());
        style.setProperty('--row-pull', Math.max(Math.min(fit.rowGap, 0), -Math.round(rowHeight * 0.7)) + 'px');
        document.documentElement.style.setProperty('--label-scale', labelScale() / 100);
        style.setProperty('--row-gap', Math.max(fit.rowGap, 0) + 'px');
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

    // Name size, as a percentage of the automatic size (older settings have none: 100%)
    function labelScale() {
        return Number(settings.labelScale) || 100;
    }

    function bgUrl() {
        return settings.bgImage === 'custom' ? customBg : settings.bgImage;
    }

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
        document.documentElement.dataset.theme = LL.appearance.resolveTheme(settings.theme, darkQuery.matches);
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
        const icon = document.createElement('div');
        icon.className = 'icon';
        icon.appendChild(img);
        const label = document.createElement('span');
        label.textContent = dial.name;
        div.append(icon, label);
        return div;
    }

    function buildFolderEl(folder, index) {
        const div = document.createElement('div');
        div.className = 'dial folder';
        div.dataset.index = index;
        div.dataset.key = 'folder:' + folder.id;
        div.tabIndex = 0;
        const preview = document.createElement('div');
        preview.className = 'icon folder-preview';
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
            // Read live, so the panel follows auto-fit when the window is resized
            layout: () => ({
                cols: Number(style.getPropertyValue('--col-count')),
                dialWidth: style.getPropertyValue('--dial-width'),
                cellWidth: style.getPropertyValue('--cell-width'),
                rowPull: style.getPropertyValue('--row-pull'),
                colGap: style.getPropertyValue('--col-gap'),
                rowGap: style.getPropertyValue('--row-gap')
            })
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

        contextWorkspaceName = workspaceName;
        // The last workspace can be renamed but not deleted
        const lastOne = Object.keys(workspaces).length <= 1;
        DOM.ctxDeleteWorkspace.hidden = lastOne;
        DOM.ctxDeleteWorkspace.previousElementSibling.hidden = lastOne;

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

            delBtn.textContent = '×';
            delBtn.setAttribute('aria-label', 'Remove your picture');

            delBtn.title = 'Remove custom background';

            delBtn.onclick = async (e) => {
                e.stopPropagation();
                const ok = await askConfirm({ title: 'Remove your picture?', message: 'The wallpaper goes back to the default.', confirmLabel: 'Remove' });
                if (ok) {
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
                openWorkspaceSheet(null);
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
        // Clear the message as soon as a field changes; it is re-checked on save
        [DOM.urlInput, DOM.nameInput].forEach(input => input.addEventListener('input', () => {
            DOM.siteError.textContent = '';
        }));

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
            DOM.workspaceContextMenu.style.display = 'none';
            if (contextWorkspaceName) openWorkspaceSheet(contextWorkspaceName);
        };

        DOM.workspaceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveWorkspaceSheet();
        });
        DOM.workspaceName.addEventListener('input', () => {
            // Clear the message as soon as the name changes; it is re-checked on save
            DOM.workspaceError.textContent = '';
        });
        DOM.workspaceCancel.onclick = closeWorkspaceSheet;
        DOM.confirmOk.onclick = () => closeConfirm(true);
        DOM.confirmCancel.onclick = () => closeConfirm(false);

        DOM.ctxDeleteWorkspace.onclick = async () => {
            DOM.workspaceContextMenu.style.display = 'none';
            const name = contextWorkspaceName;
            if (!name || Object.keys(workspaces).length <= 1) return;
            const count = countLinks(workspaces[name]);
            const ok = await askConfirm({
                title: `Delete “${name}”?`,
                message: count ? `Its ${count} link${count === 1 ? '' : 's'} will be deleted too.` : 'This workspace is empty.'
            });
            if (!ok) return;
            delete workspaces[name];
            // If we deleted the active workspace, switch to the first one left
            if (lastActiveWorkspace === name) lastActiveWorkspace = Object.keys(workspaces)[0];
            saveWorkspaces();
            renderWorkspacesTabs();
            renderDials();
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

                DOM.siteError.textContent = '';

                DOM.addModal.style.display = 'flex';

            }

            DOM.contextMenu.style.display = 'none';

        };

        DOM.ctxDelete.onclick = async () => {
            DOM.contextMenu.style.display = 'none';
            const target = contextTarget;
            if (target && await askConfirm({ title: `Delete “${targetDial(target).name}”?`, message: 'You can add it again later with +.' })) {
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
            [DOM.vGapRange, 'rowGap'],
            [DOM.labelRange, 'labelScale']
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

        darkQuery.addEventListener('change', applyTheme);

        DOM.labelColorOptions.onchange = (e) => {
            settings.labelColor = e.target.value;
            saveSettings();
        };

        // Workspace tabs and the + icon are not native buttons: Enter / Space activate them
        const activateOnKey = (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            e.target.click();
        };
        DOM.workspacesTabs.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('workspace-tab')) activateOnKey(e);
        });
        DOM.addBtn.addEventListener('keydown', activateOnKey);

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
            if (e.target === DOM.workspaceModal) closeWorkspaceSheet();
            if (e.target === DOM.confirmModal) closeConfirm(false);
        };

        // Esc closes whichever sheet is open, like Cancel
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (DOM.confirmModal.style.display === 'flex') closeConfirm(false);
            else if (DOM.workspaceModal.style.display === 'flex') closeWorkspaceSheet();
            else if (DOM.addModal.style.display === 'flex') DOM.cancelBtn.click();
            else if (DOM.settingsModal.style.display === 'flex') DOM.settingsModal.style.display = 'none';
        });

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

        // Workspace tabs: drag along the bar to reorder them
        LL.drag.attach(DOM.workspacesTabs, {
            itemSelector: '.workspace-tab:not(#add-workspace-btn)',
            canGroup: () => false,
            onReorder: (from, to) => {
                workspaces = LL.model.reorderKeys(workspaces, from, to);
                saveWorkspaces();
                renderWorkspacesTabs();
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
        DOM.ctxFolderDelete.onclick = async () => {
            hideFolderMenu();
            const index = contextFolderIndex;
            const folder = getActiveDials()[index];
            const n = folder.items.length;
            const ok = await askConfirm({
                title: `Delete folder “${folder.name}”?`,
                message: `Its ${n} link${n === 1 ? '' : 's'} will be deleted too. To keep them, choose Ungroup instead.`
            });
            if (!ok || getActiveDials()[index] !== folder) return;
            LL.flip.flip(DOM.grid, '.dial', () => {
                getActiveDials().splice(index, 1);
                saveWorkspaces();
                renderDials();
            });
        };

    }

    // --- Delete confirmations: a frosted sheet with Cancel (default) and a red action ---
    let confirmResolve = null;

    function askConfirm({ title, message, confirmLabel = 'Delete' }) {
        DOM.confirmTitle.textContent = title;
        DOM.confirmMessage.textContent = message;
        DOM.confirmOk.textContent = confirmLabel;
        DOM.confirmOk.className = 'btn btn-destructive';
        DOM.confirmCancel.style.display = '';
        DOM.confirmModal.style.display = 'flex';
        DOM.confirmCancel.focus();
        return new Promise(resolve => { confirmResolve = resolve; });
    }

    // Messages (import results, errors): the same frosted sheet with a single OK
    function showNotice({ title, message = '' }) {
        DOM.confirmTitle.textContent = title;
        DOM.confirmMessage.textContent = message;
        DOM.confirmOk.textContent = 'OK';
        DOM.confirmOk.className = 'btn btn-primary';
        DOM.confirmCancel.style.display = 'none';
        DOM.confirmModal.style.display = 'flex';
        DOM.confirmOk.focus();
        return new Promise(resolve => { confirmResolve = resolve; });
    }

    function closeConfirm(result) {
        DOM.confirmModal.style.display = 'none';
        if (confirmResolve) confirmResolve(result);
        confirmResolve = null;
    }

    // Links in a workspace, counting the ones inside folders
    function countLinks(items) {
        return items.reduce((n, item) => n + (LL.model.isFolder(item) ? item.items.length : 1), 0);
    }

    // --- Workspace sheet: create (renaming = null) or rename a workspace ---
    let renamingWorkspace = null;

    function openWorkspaceSheet(name) {
        renamingWorkspace = name;
        DOM.workspaceTitle.textContent = name ? 'Rename Workspace' : 'New Workspace';
        DOM.workspaceSave.textContent = name ? 'Rename' : 'Create';
        DOM.workspaceName.value = name || '';
        DOM.workspaceError.textContent = '';
        DOM.workspaceModal.style.display = 'flex';
        DOM.workspaceName.focus();
        DOM.workspaceName.select();
    }

    function closeWorkspaceSheet() {
        DOM.workspaceModal.style.display = 'none';
        renamingWorkspace = null;
    }

    function saveWorkspaceSheet() {
        const name = DOM.workspaceName.value.trim();
        const error = LL.model.workspaceNameError(name, Object.keys(workspaces), renamingWorkspace);
        if (error) {
            DOM.workspaceError.textContent = error;
            DOM.workspaceName.focus();
            return;
        }
        if (renamingWorkspace) {
            if (name !== renamingWorkspace) {
                workspaces = LL.model.renameKey(workspaces, renamingWorkspace, name);
                if (lastActiveWorkspace === renamingWorkspace) lastActiveWorkspace = name;
            }
        } else {
            workspaces[name] = [];
            lastActiveWorkspace = name;
        }
        closeWorkspaceSheet();
        saveWorkspaces();
        renderWorkspacesTabs();
        renderDials();
    }

    function openAddModal() {
        editingTarget = null;
        addFolderId = openFolderId;
        DOM.modalTitle.textContent = "Add Website";
        clearInputs();
        DOM.addModal.style.display = 'flex';
    }

    function clearInputs() {

        DOM.nameInput.value = '';

        DOM.urlInput.value = '';

        DOM.imgInput.value = '';

        DOM.siteError.textContent = '';

    }

    async function handleSave() {

        const name = DOM.nameInput.value;

        let url = DOM.urlInput.value;

        let img = DOM.imgInput.value;

        if (!name || !url) {
            DOM.siteError.textContent = url ? 'Enter a name.' : 'Enter a URL.';
            (url ? DOM.nameInput : DOM.urlInput).focus();
            return;
        }

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
            let data = null;
            let imported = null;
            try {
                data = JSON.parse(event.target.result);
                imported = LL.model.normalizeImport(data);
            } catch (err) { }
            if (!imported) {
                showNotice({ title: 'Couldn’t import this file', message: 'It isn’t a Lightning Links backup, or it is damaged.' });
                return;
            }

            const nextWorkspaces = data.workspaces
                ? imported.workspaces
                : Object.assign({}, workspaces, { Home: imported.workspaces.Home }); // v1.0 single-list backup goes into Home
            const nextSettings = Object.assign({}, DEFAULT_SETTINGS, imported.settings);
            // v1.0 backups carry the custom background inside settings
            const importedBg = imported.bgImage ||
                (nextSettings.bgImage && String(nextSettings.bgImage).startsWith('data:') ? nextSettings.bgImage : null);
            if (importedBg) nextSettings.bgImage = 'custom';
            else if (nextSettings.bgImage === 'custom' && !customBg) nextSettings.bgImage = 'backgrounds/bg1.jpg';

            const core = [
                ['myWorkspaces', JSON.stringify(nextWorkspaces)],
                ['lastActiveWorkspace', imported.lastActiveWorkspace],
                ['mySettings', JSON.stringify(nextSettings)]
            ];
            const extras = [];
            if (importedBg) extras.push(['bgImage', importedBg]);
            if (imported.iconCache) extras.push([LL.iconcache.KEY, JSON.stringify(imported.iconCache)]);

            // Everything at once; if that doesn't fit, the links and settings alone (icons make room)
            let note = '';
            let result = LL.storage.writeAll(localStorage, core.concat(extras));
            let extrasSaved = result === 'ok';
            if (!extrasSaved) {
                if (importedBg) nextSettings.bgImage = 'backgrounds/bg1.jpg';
                core[2][1] = JSON.stringify(nextSettings);
                result = LL.storage.writeAll(localStorage, core, [LL.iconcache.KEY]);
                if (result === 'full') {
                    showNotice({ title: 'Backup not imported', message: 'There isn’t enough storage space. Nothing was changed.' });
                    return;
                }
                note = importedBg ? 'The wallpaper was too large to keep, so the default one is used.' : 'Icons saved for offline use were not restored.';
            }

            // Storage is written: now switch the page over
            workspaces = nextWorkspaces;
            lastActiveWorkspace = imported.lastActiveWorkspace;
            settings = nextSettings;
            if (extrasSaved && importedBg) customBg = importedBg;
            if (extrasSaved && imported.iconCache) iconCache = imported.iconCache;
            else if (result === 'evicted') iconCache = {};
            applySettings();
            renderDials();
            renderBackgroundOptions();
            renderWorkspacesTabs();
            showNotice({ title: 'Backup imported', message: note || 'Your links and settings have been restored.' });
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
                    showNotice({ title: 'Picture too large', message: 'There isn’t enough storage space for this picture. Try a smaller file.' });
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
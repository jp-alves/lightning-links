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

        ctxEdit: null,

        ctxDelete: null,

        workspaceContextMenu: null,

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

        cacheIconsToggle: null

    };



    // State

    let editingIndex = -1;

    let contextIndex = -1;

    let contextWorkspaceName = null;

    let dragSrcEl = null;



    const defaultDials = [

        { name: "Google", url: "https://www.google.com", img: "https://www.google.com/s2/favicons?domain=google.com&sz=128" },

        { name: "YouTube", url: "https://www.youtube.com", img: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128" }

    ];



    const backgrounds = [

        'backgrounds/bg1.jpg', 'backgrounds/bg2.jpg', 'backgrounds/bg3.jpg',

        'backgrounds/bg4.jpg', 'backgrounds/bg5.jpg'

    ];



    let workspaces = {};



    let lastActiveWorkspace = 'Home';



    let settings = JSON.parse(localStorage.getItem('mySettings')) || {



        colCount: 6,



        dialSize: 160,



        colGap: 20,



        rowGap: 20,



        bgImage: 'backgrounds/bg1.jpg',



        theme: 'light',



        cacheIcons: false



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



        renderBackgroundOptions();



        renderWorkspacesTabs();



        attachEventListeners();

        if (settings.cacheIcons) {
            requestIdleCallback(performIconCaching);
        }

    }

    async function performIconCaching() {
        let changed = false;
        const dials = workspaces[lastActiveWorkspace] || [];

        for (let i = 0; i < dials.length; i++) {
            // OPTIMIZATION #4: Yield control back to the browser
            // This pauses for 0ms, pushing the next iteration to the end of the event queue.
            // It allows the UI to remain responsive (clicks/scrolling) between icon conversions.
            await new Promise(resolve => setTimeout(resolve, 0));

            const dial = dials[i];

            // Check if it's a remote URL (not data:URI)
            if (dial.img && dial.img.startsWith('http')) {
                try {
                    const base64 = await faviconToDataURL(dial.img);
                    if (base64 && base64.startsWith('data:')) {
                        dial.img = base64;
                        changed = true;
                    }
                } catch (e) {
                    console.warn(`Could not cache icon for ${dial.name}`);
                }
            }
        }

        if (changed) {
            saveWorkspaces();
            console.log("All icons optimized to local cache.");
        }
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

        DOM.ctxEdit = document.getElementById('ctx-edit');

        DOM.ctxDelete = document.getElementById('ctx-delete');

        DOM.workspaceContextMenu = document.getElementById('workspace-context-menu');

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

        root.style.setProperty('--col-count', settings.colCount);

        root.style.setProperty('--dial-width', settings.dialSize + 'px');

        root.style.setProperty('--col-gap', settings.colGap + 'px');

        root.style.setProperty('--row-gap', settings.rowGap + 'px');

        root.style.setProperty('--bg-image', `url('${settings.bgImage}')`);



        DOM.colVal.textContent = DOM.colRange.value = settings.colCount;

        DOM.sizeVal.textContent = Math.round((settings.dialSize / 160) * 100) + '%';

        DOM.sizeRange.value = settings.dialSize;

        DOM.hGapVal.textContent = DOM.hGapRange.value = settings.colGap + 'px';

        DOM.vGapVal.textContent = DOM.vGapRange.value = settings.rowGap + 'px';



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

    }



    function saveSettings() {

        localStorage.setItem('mySettings', JSON.stringify(settings));

        applySettings();

    }



    // Optimized render using DocumentFragment

    function renderDials() {

        const items = document.querySelectorAll('.dial:not(#add-btn)');

        items.forEach(el => el.remove());



        const fragment = document.createDocumentFragment();



        const dials = getActiveDials();

        dials.forEach((dial, index) => {

            const div = document.createElement('a');

            div.className = 'dial';

            div.href = dial.url;

            div.draggable = true;

            div.dataset.index = index;



            // Cleaner template literal

            div.innerHTML = `

                        <img src="${dial.img}" loading="lazy" onerror="this.src='icons/icon128.png'" alt="${dial.name}">

                        <span>${dial.name}</span>

                    `;


            fragment.appendChild(div);

        });



        DOM.grid.insertBefore(fragment, DOM.addBtn);

    }



    // Context menu logic

    function showContextMenu(e, index) {

        contextIndex = index;

        DOM.contextMenu.style.display = 'block';

        DOM.contextMenu.style.left = e.pageX + 'px';

        DOM.contextMenu.style.top = e.pageY + 'px';

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

        if (settings.bgImage && settings.bgImage.startsWith('data:image')) {

            createBgThumb(settings.bgImage, true);

        }

    }



    function createBgThumb(src, isCustom = false) {

        const wrapper = document.createElement('div');

        wrapper.className = 'bg-wrapper';



        const img = document.createElement('img');

        img.src = src;

        img.className = 'bg-option';

        if (src === settings.bgImage) img.classList.add('selected');



        img.onclick = () => {

            settings.bgImage = src;

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

        DOM.addBtn.onclick = () => {

            editingIndex = -1;

            DOM.modalTitle.textContent = "Add New Website";

            clearInputs();

            DOM.addModal.style.display = 'flex';

        };



        DOM.cancelBtn.onclick = () => {

            DOM.addModal.style.display = 'none';

            clearInputs();

        };



        DOM.saveBtn.onclick = handleSave;



        // Context menu - hide on outside click

        document.addEventListener('click', (e) => {

            if (!DOM.contextMenu.contains(e.target)) {

                DOM.contextMenu.style.display = 'none';

            }

            if (!DOM.workspaceContextMenu.contains(e.target)) {

                DOM.workspaceContextMenu.style.display = 'none';

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

            if (contextIndex > -1) {

                const url = getActiveDials()[contextIndex].url;

                window.open(url, '_blank');

            }

            DOM.contextMenu.style.display = 'none';

        };

        // Context menu actions

        DOM.ctxEdit.onclick = () => {

            if (contextIndex > -1) {

                const dial = getActiveDials()[contextIndex];

                editingIndex = contextIndex;

                DOM.modalTitle.textContent = "Edit Website";

                DOM.urlInput.value = dial.url;

                DOM.nameInput.value = dial.name;

                DOM.imgInput.value = dial.img;

                DOM.addModal.style.display = 'flex';

            }

            DOM.contextMenu.style.display = 'none';

        };



        DOM.ctxDelete.onclick = () => {



            if (contextIndex > -1 && confirm(`Delete ${getActiveDials()[contextIndex].name}?`)) {



                getActiveDials().splice(contextIndex, 1);



                saveWorkspaces();



                renderDials();



            }



            DOM.contextMenu.style.display = 'none';



        };



        // Settings modal

        DOM.settingsBtn.onclick = () => DOM.settingsModal.style.display = 'flex';

        DOM.closeSettingsBtn.onclick = () => DOM.settingsModal.style.display = 'none';



        // Range inputs

        DOM.colRange.oninput = (e) => {

            settings.colCount = e.target.value;

            saveSettings();

        };

        DOM.sizeRange.oninput = (e) => {

            settings.dialSize = e.target.value;

            saveSettings();

        };

        DOM.hGapRange.oninput = (e) => {

            settings.colGap = e.target.value;

            saveSettings();

        };

        DOM.vGapRange.oninput = (e) => {

            settings.rowGap = e.target.value;

            saveSettings();

        };



        // Theme options

        DOM.themeOptions.onchange = (e) => {

            settings.theme = e.target.value;

            saveSettings();

        };



        // Cache icons toggle

        DOM.cacheIconsToggle.onchange = (e) => {

            settings.cacheIcons = e.target.checked;

            saveSettings();

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

        // Optimization #1: Delegated Events

        // 1. Drag Start
        DOM.grid.addEventListener('dragstart', (e) => {
            const dial = e.target.closest('.dial');
            if (!dial) return;
            dragSrcEl = dial;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', dial.innerHTML);
            dial.classList.add('dragging');
        });

        // 2. Drag Over
        DOM.grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        });

        // 3. Drop
        DOM.grid.addEventListener('drop', (e) => {
            const dial = e.target.closest('.dial'); // Identify which dial we are dropping ON
            if (!dial) return;

            e.stopPropagation();
            if (dragSrcEl !== dial) {
                const oldIndex = parseInt(dragSrcEl.dataset.index);
                const newIndex = parseInt(dial.dataset.index);

                const activeDials = getActiveDials();
                // Move the item in the array
                const item = activeDials.splice(oldIndex, 1)[0];
                activeDials.splice(newIndex, 0, item);

                saveWorkspaces();
                renderDials();
            }
            return false;
        });

        // 4. Drag End
        DOM.grid.addEventListener('dragend', (e) => {
            // Remove styling from the source element
            if (dragSrcEl) {
                dragSrcEl.classList.remove('dragging');
                dragSrcEl = null;
            }
        });

        // 5. Context Menu
        DOM.grid.addEventListener('contextmenu', (e) => {
            const dial = e.target.closest('.dial');
            if (!dial) return;
            e.preventDefault();
            const index = parseInt(dial.dataset.index);
            showContextMenu(e, index);
        });

    }



    function clearInputs() {



        DOM.nameInput.value = '';



        DOM.urlInput.value = '';



        DOM.imgInput.value = '';



    }







    async function faviconToDataURL(url) {
        try {
            // 1. Fetch the image. 
            // Note: This requires 'host_permissions' in manifest.json to work.
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');

            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');

                    // 2. Use the actual size of the image (e.g., 128x128)
                    // instead of forcing 32x32, so icons look sharp.
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    const dataURL = canvas.toDataURL('image/png');
                    URL.revokeObjectURL(objectURL);
                    resolve(dataURL);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectURL);
                    reject(new Error('Failed to load image'));
                };
                img.src = objectURL;
            });
        } catch (e) {
            console.warn(`Failed to cache icon from ${url}:`, e);
            // Fallback: Return original URL so it at least works while online
            return url;
        }
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







        if (settings.cacheIcons && img !== "icons/icon128.png") {



            img = await faviconToDataURL(img);



        }







        const dialData = { name, url, img };







        const activeDials = getActiveDials();



        if (editingIndex > -1) {



            activeDials[editingIndex] = dialData;



        } else {



            activeDials.push(dialData);



        }







        saveWorkspaces();



        renderDials();



        DOM.addModal.style.display = 'none';



        clearInputs();



    }

    function handleExport() {



        const data = { workspaces, lastActiveWorkspace, settings };



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



                if (data.workspaces && data.settings) { // New format



                    workspaces = data.workspaces;



                    lastActiveWorkspace = data.lastActiveWorkspace || 'Home';



                    settings = data.settings;



                    saveWorkspaces();



                    saveSettings();



                    renderDials();



                    applySettings();



                    renderBackgroundOptions();



                    renderWorkspacesTabs();



                    alert("Import successful!");



                } else if (data.dials && data.settings) { // Old format



                    workspaces['Home'] = data.dials;



                    lastActiveWorkspace = 'Home';



                    settings = data.settings;



                    saveWorkspaces();



                    saveSettings();



                    renderDials();



                    applySettings();



                    renderBackgroundOptions();



                    renderWorkspacesTabs();



                    alert("Old backup format imported successfully into 'Home' workspace!");



                }



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



                settings.bgImage = optimizedDataUrl;

                saveSettings();

                renderBackgroundOptions();

                applySettings();

            };

            img.src = event.target.result;

        };

        reader.readAsDataURL(file);

    }

})();
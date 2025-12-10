(function() {
    'use strict';

    const DOM = {
        grid: null, addBtn: null, addModal: null, modalTitle: null,
        nameInput: null, urlInput: null, imgInput: null, saveBtn: null, cancelBtn: null,
        contextMenu: null, ctxNewTab: null, ctxEdit: null, ctxDelete: null,
        settingsBtn: null, settingsModal: null, closeSettingsBtn: null,
        colRange: null, colVal: null, sizeRange: null, sizeVal: null,
        hGapRange: null, hGapVal: null, vGapRange: null, vGapVal: null,
        bgGrid: null, tabs: null, exportBtn: null, importTrigger: null, importFile: null, bgUpload: null
    };

    let editingIndex = -1;
    let contextIndex = -1;
    let dragSrcIndex = -1; 

    const defaultDials = [
        { name: "Google", url: "https://www.google.com", img: "icons/icon.png" }, 
        { name: "YouTube", url: "https://www.youtube.com", img: "icons/icon.png" }
    ];

    const backgrounds = ['backgrounds/bg1.jpg', 'backgrounds/bg2.jpg', 'backgrounds/bg3.jpg', 'backgrounds/bg4.jpg', 'backgrounds/bg5.jpg'];
    let dials = JSON.parse(localStorage.getItem('myDials')) || defaultDials;
    let settings = JSON.parse(localStorage.getItem('mySettings')) || { colCount: 6, dialSize: 160, colGap: 20, rowGap: 20, bgImage: 'backgrounds/bg1.jpg' };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        cacheDOMElements();
        applySettings();
        renderDials();
        renderBackgroundOptions();
        attachEventListeners();
    }

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
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--col-count', settings.colCount);
        root.style.setProperty('--dial-width', settings.dialSize + 'px');
        root.style.setProperty('--col-gap', settings.colGap + 'px');
        root.style.setProperty('--row-gap', settings.rowGap + 'px');
        DOM.colVal.textContent = DOM.colRange.value = settings.colCount;
        DOM.sizeVal.textContent = Math.round((settings.dialSize / 160) * 100) + '%';
        DOM.sizeRange.value = settings.dialSize;
        DOM.hGapVal.textContent = DOM.hGapRange.value = settings.colGap + 'px';
        DOM.vGapVal.textContent = DOM.vGapRange.value = settings.rowGap + 'px';
    }

    function saveSettings() {
        localStorage.setItem('mySettings', JSON.stringify(settings));
        applySettings();
    }

    function renderDials() {
        const items = document.querySelectorAll('.dial:not(#add-btn)');
        items.forEach(el => el.remove());

        const fragment = document.createDocumentFragment();

        dials.forEach((dial, index) => {
            const div = document.createElement('a');
            div.className = 'dial';
            div.href = dial.url;
            div.draggable = true;
            div.dataset.index = index; 

            // PERFORMANCE FIX: Removed loading="lazy"
            div.innerHTML = `
                <img src="${dial.img}" onerror="this.src='icons/icon.png'" alt="${dial.name}">
                <span>${dial.name}</span>
            `;
            fragment.appendChild(div);
        });

        DOM.grid.insertBefore(fragment, DOM.addBtn);
    }

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
            document.documentElement.style.setProperty('--bg-image', `url('${src}')`);
        };
        wrapper.appendChild(img);
        if (isCustom) {
            const delBtn = document.createElement('div');
            delBtn.className = 'bg-delete-btn';
            delBtn.textContent = 'X';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Remove custom background?')) {
                    settings.bgImage = 'backgrounds/bg1.jpg';
                    saveSettings();
                    renderBackgroundOptions();
                    document.documentElement.style.setProperty('--bg-image', `url('backgrounds/bg1.jpg')`);
                }
            };
            wrapper.appendChild(delBtn);
        }
        DOM.bgGrid.appendChild(wrapper);
    }

    function attachEventListeners() {
        // --- 1. EVENT DELEGATION (Efficient Listeners) ---
        DOM.grid.addEventListener('contextmenu', (e) => {
            const dial = e.target.closest('.dial');
            if (dial && !dial.classList.contains('add-btn')) {
                e.preventDefault();
                contextIndex = parseInt(dial.dataset.index);
                DOM.contextMenu.style.display = 'block';
                DOM.contextMenu.style.left = e.pageX + 'px';
                DOM.contextMenu.style.top = e.pageY + 'px';
            }
        });

        DOM.grid.addEventListener('dragstart', (e) => {
            const dial = e.target.closest('.dial');
            if (dial && !dial.classList.contains('add-btn')) {
                dragSrcIndex = parseInt(dial.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', dial.innerHTML); 
                dial.classList.add('dragging');
            }
        });

        DOM.grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        });

        DOM.grid.addEventListener('dragend', (e) => {
            const dial = e.target.closest('.dial');
            if(dial) dial.classList.remove('dragging');
            document.querySelectorAll('.dial').forEach(d => d.classList.remove('dragging'));
        });

        DOM.grid.addEventListener('drop', (e) => {
            e.stopPropagation();
            const targetDial = e.target.closest('.dial');
            if (targetDial && !targetDial.classList.contains('add-btn') && dragSrcIndex !== -1) {
                const targetIndex = parseInt(targetDial.dataset.index);
                if (dragSrcIndex !== targetIndex) {
                    const item = dials.splice(dragSrcIndex, 1)[0];
                    dials.splice(targetIndex, 0, item);
                    localStorage.setItem('myDials', JSON.stringify(dials));
                    renderDials();
                }
            }
            return false;
        });

        DOM.addBtn.onclick = () => {
            editingIndex = -1;
            DOM.modalTitle.textContent = "Add New Website";
            clearInputs();
            DOM.addModal.style.display = 'flex';
        };

        DOM.cancelBtn.onclick = () => { DOM.addModal.style.display = 'none'; clearInputs(); };
        DOM.saveBtn.onclick = handleSave;

        document.addEventListener('click', (e) => {
            if (!DOM.contextMenu.contains(e.target)) DOM.contextMenu.style.display = 'none';
        });

        DOM.ctxNewTab.onclick = () => {
            if (contextIndex > -1) window.open(dials[contextIndex].url, '_blank');
            DOM.contextMenu.style.display = 'none';
        };

        DOM.ctxEdit.onclick = () => {
            if (contextIndex > -1) {
                const dial = dials[contextIndex];
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
            if (contextIndex > -1 && confirm(`Delete ${dials[contextIndex].name}?`)) {
                dials.splice(contextIndex, 1);
                localStorage.setItem('myDials', JSON.stringify(dials));
                renderDials();
            }
            DOM.contextMenu.style.display = 'none';
        };

        DOM.settingsBtn.onclick = () => DOM.settingsModal.style.display = 'flex';
        DOM.closeSettingsBtn.onclick = () => DOM.settingsModal.style.display = 'none';

        DOM.colRange.oninput = (e) => { settings.colCount = e.target.value; saveSettings(); };
        DOM.sizeRange.oninput = (e) => { settings.dialSize = e.target.value; saveSettings(); };
        DOM.hGapRange.oninput = (e) => { settings.colGap = e.target.value; saveSettings(); };
        DOM.vGapRange.oninput = (e) => { settings.rowGap = e.target.value; saveSettings(); };

        DOM.tabs.forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            };
        });

        DOM.urlInput.oninput = function() {
            const val = this.value;
            if (!val) return;
            try {
                const urlObj = new URL(val.startsWith('http') ? val : `https://${val}`);
                let domain = urlObj.hostname.replace('www.', '');
                let name = domain.split('.')[0];
                name = name.charAt(0).toUpperCase() + name.slice(1);
                if (document.activeElement !== DOM.nameInput && !DOM.nameInput.value) {
                    DOM.nameInput.value = name;
                }
            } catch (e) {}
        };

        DOM.exportBtn.onclick = handleExport;
        DOM.importTrigger.onclick = () => DOM.importFile.click();
        DOM.importFile.onchange = handleImport;
        DOM.bgUpload.onchange = handleBgUpload;

        window.onclick = (e) => {
            if (e.target === DOM.addModal) DOM.addModal.style.display = 'none';
            if (e.target === DOM.settingsModal) DOM.settingsModal.style.display = 'none';
        };
    }

    async function handleSave() {
        const name = DOM.nameInput.value;
        let url = DOM.urlInput.value;
        let imgInput = DOM.imgInput.value;
        let finalImg = "icons/icon.png";

        if (!name || !url) return alert("Name and URL required!");
        if (!url.startsWith('http')) url = 'https://' + url;

        const originalBtnText = DOM.saveBtn.textContent;
        DOM.saveBtn.textContent = "Saving...";
        DOM.saveBtn.disabled = true;

        try {
            if (imgInput) {
                finalImg = await convertUrlToBase64(imgInput) || imgInput;
            } else {
                try {
                    const domain = new URL(url).hostname;
                    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                    const cached = await convertUrlToBase64(googleUrl);
                    finalImg = cached || googleUrl;
                } catch (e) {
                    console.error("Favicon error", e);
                }
            }

            const dialData = { name, url, img: finalImg };

            if (editingIndex > -1) {
                dials[editingIndex] = dialData;
            } else {
                dials.push(dialData);
            }

            localStorage.setItem('myDials', JSON.stringify(dials));
            renderDials();
            DOM.addModal.style.display = 'none';
            clearInputs();

        } catch (err) {
            console.error("Save failed", err);
            alert("Error saving. Check console.");
        } finally {
            DOM.saveBtn.textContent = originalBtnText;
            DOM.saveBtn.disabled = false;
        }
    }

    async function convertUrlToBase64(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn("Could not cache image (CORS or Network):", url);
            return null; 
        }
    }

    function clearInputs() {
        DOM.nameInput.value = ''; DOM.urlInput.value = ''; DOM.imgInput.value = '';
    }

    function handleExport() {
        const data = { dials, settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'lightning-links-backup.json';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (data.dials && data.settings) {
                    dials = data.dials; settings = data.settings;
                    localStorage.setItem('myDials', JSON.stringify(dials));
                    localStorage.setItem('mySettings', JSON.stringify(settings));
                    renderDials(); applySettings(); renderBackgroundOptions();
                    alert("Import successful!");
                }
            } catch (err) { alert("Error reading file."); }
        };
        reader.readAsText(file);
    }

    function handleBgUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 1920, MAX_HEIGHT = 1080;
                let width = img.width, height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const optimizedDataUrl = canvas.toDataURL('image/webp', 0.8);
                settings.bgImage = optimizedDataUrl;
                saveSettings(); renderBackgroundOptions();
                document.documentElement.style.setProperty('--bg-image', `url('${optimizedDataUrl}')`);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
})();
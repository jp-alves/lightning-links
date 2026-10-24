// ui/folder-panel.js - The opened folder: a frosted panel that zooms out of the folder's grid cell
(function (root) {
    'use strict';

    const DURATION = 240;
    const EASING = 'cubic-bezier(.2, .7, .3, 1)';

    let els = null;
    let state = null; // { folder, opts }

    function $(id) {
        return document.getElementById(id);
    }

    function init() {
        if (els) return;
        els = {
            layer: $('folder-layer'),
            backdrop: $('folder-backdrop'),
            wrap: $('folder-wrap'),
            name: $('folder-name'),
            grid: $('folder-grid')
        };
        els.backdrop.addEventListener('click', () => close());
        window.addEventListener('resize', () => {
            if (state) requestAnimationFrame(() => state && render());
        });
        document.addEventListener('keydown', (e) => {
            // Esc during a drag cancels the drag only; with a dialog open on top, it's not ours
            const dialogOpen = [...document.querySelectorAll('.modal')].some(m => m.style.display === 'flex');
            if (e.key === 'Escape' && state && !dialogOpen && !els.grid.classList.contains('drag-active')) close();
        });
        els.name.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') els.name.blur();
        });
        els.name.addEventListener('change', () => {
            if (!state) return;
            const name = els.name.value.trim();
            if (name) state.opts.onRename(name);
            else els.name.value = state.folder.name;
        });
        els.grid.addEventListener('click', (e) => {
            if (!state) return;
            if (e.target.closest('.folder-add')) {
                state.opts.onAdd();
                return;
            }
            // Opening a site from the folder closes it (the page navigates, or a new tab opens)
            if (e.target.closest('a.dial') && !e.defaultPrevented) close(true);
        });
    }

    function render() {
        const { folder, opts } = state;
        const frag = document.createDocumentFragment();
        folder.items.forEach((dial, i) => frag.appendChild(opts.renderItem(dial, i)));
        const add = document.createElement('div');
        add.className = 'dial add-btn folder-add';
        add.dataset.key = 'add';
        add.setAttribute('role', 'button');
        add.setAttribute('aria-label', 'Add website to this folder');
        add.tabIndex = 0;
        add.innerHTML = '<div class="icon"><svg class="sym"><use href="#i-plus"/></svg></div><span aria-hidden="true">&nbsp;</span>';
        frag.appendChild(add);
        els.grid.replaceChildren(frag);

        const v = opts.layout();
        // Never wider than the window: panel padding (2 x 22px) + grid padding (2 x 6px) + page margin
        const dial = parseFloat(v.dialWidth);
        const gap = parseFloat(v.colGap);
        const fitCols = Math.max(1, Math.floor((window.innerWidth - 40 - 56 + gap) / (dial + gap)));
        const style = els.grid.style;
        style.setProperty('--col-count', Math.min(folder.items.length + 1, v.cols, fitCols));
        style.setProperty('--dial-width', v.dialWidth);
        style.setProperty('--col-gap', v.colGap);
        style.setProperty('--row-gap', v.rowGap);
    }

    // Transform that maps the panel onto the folder's grid cell
    function zoomFrom(folderEl) {
        const from = folderEl.getBoundingClientRect();
        const to = els.wrap.getBoundingClientRect();
        const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        return `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    }

    // opts: { renderItem(dial, i), onRename(name), onAdd(), onClose(), getFolderEl(), layout() -> {cols, dialWidth, colGap, rowGap} }
    function open(folderEl, folder, opts) {
        init();
        state = { folder, opts };
        els.name.value = folder.name;
        render();
        els.layer.hidden = false;
        if (LL.flip.reducedMotion()) return;
        els.wrap.animate(
            [{ transform: zoomFrom(folderEl), opacity: 0 }, { transform: 'none', opacity: 1 }],
            { duration: DURATION, easing: EASING }
        );
        els.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }

    function refresh(folder) {
        if (!state) return;
        state.folder = folder;
        els.name.value = folder.name;
        render();
    }

    // instant: skip the zoom (e.g. the page is navigating away)
    function close(instant = false) {
        if (!state) return;
        const { opts } = state;
        state = null;
        const done = () => {
            if (state) return; // re-opened while closing
            els.layer.hidden = true;
            els.grid.replaceChildren();
        };
        const folderEl = opts.getFolderEl();
        if (instant || !folderEl || LL.flip.reducedMotion()) {
            done();
        } else {
            els.wrap.animate(
                [{ transform: 'none', opacity: 1 }, { transform: zoomFrom(folderEl), opacity: 0 }],
                { duration: 200, easing: EASING, fill: 'forwards' }
            ).onfinish = (e) => { done(); e.target.cancel(); };
            els.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out', fill: 'forwards' })
                .onfinish = (e) => e.target.cancel();
        }
        opts.onClose();
    }

    function focusName() {
        init();
        els.name.focus();
        els.name.select();
    }

    (root.LL = root.LL || {}).folderPanel = {
        open, refresh, close, focusName,
        isOpen: () => !!state,
        gridEl: () => { init(); return els.grid; },
        panelEl: () => { init(); return els.wrap; }
    };
})(self);

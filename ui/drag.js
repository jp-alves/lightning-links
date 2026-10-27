// ui/drag.js - Pointer-based drag & drop with sliding reorder and hold-to-group
(function (root) {
    'use strict';

    const START_DISTANCE = 5;
    // The gap moves only once the pointer settles, so sweeping towards a lightning's
    // center (to make a folder) doesn't push that lightning away first
    const REORDER_DELAY = 200;
    const SLIDE = 'transform 200ms cubic-bezier(.2, .7, .3, 1)';
    const EDGE = 40;        // px from a scrollable grid's edge that starts auto-scroll
    const EDGE_SPEED = 10;  // px per frame

    // opts: { itemSelector, onReorder(from, to), onGroup(from, target), canGroup(from, target) -> bool, onDragStart(),
    //         onDragOutside(from, x, y, event) -> bool (true = drag handed elsewhere), boundsEl, holdMs }
    function attach(container, opts) {
        const holdMs = opts.holdMs ?? 400;
        let press = null;   // pointerdown candidate
        let drag = null;    // active drag state
        let suppressClick = false;
        let canceledPointer = false; // Esc pressed mid-drag: the coming release must not click

        const items = () => [...container.querySelectorAll(opts.itemSelector)];
        const toRect = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });

        function onPointerDown(e) {
            if (e.button !== 0 || drag) return;
            const el = e.target.closest(opts.itemSelector);
            if (!el || !container.contains(el)) return;
            press = { el, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
        }

        // The item being dragged is drawn as a floating copy on <body>, so a scrolling,
        // clipping grid never hides it; the real item stays (invisible) in its slot
        function makeGhost(el, rect) {
            const ghost = el.cloneNode(true);
            ghost.removeAttribute('data-key');
            ghost.classList.add('drag-ghost', 'dragging');
            ghost.style.setProperty('--lightning-width', getComputedStyle(container).getPropertyValue('--lightning-width'));
            Object.assign(ghost.style, {
                left: rect.left + 'px', top: rect.top + 'px',
                width: rect.width + 'px', height: rect.height + 'px'
            });
            document.body.appendChild(ghost);
            return ghost;
        }

        // grab: pointer offset inside the item; defaults to where it was pressed
        function start(e, grab) {
            const all = items();
            const from = all.indexOf(press.el);
            const slots = all.map(el => toRect(el.getBoundingClientRect()));
            const others = all.filter(el => el !== press.el);
            drag = {
                el: press.el, from, slots, others,
                home: slots[from],
                ghost: makeGhost(press.el, slots[from]),
                scroll0: container.scrollTop,
                x: e.clientX, y: e.clientY, frame: 0,
                offsetX: grab ? grab.x : press.x - slots[from].left,
                offsetY: grab ? grab.y : press.y - slots[from].top,
                gap: from,             // insert position among `others`
                holdTarget: -1, holdTimer: 0, groupTarget: -1,
                pendingGap: -1, pendingTimer: 0
            };
            press = null;
            drag.el.setPointerCapture(e.pointerId);
            drag.el.classList.add('drag-source');
            container.classList.add('drag-active');
            others.forEach(el => { el.style.transition = SLIDE; });
            if (opts.onDragStart) opts.onDragStart();
            drag.frame = requestAnimationFrame(autoScroll);
        }

        // Near the top/bottom edge of a scrolling grid, keep scrolling while dragging
        function autoScroll() {
            if (!drag) return;
            const box = container.getBoundingClientRect();
            let dy = 0;
            if (drag.y < box.top + EDGE) dy = -EDGE_SPEED;
            else if (drag.y > box.bottom - EDGE) dy = EDGE_SPEED;
            if (dy && container.scrollHeight > container.clientHeight) {
                const before = container.scrollTop;
                container.scrollTop += dy;
                if (container.scrollTop !== before) move({ clientX: drag.x, clientY: drag.y });
            }
            drag.frame = requestAnimationFrame(autoScroll);
        }

        // Slot rects were measured at drag start; follow the grid's scroll since then
        function shifted(r) {
            const dy = container.scrollTop - drag.scroll0;
            return dy ? { ...r, top: r.top - dy, bottom: r.bottom - dy } : r;
        }

        // Where `others[j]` sits while the gap is at `gap`
        function slotOf(j) {
            return shifted(drag.slots[j < drag.gap ? j : j + 1]);
        }

        // Insert position judged against what the user sees right now
        function gapAt(x, y) {
            return LL.dragmath.insertIndex(drag.others.map((_, j) => slotOf(j)), x, y);
        }

        function layoutOthers() {
            drag.others.forEach((el, j) => {
                const home = drag.slots[j < drag.from ? j : j + 1];
                const to = drag.slots[j < drag.gap ? j : j + 1];
                el.style.transform = `translate(${to.left - home.left}px, ${to.top - home.top}px)`;
            });
        }

        function clearPending() {
            clearTimeout(drag.pendingTimer);
            drag.pendingGap = -1;
        }

        function clearHold() {
            clearTimeout(drag.holdTimer);
            if (drag.groupTarget > -1) drag.others[drag.groupTarget].classList.remove('group-target');
            drag.holdTarget = drag.groupTarget = -1;
        }

        function move(e) {
            const x = e.clientX, y = e.clientY;
            drag.x = x;
            drag.y = y;
            drag.ghost.style.transform = `translate(${x - drag.offsetX - drag.home.left}px, ${y - drag.offsetY - drag.home.top}px) scale(1.05)`;

            if (opts.onDragOutside) {
                const box = (opts.boundsEl || container).getBoundingClientRect();
                const outside = x < box.left || x > box.right || y < box.top || y > box.bottom;
                if (outside && opts.onDragOutside(drag.from, x, y, e)) {
                    finish(false, true);
                    return;
                }
            }

            // Hovering the center of another item holds the layout still and arms grouping
            const target = drag.others.findIndex((el, j) => {
                const r = slotOf(j);
                return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            });
            const groupable = target > -1 && (!opts.canGroup || opts.canGroup(drag.from, target < drag.from ? target : target + 1));
            if (groupable && LL.dragmath.zone(slotOf(target), x, y) === 'center') {
                clearPending();
                if (drag.holdTarget !== target) {
                    clearHold();
                    drag.holdTarget = target;
                    drag.holdTimer = setTimeout(() => {
                        drag.groupTarget = target;
                        drag.others[target].classList.add('group-target');
                    }, holdMs);
                }
                return;
            }
            clearHold();

            // Only an item's edge zone (or the space after the last item) moves the gap;
            // empty space between items keeps the layout still
            const gap = gapAt(x, y);
            if (target === -1 && gap !== drag.others.length) {
                clearPending();
                return;
            }
            if (gap === drag.gap) {
                clearPending();
            } else if (gap !== drag.pendingGap) {
                clearPending();
                drag.pendingGap = gap;
                drag.pendingTimer = setTimeout(() => {
                    drag.gap = gap;
                    drag.pendingGap = -1;
                    layoutOthers();
                }, REORDER_DELAY);
            }
        }

        // commit: apply the result; handedOff: another container continues the drag
        function finish(commit, handedOff = false, x, y) {
            const d = drag;
            const groupTarget = d.groupTarget;
            // Dropping before the gap settled still lands where the pointer is
            if (commit && d.groupTarget === -1 && x !== undefined) {
                const onCenter = d.holdTarget > -1;
                if (!onCenter) d.gap = gapAt(x, y);
            }
            clearPending();
            clearHold();
            cancelAnimationFrame(d.frame);
            drag = null;
            container.classList.remove('drag-active');
            const dropRect = d.ghost.getBoundingClientRect();
            const reset = () => {
                d.ghost.remove();
                d.el.classList.remove('drag-source');
                d.others.forEach(el => { el.style.transition = ''; el.style.transform = ''; });
            };
            if (handedOff) {
                reset();
                return;
            }
            if (!commit) {
                // Glide everything back home
                const home = d.el.getBoundingClientRect();
                d.ghost.style.transition = SLIDE;
                d.ghost.style.transform = `translate(${home.left - d.home.left}px, ${home.top - d.home.top}px)`;
                d.others.forEach(el => { el.style.transform = ''; });
                setTimeout(reset, 220);
                return;
            }
            const key = d.el.dataset.key;
            const toIndex = (j) => (j < d.from ? j : j + 1);
            reset();
            if (groupTarget > -1) {
                opts.onGroup(d.from, toIndex(groupTarget));
            } else if (d.gap !== d.from) {
                opts.onReorder(d.from, d.gap);
            }
            // Settle the dropped item from where it was let go into its new place
            const placed = key && container.querySelector(`[data-key="${CSS.escape(key)}"]`);
            if (placed && !LL.flip.reducedMotion()) {
                const now = placed.getBoundingClientRect();
                placed.animate([
                    { transform: `translate(${dropRect.left - now.left}px, ${dropRect.top - now.top}px)` },
                    { transform: 'none' }
                ], { duration: 200, easing: 'cubic-bezier(.2, .7, .3, 1)' });
            }
        }

        function onPointerMove(e) {
            // The button was released somewhere we never heard about: forget the press
            if (!(e.buttons & 1)) {
                press = null;
                if (drag) finish(false);
                return;
            }
            if (press && !drag) {
                if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < START_DISTANCE) return;
                start(e);
            }
            if (drag) move(e);
        }

        // Swallow only the click that immediately follows a drag
        function suppressNextClick() {
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 0);
        }

        function onPointerUp(e) {
            press = null;
            if (canceledPointer) {
                canceledPointer = false;
                suppressNextClick();
                return;
            }
            if (!drag) return;
            suppressNextClick();
            // Letting go outside the grid cancels, like v1.0
            const box = (opts.boundsEl || container).getBoundingClientRect();
            const inside = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
            finish(inside, false, e.clientX, e.clientY);
        }

        function onPointerCancel() {
            press = null;
            if (drag) finish(false);
        }

        function onKeyDown(e) {
            if (e.key === 'Escape' && drag) {
                canceledPointer = true;
                finish(false);
            }
        }

        // A drag must not also count as a click (which would open the site)
        function onClick(e) {
            if (suppressClick) {
                suppressClick = false;
                e.preventDefault();
                e.stopPropagation();
            }
        }

        const preventNative = (e) => e.preventDefault();

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerCancel);
        container.addEventListener('click', onClick, true);
        container.addEventListener('dragstart', preventNative);
        document.addEventListener('keydown', onKeyDown);

        return {
            // Continue a drag that started elsewhere (e.g. a lightning dragged out of a folder)
            begin(el, e) {
                if (drag) return;
                const r = el.getBoundingClientRect();
                press = { el, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
                start(e, { x: r.width / 2, y: r.height / 2 });
                move(e);
            },
            detach() {
                container.removeEventListener('pointerdown', onPointerDown);
                container.removeEventListener('pointermove', onPointerMove);
                container.removeEventListener('pointerup', onPointerUp);
                container.removeEventListener('pointercancel', onPointerCancel);
                container.removeEventListener('click', onClick, true);
                container.removeEventListener('dragstart', preventNative);
                document.removeEventListener('keydown', onKeyDown);
            }
        };
    }

    (root.LL = root.LL || {}).drag = { attach };
})(self);

// ui/drag.js - Pointer-based drag & drop with sliding reorder and hold-to-group
(function (root) {
    'use strict';

    const START_DISTANCE = 5;
    // The gap moves only once the pointer settles, so sweeping towards a dial's
    // centre (to make a folder) doesn't push that dial away first
    const REORDER_DELAY = 200;
    const SLIDE = 'transform 200ms cubic-bezier(.2, .7, .3, 1)';

    // opts: { itemSelector, onReorder(from, to), onGroup(from, target), onDragOutside(from, x, y) -> bool, holdMs }
    function attach(container, opts) {
        const holdMs = opts.holdMs ?? 400;
        let press = null;   // pointerdown candidate
        let drag = null;    // active drag state
        let suppressClick = false;
        let cancelledPointer = false; // Esc pressed mid-drag: the coming release must not click

        const items = () => [...container.querySelectorAll(opts.itemSelector)];
        const toRect = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });

        function onPointerDown(e) {
            if (e.button !== 0 || drag) return;
            const el = e.target.closest(opts.itemSelector);
            if (!el || !container.contains(el)) return;
            press = { el, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
        }

        function start(e) {
            const all = items();
            const from = all.indexOf(press.el);
            const slots = all.map(el => toRect(el.getBoundingClientRect()));
            const others = all.filter(el => el !== press.el);
            drag = {
                el: press.el, from, slots, others,
                home: slots[from],
                offsetX: press.x - slots[from].left,
                offsetY: press.y - slots[from].top,
                gap: from,             // insert position among `others`
                holdTarget: -1, holdTimer: 0, groupTarget: -1,
                pendingGap: -1, pendingTimer: 0
            };
            press = null;
            drag.el.setPointerCapture(e.pointerId);
            drag.el.classList.add('dragging');
            container.classList.add('drag-active');
            others.forEach(el => { el.style.transition = SLIDE; });
        }

        // Where `others[j]` sits while the gap is at `gap`
        function slotOf(j) {
            return drag.slots[j < drag.gap ? j : j + 1];
        }

        // Insert position judged against what the user sees right now
        function gapAt(x, y) {
            return LL.dragmath.insertIndex(drag.others.map((_, j) => slotOf(j)), x, y);
        }

        function layoutOthers() {
            drag.others.forEach((el, j) => {
                const home = drag.slots[j < drag.from ? j : j + 1];
                const to = slotOf(j);
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
            drag.el.style.transform = `translate(${x - drag.offsetX - drag.home.left}px, ${y - drag.offsetY - drag.home.top}px) scale(1.05)`;

            if (opts.onDragOutside) {
                const box = container.getBoundingClientRect();
                const outside = x < box.left || x > box.right || y < box.top || y > box.bottom;
                if (outside && opts.onDragOutside(drag.from, x, y, e)) {
                    finish(false, true);
                    return;
                }
            }

            // Hovering the centre of another item holds the layout still and arms grouping
            const target = drag.others.findIndex((el, j) => {
                const r = slotOf(j);
                return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            });
            if (target > -1 && LL.dragmath.zone(slotOf(target), x, y) === 'centre') {
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
            // Dropping before the gap settled still lands where the pointer is
            if (commit && d.groupTarget === -1 && x !== undefined) {
                const onCentre = d.holdTarget > -1;
                if (!onCentre) d.gap = gapAt(x, y);
            }
            clearPending();
            clearHold();
            drag = null;
            container.classList.remove('drag-active');
            const dropRect = d.el.getBoundingClientRect();
            const reset = () => {
                d.el.classList.remove('dragging');
                d.el.style.transform = '';
                d.others.forEach(el => { el.style.transition = ''; el.style.transform = ''; });
            };
            if (handedOff) {
                reset();
                return;
            }
            if (!commit) {
                // Glide everything back home
                d.el.style.transition = SLIDE;
                d.el.style.transform = '';
                d.others.forEach(el => { el.style.transform = ''; });
                setTimeout(() => { d.el.style.transition = ''; reset(); }, 220);
                return;
            }
            const key = d.el.dataset.key;
            const toIndex = (j) => (j < d.from ? j : j + 1);
            reset();
            if (d.groupTarget > -1) {
                opts.onGroup(d.from, toIndex(d.groupTarget));
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
            if (cancelledPointer) {
                cancelledPointer = false;
                suppressNextClick();
                return;
            }
            if (!drag) return;
            suppressNextClick();
            finish(true, false, e.clientX, e.clientY);
        }

        function onKeyDown(e) {
            if (e.key === 'Escape' && drag) {
                cancelledPointer = true;
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
        container.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('click', onClick, true);
        container.addEventListener('dragstart', preventNative);
        document.addEventListener('keydown', onKeyDown);

        return {
            detach() {
                container.removeEventListener('pointerdown', onPointerDown);
                container.removeEventListener('pointermove', onPointerMove);
                container.removeEventListener('pointerup', onPointerUp);
                container.removeEventListener('pointercancel', onPointerUp);
                container.removeEventListener('click', onClick, true);
                container.removeEventListener('dragstart', preventNative);
                document.removeEventListener('keydown', onKeyDown);
            }
        };
    }

    (root.LL = root.LL || {}).drag = { attach };
})(self);

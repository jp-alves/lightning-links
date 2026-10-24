# Lightning Links v1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.1 of the Lightning Links new-tab extension: incognito and copy-link menu items, iPhone-style folders, working offline icons, faster startup, smooth animations, truthful size and spacing sliders, and auto-fit to the window.

**Architecture:** Keep the zero-dependency, no-build, unpacked-extension shape.
- Pure logic moves into small `lib/*.js` files. Each one is a classic script that sets `window.LL.<name>` in the browser and `module.exports` in Node, so it can be unit-tested with `node --test` (built into Node 24, no packages).
- DOM-heavy pieces (drag controller, folder panel) live in `ui/*.js` and talk to `script.js` through callbacks.
- `script.js` stays the app shell: state, storage, rendering, menus and settings.

**Tech Stack:** Manifest V3 Chrome extension; vanilla ES2020 JS, HTML and CSS; Node 24 `node:test` for unit tests; headless `google-chrome` for screenshot smoke checks.

**Spec:** `docs/superpowers/specs/2026-10-24-lightning-links-v1.1-design.md`. Read it before every task, because section numbers (§1–§8) below refer to it.

## Global Constraints

- No dependencies, frameworks, `package.json`, or build step. Files load directly via `<script>` tags.
- No network calls other than fetching icons. No analytics.
- Must not delay first paint or cause a white or black flash. Dials must never move unless the user moves them or auto-fit reflows them.
- Motion uses only `transform` and `opacity`, with ease-out curves of 150–250 ms and no overshoot. Under `prefers-reduced-motion: reduce`, durations are about 0.
- Existing data must keep working: `localStorage` keys `myWorkspaces`, `mySettings`, `lastActiveWorkspace`, the legacy `myDials`, and v1.0 export files in both the `{workspaces, settings}` and `{dials, settings}` formats.
- Settings values from v1.0 may be **strings** (range inputs stored `e.target.value`). Always use `Number(...)`.
- Both light mode and `.dark-mode` must look right for every new UI piece.
- No nested folders. An item without `type` is a dial `{name, url, img}`; a folder is `{type:'folder', id, name, items:[dial…]}`.
- Never build dial or folder DOM with `innerHTML` interpolation of user data; use `textContent` and attributes.
- `lib/` module pattern (copy exactly):
  ```js
  (function (root) {
      'use strict';
      const api = { /* functions */ };
      if (typeof module === 'object' && module.exports) module.exports = api;
      else (root.LL = root.LL || {}).NAME = api;
  })(typeof self !== 'undefined' ? self : this);
  ```
- Test command for everything: `node --test tests/`.
- Smoke screenshot command:
  - Start a server: `python3 -m http.server 8765 --directory /home/joao/Documents/lightning-links >/dev/null 2>&1 &`
  - Take the screenshot: `google-chrome --headless=new --disable-gpu --screenshot=/tmp/claude-1000/ll-<name>.png --window-size=<W>,<H> http://localhost:8765/newtab.html`
  - Then view the PNG. Outside the extension, `chrome.*` APIs are absent, so code that uses them must guard with `typeof chrome !== 'undefined' && chrome.<api>`.

## Review Focus

1. **Dial names or URLs containing `<`, `"`, `&`, or emoji** should render literally and never execute or break markup. This is pinned in Task 9 with a manual check, plus the Global Constraint on `innerHTML`.
2. **`localStorage` quota exceeded** while saving icons or a large custom background: existing workspaces must stay intact and the user should see "Storage full". This is pinned in Task 4 (`saveCache` with a throwing storage) and Task 5 (background upload).
3. **A v1.0 export or saved state with string numbers** (`"colCount":"6"`) and dial `img` values that are already `data:` URLs should import and lay out correctly. This is pinned in Task 3 (`normalizeImport`) and Task 6 (`computeFit` with string input).
4. **Extreme counts:** an empty workspace (only the "+" button), 1 item, and 120 items in a 600×400 window should give sensible layouts with no sideways scroll. This is pinned in Task 6's tests.
5. **An icon URL returning a non-image or an error** (404, HTML page, redirect to a non-CORS host without permission) should count as failed, leave the dial showing the original `img`, and continue with the next icon. This is pinned in Task 4 (`cacheIcons` with a fake fetch).

---

### Task 1: Groundwork — commit spec, remove blank-line bloat, test harness

**Files:**
- Modify: `script.js` (whitespace only), `.gitignore`
- Create: `tests/harness.test.js`
- Commit: `docs/superpowers/specs/…`, `docs/superpowers/plans/…`

- [ ] **Step 1:** Collapse runs of blank lines in `script.js` to at most one blank line, and keep the code byte-identical otherwise.
  Run: `python3 - <<'EOF'
import re;p='script.js';s=open(p).read();open(p,'w').write(re.sub(r'\n(\s*\n){2,}', '\n\n', s))
EOF`
  Verify: `git diff -w --stat script.js` shows only whitespace changes (`git diff -w` should be empty, or show only blank-line removals).
- [ ] **Step 2:** Create `tests/harness.test.js` containing one test, `harness runs`, that asserts `1 === 1`. Run `node --test tests/` and expect `pass 1`.
- [ ] **Step 3:** Load the page in the smoke-screenshot setup at 1600×900 and check that the two default dials render. This is the visual baseline.
- [ ] **Step 4:** Commit: `git add -A docs .gitignore script.js tests && git commit -m "chore: v1.1 spec/plan, strip blank lines, add node test harness"`. Leave out `.impeccable/` and `.superpowers/`, and add both to `.gitignore`.

### Task 2: Truthful sizing and spacing (§7)

**Files:**
- Modify: `styles.css` (`.container`, `.dial`, `.dial span`), `script.js` (`applySettings`, range handlers), `newtab.html` (size slider label)

**Interfaces:**
- Produces: CSS variables `--col-count`, `--dial-width`, `--col-gap` and `--row-gap` now mean literal values. Task 6 overrides them **on `#dial-grid`'s inline style** (not `:root`).
- Produces: `function applyLayoutVars()` in `script.js`. It writes the four variables to `DOM.grid.style` from the current settings. Task 6 replaces its body with auto-fit output.

- [ ] **Step 1:** In `.container`, use these grid styles:
  - `grid-template-columns: repeat(var(--col-count), var(--dial-width)); justify-content: center;`
  - Remove the `width: 85%` and `max-width: 1600px` rules; use `max-width: calc(100vw - 40px)`.
  - Keep `max-height: 90vh; overflow-y: auto`.
  - On `.dial`, remove `max-width` and `margin: 0 auto` (width comes from the column).
- [ ] **Step 2:** Make `.dial span` use `font-size: clamp(11px, calc(var(--dial-width) * 0.085), 16px)`, which gives about 13.6 px at 160.
- [ ] **Step 3:** In `applySettings`:
  - Write the range `.value`s as plain numbers and the label text with `px`. That is, `DOM.hGapRange.value = settings.colGap; DOM.hGapVal.textContent = settings.colGap + 'px'`, and the same for vertical spacing.
  - The size label stays a percentage of 160; change the slider to `min="80" max="300"` so the label's 50–188% is honest.
  - Move the four `setProperty` calls into `applyLayoutVars()`.
- [ ] **Step 4:** Make range handlers set the setting with `Number(e.target.value)` and call `applySettings()` on `input` without writing storage. They persist with `localStorage.setItem('mySettings', …)` on `change`. Make `saveSettings()` keep doing both.
- [ ] **Step 5 (no sideways scroll, auto-fit off, §7):**
  - In `applyLayoutVars`, if `cols*dial + (cols-1)*gap > innerWidth − 40`, scale the dial and the gap down by the ratio, keeping the same columns.
  - Use `LL.layout.computeFit` with `autoFit:false` once Task 6 lands. For now, inline the one-line ratio.
- [ ] **Step 6:** Verify with smoke screenshots at 1600×900 and at 900×900 that the dials are exactly the set size, the gaps change when the setting changes, and there is no horizontal scrollbar.
  Then, in Chrome: open Settings, move both spacing sliders, close and reopen, and check that each thumb is where you left it.
- [ ] **Step 7:** Commit: `fix: dial size and spacing sliders render literal values`.

### Task 3: Item model and import normalisation (pure)

**Files:**
- Create: `lib/model.js`, `tests/model.test.js`
- Modify: `newtab.html` (add `<script src="lib/model.js">` before `script.js`), `script.js` (`handleImport` uses `normalizeImport`)

**Interfaces (`LL.model`):**
- `isFolder(item) → boolean`
- `forEachDial(workspaces, fn(dial, workspaceName))`: visits every dial, including dials inside folders.
- `moveItem(items, from, to) → void`: moves the item in place.
- `createFolder(items, dragIdx, targetIdx, id) → folder`: removes both and inserts `{type:'folder', id, name:'Folder', items:[target, dragged]}` at the target's original position, adjusted for the removal.
- `addToFolder(items, dragIdx, folderIdx) → void`: appends the dragged dial to the folder.
- `removeFromFolder(items, folderIdx, childIdx, insertAt) → void`: moves the child to the top level at `insertAt` (index after removal), then runs `normalize`.
- `ungroup(items, folderIdx) → void`: puts the folder's items in its place, in order.
- `normalize(items) → void`: a folder with 1 item becomes that dial; a folder with 0 items is removed.
- `normalizeImport(data) → {workspaces, lastActiveWorkspace, settings} | null`: accepts both v1.0 formats and v1.1 (which may also carry `iconCache` and `bgImage`, passed through as `data.iconCache` and `data.bgImage`); coerces numeric settings with `Number`; returns `null` when neither format matches.

- [ ] **Step 1: Write the failing tests** in `tests/model.test.js` (`require('../lib/model.js')`):
  - `createFolder` with `[A,B,C]`, drag 0 onto 2: gives `[B, F]`, where `F.items` is `[C, A]` and `F.name` is `'Folder'`.
  - `createFolder` with `[A,B,C]`, drag 2 onto 0: gives `[F, B]`, where `F.items` is `[A, C]`.
  - `addToFolder` with `[A, F{X}]`, dragging 0 to 1: gives `[F{X,A}]`.
  - `removeFromFolder` with `[F{X,Y}, B]`, folder 0, child 0, insertAt 1: gives `[Y, X, B]`. F dissolves because one item is left (Y stays at F's spot), and X goes in at index 1.
  - `ungroup` with `[A, F{X,Y}, B]` at 1: gives `[A, X, Y, B]`.
  - `normalize` removes `F{}` and turns `F{X}` into `X`.
  - `forEachDial` over `{Home:[A, F{X}], Work:[B]}` visits A, X, B with the workspace names.
  - `normalizeImport({dials:[A], settings:{colCount:'6'}})` gives `workspaces.Home` equal to `[A]` and `settings.colCount === 6`.
  - `normalizeImport({workspaces:{W:[A]}, settings:{}, lastActiveWorkspace:'W'})` passes through.
  - `normalizeImport({foo:1})` returns `null`.
- [ ] **Step 2:** Run `node --test tests/` and expect FAIL (module not found).
- [ ] **Step 3:** Implement `lib/model.js` using the Global Constraints module pattern, with NAME `model`.
- [ ] **Step 4:** Run `node --test tests/` and expect PASS.
- [ ] **Step 5:** Make `handleImport` call `LL.model.normalizeImport` (one path instead of two duplicated branches). Alert "Error reading file." on `null`.
  Check manually: import a v1.0 export (`{workspaces, settings}`), and a hand-made `{dials, settings}` file.
- [ ] **Step 6:** Commit: `feat: item model with folder ops and import normalisation`.

### Task 4: Offline icons (§4)

**Files:**
- Create: `lib/iconcache.js`, `tests/iconcache.test.js`
- Modify: `manifest.json`, `newtab.html` (status line under the Cache Icons toggle: `<div class="sub-label" id="icon-cache-status"></div>`; script tag), `script.js` (`init`, toggle handler, `handleSave`, `renderDials`, `handleExport`, `handleImport`; delete `performIconCaching` and `faviconToDataURL`)

**Interfaces (`LL.iconcache`):**
- `KEY = 'iconCache'`
- `loadCache(storage) → Object<string,string>`: returns `{}` on missing or corrupt data.
- `saveCache(storage, cache) → boolean`: returns `false` on a quota error (catch everything) and does not throw.
- `resolveIcon(cache, img) → string`: returns `cache[img] ?? img`.
- `async cacheIcons(urls, cache, {fetchFn, encodeFn, onProgress}) → {saved, failed, total}`. It handles each unique `http(s)` url not already in `cache`:
  - `fetchFn(url)` must return an ok response with an `image/*` content-type (otherwise the url counts as failed);
  - `encodeFn(blob)` gives a data URL;
  - the result is stored in `cache`.
  - It yields with `await new Promise(r => setTimeout(r, 0))` between items, calls `onProgress(saved, failed, total)` after each, and never throws.
- `async encodeBlob(blob) → string` (browser only):
  - `createImageBitmap(blob)`, then draw onto a canvas, downscaling to at most 128 px on the longest side;
  - try `canvas.toDataURL('image/webp', 0.9)` and `'image/png'` and return the shorter.
- `script.js` produces `function collectIconUrls() → string[]` (via `LL.model.forEachDial`) and `function refreshIconCache()`, which runs caching, saves, updates the status line, and re-renders when anything was saved.

- [ ] **Step 1: Write the failing tests:**
  - `cacheIcons` with a fake fetch:
    - url a returns `{ok:true, headers:{get:()=>'image/png'}, blob:async()=>'B'}`;
    - url b returns `{ok:false}`;
    - url c returns ok with `text/html`;
    - url d throws;
    - `encodeFn` returns `'data:x'`.
    The result should be `{saved:1, failed:3, total:4}`, and `cache` should equal `{a:'data:x'}`. Also check that a `data:` url and a url already in `cache` are skipped (not counted in `total`).
  - `saveCache` with a storage whose `setItem` throws `DOMException('x','QuotaExceededError')`: returns `false`.
  - `loadCache` with corrupt JSON: returns `{}`.
  - `resolveIcon`: a cached url maps to its data URL; an uncached url is returned unchanged.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement `lib/iconcache.js`, NAME `iconcache`.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5:** Edit `manifest.json`:
  - `"host_permissions": ["https://www.google.com/*", "https://*.gstatic.com/*"]`
  - `"optional_host_permissions": ["<all_urls>"]`
  - Leave `version` until Task 12.
- [ ] **Step 6: Wire it into `script.js`:**
  - **Render:** `renderDials` uses `LL.iconcache.resolveIcon(iconCache, dial.img)`. `iconCache` is loaded once at startup.
  - **Toggle on:**
    1. `chrome.permissions.request({origins:['<all_urls>']})` (guarded; a denial is fine);
    2. set `settings.cacheIcons = true`, then save;
    3. `refreshIconCache()` immediately.
  - **Toggle off:** remove the `iconCache` key; the status line reads empty.
  - **Startup:** when the setting is on, `requestIdleCallback(refreshIconCache)`.
  - **Saving a dial** (`handleSave`): store the remote `img` url in the dial (no longer a data URL), then `refreshIconCache()` when the setting is on.
  - **Status line text:**
    - `"${saved} of ${total} icons saved for offline"`;
    - add `" · ${failed} couldn't be saved"` when there are failures;
    - when `saveCache` returns `false`, show `"Storage full — some icons not saved"`.
    - Here `saved` and `total` count across all dials: `total` = unique http(s) icon urls, and `saved` = how many of those are in `iconCache`.
  - **Export and import:** export adds `iconCache` to the JSON. Import restores it via `saveCache` when present.
  - Legacy dials whose `img` is already a `data:` URL are left as they are.
- [ ] **Step 7: Verify in Chrome** (load unpacked):
  1. Add a dial in a second workspace, turn on Cache Icons, and accept the permission prompt.
  2. Check that the status reaches "N of N icons saved for offline".
  3. In DevTools → Network → Offline, open a new tab.
  4. Every icon in every workspace should show.
  5. Turn caching off and check that `localStorage.iconCache` is gone.
- [ ] **Step 8:** Commit: `fix: icon cache works offline across all workspaces`.

### Task 5: Startup performance (§5)

**Files:**
- Modify: `init.js`, `script.js`, `newtab.html`, `styles.css` (body reveal), `backgrounds/bg2–5.jpg`

**Interfaces:**
- Produces `window.__LL_BOOT = { settings, bgImage }`, set by `init.js`; `script.js` reads it instead of re-parsing.
- Produces a separate `localStorage` key `bgImage`, which holds the custom background data URL. `settings.bgImage` keeps holding preset paths only, or the sentinel `'custom'`.

- [ ] **Step 1: Baseline.**
  - Add `performance.mark('ll-dials')` right after the first `renderDials()` in `init`.
  - In Chrome, with about 50 dials (paste a 50-dial workspace via import), record `performance.getEntriesByName('ll-dials')[0].startTime` and the time when `body.ready` lands, averaged over 5 new tabs.
  - Note the numbers in the commit message.
- [ ] **Step 2: Migrate the background.**
  - `init.js` reads `settings.bgImage`. If it starts with `data:`, it moves the value to `localStorage.bgImage`, sets `settings.bgImage = 'custom'`, and writes both.
  - When `settings.bgImage === 'custom'`, the URL comes from `localStorage.bgImage`.
  - Update `renderBackgroundOptions`, `createBgThumb`, `handleBgUpload` (catches a quota error, with `alert("Storage full — image too large")`, leaving the old background), export (includes `bgImage`), and import accordingly.
- [ ] **Step 3: Reveal.**
  - Stop gating reveal on the image: `body` becomes visible on DOMContentLoaded.
  - The background is painted by a `body::before` layer, `opacity:0` and then `1` with a 200 ms fade, toggled by the class `bg-ready` once the preloaded `Image` decodes (or immediately when already cached; check `img.complete`).
  - Delete the 500 ms timeout.
- [ ] **Step 4: Parse settings once.** `script.js` uses `window.__LL_BOOT.settings` when present, falling back to parsing.
- [ ] **Step 5: Icons.** Remove `loading="lazy"` from dial icons and add `decoding="async"`.
- [ ] **Step 6: Compress the backgrounds.** Re-encode `bg2.jpg`–`bg5.jpg` with PIL to at most 1920 px wide at quality 82, progressive, keeping the files as `.jpg` with the same names.
  Verify: total backgrounds size is under 800 KB, and a side-by-side view at full screen shows no visible banding.
- [ ] **Step 7: Re-measure** as in Step 1. Expect `body.ready` at least 100 ms earlier on a cold load with a large background, `ll-dials` no worse than before, and no flash: a dark fallback colour, then dials, then the background fading in.
- [ ] **Step 8:** Commit: `perf: earlier reveal, split background storage, smaller assets (before → after ms)`.

### Task 6: Auto-fit (§8)

**Files:**
- Create: `lib/layout.js`, `tests/layout.test.js`
- Modify: `newtab.html` (Layout tab toggle, script tag), `script.js` (`applyLayoutVars`, resize listener, settings default `autoFit: true`), `styles.css` (grid transition)

**Interfaces (`LL.layout`):**
- `computeFit({availW, availH, count, cols, dialSize, colGap, rowGap, autoFit, minScale = 0.6, aspect = 1.3}) → {cols, dialSize, colGap, rowGap, scroll}`
  - Numbers may arrive as strings.
  - `count` includes the "+" button.
  - Outputs are rounded integers.

The algorithm (spec §8: keep as many columns as possible, i.e. the first column count, stepping down, that fits at ≥ 60%):
```
fitScale(c): e = min(c, count); r = ceil(count / c)
  sW = availW / (e*dial + (e-1)*colGap)
  sH = availH / (r*dial/aspect + (r-1)*rowGap)
  return min(1, sW, sH)
if !autoFit: s = min(1, sW(cols)); return scaled cols layout, scroll = (rows height*s > availH)
for c from cols down to 1:            # shrink first, then drop one column at a time
  if fitScale(c) >= minScale: use c at fitScale(c); scroll = false; stop
none fits: use cols at s = min(minScale, sW(cols)), scroll = true
sizes/gaps are Math.floor(value * s) so the grid never exceeds availW
```

- [ ] **Step 1: Write the failing tests:**
  - **Fits at full size:** 1600×800 available, count 7, cols 6, dial 160, gaps 20. The result is cols 6, dial 160, and `scroll` is false.
  - **Shrinks while keeping columns:** 800×800 available, count 12, cols 6, dial 160, gaps 20. Width scale is 800/1060 ≈ 0.755. The result is cols 6, dial 120, colGap 15 (floored).
  - **Reflows:** 500×900 available, count 12, cols 6, dial 160, gaps 20. Six columns would scale to about 0.47, and fewer columns fit better. The result is cols 4, dial 114, and `scroll` false. Five columns would scale to about 0.57, so four is the first count that fits.
  - **Fallback:** 600×400 available, count 120. The result is cols 6, `dialSize <= 96`, and `scroll` true. Also check that `cols*dial + (cols-1)*colGap <= 600`.
  - **Empty workspace:** count 1 (just "+"). The result is dial 160 and `scroll` false.
  - **Auto-fit off:** 800 wide, count 12, cols 6. Same columns, scaled to the width; `scroll` is true when the height doesn't fit.
  - **String inputs:** `cols:'6', dialSize:'160'` gives the same result as the numbers.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement `lib/layout.js`, NAME `layout`.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5: Wire it in.**
  - **Layout vars:** `applyLayoutVars()` computes the available area and writes the result to `DOM.grid.style`:
    - `availW = innerWidth − 40`;
    - `availH = innerHeight − 2 × (DOM.workspacesContainer.getBoundingClientRect().bottom + 10)`;
    - `count` = top-level items in the active workspace + 1.
  - **When it runs:**
    - at the top of `init` (before the first render, so there's no jump);
    - after `renderDials`;
    - on workspace switch;
    - on `resize`, throttled with `requestAnimationFrame`.
  - **Toggle:** `#autofit-toggle` in the Layout tab, using the same toggle-switch markup as Cache Icons, with the label "Auto-fit to window" and the sub-label "Shrink and reflow dials so they all fit when the window is small."
  - **Animation:** add `.container { transition: grid-template-columns 200ms ease-out }`, and give `.dial` a width/height transition only while the class `resizing` is set on the grid. The class is removed 250 ms after the last resize event.
- [ ] **Step 6:** Verify with smoke screenshots at 1600×900, 960×1000 (half screen) and 700×500, using 30 dials (seed through `localStorage` in a DevTools console, or a temporary query-param seeding hook that you remove before committing). All items should be visible with no scrollbar at the first two sizes.
- [ ] **Step 7:** Commit: `feat: auto-fit grid to window (shrink then reflow)`.

### Task 7: Hover, add and delete animations (§6, non-drag)

**Files:**
- Create: `lib/flip.js`
- Modify: `styles.css`, `script.js` (`renderDials`, delete handler, add flow), `newtab.html`

**Interfaces (`LL.flip`):**
- `flip(container, selector, mutate) → void`. It records each matching element's rect, keyed by `dataset.key`. It calls `mutate()` synchronously, which re-renders. Then each element whose key still exists is moved from its old offset to its new one (`translate`, 220 ms ease-out, Web Animations API). It returns early when reduced motion is on.
- Dials and folders get a stable `dataset.key`: the dial url plus its index among dials with the same url, or the folder `id`.

- [ ] **Step 1: Hover.**
  - `.dial` transition: `transform 180ms cubic-bezier(.2,.7,.3,1), box-shadow 180ms`.
  - Hover: `translateY(-4px) scale(1.03)` with a deeper shadow.
  - Remove the permanent `will-change`; set `will-change: transform` only on `:hover` and `.dragging`.
- [ ] **Step 2: Add and delete.**
  - **Add:** the new dial gets the class `entering`, from `opacity:0; scale(.9)` to its normal state, over 200 ms.
  - **Delete:**
    1. Animate the dial to `opacity:0; scale(.9)` over 160 ms.
    2. On finish, splice the item out and save.
    3. Run `flip(DOM.grid, '.dial', renderDials)` so the neighbours glide into place.
- [ ] **Step 3:** Add a `@media (prefers-reduced-motion: reduce)` block that sets `transition-duration` and `animation-duration` to `1ms` for `.dial`, the folder panel, and the backdrop.
- [ ] **Step 4:** Verify in Chrome: hovering, adding and deleting all feel smooth. With Chrome DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" turned on, the changes are instant.
- [ ] **Step 5:** Commit: `feat: smooth hover/add/delete animations`.

### Task 8: Pointer-based drag with sliding reorder (§6)

**Files:**
- Create: `lib/dragmath.js`, `tests/dragmath.test.js`, `ui/drag.js`
- Modify: `script.js` (remove the native `dragstart`, `dragover`, `drop` and `dragend` listeners and `draggable=true`), `styles.css`, `newtab.html`

**Interfaces:**
- `LL.dragmath.zone(rect, x, y) → 'centre' | 'reorder'`. The centre zone is the middle 50% of the width and the middle 50% of the height.
- `LL.dragmath.insertIndex(rects, x, y) → number`. `rects` are the top-level item rects in DOM order, excluding the dragged item. It returns the index where the dragged item would go: the first rect whose row contains `y` and whose horizontal midpoint is past `x`; after the last item in that row otherwise; `rects.length` when below all rows.
- `LL.drag.attach(container, opts)` with these options:
  - `itemSelector`: `'.dial:not(#add-btn)'`;
  - `onReorder(from, to)`;
  - `onGroup(from, targetIndex)`: called after a 400 ms centre hold, then a drop;
  - `onDragOutside(from, x, y) → boolean`: used by the folder panel in Task 11; when it returns `true`, the drag is handed over;
  - `holdMs = 400`.
  - It returns `{ detach() }`.
- **Behaviour:**
  - A drag starts after the pointer moves 5 px with the primary button held. Under that threshold, a click still navigates.
  - The dragged element gets `.dragging` and follows the pointer via `transform`.
  - The other items slide using FLIP translations as `insertIndex` changes, but only while the pointer is in a reorder zone.
  - In a centre zone, sliding is held. After `holdMs`, the target gets the class `group-target`.
  - Esc cancels the drag.
  - When a drag happened, the follow-up `click` is suppressed.

- [ ] **Step 1: Write the failing tests** with a 3×2 grid of 100×77 rects and gaps of 20:
  - `zone` at the exact centre is `'centre'`; at 10 px from the left edge, `'reorder'`.
  - `insertIndex` left of item 0 is 0; between items 1 and 2 on row 0 it is 2; to the right of the last item on row 0 it is 3; below all rows it is 6.
- [ ] **Step 2:** Run the tests and expect FAIL. **Step 3:** Implement. **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5:** Implement `ui/drag.js` using Pointer Events with `setPointerCapture`. Animate the others with `LL.flip`-style transforms, without re-rendering until the drop. Then wire it into `script.js`: `onReorder` calls `LL.model.moveItem`, saves, and renders without FLIP (the items are already in place visually). `onGroup` is a no-op until Task 11.
- [ ] **Step 6: Verify in Chrome:**
  - Dragging a dial across the grid makes the others slide aside smoothly, and dropping commits the move.
  - Clicking still opens the site; right-click still shows the menu.
  - Esc cancels.
  - Middle-click and Ctrl+click still open in a new tab.
- [ ] **Step 7:** Commit: `feat: pointer drag with sliding reorder`.

### Task 9: Context menu — Incognito and Copy Link (§1–2) and safe dial DOM

*Ordered after the drag rework so the menu code is touched once.*

**Files:**
- Modify: `newtab.html` (menu items, toast element `<div id="toast" class="toast"></div>`), `script.js`, `styles.css`

- [ ] **Step 1:** Make the menu order: Open in New Tab, Open in Incognito (`#ctx-incognito`), Copy Link (`#ctx-copy`), Edit, Delete.
- [ ] **Step 2: Incognito.** `chrome.windows.create({url, incognito:true})`. Guard for the API's absence.
- [ ] **Step 3: Copy Link.**
  - Call `navigator.clipboard.writeText(url)`, then `showToast('Link copied')`.
  - `showToast(text)` puts the text in `#toast` and adds `.show` (opacity and a translateY fade, 200 ms), then removes it after 1500 ms.
  - Only if `writeText` rejects inside the extension, add `"clipboardWrite"` to the manifest permissions.
- [ ] **Step 4:** Rewrite `renderDials` item creation without `innerHTML`: `createElement('img')`, `img.alt = name`, `span.textContent = name`. Keep the `onerror` fallback as a property assignment.
- [ ] **Step 5: Verify in Chrome:**
  - Incognito opens the site in an incognito window, and the copied link pastes correctly.
  - A dial named `<b>x</b> & "q" 🚀` shows that text literally (Review Focus 1).
  - Dark mode menu and toast look right.
- [ ] **Step 6:** Commit: `feat: open in incognito and copy link`.

### Task 10: Folders — render, open and close panel, folder menu (§3)

**Files:**
- Create: `ui/folder-panel.js`
- Modify: `newtab.html` (folder panel and backdrop markup, a folder context menu `#folder-context-menu` with `#ctx-folder-rename`, `#ctx-folder-openall`, `#ctx-folder-ungroup`, `#ctx-folder-delete`), `script.js`, `styles.css`

**Interfaces:**
- `renderDials()` renders a folder as `<div class="dial folder" data-index data-key>`. Inside it are a `.folder-preview` 2×2 grid holding the first 4 resolved icons, then a `<span>` with the name.
- `LL.folderPanel.open(folderEl, folder, opts)` takes these options:
  - `renderItem(dial, i) → Element`: reuses the dial element builder;
  - `onRename(name)`;
  - `onClose()`;
  - `onAdd()`;
  - `cols`.
- `LL.folderPanel.close()`, `LL.folderPanel.isOpen()`, and `LL.folderPanel.gridEl()` round out the API. The latter is for Task 11 to attach drag.
- `script.js` state: `openFolderIndex` (-1 when closed). `contextIndex` becomes `contextTarget = {index, childIndex}`. `childIndex` is -1 for top-level items, so Edit, Delete, Copy and Incognito work inside the panel too.

- [ ] **Step 1: Closed-folder CSS.**
  - Light mode: `background: rgba(255,255,255,.35); backdrop-filter: blur(10px)`, with white name text and a text shadow for legibility.
  - Dark mode: `rgba(30,30,30,.45)`.
  - The preview is a 2×2 grid of icons, each about 22% of the dial's width.
- [ ] **Step 2: Panel markup and CSS.**
  - A fixed backdrop: `rgba(0,0,0,.35)` with `backdrop-filter: blur(6px)`, fading in over 200 ms.
  - The panel: a centered frosted card. Above it is a name `<input class="folder-name">` that looks like a heading. Inside is a grid with the same `--dial-width` and gaps as the main grid, `min(items, cols)` columns, `max-height: 70vh; overflow-y: auto`, and a "+" add tile at the end.
- [ ] **Step 3: Zoom.**
  - `open` measures `folderEl`'s rect and the panel's final rect, then animates the panel with `transform: translate(dx,dy) scale(sx,sy)` and `opacity 0→1`, from the folder's position to identity, over 240 ms `cubic-bezier(.2,.7,.3,1)`.
  - `close` runs the reverse animation, then hides.
  - Reduced motion gives an instant change.
- [ ] **Step 4: Closing and dial behaviour.**
  - The panel closes on a backdrop click, on Esc, and after a dial inside is clicked (navigation proceeds).
  - Renaming saves on `change` or Enter. An empty name reverts.
  - A right-click on a dial inside opens the dial menu with `childIndex` set. Its actions use the folder's `items`, then run `LL.model.normalize` and save. When the folder dissolves, the panel closes and the grid re-renders.
- [ ] **Step 5: "+" inside the panel.** It opens the existing add modal, and `handleSave` pushes the new dial into `folder.items` when `openFolderIndex > -1`.
- [ ] **Step 6: Folder context menu.**
  - **Rename:** opens the panel and focuses the name.
  - **Open All in New Tabs:** `window.open` for each, or `chrome.tabs.create` when it's available.
  - **Ungroup:** `LL.model.ungroup`, then a FLIP re-render.
  - **Delete:** `confirm('Delete folder "<name>" and its N links?')`.
  - Clicking a folder never navigates.
- [ ] **Step 7: Verify in Chrome.** Seed a folder via import JSON (`{type:'folder',id:'f1',name:'Money',items:[…3 dials]}`). Then:
  - It renders with 3 previews.
  - It opens with a zoom from its own spot and closes back into it.
  - All menu items work.
  - "+" adds a dial inside the folder.
  - Deleting dials down to 1 dissolves the folder.
  - Dark mode works, and so does reduced motion.
- [ ] **Step 8:** Commit: `feat: folders render, open with zoom, folder menu`.

### Task 11: Folders — drag to group, add, reorder inside, drag out (§3)

**Files:**
- Modify: `ui/drag.js`, `ui/folder-panel.js`, `script.js`, `styles.css`

**Interfaces:**
- Consumes `LL.drag.attach` (`onGroup`, `onDragOutside`), `LL.model.createFolder`, `addToFolder` and `removeFromFolder`, and `LL.folderPanel.gridEl()`.
- Adds `LL.drag.continueIn(container, element, pointerEvent, opts)`. It resumes an in-progress drag of `element` in another container, so a drag that started in the panel carries on in the main grid.

- [ ] **Step 1: Grouping.** `onGroup(from, target)`:
  - If the target is a folder, call `addToFolder`.
  - Otherwise call `createFolder` with the id `'f' + Date.now().toString(36)`.
  - Then save and run a FLIP render.
  - Style the `.group-target` highlight: `scale(1.08)` with a soft white ring, 150 ms.
- [ ] **Step 2: Inside the panel.**
  - Attach `LL.drag` to the panel grid. Reorder uses `moveItem` on `folder.items`.
  - `onGroup` inside the panel is treated as a reorder (no nested folders).
- [ ] **Step 3: Dragging out of the panel.**
  - When the pointer leaves the panel's rect, `onDragOutside` closes the panel immediately and calls `LL.drag.continueIn(DOM.grid, …)`.
  - On drop, `removeFromFolder(items, folderIdx, childIdx, insertIndex)`. Then save and render.
- [ ] **Step 4: Verify in Chrome:**
  1. Hold a dial on another dial's centre for about 0.4 s: it highlights, and dropping makes a "Folder" with both.
  2. Pass quickly over a dial or a folder: it reorders and doesn't group.
  3. Hold on a folder's centre and drop: the dial is added.
  4. Inside the panel, reordering works.
  5. Dragging a dial out closes the panel, and the dial lands where it's dropped.
  6. Dragging out the second-to-last dial dissolves the folder.
  7. Reload: everything persisted.
  8. Export then re-import: the folders survive.
- [ ] **Step 5:** Commit: `feat: drag to create folders, add, reorder and drag out`.

### Task 12: Release polish

**Files:**
- Modify: `manifest.json` (`"version": "1.1.0"`), `README.md` (Features list: add Folders, Open in Incognito / Copy Link, Auto-fit, Offline icons; keep the voice and keep it minimal)

- [ ] **Step 1:** Run `node --test tests/` and expect everything to pass.
- [ ] **Step 2: Full manual pass** in Chrome (load unpacked), working through every spec section's "Testing and verification" bullet:
  - offline icons across all workspaces;
  - half-screen and quarter-screen layouts;
  - importing a v1.0 export;
  - dark mode;
  - reduced motion.
  Record anything that fails, and fix it before committing.
- [ ] **Step 3:** Commit: `release: v1.1.0`.

# Lightning Links v1.1 — Design

Date: 2026-10-24
Status: draft, awaiting owner approval

## Intent

Lightning Links is a minimal, privacy-first New Tab page (Chrome MV3, vanilla JS, zero dependencies, all data local). v1.1 adds a few features the owner uses daily, fixes settings that don't do what they say, and makes the page feel smoother — without adding bloat or breaking the core promise: **your links, exactly where you left them, instantly.**

## Goals

1. Right-click a dial → **Open in Incognito**.
2. Right-click a dial → **Copy Link**.
3. **Folders** (iPhone-style) that group dials.
4. **Cached icons survive offline** — the "Cache Icons" setting actually works.
5. **Faster startup** where measurable.
6. **Smoother animations**: hover, drag, add, delete, folder open/close.
7. **Sizing and spacing sliders do exactly what their labels say.**
8. **Auto-fit** the grid to smaller windows (half-screen etc.), as a setting, on by default.

## Non-goals

- No new dependencies, frameworks, or build step. Plain HTML/CSS/JS loaded directly as an unpacked extension.
- No sync, accounts, analytics, or network calls other than fetching icons.
- No nested folders.
- No redesign of the settings modal beyond adding the new controls.

## Anti-goals (would be a failure even if it "works")

- Anything that delays first paint or reintroduces a white or black flash.
- Dials moving around unexpectedly (muscle memory is the product).
- Bouncy or showy motion: the owner asked for smooth and subtle.
- Losing or corrupting existing users' data (`myWorkspaces`, `mySettings`, old `myDials` migration, existing export files).

## Constraints

- Manifest V3. Current permissions are `storage`, plus host permission `https://www.google.com/*`.
- First render reads `localStorage` synchronously (`init.js` sets CSS variables before paint). Keep data needed for first paint synchronous.
- Existing export JSON files must still import.
- Respect `prefers-reduced-motion`.
- Light and dark mode both supported (the existing `.dark-mode` class).

---

## 1 & 2. Context menu: Open in Incognito, Copy Link

Add two items to the existing dial context menu (`#context-menu`). Final order:

- Open in New Tab
- Open in Incognito
- Copy Link
- Edit
- Delete

Details:

- **Incognito:** `chrome.windows.create({ url, incognito: true })`. This needs no extra permission for http(s) URLs. *(Builder: confirm. If Chrome reuses an existing incognito window rather than opening a new one, either behavior is fine.)*
- **Copy Link:** `navigator.clipboard.writeText(url)`. Show a small, unobtrusive toast ("Link copied"), auto-hiding after about 1.5 s. Add the `clipboardWrite` permission only if writing fails without it.
- The same menu appears for dials inside an open folder.
- For a **folder**, the context menu shows: Rename, Open All in New Tabs, Ungroup (moves contents back to the grid in place), Delete (asks for confirmation; deletes the folder and its contents).

## 3. Folders

Owner's picture: a "Money" folder holding bank, investment and stocks dials. Click it and it zooms open; click a dial to go there.

**Closed folder** (owner chose mockup 1.A):
- It occupies one grid cell, the same size as a dial, and reorders like a dial.
- Frosted-glass card (translucent white with `backdrop-filter: blur`). It shows a 2×2 preview of the first 4 icons, with the folder name below.
- In dark mode it uses a translucent dark glass with the same structure.

**Open folder** (owner chose mockup 2.A):
- Clicking zooms the folder from its grid position into a centered panel (a FLIP-style transform from the folder's rect to the panel's rect). The page behind blurs and dims.
- The folder name is shown above the panel and is editable in place (click to rename).
- The panel grid uses the same dial size as the main grid. Columns are `min(item count, main column count)`, and the panel scrolls if it is too tall.
- It closes on a click outside, on Esc, or after a dial is opened. Closing zooms back into the folder's cell.

**Interactions** (owner confirmed the playback):
- **Group vs reorder rule (iPhone-like):** each dial or folder has a **centre zone**, the middle ~50% of its width and height. The rest of the cell, plus the gaps, is the reorder zone.
  - Pointer in a reorder zone: the other dials slide to open the landing gap (§6) right away.
  - Pointer in a centre zone: nothing slides. After a ~400 ms hold, the target highlights as a group target. Dropping then groups.
  - Dropping on a centre zone *before* the hold finishes, or moving out early, is treated as a reorder.
  - This applies to folders too: hold over a folder's centre to add the dial to it, and pass over it quickly to move past it. *(My call.)*
- **Create:** use the group gesture on another dial. Dropping creates a folder named "Folder" containing both dials, at the target's position.
- **Add:** use the group gesture on a folder.
- **Inside the panel:** reorder by dragging; right-click for the normal dial menu.
- **Drag a dial out of the panel:** the panel closes as soon as the pointer leaves it, and the drag carries on in the main grid with the live sliding gap, so the user can aim the drop. *(My call; it's how iPhone does it.)*
- A folder left with **one** dial turns back into a normal dial. A folder with **zero** dials is removed.
- Each workspace has its own folders. Export and import include folders.
- The "+" add button inside an open folder adds the new dial into that folder. *(My call.)*

**Data model:**
- A workspace stays an ordered array. A folder is an item `{ type: 'folder', id, name, items: [dial, …] }`.
- A plain dial stays `{ name, url, img }`. An item without `type` is a dial.
- This keeps old data and old exports valid with no migration.

## 4. Offline icons ("Cache Icons" setting)

**Why it's broken today** (verified):
- Default icons use `https://www.google.com/s2/favicons?...`. That address now answers with a **301 redirect to `https://tN.gstatic.com/faviconV2?...`**, which sends no CORS headers.
- The extension only has host permission for `www.google.com`, so `fetch()` fails. `faviconToDataURL` then silently returns the original URL, which breaks offline.

Other gaps in the current code:
- `performIconCaching` only caches the workspace that was active at startup.
- Toggling the setting on doesn't cache anything until the next new tab.
- Custom icon URLs from other hosts fail for the same permission reason.
- Base64 icons live inside `myWorkspaces`, inflating the JSON parsed on every new tab.

**Fix:**
- **Permissions:**
  - Add host permissions for `https://www.google.com/*` and `https://*.gstatic.com/*` (needed by default).
  - Add `<all_urls>` as an **optional** host permission. It is requested via `chrome.permissions.request` the moment the user turns on Cache Icons, so users who never enable the setting see no install warning. *(My call; the owner chose to allow caching custom icons from any site.)*
  - If the user denies the request, only Google icons get cached, and the settings row says so.
- **When caching runs:**
  - Caching covers **every workspace and every folder**.
  - It starts immediately when the setting is switched on.
  - It runs on idle at startup for anything not yet cached.
  - It caches on save when adding or editing a dial.
- **Where the cache lives:**
  - Icons move into their own `localStorage` key (`iconCache`: a map from icon URL to data URL), separate from `myWorkspaces`. They stay synchronous, so icons render on first paint.
  - Icons are downscaled to at most 128 px and encoded compactly (WebP or PNG, whichever is smaller).
  - Rendering uses `iconCache[dial.img] ?? dial.img`.
  - Existing dials whose `img` is already a `data:` URL keep working as they are.
- **Failures:**
  - The settings row shows a status line: "N of M icons saved for offline". Icons that failed are listed or counted, never silently skipped.
  - When the setting is turned off, the cache is cleared to free storage.
  - If a write would exceed the storage quota, stop caching and show "Storage full" in the status line.
- **Export:** export includes cached icons so a restore works offline.

## 5. Performance

These are targeted fixes, each with a before and after measurement. The builder records time to first dial paint (Performance panel or `performance.now()` marks) on a profile with about 50 dials, before and after.

- **Stop hiding the page up to 500 ms waiting for the background.** Show the dials as soon as the DOM is ready over the dark fallback colour, and fade the background image in when it decodes. *(Builder: confirm this removes the startup delay without a visible flash. If it looks worse, keep the current reveal but lower the timeout.)*
- **Remove `loading="lazy"`** from dial icons, since they are above the fold. Add `decoding="async"`.
- **Separate heavy data from first-paint data:**
  - The custom background data URL lives in its own key (`bgImage`), so `mySettings` stays tiny. `init.js` reads it directly.
  - Icons are moved out as in §4.
- **Don't write `localStorage` on every slider tick.** Apply CSS variables on `input`, and persist on `change`.
- **Parse settings once.** `init.js` stashes the parsed object on `window`, and `script.js` reuses it.
- **Compress the bundled backgrounds.** For example, `bg5.jpg` is 826 KB. Re-encode them to about 1920 px wide at a sensible quality, without visible loss.
- **Remove the excessive blank lines** in `script.js` (pure cleanup; it shrinks the file by roughly half). *(My call; the owner asked for speed work, and this is free.)*

## 6. Animations (smooth and subtle)

All of these use `transform` and `opacity` only, with ease-out curves of roughly 150–250 ms and no overshoot. Under `prefers-reduced-motion: reduce`, durations drop to about 0.

- **Hover:** lift about 4 px, a slight scale-up (about 1.03) and a deeper shadow, on a 180 ms ease-out. Fix the current `will-change` on every dial; apply it only while hovering or dragging.
- **Drag:**
  - The held dial follows the pointer.
  - Other dials **slide** to open the landing gap (FLIP animation) instead of jumping on drop.
  - Holding over a dial highlights it as a folder target (see §3).
  - Use pointer events rather than native HTML5 drag-and-drop if that's needed to get the sliding preview and the hold-to-group behavior. *(Builder's choice; native DnD gives a ghost image that can't animate.)*
- **Add:** the new dial fades and scales in from 0.9.
- **Delete:** the dial fades and scales out, then its neighbours glide to close the gap (FLIP).
- **Folder open and close:** the zoom described in §3, plus the backdrop blur fading in and out.
- **Auto-fit relayout:** size changes animate (see §8).

## 7. Sizing and spacing that do what they say

**Bugs found:**
- `grid-template-columns: repeat(N, 1fr)` inside an 85%-wide container means **Dial Size is only a maximum**. When the columns are narrow, the slider does nothing.
- **Horizontal Spacing is mostly fake**: the visible space is leftover column width, not the gap setting.
- `hGapVal.textContent = hGapRange.value = '20px'` writes `"20px"` into a range input. That value is invalid, so **the slider thumb resets to the middle** when Settings is reopened. The same happens for vertical spacing.
- The name text is fixed at 13 px and doesn't scale with the dial.
- The size label shows a percentage of 160 px while the slider's minimum is 100, so the label ranges from about 63% to 188%. *(Builder: keep it as a percentage of the default, but make the label and slider agree.)*

**Fix:**
- Make the grid `repeat(var(--col-count), var(--dial-width))`, with `column-gap` and `row-gap` taken from the settings and the grid centered.
- The container can then be as wide as needed, up to the viewport. Remove the 85% and 1600 px caps, or keep them only as a safety bound.
- The name font scales with dial size, clamped to a readable range.
- Fix the slider value assignment.
- **No migration.** The owner accepted that existing layouts may look different once, after updating, because the saved values now render literally. v1.0 export files also import as-is.
- **When the grid is wider than the window and auto-fit is off:** never scroll sideways. Dials shrink just enough to fit the window width (same columns), and the grid scrolls vertically as today. *(My call.)*

## 8. Auto-fit to window (setting, default ON)

The owner chose "a mix of reflow and shrink" and approved this behavior; it can be tuned after use.

- The user's settings (columns, dial size, gaps) define the **full-size layout**. Auto-fit only ever makes things **smaller**.
- When the window is too small to show every item without scrolling:
  1. **Shrink first.** Scale the dial size and gaps together, keeping the column count, so positions stay put.
  2. **Reflow when needed.** If the scale would drop below **60%** of the chosen dial size, reduce the column count one step at a time and recompute.
  3. **Pick the best fit.** Use the layout that fits all items at the largest scale. If none fits even at 60% with one column, use the user's column count at 60% scale and let the grid scroll.
- Items counted are the top-level items of the active workspace (folders count as one), plus the "+" button.
- Recompute on `resize` (throttled with rAF), on workspace switch, and on add or delete.
- Apply the result by setting `--col-count`, `--dial-width` and the gaps on the grid element only. The user's saved settings are never overwritten.
- The first computation happens before first paint (in `init.js`, or synchronously at the top of `init`) so there is no visible jump on load.
- Animate changes during live resize with a short transition.
- **Settings:** add a toggle to the Layout tab: "Auto-fit to window — shrink and reflow dials so they all fit when the window is small." When it is off, behavior is the fixed layout from §7 with scrolling.

---

## Suggested order

Each step is independently shippable and testable in the browser.

1. §7 Sizing fixes. Auto-fit and folders build on correct grid math.
2. §1–2 Context menu items. These are small and quick wins.
3. §4 Offline icons.
4. §5 Performance. Measure before and after.
5. §8 Auto-fit.
6. §6 Animations. The drag rework lands here.
7. §3 Folders. They depend on the new drag system and animations.

## Testing and verification

- There is no test harness today. *(Builder's choice: pure logic such as the auto-fit calculation, folder data operations and import compatibility can be unit-tested with plain Node scripts. No dependencies.)*
- Manual checks in Chrome for each section:
  - Offline icons: enable caching, then use the DevTools "Offline" network setting and reload. Every icon must show, in every workspace.
  - Auto-fit: snap the window to half-screen and quarter-screen.
  - Import an export file made by v1.0.
  - Dark mode, reduced motion.
- Bump `manifest.json` version to 1.1.0. Update the README's feature list.

## Calls made by the designer (not confirmed by the owner)

- Hold-to-create-folder delay (about 400 ms), the centre-zone group rule, and the default name "Folder".
- Dragging a dial out of a folder closes the panel as soon as the pointer leaves it.
- With auto-fit off, an over-wide grid shrinks to the window width rather than scrolling sideways.
- The folder context menu items (Rename, Open All, Ungroup, Delete).
- The "+" inside an open folder adds into that folder.
- `<all_urls>` is an optional permission requested on toggle, not at install.
- Icon cache stays in synchronous `localStorage` under its own key, rather than async storage.
- Cleanup of blank lines in `script.js`, and re-compression of the bundled backgrounds.
- Showing the dials before the background finishes loading.

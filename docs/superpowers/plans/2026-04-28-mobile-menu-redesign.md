# Mobile Menu Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile topbar with a fixed bottom bar (sidebar toggle + auto-scroll + settings), with a slide-up sheet for secondary controls (font size, chords, transpose, scroll speed).

**Architecture:** Hide the existing `.topbar` and `.menu-toggle` on mobile via CSS, add new `.mobile-bar` and `.mobile-sheet` elements to `index.html`, and update JS functions to sync state to both the desktop topbar and the new mobile elements. Desktop is unchanged.

**Tech Stack:** Vanilla JS (ES modules), plain CSS, no build step required for dev (open `index.html` directly or via local server).

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add `.mobile-bar` and `.mobile-sheet` HTML inside `<main>` |
| `style.css` | Add mobile bar + sheet styles; update `@media (max-width: 768px)` to hide topbar |
| `app.js` | Add `toggleSettingsSheet`, `closeSettingsSheet`, `updateMobileScrollBtn`, `updateMobileChordsBtn`; update `toggleAutoScroll`, `changeFontSize`, `changeScrollSpeed`, `toggleHideChords`, `selectSong`, `init` |

---

## Task 1: HTML — Add mobile bottom bar and settings sheet

**Files:**
- Modify: `index.html:33-68` (inside `<main class="main">`, after `#songDisplay`)

- [ ] **Step 1: Add the mobile bar and sheet markup**

Open `index.html`. After the closing `</div>` of `#songDisplay` (line 67) and before `</main>`, insert:

```html
    <!-- Mobile bottom bar (hidden on desktop via CSS) -->
    <div class="mobile-bar" id="mobileBar" role="toolbar" aria-label="Mobilmeny">
      <button class="mobile-bar__btn" onclick="toggleSidebar()" aria-label="Öppna/stäng låtlista">☰</button>
      <button class="mobile-bar__scroll" id="mobileScrollBtn" onclick="toggleAutoScroll()" aria-pressed="false" aria-label="Autoscroll">▶ Scrolla</button>
      <button class="mobile-bar__btn" id="mobileSettingsBtn" onclick="toggleSettingsSheet()" aria-label="Inställningar" aria-expanded="false">⚙</button>
    </div>

    <!-- Mobile settings sheet (slides up from behind the bottom bar) -->
    <div class="mobile-sheet" id="mobileSheet" role="dialog" aria-label="Inställningar" aria-hidden="true">
      <div class="mobile-sheet__handle"></div>
      <div class="mobile-sheet__row">
        <span class="mobile-sheet__label">Textstorlek</span>
        <div class="mobile-sheet__ctrl">
          <button onclick="changeFontSize(-1)" aria-label="Minska textstorlek">−</button>
          <span id="mobileFontLabel">13</span>
          <button onclick="changeFontSize(1)" aria-label="Öka textstorlek">+</button>
        </div>
      </div>
      <div class="mobile-sheet__row">
        <span class="mobile-sheet__label">Ackord</span>
        <button class="mobile-sheet__toggle mobile-sheet__toggle--on" id="mobileHideChordsBtn" onclick="toggleHideChords()" aria-pressed="true">Visas</button>
      </div>
      <div class="mobile-sheet__row">
        <span class="mobile-sheet__label">Transponera</span>
        <div class="mobile-sheet__ctrl">
          <button onclick="transpose(-1)" aria-label="Transponera ner ett halvsteg">♭</button>
          <button onclick="transpose(1)" aria-label="Transponera upp ett halvsteg">♯</button>
        </div>
      </div>
      <div class="mobile-sheet__row">
        <span class="mobile-sheet__label">Scrollhastighet</span>
        <div class="mobile-sheet__ctrl">
          <button onclick="changeScrollSpeed(-1)" aria-label="Minska scrollhastighet">−</button>
          <span id="mobileScrollSpeedLabel">3</span>
          <button onclick="changeScrollSpeed(1)" aria-label="Öka scrollhastighet">+</button>
        </div>
      </div>
    </div>
    <div class="mobile-sheet-backdrop" id="mobileSheetBackdrop" onclick="closeSettingsSheet()" aria-hidden="true"></div>
```

- [ ] **Step 2: Verify HTML is valid**

Open `index.html` in a browser (or run `npx serve .` if you prefer). Open DevTools → Elements. Confirm `#mobileBar`, `#mobileSheet`, `#mobileSheetBackdrop` exist as siblings after `#songDisplay` inside `<main>`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add mobile bottom bar and settings sheet HTML"
```

---

## Task 2: CSS — Style bottom bar and settings sheet

**Files:**
- Modify: `style.css` — add new rules after the existing `@media (max-width: 768px)` block and update that block

- [ ] **Step 1: Hide `.menu-toggle` on mobile and `.topbar` on mobile**

In `style.css`, inside the existing `@media (max-width: 768px)` block, add these two rules (the `.topbar` line replaces or adds to the existing `.topbar` overrides in that block):

```css
  /* Hide desktop-only elements on mobile */
  .menu-toggle { display: none !important; }
  .topbar { display: none !important; }
```

Remove or comment out the existing `@media (max-width: 768px)` rule `.topbar { padding-left: 56px; }` since `.topbar` is now hidden entirely.

- [ ] **Step 2: Add padding to .main on mobile**

Inside `@media (max-width: 768px)`, add:

```css
  /* Prevent song content from hiding behind the fixed bottom bar */
  .main { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
```

- [ ] **Step 3: Add bottom bar styles**

After all existing rules in `style.css`, add:

```css
/* ─── Mobile Bottom Bar ─── */
.mobile-bar { display: none; }

@media (max-width: 768px) {
  .mobile-bar {
    display: flex;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 150;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 8px 12px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    align-items: center;
    gap: 8px;
  }

  .mobile-bar__btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    width: 40px; height: 40px;
    border-radius: 8px;
    font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s;
  }

  .mobile-bar__btn.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .mobile-bar__scroll {
    flex: 1;
    height: 40px;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mobile-bar__scroll.active {
    background: var(--accent);
    color: #0f0f0f;
    border-color: var(--accent);
  }

  /* ─── Settings Sheet ─── */
  .mobile-sheet {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 140;
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 14px 14px 0 0;
    padding: 10px 20px;
    /* Push content above the bar */
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
    transform: translateY(100%);
    transition: transform 0.25s ease;
  }

  .mobile-sheet--open {
    transform: translateY(0);
  }

  .mobile-sheet__handle {
    width: 32px; height: 3px;
    background: #444;
    border-radius: 2px;
    margin: 0 auto 12px;
  }

  .mobile-sheet__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .mobile-sheet__row:last-child { border-bottom: none; }

  .mobile-sheet__label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-dim);
  }

  .mobile-sheet__ctrl {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-sheet__ctrl button {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    width: 32px; height: 32px;
    border-radius: 6px;
    font-size: 15px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }

  .mobile-sheet__ctrl button:active { border-color: var(--accent); color: var(--accent); }

  .mobile-sheet__ctrl span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--text);
    min-width: 20px;
    text-align: center;
  }

  .mobile-sheet__toggle {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    border-radius: 6px;
    padding: 5px 14px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mobile-sheet__toggle--on {
    background: var(--accent);
    color: #0f0f0f;
    border-color: var(--accent);
  }

  .mobile-sheet-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 130;
  }

  .mobile-sheet-backdrop--active { display: block; }
}
```

- [ ] **Step 4: Verify layout at 375px width**

Open browser DevTools → toggle device toolbar → set width to 375px. Confirm:
- Bottom bar visible with three elements
- No topbar visible
- Song content not hidden behind bar (scroll to bottom)
- Sheet hidden (not visible)

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "feat: add mobile bottom bar and settings sheet CSS"
```

---

## Task 3: JS — Add sheet toggle and sync helpers

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add `updateMobileScrollBtn` helper**

After the `releaseWakeLock` function (around line 267), add:

```js
function updateMobileScrollBtn() {
  const btn = document.getElementById('mobileScrollBtn');
  if (!btn) return;
  btn.textContent = scrollActive ? '■ Stopp' : '▶ Scrolla';
  btn.className = 'mobile-bar__scroll' + (scrollActive ? ' active' : '');
  btn.setAttribute('aria-pressed', scrollActive);
}
```

- [ ] **Step 2: Add `updateMobileChordsBtn` helper**

Immediately after `updateMobileScrollBtn`:

```js
function updateMobileChordsBtn() {
  const btn = document.getElementById('mobileHideChordsBtn');
  if (!btn) return;
  btn.textContent = hideChords ? 'Dold' : 'Visas';
  btn.className = 'mobile-sheet__toggle' + (hideChords ? '' : ' mobile-sheet__toggle--on');
  btn.setAttribute('aria-pressed', !hideChords);
}
```

- [ ] **Step 3: Add `toggleSettingsSheet` and `closeSettingsSheet`**

Immediately after `updateMobileChordsBtn`:

```js
function closeSettingsSheet() {
  const sheet = document.getElementById('mobileSheet');
  const btn = document.getElementById('mobileSettingsBtn');
  const backdrop = document.getElementById('mobileSheetBackdrop');
  if (!sheet) return;
  sheet.classList.remove('mobile-sheet--open');
  sheet.setAttribute('aria-hidden', 'true');
  if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); }
  if (backdrop) backdrop.classList.remove('mobile-sheet-backdrop--active');
}

function toggleSettingsSheet() {
  const sheet = document.getElementById('mobileSheet');
  const btn = document.getElementById('mobileSettingsBtn');
  const backdrop = document.getElementById('mobileSheetBackdrop');
  if (!sheet) return;
  const isOpen = sheet.classList.contains('mobile-sheet--open');
  if (isOpen) {
    closeSettingsSheet();
  } else {
    // Sync current values into sheet before opening
    const mfl = document.getElementById('mobileFontLabel');
    if (mfl) mfl.textContent = fontSize;
    const msl = document.getElementById('mobileScrollSpeedLabel');
    if (msl) msl.textContent = scrollLevel;
    updateMobileChordsBtn();
    sheet.classList.add('mobile-sheet--open');
    sheet.setAttribute('aria-hidden', 'false');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-expanded', 'true'); }
    if (backdrop) backdrop.classList.add('mobile-sheet-backdrop--active');
  }
}
```

- [ ] **Step 4: Update `toggleAutoScroll` to sync mobile button**

In the existing `toggleAutoScroll` function, add a call to `updateMobileScrollBtn()` right after the two lines that update `scrollBtn`:

```js
async function toggleAutoScroll() {
  scrollActive = !scrollActive;
  const scrollBtn = document.getElementById('scrollBtn');
  scrollBtn.className = 'ctrl-btn' + (scrollActive ? ' active' : '');
  scrollBtn.setAttribute('aria-pressed', scrollActive);
  updateMobileScrollBtn();   // ← add this line
  if (scrollActive) {
    // ...rest unchanged
```

- [ ] **Step 5: Update `changeFontSize` to sync mobile label**

In `changeFontSize`, add one line after `document.getElementById('fontLabel').textContent = fontSize;`:

```js
function changeFontSize(dir) {
  fontSize = Math.max(9, Math.min(20, fontSize + dir));
  document.getElementById('fontLabel').textContent = fontSize;
  const mfl = document.getElementById('mobileFontLabel');
  if (mfl) mfl.textContent = fontSize;   // ← add this
  renderSong();
  savePrefs();
}
```

- [ ] **Step 6: Update `changeScrollSpeed` to sync mobile label**

In `changeScrollSpeed`, add one line after `document.getElementById('scrollSpeedLabel').textContent = scrollLevel;`:

```js
function changeScrollSpeed(dir) {
  scrollLevel = Math.max(1, Math.min(9, scrollLevel + dir));
  document.getElementById('scrollSpeedLabel').textContent = scrollLevel;
  const msl = document.getElementById('mobileScrollSpeedLabel');
  if (msl) msl.textContent = scrollLevel;   // ← add this
}
```

- [ ] **Step 7: Update `toggleHideChords` to sync mobile button**

In `toggleHideChords`, add one line after `document.getElementById('transposeBtns').style.display = ...`:

```js
function toggleHideChords() {
  hideChords = !hideChords;
  const btn = document.getElementById('hideChordsBtn');
  btn.className = 'ctrl-btn' + (hideChords ? '' : ' active');
  btn.setAttribute('aria-pressed', !hideChords);
  document.getElementById('transposeBtns').style.display = hideChords ? 'none' : '';
  updateMobileChordsBtn();   // ← add this
  renderSong();
  savePrefs();
}
```

- [ ] **Step 8: Close sheet when a song is selected**

In `selectSong`, inside the `if (window.innerWidth <= 768)` block, add `closeSettingsSheet()`:

```js
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
    closeSettingsSheet();   // ← add this
  }
```

- [ ] **Step 9: Expose new functions on `window`**

In the `Object.assign(window, { ... })` block at the bottom of `app.js`, add `toggleSettingsSheet` and `closeSettingsSheet`:

```js
Object.assign(window, {
  toggleSidebar, reloadSongs, changeFontSize, toggleColumns,
  toggleHideChords, transpose, toggleSongEditor, toggleAutoScroll,
  changeScrollSpeed, transposeSongData, selectSong, renderSongList,
  toggleSettingsSheet, closeSettingsSheet,   // ← add this line
});
```

- [ ] **Step 10: Commit**

```bash
git add app.js
git commit -m "feat: wire up mobile bottom bar JS controls and settings sheet"
```

---

## Task 4: Init — Sync initial state to mobile elements

**Files:**
- Modify: `app.js` — `init()` function

The mobile elements need to reflect saved preferences on page load (e.g., if the user had chords hidden, the mobile toggle should show "Dold" from the start).

- [ ] **Step 1: Add sync calls in `init()` after rendering**

In `init()`, after the line `document.getElementById('hideChordsBtn').className = ...` (around line 138), add:

```js
    // Sync initial state to mobile elements
    const mfl = document.getElementById('mobileFontLabel');
    if (mfl) mfl.textContent = fontSize;
    const msl = document.getElementById('mobileScrollSpeedLabel');
    if (msl) msl.textContent = scrollLevel;
    updateMobileChordsBtn();
```

- [ ] **Step 2: Verify initial state on reload**

1. On mobile dimensions (375px) in DevTools, open the app.
2. Use the desktop topbar to set font size to 16 and hide chords.
3. Reload the page.
4. Open the settings sheet — confirm font label shows "16" and chords toggle shows "Dold".

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: sync saved preferences to mobile settings sheet on init"
```

---

## Task 5: Manual smoke test

No automated UI tests exist in this project. Run through the golden path manually.

- [ ] **Step 1: Test on mobile dimensions (375 × 812px in DevTools)**

Open the app. Confirm:
- No topbar visible
- Bottom bar visible at bottom with ☰, "▶ Scrolla", ⚙
- ☰ opens/closes the song list sidebar
- "▶ Scrolla" starts scrolling, button turns gold and shows "■ Stopp"
- "■ Stopp" stops scrolling
- ⚙ opens the settings sheet (slides up from bottom), button gets accent border
- Tapping backdrop closes the sheet
- Font size −/+ in sheet changes the song text size
- Ackord toggle switches between "Visas" (gold) and "Dold" (grey)
- ♭/♯ transpose the song
- Scrollhastighet −/+ changes the scroll speed (test while scrolling)
- Selecting a song from sidebar closes the sidebar AND the sheet

- [ ] **Step 2: Test songs with and without bar lines**

Pick a song without bar lines (a song where all lines have no `|` in the chord field). Change font size using the settings sheet. Confirm the bottom bar does NOT jump or change height.

- [ ] **Step 3: Test on desktop (≥769px)**

Switch DevTools to desktop width. Confirm:
- Topbar is visible with all original controls
- Bottom bar is NOT visible
- All desktop controls (columns, edit, font, chords, transpose, scroll) work as before

- [ ] **Step 4: Final commit**

```bash
git add -p   # review any unstaged changes
git commit -m "test: verify mobile menu redesign works end-to-end"
```

---

## Potential Pitfalls

- **`scrollBtn` null crash on desktop**: All mobile helper functions guard with `if (!btn) return` — safe on desktop where the elements don't exist.
- **iOS safe area**: The `env(safe-area-inset-bottom)` in padding handles the home indicator notch on iPhone. Verify on a real iPhone if possible.
- **Sheet z-index vs chord popup**: The chord popup uses `z-index: 500`. The sheet is `z-index: 140`. No conflict — they can't both be open simultaneously (tapping a chord diagram would be behind the sheet).

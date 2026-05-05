# Song Variant Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to clone songs and quickly experiment with different chord arrangements, then save variants as independent song files.

**Architecture:** Add a new "Variant Editor" view alongside the existing Song Editor. Users click [Clone] in the Song Editor, which opens the Variant Editor with a copy of the song's data. Macros allow bulk modifications (transpose, extend/shorten measures). Changes preview in real-time. Saving creates a new song file and updates `songs/index.json`.

**Tech Stack:** Vanilla JavaScript (app.js), CSS (style.css), existing `validateSong()` and `transposeChord()` functions.

---

## File Structure

**Files to modify:**
- `app.js` — Add Clone button, Variant Editor UI rendering, macro functions, event handlers
- `style.css` — Styles for Variant Editor and macro controls
- `SONGS_GUIDE.md` — Document that variants are just cloned songs

**Files unchanged:**
- `server.py`, `chords.js`, `sw.js`, `index.html`

---

## Task 1: Add [Clone] Button to Song Editor

**Files:**
- Modify: `app.js:930-935`

- [ ] **Step 1: Find the [Arkivera] button in renderSongEditor()**

In `app.js`, search for the line with `mobileArchiveBtn` or similar. This is where mobile buttons are added in the song editor.

- [ ] **Step 2: Add Clone button HTML next to Arkivera button**

In the metadata section of `renderSongEditor()`, after the [Arkivera] button, add:

```html
<button class="sed-btn" id="sed-clone-btn">🔄 Klona</button>
```

Add this line right before the closing `</div>` of the metadata card (around line 935).

- [ ] **Step 3: Add click handler for Clone button**

At the end of `renderSongEditor()` function, add to the button setup section:

```javascript
const cloneBtn = document.getElementById('sed-clone-btn');
if (cloneBtn) {
  cloneBtn.addEventListener('click', () => toggleVariantEditor(songs[currentSong]));
}
```

- [ ] **Step 4: Verify button appears**

Reload the app, open a song in editor mode, confirm [Klona] button appears next to [Arkivera] button. Don't click it yet (function doesn't exist).

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: add Clone button to song editor"
```

---

## Task 2: Add Variant Editor State Variables

**Files:**
- Modify: `app.js:29-35` (with other global state variables)

- [ ] **Step 1: Add variant editor mode flag**

Near the top of `app.js`, after `let songEditorMode = false;`, add:

```javascript
let variantEditorMode = false;
let variantEditorSong = null; // Copy of original song being edited
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add variant editor state variables"
```

---

## Task 3: Implement toggleVariantEditor() Function

**Files:**
- Modify: `app.js` (add new function after `toggleSongEditor()`)

- [ ] **Step 1: Write toggleVariantEditor function**

After the `toggleSongEditor()` function (around line 740), add:

```javascript
function toggleVariantEditor(song) {
  if (!song) return;
  variantEditorMode = true;
  // Create a deep copy of the song
  variantEditorSong = JSON.parse(JSON.stringify(song));
  // Modify title to indicate it's a variant
  variantEditorSong.title = (song.title || '') + ' (variant)';
  variantEditorSong._originalFilename = song._filename;
  renderVariantEditor();
}

function closeVariantEditor() {
  variantEditorMode = false;
  variantEditorSong = null;
  renderSong();
}
```

- [ ] **Step 2: Update init() to handle variant editor display**

In the `init()` function, find where `songEditorMode` display logic is handled (around line 435-440). Add similar logic for variant editor:

```javascript
if (variantEditorMode) { songEditorMode = false; updateMobileEditorBtn(); }
```

- [ ] **Step 3: Update renderSong() to show variant editor instead of song display**

In `renderSong()` function, after the line checking `if (songEditorMode)`, add:

```javascript
if (variantEditorMode) {
  const display = document.querySelector('.sheet-display');
  if (display) display.innerHTML = renderVariantEditor();
  return;
}
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: implement toggleVariantEditor and closeVariantEditor functions"
```

---

## Task 4: Implement renderVariantEditor() - Header Section

**Files:**
- Modify: `app.js` (add new function after `renderSongEditor()`)

- [ ] **Step 1: Create renderVariantEditor() function skeleton**

After `renderSongEditor()` (around line 1100), add:

```javascript
function renderVariantEditor() {
  const s = variantEditorSong;
  if (!s) return '';
  
  let html = `<div class="variant-editor">`;
  
  // Header
  html += `<div class="variant-editor-header">
    <h2>Variant av ${escHtml(s._originalFilename ? songs.find(song => song._filename === s._originalFilename)?.title || 'låt' : 'låt')}</h2>
    <button class="variant-editor-back" onclick="closeVariantEditor()">← Tillbaka</button>
  </div>`;
  
  // Rest of sections will go here
  
  html += `</div>`;
  return html;
}
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add renderVariantEditor function with header"
```

---

## Task 5: Implement renderVariantEditor() - Chord Templates Section

**Files:**
- Modify: `app.js` (expand renderVariantEditor function)

- [ ] **Step 1: Add chord templates section to renderVariantEditor()**

Inside `renderVariantEditor()`, right before the closing `</div>`, add the templates section:

```javascript
  // Chord Templates Section
  const tplNames = s.chordTemplates ? Object.keys(s.chordTemplates) : [];
  html += `<div class="variant-editor-card">
    <div class="variant-editor-card-title">Ackordmallar</div>
    <div class="variant-tpl-list">`;
  
  tplNames.forEach(name => {
    const tplStr = s.chordTemplates[name] || '';
    const measures = tplStr.split('|');
    html += `<div class="variant-tpl-row">
      <input class="variant-tpl-name" data-name="${escHtml(name)}" value="${escHtml(name)}" placeholder="mallnamn">
      <span class="variant-colon">:</span>
      <div class="variant-tpl-measures">`;
    
    measures.forEach((m, mi) => {
      const ms = Math.max(4, m.length + 2);
      html += `<input class="variant-tpl-measure" 
        data-name="${escHtml(name)}" 
        data-mi="${mi}" 
        value="${escHtml(m)}" 
        size="${ms}" 
        placeholder="ackord">
        <button class="variant-btn variant-btn--add" 
          data-name="${escHtml(name)}" 
          data-mi="${mi}" 
          onclick="addMeasureToTemplate('${escHtml(name)}', ${mi})">+</button>`;
      if (measures.length > 1) {
        html += `<button class="variant-btn variant-btn--danger" 
          data-name="${escHtml(name)}" 
          data-mi="${mi}" 
          onclick="removeMeasureFromTemplate('${escHtml(name)}', ${mi})">−</button>`;
      }
    });
    
    html += `</div></div>`;
  });
  
  html += `</div></div>`;
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add chord templates section to variant editor"
```

---

## Task 6: Implement Macro Tool Functions

**Files:**
- Modify: `app.js` (add new functions)

- [ ] **Step 1: Implement transposeAllChords()**

After `closeVariantEditor()`, add:

```javascript
function transposeAllChords(semitones) {
  if (!variantEditorSong || !variantEditorSong.chordTemplates) return;
  
  Object.keys(variantEditorSong.chordTemplates).forEach(tplName => {
    const chords = variantEditorSong.chordTemplates[tplName].split('|');
    const transposed = chords.map(chord => {
      if (!chord || chord === '.') return chord;
      return transposeChord(chord, semitones);
    });
    variantEditorSong.chordTemplates[tplName] = transposed.join('|');
  });
  
  // Update key
  const currentKey = variantEditorSong.key || 'C';
  variantEditorSong.key = transposeChord(currentKey, semitones);
  
  renderVariantEditor();
}
```

- [ ] **Step 2: Implement extendAllMeasures()**

```javascript
function extendAllMeasures() {
  if (!variantEditorSong || !variantEditorSong.chordTemplates) return;
  
  Object.keys(variantEditorSong.chordTemplates).forEach(tplName => {
    const tpl = variantEditorSong.chordTemplates[tplName];
    variantEditorSong.chordTemplates[tplName] = tpl + '|';
  });
  
  renderVariantEditor();
}
```

- [ ] **Step 3: Implement shortenAllMeasures()**

```javascript
function shortenAllMeasures() {
  if (!variantEditorSong || !variantEditorSong.chordTemplates) return;
  
  Object.keys(variantEditorSong.chordTemplates).forEach(tplName => {
    const measures = variantEditorSong.chordTemplates[tplName].split('|');
    if (measures.length > 1) {
      measures.pop();
      variantEditorSong.chordTemplates[tplName] = measures.join('|');
    }
  });
  
  renderVariantEditor();
}
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: implement macro functions for variant editor"
```

---

## Task 7: Implement renderVariantEditor() - Macro Tools Section

**Files:**
- Modify: `app.js` (expand renderVariantEditor function)

- [ ] **Step 1: Add macro tools section**

In `renderVariantEditor()`, before the closing `</div>` of the main container, add:

```javascript
  // Macro Tools Section
  html += `<div class="variant-editor-card">
    <div class="variant-editor-card-title">Makro-verktyg</div>
    <div class="variant-macro-buttons">
      <button class="variant-btn variant-macro-btn" onclick="transposeAllChords(1)">▲ Transponera +1</button>
      <button class="variant-btn variant-macro-btn" onclick="transposeAllChords(-1)">▼ Transponera -1</button>
      <button class="variant-btn variant-macro-btn" onclick="extendAllMeasures()">➕ Förläng verser</button>
      <button class="variant-btn variant-macro-btn" onclick="shortenAllMeasures()">➖ Förkorta verser</button>
    </div>
  </div>`;
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add macro tools section to variant editor"
```

---

## Task 8: Implement renderVariantEditor() - Live Preview Section

**Files:**
- Modify: `app.js` (expand renderVariantEditor function)

- [ ] **Step 1: Add live preview section**

In `renderVariantEditor()`, after the macro section, add:

```javascript
  // Live Preview Section
  html += `<div class="variant-editor-card">
    <div class="variant-editor-card-title">Förhandsvisning</div>
    <div class="variant-preview">`;
  
  // Render the variant song using existing renderSong logic
  s.sections.forEach((sec, si) => {
    html += `<div class="variant-section">
      <h3>${escHtml(sec.label)}</h3>`;
    
    sec.lines.forEach(line => {
      const chords = (line.c || '').startsWith('@')
        ? (s.chordTemplates[(line.c || '').slice(1)] || '')
        : (line.c || '');
      const chordArr = chords.split('|');
      const textParts = (line.l || '').split('|');
      
      html += `<div class="variant-line">
        <div class="variant-chords">${chordArr.map(c => `<span>${escHtml(c)}</span>`).join('')}</div>
        <div class="variant-text">${textParts.map(t => `<span>${escHtml(t)}</span>`).join('')}</div>
      </div>`;
    });
    
    html += `</div>`;
  });
  
  html += `</div></div>`;
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add live preview to variant editor"
```

---

## Task 9: Implement Template Editing Functions

**Files:**
- Modify: `app.js` (add new functions)

- [ ] **Step 1: Implement addMeasureToTemplate()**

After the macro functions, add:

```javascript
function addMeasureToTemplate(tplName, afterIndex) {
  if (!variantEditorSong || !variantEditorSong.chordTemplates[tplName]) return;
  
  const measures = variantEditorSong.chordTemplates[tplName].split('|');
  measures.splice(afterIndex + 1, 0, '');
  variantEditorSong.chordTemplates[tplName] = measures.join('|');
  
  renderVariantEditor();
}
```

- [ ] **Step 2: Implement removeMeasureFromTemplate()**

```javascript
function removeMeasureFromTemplate(tplName, index) {
  if (!variantEditorSong || !variantEditorSong.chordTemplates[tplName]) return;
  
  const measures = variantEditorSong.chordTemplates[tplName].split('|');
  if (measures.length > 1) {
    measures.splice(index, 1);
    variantEditorSong.chordTemplates[tplName] = measures.join('|');
  }
  
  renderVariantEditor();
}
```

- [ ] **Step 3: Add live update for template editing**

In `renderVariantEditor()`, update the template input creation to include an `onchange` handler:

Change:
```javascript
<input class="variant-tpl-measure" 
  data-name="${escHtml(name)}" 
  data-mi="${mi}" 
  value="${escHtml(m)}" 
  size="${ms}" 
  placeholder="ackord">
```

To:
```javascript
<input class="variant-tpl-measure" 
  data-name="${escHtml(name)}" 
  data-mi="${mi}" 
  value="${escHtml(m)}" 
  size="${ms}" 
  placeholder="ackord"
  onchange="updateTemplateMeasure('${escHtml(name)}', ${mi}, this.value)">
```

And add the update function:

```javascript
function updateTemplateMeasure(tplName, index, newChord) {
  if (!variantEditorSong || !variantEditorSong.chordTemplates[tplName]) return;
  
  const measures = variantEditorSong.chordTemplates[tplName].split('|');
  measures[index] = newChord;
  variantEditorSong.chordTemplates[tplName] = measures.join('|');
  
  renderVariantEditor();
}
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: implement template measure add/remove/update functions"
```

---

## Task 10: Implement renderVariantEditor() - Save Section

**Files:**
- Modify: `app.js` (expand renderVariantEditor function)

- [ ] **Step 1: Add save section**

In `renderVariantEditor()`, right before the closing `</div>`, add:

```javascript
  // Save Section
  html += `<div class="variant-editor-card">
    <button class="variant-btn variant-btn--primary" onclick="openVariantSaveDialog()">💾 Spara som ny låt</button>
  </div>`;
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add save section to variant editor"
```

---

## Task 11: Implement Save Dialog and Saving

**Files:**
- Modify: `app.js` (add new functions)

- [ ] **Step 1: Implement openVariantSaveDialog()**

After the template functions, add:

```javascript
function openVariantSaveDialog() {
  if (!variantEditorSong) return;
  
  const s = variantEditorSong;
  const defaultFilename = (s._originalFilename || 'song').replace('.json', '') + '_variant_' + Date.now();
  
  const dialog = document.createElement('div');
  dialog.className = 'variant-save-dialog-overlay';
  dialog.innerHTML = `
    <div class="variant-save-dialog">
      <h3>Spara som ny låt</h3>
      <label>Titel
        <input class="variant-dialog-input" id="variant-save-title" value="${escHtml(s.title || '')}" placeholder="Låtens namn">
      </label>
      <label>Artist
        <input class="variant-dialog-input" id="variant-save-artist" value="${escHtml(s.artist || '')}" placeholder="Artist">
      </label>
      <label>Tonart
        <input class="variant-dialog-input" id="variant-save-key" value="${escHtml(s.key || '')}" placeholder="Am, C, G, etc">
      </label>
      <div class="variant-dialog-actions">
        <button class="variant-btn variant-btn--primary" onclick="saveVariantSong('${escHtml(defaultFilename)}')">Spara</button>
        <button class="variant-btn" onclick="closeVariantSaveDialog()">Avbryt</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  document.getElementById('variant-save-title').focus();
}

function closeVariantSaveDialog() {
  const dialog = document.querySelector('.variant-save-dialog-overlay');
  if (dialog) dialog.remove();
}
```

- [ ] **Step 2: Implement saveVariantSong()**

```javascript
async function saveVariantSong(defaultFilename) {
  if (!variantEditorSong) return;
  
  const title = document.getElementById('variant-save-title')?.value || variantEditorSong.title;
  const artist = document.getElementById('variant-save-artist')?.value || variantEditorSong.artist;
  const key = document.getElementById('variant-save-key')?.value || variantEditorSong.key;
  
  // Update metadata
  variantEditorSong.title = title;
  variantEditorSong.artist = artist;
  variantEditorSong.key = key;
  
  // Generate filename from title
  let filename = title.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '') + '.json';
  
  // Validate song
  const errors = validateSong(variantEditorSong);
  if (errors.length > 0) {
    alert('Valideringsfel:\n' + errors.join('\n'));
    return;
  }
  
  // Save to server
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isLocal) {
    alert('Kan bara spara lokalt. Varianterna är en development-feature.');
    return;
  }
  
  try {
    const response = await fetch('/save-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        content: {
          title: variantEditorSong.title,
          artist: variantEditorSong.artist,
          key: variantEditorSong.key,
          timeSignature: variantEditorSong.timeSignature,
          difficulty: variantEditorSong.difficulty,
          capio: variantEditorSong.capio,
          chordTemplates: variantEditorSong.chordTemplates,
          sections: variantEditorSong.sections
        }
      })
    });
    
    if (response.ok) {
      // Update songs/index.json
      const indexResp = await fetch('songs/index.json');
      const songFiles = await indexResp.json();
      if (!songFiles.includes(filename)) {
        songFiles.push(filename);
        await fetch('/save-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: 'index.json',
            content: songFiles,
            isIndex: true
          })
        });
      }
      
      // Close dialog and editor
      closeVariantSaveDialog();
      closeVariantEditor();
      
      // Reload songs and show confirmation
      await loadSongs(true);
      alert('Låten "' + title + '" sparades!');
    } else {
      alert('Fel vid sparning: ' + response.statusText);
    }
  } catch (e) {
    alert('Fel: ' + e.message);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: implement save dialog and variant saving"
```

---

## Task 12: Add Clone Button Local/Production Control

**Files:**
- Modify: `app.js` (update renderSongEditor)

- [ ] **Step 1: Hide Clone button in production**

In `renderSongEditor()`, after the Clone button HTML creation, add an `if (isLocal)` check:

Change the Clone button creation to:

```javascript
if (isLocal) {
  html += `<button class="sed-btn" id="sed-clone-btn">🔄 Klona</button>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: hide Clone button in production (GitHub Pages)"
```

---

## Task 13: Add CSS Styling for Variant Editor

**Files:**
- Modify: `style.css` (add new styles)

- [ ] **Step 1: Add variant editor container styles**

At the end of `style.css`, add:

```css
/* Variant Editor */
.variant-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  background: var(--bg-color, #fff);
}

.variant-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--border-color, #ddd);
  padding-bottom: 1rem;
}

.variant-editor-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.variant-editor-back {
  padding: 0.5rem 1rem;
  background: var(--btn-bg, #f0f0f0);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.variant-editor-back:hover {
  background: var(--btn-hover-bg, #e0e0e0);
}

.variant-editor-card {
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  padding: 1rem;
  background: var(--card-bg, #fafafa);
}

.variant-editor-card-title {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-color, #333);
}

.variant-tpl-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.variant-tpl-name {
  flex: 0 1 100px;
  padding: 0.5rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 0.9rem;
}

.variant-colon {
  font-weight: bold;
  margin: 0 0.25rem;
}

.variant-tpl-measures {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 300px;
}

.variant-tpl-measure {
  padding: 0.5rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: monospace;
}

.variant-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--btn-bg, #f0f0f0);
  cursor: pointer;
  font-size: 0.85rem;
}

.variant-btn:hover {
  background: var(--btn-hover-bg, #e0e0e0);
}

.variant-btn--danger {
  color: var(--danger-color, #d32f2f);
  border-color: var(--danger-color, #d32f2f);
}

.variant-btn--primary {
  background: var(--primary-color, #1976d2);
  color: white;
  border-color: var(--primary-color, #1976d2);
  font-weight: bold;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.variant-btn--primary:hover {
  background: var(--primary-hover, #1565c0);
}

.variant-macro-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.variant-macro-btn {
  padding: 0.75rem 1rem;
  background: var(--accent-color, #ff9800);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.variant-macro-btn:hover {
  opacity: 0.9;
}

.variant-preview {
  background: var(--preview-bg, #fff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.6;
}

.variant-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #ddd);
}

.variant-section h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: var(--primary-color, #1976d2);
}

.variant-line {
  margin-bottom: 0.5rem;
}

.variant-chords {
  color: var(--primary-color, #1976d2);
  font-weight: bold;
  word-spacing: 0.5rem;
}

.variant-text {
  color: var(--text-color, #333);
  word-spacing: 0.5rem;
}

/* Save Dialog */
.variant-save-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.variant-save-dialog {
  background: var(--card-bg, #fff);
  border-radius: 8px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.variant-save-dialog h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
}

.variant-save-dialog label {
  display: block;
  margin-bottom: 1rem;
  font-weight: 500;
}

.variant-dialog-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  margin-top: 0.25rem;
}

.variant-dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .variant-tpl-row {
    flex-direction: column;
  }
  
  .variant-tpl-measures {
    min-width: auto;
    width: 100%;
  }
  
  .variant-macro-buttons {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add CSS styling for variant editor"
```

---

## Task 14: Update SONGS_GUIDE.md with Variant Information

**Files:**
- Modify: `SONGS_GUIDE.md`

- [ ] **Step 1: Add section about variants**

At the end of SONGS_GUIDE.md, before "Tips", add:

```markdown
## Skapa varianter

Du kan enkelt skapa varianter av befintliga låtar för att testa nya arrangemang:

1. Öppna låten i redigeringsvyn
2. Klicka [Klona]-knappen (visas bara lokalt)
3. Variant Editor öppnas med en kopia av låten
4. Gör ändringar:
   - **Ackord**: Redigera ackordsmallar direkt eller använd macro-knapparna
   - **Makron**: Transponera, förläng/förkorta verser med en klick
5. Förhandsvisa ändringar i real-time
6. Klicka [Spara som ny låt] när du är nöjd
7. Ny låt visas i menyn

Varianterna sparas som helt oberoende låtfiler — ingen länkning till originalet.
```

- [ ] **Step 2: Commit**

```bash
git add SONGS_GUIDE.md
git commit -m "docs: add song variant creation guide"
```

---

## Task 15: Manual Testing

**Files:**
- Test: No files modified; manual UI testing only

- [ ] **Step 1: Run the app locally**

```bash
npm run dist
python server.py
```

Open `http://localhost:8000` in browser.

- [ ] **Step 2: Test clone flow**

1. Open "Bella Ciao" or another existing song
2. Click [Redigerare] button to enter editor mode
3. Verify [Klona] button appears next to [Arkivera]
4. Click [Klona]
5. Verify Variant Editor opens with pre-filled data (title shows "Bella Ciao (variant)")
6. Verify [← Tillbaka] button appears

- [ ] **Step 3: Test macro: Transpose**

1. In Variant Editor, click [▲ Transponera +1]
2. Check live preview: All chords shift up by 1 semitone (Am → A#m, etc.)
3. Verify key field shows new key (if Am, should be A#m)
4. Click [▼ Transponera -1]
5. Verify chords return to original

- [ ] **Step 4: Test macro: Extend/Shorten**

1. In Variant Editor, click [➕ Förläng verser]
2. Check chord templates: Each one gains an extra `|` at end
3. Live preview updates
4. Click [➖ Förkorta verser]
5. Verify extra measure removed

- [ ] **Step 5: Test direct template editing**

1. In chord templates section, manually edit one chord (e.g., change "Am" to "C")
2. Live preview updates immediately
3. Click [+] next to a chord to add a measure
4. Click [−] to remove a measure
5. Verify preview updates

- [ ] **Step 6: Test save dialog**

1. Click [💾 Spara som ny låt]
2. Verify modal appears with pre-filled title, artist, key
3. Edit title to something like "Bella Ciao Slow"
4. Click [Spara]
5. Verify success message
6. Return to main menu
7. Search songs: "Slow" should appear in list
8. Open new variant song
9. Verify changes were saved (chords, transposition, etc.)

- [ ] **Step 7: Test error handling**

1. Clone a song
2. Edit to have invalid chord (e.g., "Xyz")
3. Try to save
4. Should warn about invalid chord but allow save
5. Try to save with same name as existing song
6. Should warn about duplicate filename

- [ ] **Step 8: Test archived song cloning**

1. Archive a song (e.g., "Amazing Grace")
2. Open archived song
3. Verify [Klona] button NOT visible (archived songs can't be edited directly)
4. Go back, find original song if available
5. Clone it successfully

- [ ] **Step 9: Test production mode**

1. Build for production: `npm run dist`
2. Verify `dist/` updated
3. Verify in production (non-localhost), Clone button does NOT appear
4. In dev mode (localhost), button appears

- [ ] **Step 10: Commit test results**

No code commit needed for manual testing. Just verify everything works as expected.

---

## Summary

This plan implements the complete Song Variant Workflow:

✅ Clone button in Song Editor  
✅ Variant Editor view with chord templates  
✅ Macro tools (transpose, extend/shorten)  
✅ Live preview of changes  
✅ Save dialog and variant saving  
✅ Local/production controls  
✅ CSS styling  
✅ Documentation  

All acceptance criteria from the design are covered.

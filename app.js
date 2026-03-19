// ─── Körhäftet — app.js ───

const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Songs loaded dynamically from songs/ folder
let songs = [];

// ─── State ───
let currentSong = 0;
let transposeSemitones = 0;
let fontSize = 13;
let twoColumns = false;
let sidebarHidden = false;
let editMode = false;
let chordOffsets = {};
let storageReady = false;
let saveTimeout = null;

const STORAGE_KEY = 'korhaftet-chord-offsets';
const PREFS_KEY = 'korhaftet-preferences';

// ─── Song Loading ───
async function loadSongs() {
  try {
    const indexResp = await fetch('songs/index.json');
    if (!indexResp.ok) throw new Error('Could not load songs/index.json');
    const songFiles = await indexResp.json();

    const loaded = await Promise.all(
      songFiles.map(async (filename) => {
        try {
          const resp = await fetch(`songs/${filename}`);
          if (!resp.ok) return null;
          const song = await resp.json();
          song._filename = filename;
          return song;
        } catch (e) {
          console.warn(`Could not load songs/${filename}:`, e);
          return null;
        }
      })
    );

    songs = loaded.filter(s => s !== null);

    // Update subtitle with song count
    const subtitle = document.querySelector('.sidebar-header p');
    if (subtitle) subtitle.textContent = `${songs.length} låtar — ackord & text`;

  } catch (e) {
    console.error('Failed to load song index:', e);
    document.getElementById('songDisplay').innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--text-dim)">
        <p style="font-size:40px;margin-bottom:12px">⚠️</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:13px">
          Kunde inte ladda låtfiler.<br>
          Kontrollera att songs/index.json finns.
        </p>
      </div>`;
  }
}

// ─── Persistent Storage (localStorage) ───
async function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) chordOffsets = JSON.parse(raw);
  } catch (e) {
    chordOffsets = {};
  }

  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.fontSize) fontSize = p.fontSize;
      if (p.twoColumns !== undefined) twoColumns = p.twoColumns;
      if (p.sidebarHidden !== undefined) sidebarHidden = p.sidebarHidden;
      if (p.currentSong !== undefined) currentSong = p.currentSong;
    }
  } catch (e) {}

  storageReady = true;
}

async function saveOffsets() {
  if (!storageReady) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chordOffsets));
    flashSaveIndicator();
  } catch (e) {
    console.error('Failed to save offsets:', e);
  }
}

async function savePrefs() {
  if (!storageReady) return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ fontSize, twoColumns, sidebarHidden, currentSong }));
  } catch (e) {
    console.error('Failed to save prefs:', e);
  }
}

function debouncedSaveOffsets() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveOffsets();
    saveCurrentSongToFile();
  }, 800);
}

function flashSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

// ─── Init ───
async function init() {
  try {
    await loadFromStorage();
    await loadSongs();

    if (songs.length === 0) {
      document.getElementById('songDisplay').innerHTML =
        `<div style="padding:40px;color:#f66;font-family:monospace">Inga låtar laddades. Kontrollera konsolen.</div>`;
      return;
    }

    // Clamp currentSong to valid range
    if (currentSong >= songs.length) currentSong = 0;

    const list = document.getElementById('songList');
    list.innerHTML = '';
    songs.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'song-item' + (i === currentSong ? ' active' : '');
      div.innerHTML = `
        <div class="song-title">${s.title}</div>
        <div class="song-artist">${s.artist}</div>
        <div class="song-meta">
          <span class="tag">${s.key}</span>
          <span class="tag">${s.difficulty}</span>
          ${s.bpm ? `<span class="tag">${s.bpm} bpm</span>` : ''}
        </div>
      `;
      div.onclick = () => selectSong(i);
      list.appendChild(div);
    });

    document.getElementById('fontLabel').textContent = fontSize;
    document.getElementById('colBtn').className = 'ctrl-btn' + (twoColumns ? ' active' : '');
    if (sidebarHidden && window.innerWidth > 768) {
      document.querySelector('.app').classList.add('sidebar-hidden');
    }
    renderSong();
  } catch (e) {
    console.error('init() kraschade:', e);
    document.getElementById('songDisplay').innerHTML =
      `<div style="padding:40px;color:#f66;font-family:monospace">Startfel: ${e.message}<br><pre style="font-size:11px;margin-top:8px;opacity:.7">${e.stack}</pre></div>`;
  }
}

function selectSong(idx) {
  currentSong = idx;
  transposeSemitones = 0;
  document.getElementById('transposeBadge').style.display = 'none';
  document.querySelectorAll('.song-item').forEach((el, i) => {
    el.className = 'song-item' + (i === idx ? ' active' : '');
  });
  renderSong();
  savePrefs();
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  }
}

// ─── Chord parsing ───
function parseChordLine(chordStr) {
  const chords = [];
  const regex = /(\S+)/g;
  let m;
  while ((m = regex.exec(chordStr)) !== null) {
    chords.push({ name: m[1], pos: m.index });
  }
  return chords;
}

function transposeChordName(chord, semitones) {
  if (semitones === 0) return chord;
  return chord.replace(/(?<![A-Za-z])([A-G])(#|b)?/g, (match, note, acc) => {
    let idx = NOTES_SHARP.indexOf(note + (acc || ''));
    if (idx === -1) idx = NOTES_FLAT.indexOf(note + (acc || ''));
    if (idx === -1) return match;
    let newIdx = (idx + semitones + 12) % 12;
    return semitones >= 0 ? NOTES_SHARP[newIdx] : NOTES_FLAT[newIdx];
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Render ───
let chWidthCache = 8;

function measureChWidth() {
  const probe = document.createElement('span');
  probe.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:'+fontSize+'px;position:absolute;visibility:hidden;white-space:pre';
  probe.textContent = '0';
  document.body.appendChild(probe);
  chWidthCache = probe.getBoundingClientRect().width || 8;
  document.body.removeChild(probe);
}

function renderSong() {
  if (songs.length === 0) return;
  try {
  measureChWidth();
  const s = songs[currentSong];
  const display = document.getElementById('songDisplay');
  const transposedKey = transposeSemitones !== 0
    ? transposeChordName(s.key, transposeSemitones) : s.key;

  let info = `Tonart: ${transposedKey}`;
  if (s.timeSignature) info += ` · ${s.timeSignature}`;
  if (s.bpm) info += ` · ${s.bpm} bpm`;
  info += ` · ${s.difficulty}`;

  let html = `
    <div class="header">
      <h2>${s.title}</h2>
      <div class="artist">${s.artist}</div>
      <div class="info">${info}</div>
    </div>
  `;

  // Chord diagrams
  if (typeof renderChordDiagrams === 'function') {
    html += renderChordDiagrams(s, transposeSemitones);
  }

  if (editMode) {
    html += `<div class="edit-banner">
      <span class="icon">↔</span>
      <span>Redigeringsläge — dra ackord · klicka text för att redigera · klicka taktstreck (×) för att ta bort · +| för att lägga till</span>
    </div>`;
  }

  html += `<div class="song-body" style="font-size:${fontSize}px">`;

  s.sections.forEach((sec, si) => {
    html += `<div class="song-block" data-section="${si}">`;
    html += `<div class="section-label">${escHtml(sec.label)}</div>`;

    sec.lines.forEach((line, li) => {
      // Resolve chord template reference: "c": "@mallnamn" → lookup in s.chordTemplates
      const rawC = line.c || '';
      const cStr = rawC.startsWith('@') && s.chordTemplates
        ? (s.chordTemplates[rawC.slice(1)] || '')
        : rawC;
      const cMeasures = cStr.split('|');
      const lMeasures = (line.l || '').split('|');
      const isMultiMeasure = cMeasures.length > 1;

      // Display only: if a measure boundary falls mid-word, move the
      // trailing fragment to the start of the next measure so the full
      // word appears together. Edit mode always shows the raw data.
      const displayLyrics = [...lMeasures];
      if (!editMode) {
        for (let mi = 0; mi < displayLyrics.length - 1; mi++) {
          const cur = displayLyrics[mi] || '';
          const nxt = displayLyrics[mi + 1] || '';
          if (cur.length > 0 && cur[cur.length - 1] !== ' ' &&
              nxt.length > 0 && nxt[0] !== ' ') {
            const m = cur.match(/\S+$/);
            if (m && cur.length > m[0].length) {
              displayLyrics[mi] = cur.slice(0, cur.length - m[0].length);
              displayLyrics[mi + 1] = m[0] + nxt;
            }
          }
        }
      }

      if (isMultiMeasure) html += `<div class="cl-line-measures">`;

      cMeasures.forEach((cPart, mi) => {
        const chords = parseChordLine(cPart);
        const lyric = displayLyrics[mi] || '';

        // Open a row group every 2 measures (for 2+2 mobile layout)
        if (isMultiMeasure && mi % 2 === 0) html += `<div class="cl-measure-row">`;

        // Barline within a row group (mi=1, 3, 5…); NOT at row boundaries (mi=2, 4…)
        if (mi > 0 && (!isMultiMeasure || mi % 2 !== 0)) {
          html += editMode
            ? `<div class="cl-measure-bar cl-bar-edit" data-si="${si}" data-li="${li}" data-left="${mi-1}" title="Klicka för att ta bort taktstreck"></div>`
            : `<div class="cl-measure-bar"></div>`;
        }

        if (editMode) {
          html += `<div class="cl-abs-pair">`;
          if (chords.length > 0) {
            html += `<div class="cl-abs-chord-row">`;
            chords.forEach((ch, ci) => {
              const key = `${currentSong}-${si}-${li}-${mi}-${ci}`;
              const offset = chordOffsets[key] || 0;
              const name = transposeSemitones !== 0
                ? transposeChordName(ch.name, transposeSemitones) : ch.name;
              html += `<span class="chord-tag editable" `
                + `data-key="${key}" `
                + `data-base-pos="${ch.pos}" `
                + `style="left:calc(${ch.pos}ch + ${offset}px)">`
                + `${escHtml(name)}</span>`;
            });
            html += `</div>`;
          }
          html += `<div class="cl-abs-lyric-row cl-lyric-edit" contenteditable="true" spellcheck="false" `
            + `data-si="${si}" data-li="${li}" data-mi="${mi}">${escHtml(lyric)}</div>`;
          html += `<button class="cl-add-bar-btn" data-si="${si}" data-li="${li}" data-after="${mi}" title="Lägg till taktstreck">+|</button>`;
          html += `</div>`;
        } else {
          if (isMultiMeasure) {
            // Multi-measure display: abs-positioned chords + full-width justified lyric
            html += `<div class="cl-abs-pair">`;
            if (chords.length > 0) {
              html += `<div class="cl-abs-chord-row">`;
              chords.forEach((ch, ci) => {
                const key = `${currentSong}-${si}-${li}-${mi}-${ci}`;
                const offset = chordOffsets[key] || 0;
                const name = transposeSemitones !== 0
                  ? transposeChordName(ch.name, transposeSemitones) : ch.name;
                html += `<span class="chord-tag" style="left:calc(${ch.pos}ch + ${offset}px)">${escHtml(name)}</span>`;
              });
              html += `</div>`;
            }
            if (lyric.trim()) {
              html += `<div class="cl-display-lyric">${escHtml(lyric)}</div>`;
            }
            html += `</div>`;
          } else {
            // Single-measure: segment-based rendering with word-wrap
            if (chords.length > 0 && lyric.trim()) {
              html += `<div class="cl-pair cl-pair--chords">`;
              const snappedStarts = chords.map((ch, ci) => {
                const key = `${currentSong}-${si}-${li}-${mi}-${ci}`;
                const pxOffset = chordOffsets[key] || 0;
                const charShift = Math.round(pxOffset / chWidthCache);
                let pos = Math.max(0, ch.pos + charShift);
                while (pos > 0 && lyric[pos - 1] !== ' ') pos--;
                return pos;
              });
              chords.forEach((ch, ci) => {
                const startPos = snappedStarts[ci];
                const nextPos = ci < chords.length - 1 ? snappedStarts[ci + 1] : lyric.length;
                const textSlice = lyric.substring(startPos, Math.max(startPos, nextPos));
                if (ci === 0 && startPos > 0) {
                  const pre = lyric.substring(0, startPos);
                  html += `<span class="cl-segment-chord"><span class="chord-name">&nbsp;</span><span class="chord-text">${escHtml(pre)}</span></span>`;
                }
                const name = transposeSemitones !== 0
                  ? transposeChordName(ch.name, transposeSemitones) : ch.name;
                html += `<span class="cl-segment-chord"><span class="chord-name">${escHtml(name)}</span><span class="chord-text">${escHtml(textSlice)}</span></span>`;
              });
              html += `</div>`;
            } else if (chords.length > 0 && !lyric.trim()) {
              html += `<div class="cl-chord-only">`;
              chords.forEach((ch, ci) => {
                const key = `${currentSong}-${si}-${li}-${mi}-${ci}`;
                const pxOffset = chordOffsets[key] || 0;
                const charShift = Math.round(pxOffset / chWidthCache);
                const startPos = Math.max(0, ch.pos + charShift);
                const nextPos = ci < chords.length - 1
                  ? Math.max(0, chords[ci+1].pos + Math.round((chordOffsets[`${currentSong}-${si}-${li}-${mi}-${ci+1}`] || 0) / chWidthCache))
                  : startPos + ch.name.length + 2;
                const spacing = ' '.repeat(Math.max(1, nextPos - startPos - ch.name.length));
                const name = transposeSemitones !== 0
                  ? transposeChordName(ch.name, transposeSemitones) : ch.name;
                html += `<span class="chord-name">${escHtml(name)}</span>`;
                if (ci < chords.length - 1) html += `<span>${escHtml(spacing)}</span>`;
              });
              html += `</div>`;
            } else if (lyric.trim()) {
              html += `<div class="cl-pair"><span class="cl-segment-plain">${escHtml(lyric)}</span></div>`;
            }
          }
        }

        // Close row group after 2nd measure of a pair, or at the last measure
        if (isMultiMeasure && (mi % 2 === 1 || mi === cMeasures.length - 1)) {
          html += `</div>`; // close cl-measure-row
          // Between-rows barline: visible on desktop (display:contents), hidden on mobile
          if (mi < cMeasures.length - 1) {
            html += editMode
              ? `<div class="cl-measure-bar cl-measure-bar--between cl-bar-edit" data-si="${si}" data-li="${li}" data-left="${mi}" title="Klicka för att ta bort taktstreck"></div>`
              : `<div class="cl-measure-bar cl-measure-bar--between"></div>`;
          }
        }
      });

      if (isMultiMeasure) html += `</div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;
  display.innerHTML = html;
  display.className = 'song-display' + (twoColumns ? ' columns-2' : '');

  if (editMode) attachDragHandlers();
  } catch (e) {
    console.error('renderSong crash:', e);
    document.getElementById('songDisplay').innerHTML =
      `<div style="padding:40px;color:#f66;font-family:monospace">FEL: ${e.message}</div>`;
  }
}

// ─── Drag system ───
let dragState = null;

function attachDragHandlers() {
  document.querySelectorAll('.chord-tag.editable').forEach(el => {
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDragTouch, { passive: false });
  });
  document.querySelectorAll('.cl-lyric-edit').forEach(el => {
    el.addEventListener('blur', onLyricBlur);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  });
  document.querySelectorAll('.cl-bar-edit').forEach(el => {
    el.addEventListener('click', onBarlineRemove);
  });
  document.querySelectorAll('.cl-add-bar-btn').forEach(el => {
    el.addEventListener('click', onBarlineAdd);
  });
}

// ─── Lyric & barline editing ───

function onLyricBlur(e) {
  const el = e.target;
  const si = +el.dataset.si, li = +el.dataset.li, mi = +el.dataset.mi;
  const line = songs[currentSong].sections[si].lines[li];
  const parts = (line.l || '').split('|');
  while (parts.length <= mi) parts.push('');
  parts[mi] = el.textContent;
  line.l = parts.join('|');
  debouncedSaveOffsets();
}

function onBarlineRemove(e) {
  const el = e.currentTarget;
  const si = +el.dataset.si, li = +el.dataset.li, left = +el.dataset.left;
  const line = songs[currentSong].sections[si].lines[li];
  const cp = (line.c || '').split('|');
  const lp = (line.l || '').split('|');
  if (left + 1 < cp.length) { cp[left] = cp[left] + cp[left + 1]; cp.splice(left + 1, 1); }
  if (left + 1 < lp.length) { lp[left] = (lp[left]||'') + (lp[left+1]||''); lp.splice(left + 1, 1); }
  line.c = cp.join('|');
  line.l = lp.join('|');
  debouncedSaveOffsets();
  renderSong();
}

function onBarlineAdd(e) {
  e.stopPropagation();
  const el = e.currentTarget;
  const si = +el.dataset.si, li = +el.dataset.li, after = +el.dataset.after;
  const line = songs[currentSong].sections[si].lines[li];
  const cp = (line.c || '').split('|');
  const lp = (line.l || '').split('|');
  cp.splice(after + 1, 0, '');
  lp.splice(after + 1, 0, '');
  line.c = cp.join('|');
  line.l = lp.join('|');
  debouncedSaveOffsets();
  renderSong();
}

function startDrag(e) {
  e.preventDefault();
  const el = e.target.closest('.chord-tag');
  if (!el) return;
  dragState = { el, key: el.dataset.key, startX: e.clientX, startOffset: chordOffsets[el.dataset.key] || 0 };
  el.classList.add('dragging');
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}

function startDragTouch(e) {
  e.preventDefault();
  const el = e.target.closest('.chord-tag');
  if (!el) return;
  const touch = e.touches[0];
  dragState = { el, key: el.dataset.key, startX: touch.clientX, startOffset: chordOffsets[el.dataset.key] || 0 };
  el.classList.add('dragging');
  document.addEventListener('touchmove', onDragTouch, { passive: false });
  document.addEventListener('touchend', endDragTouch);
}

function onDrag(e) {
  if (!dragState) return;
  const newOffset = dragState.startOffset + (e.clientX - dragState.startX);
  chordOffsets[dragState.key] = newOffset;
  dragState.el.style.left = `calc(${dragState.el.dataset.basePos}ch + ${newOffset}px)`;
}

function onDragTouch(e) {
  if (!dragState) return;
  e.preventDefault();
  const newOffset = dragState.startOffset + (e.touches[0].clientX - dragState.startX);
  chordOffsets[dragState.key] = newOffset;
  dragState.el.style.left = `calc(${dragState.el.dataset.basePos}ch + ${newOffset}px)`;
}

function endDrag() {
  if (dragState) { dragState.el.classList.remove('dragging'); debouncedSaveOffsets(); }
  dragState = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
}

function endDragTouch() {
  if (dragState) { dragState.el.classList.remove('dragging'); debouncedSaveOffsets(); }
  dragState = null;
  document.removeEventListener('touchmove', onDragTouch);
  document.removeEventListener('touchend', endDragTouch);
}

// ─── Controls ───
function transpose(dir) {
  transposeSemitones = ((transposeSemitones + dir) + 12) % 12;
  const badge = document.getElementById('transposeBadge');
  if (transposeSemitones === 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'inline-block';
    badge.textContent = transposeSemitones <= 6 ? `+${transposeSemitones}` : `${transposeSemitones - 12}`;
  }
  renderSong();
}

function changeFontSize(dir) {
  fontSize = Math.max(9, Math.min(20, fontSize + dir));
  document.getElementById('fontLabel').textContent = fontSize;
  renderSong();
  savePrefs();
}

function toggleColumns() {
  twoColumns = !twoColumns;
  document.getElementById('colBtn').className = 'ctrl-btn' + (twoColumns ? ' active' : '');
  renderSong();
  savePrefs();
}

function toggleEditMode() {
  editMode = !editMode;
  document.getElementById('editBtn').className = 'ctrl-btn' + (editMode ? ' active' : '');
  document.getElementById('resetBtn').style.display = editMode ? 'inline-block' : 'none';
  renderSong();
}

async function saveCurrentSongToFile() {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  const songIdx = currentSong;
  const s = songs[songIdx];
  const filename = s._filename;
  if (!filename) return;

  measureChWidth();
  const chWidth = chWidthCache;
  const exportSong = { ...s, sections: [] };
  delete exportSong._filename;

  s.sections.forEach((sec, si) => {
    const exportSec = { label: sec.label, lines: [] };
    sec.lines.forEach((line, li) => {
      const chords = parseChordLine(line.c);
      if (chords.length === 0) {
        exportSec.lines.push({ c: '', l: line.l });
        return;
      }
      const newChords = chords.map((ch, ci) => {
        const key = `${songIdx}-${si}-${li}-${ci}`;
        const charOffset = Math.round((chordOffsets[key] || 0) / chWidth);
        return { name: ch.name, pos: Math.max(0, ch.pos + charOffset) };
      }).sort((a, b) => a.pos - b.pos);
      let chordStr = '';
      newChords.forEach(ch => {
        while (chordStr.length < ch.pos) chordStr += ' ';
        chordStr += ch.name;
      });
      exportSec.lines.push({ c: chordStr, l: line.l });
    });
    exportSong.sections.push(exportSec);
  });

  try {
    const resp = await fetch('/save-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content: exportSong })
    });
    if (!resp.ok) throw new Error(await resp.text());
    // Uppdatera songs i minnet och rensa offsets för denna låt
    songs[songIdx] = { ...exportSong, _filename: filename };
    chordOffsets = Object.fromEntries(
      Object.entries(chordOffsets).filter(([k]) => !k.startsWith(songIdx + '-'))
    );
    await saveOffsets();
    flashSaveIndicator();
  } catch (e) {
    console.error(`Kunde inte spara ${filename}:`, e);
  }
}

async function resetPositions() {
  Object.keys(chordOffsets).forEach(k => {
    if (k.startsWith(currentSong + '-')) delete chordOffsets[k];
  });
  renderSong();
  await saveOffsets();
}

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
  } else {
    sidebarHidden = !sidebarHidden;
    document.querySelector('.app').classList.toggle('sidebar-hidden', sidebarHidden);
    savePrefs();
  }
}

// ─── Start ───
init();

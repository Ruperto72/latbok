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
    localStorage.setItem(PREFS_KEY, JSON.stringify({ fontSize, twoColumns, currentSong }));
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
  await loadFromStorage();
  await loadSongs();

  if (songs.length === 0) return;

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
  renderSong();
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
  measureChWidth();
  const s = songs[currentSong];
  const display = document.getElementById('songDisplay');
  const transposedKey = transposeSemitones !== 0
    ? transposeChordName(s.key, transposeSemitones) : s.key;

  document.getElementById('topbarTitle').textContent = s.title;

  let info = `Tonart: ${transposedKey}`;
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
      <span>Redigeringsläge — dra ackorden åt vänster/höger · sparas automatiskt</span>
    </div>`;
  }

  html += `<div class="song-body" style="font-size:${fontSize}px">`;

  s.sections.forEach((sec, si) => {
    html += `<div class="song-block" data-section="${si}">`;
    html += `<div class="section-label">${escHtml(sec.label)}</div>`;

    sec.lines.forEach((line, li) => {
      const chords = parseChordLine(line.c);
      const lyric = line.l || '';

      if (editMode) {
        html += `<div class="cl-abs-pair">`;
        if (chords.length > 0) {
          html += `<div class="cl-abs-chord-row">`;
          chords.forEach((ch, ci) => {
            const key = `${currentSong}-${si}-${li}-${ci}`;
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
        if (lyric.trim()) {
          html += `<div class="cl-abs-lyric-row">${escHtml(lyric)}</div>`;
        }
        html += `</div>`;
      } else {
        if (chords.length > 0 && lyric.trim()) {
          html += `<div class="cl-pair">`;
          // Pre-compute snapped start positions so segment boundaries fall on word starts
          const snappedStarts = chords.map((ch, ci) => {
            const key = `${currentSong}-${si}-${li}-${ci}`;
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
            const key = `${currentSong}-${si}-${li}-${ci}`;
            const pxOffset = chordOffsets[key] || 0;
            const charShift = Math.round(pxOffset / chWidthCache);
            const startPos = Math.max(0, ch.pos + charShift);
            const nextPos = ci < chords.length - 1
              ? Math.max(0, chords[ci+1].pos + Math.round((chordOffsets[`${currentSong}-${si}-${li}-${ci+1}`] || 0) / chWidthCache))
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
    });

    html += `</div>`;
  });

  html += `</div>`;
  display.innerHTML = html;
  display.className = 'song-display' + (twoColumns ? ' columns-2' : '');

  if (editMode) attachDragHandlers();
}

// ─── Drag system ───
let dragState = null;

function attachDragHandlers() {
  document.querySelectorAll('.chord-tag.editable').forEach(el => {
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDragTouch, { passive: false });
  });
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
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

// ─── Start ───
init();

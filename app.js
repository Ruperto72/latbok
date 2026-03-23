// ─── Körhäftet — app.js ───

const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Songs loaded dynamically from songs/ folder
let songs = [];

// ─── State ───
let currentSong = 0;
let transposeSemitones = 0;
let fontSize = 13;
let columnsMode = 0; // 0=1 smal, 1=1 bred, 2=2 smal, 3=2 bred
let hideChords = false;
let sidebarHidden = false;
let songEditorMode = false;
let storageReady = false;

// ─── Auto-scroll ───
let scrollLevel = 3;       // 1–9, visas i knappen
let scrollActive = false;
let scrollRAF = null;
let scrollLastTime = null;

const PREFS_KEY = 'korhaftet-preferences';

// ─── Song Loading ───
async function loadSongs(bustCache = false) {
  const qs = bustCache ? `?t=${Date.now()}` : '';
  try {
    const indexResp = await fetch(`songs/index.json${qs}`);
    if (!indexResp.ok) throw new Error('Could not load songs/index.json');
    const songFiles = await indexResp.json();

    const loaded = await Promise.all(
      songFiles.map(async (filename) => {
        try {
          const resp = await fetch(`songs/${filename}${qs}`);
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
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.fontSize) fontSize = p.fontSize;
      if (p.columnsMode !== undefined) columnsMode = p.columnsMode;
      else if (p.twoColumns !== undefined) columnsMode = p.twoColumns ? 1 : 0; // bakåtkompatibilitet
      if (p.hideChords !== undefined) hideChords = p.hideChords;
      if (p.sidebarHidden !== undefined) sidebarHidden = p.sidebarHidden;
      if (p.currentSong !== undefined) currentSong = p.currentSong;
    }
  } catch (e) {}
  storageReady = true;
}

async function savePrefs() {
  if (!storageReady) return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ fontSize, columnsMode, hideChords, sidebarHidden, currentSong }));
  } catch (e) {
    console.error('Failed to save prefs:', e);
  }
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
    updateColBtn();
    document.getElementById('hideChordsBtn').className = 'ctrl-btn' + (hideChords ? '' : ' active');
    if (hideChords) document.getElementById('songDisplay').classList.add('hide-chords');
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isLocal) document.getElementById('songEditorBtn').style.display = 'none';
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

async function reloadSongs() {
  const btn = document.getElementById('reloadSongsBtn');
  if (btn) btn.disabled = true;
  try {
    await loadSongs(true);
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
    renderSong();
  } finally {
    if (btn) btn.disabled = false;
  }
}

function alignMeasureColumns() {
  document.querySelectorAll('.song-block').forEach(block => {
    const cells = block.querySelectorAll('.cl-abs-pair[data-mi]');
    // Sätt flex: 0 0 auto så varje cell mäter sitt eget innehåll (inte flex:1-medelvärdet)
    cells.forEach(c => { c.style.flex = '0 0 auto'; c.style.minWidth = ''; });
    const colWidths = {};
    cells.forEach(c => {
      const mi = c.dataset.mi;
      const w = c.getBoundingClientRect().width;
      colWidths[mi] = Math.max(colWidths[mi] || 0, w);
    });
    cells.forEach(c => {
      c.style.flex = `0 0 ${colWidths[c.dataset.mi]}px`;
    });
  });
}

function clearMeasureColumnAlignment() {
  document.querySelectorAll('.cl-abs-pair[data-mi]').forEach(c => {
    c.style.flex = '';
    c.style.minWidth = '';
  });
}

function toggleAutoScroll() {
  scrollActive = !scrollActive;
  document.getElementById('scrollBtn').className = 'ctrl-btn' + (scrollActive ? ' active' : '');
  if (scrollActive) {
    scrollLastTime = null;
    scrollRAF = requestAnimationFrame(autoScrollStep);
  } else {
    cancelAnimationFrame(scrollRAF);
    scrollRAF = null;
  }
}

function autoScrollStep(ts) {
  if (!scrollActive) return;
  if (scrollLastTime !== null) {
    const px = (scrollLevel * 12) * (ts - scrollLastTime) / 1000;
    window.scrollBy(0, px);
    // Stanna automatiskt vid sidans slut
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      toggleAutoScroll();
      return;
    }
  }
  scrollLastTime = ts;
  scrollRAF = requestAnimationFrame(autoScrollStep);
}

function changeScrollSpeed(dir) {
  scrollLevel = Math.max(1, Math.min(9, scrollLevel + dir));
  document.getElementById('scrollSpeedLabel').textContent = scrollLevel;
}

function selectSong(idx) {
  if (scrollActive) toggleAutoScroll();
  if (songEditorMode) { songEditorMode = false; document.getElementById('songEditorBtn').className = 'ctrl-btn'; }
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

function renderSong() {
  if (songs.length === 0) return;
  try {
  if (songEditorMode) {
    const display = document.getElementById('songDisplay');
    display.className = 'song-display song-display--editor';
    display.innerHTML = renderSongEditor();
    attachEditorHandlers();
    return;
  }
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

  if (typeof renderChordDiagrams === 'function') {
    html += renderChordDiagrams(s, transposeSemitones);
  }

  html += `<div class="song-body" style="font-size:${fontSize}px">`;

  s.sections.forEach((sec, si) => {
    html += `<div class="song-block" data-section="${si}">`;
    html += `<div class="section-label">${escHtml(sec.label)}</div>`;

    sec.lines.forEach((line) => {
      const rawC = line.c || '';
      const cStr = rawC.startsWith('@') && s.chordTemplates
        ? (s.chordTemplates[rawC.slice(1)] || '')
        : rawC;
      const cMeasures = cStr.split('|');
      const lMeasures = (line.l || '').split('|');
      const isMultiMeasure = cMeasures.length > 1;

      // If a measure boundary falls mid-word, move the trailing fragment
      // to the next measure so the full word appears together.
      const displayLyrics = [...lMeasures];
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

      if (isMultiMeasure) html += `<div class="cl-line-measures">`;

      cMeasures.forEach((cPart, mi) => {
        const chords = parseChordLine(cPart);
        const lyric = displayLyrics[mi] || '';

        const hasPickup = isMultiMeasure && cMeasures[0].trim() === '.';
        const isPickup = isMultiMeasure && mi === 0 && hasPickup;
        const realMi = hasPickup ? mi - 1 : mi; // -1 för pickup, 0+ för riktiga takter

        // Öppna taktgrupp om 2 (anakrus räknas inte)
        if (isMultiMeasure && !isPickup && realMi % 2 === 0) {
          html += `<div class="cl-measure-row">`;
        }

        // Taktstreck inuti grupp (ej före första takten i gruppen)
        if (isMultiMeasure && !isPickup && realMi % 2 !== 0) {
          html += `<div class="cl-measure-bar"></div>`;
        }

        if (isMultiMeasure) {
          html += `<div class="cl-abs-pair${isPickup ? ' cl-pickup' : ''}" data-mi="${mi}">`;
          const hyphenClass = lyric.trimEnd().endsWith('-') ? ' cl-lyric--hyphen' : '';
          if (isPickup) {
            html += `<div class="cl-abs-chord-row"></div>`;
            if (lyric.trim()) html += `<div class="cl-display-lyric${hyphenClass}">${escHtml(lyric)}</div>`;
          } else {
            if (chords.length > 0) {
              html += `<div class="cl-abs-chord-row">`;
              chords.forEach(ch => {
                const name = transposeSemitones !== 0
                  ? transposeChordName(ch.name, transposeSemitones) : ch.name;
                html += `<span class="chord-tag" style="left:${ch.pos}ch">${escHtml(name)}</span>`;
              });
              html += `</div>`;
            }
            if (lyric.trim()) {
              html += `<div class="cl-display-lyric${hyphenClass}">${escHtml(lyric)}</div>`;
            }
          }
          html += `</div>`;
        } else {
          if (chords.length > 0 && lyric.trim()) {
            html += `<div class="cl-pair cl-pair--chords">`;
            const snappedStarts = chords.map(ch => {
              let pos = Math.max(0, ch.pos);
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
              const nextPos = ci < chords.length - 1 ? chords[ci+1].pos : ch.pos + ch.name.length + 2;
              const spacing = ' '.repeat(Math.max(1, nextPos - ch.pos - ch.name.length));
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

        // Stäng taktgrupp
        if (isMultiMeasure && !isPickup && (realMi % 2 === 1 || mi === cMeasures.length - 1)) {
          html += `</div>`;
        }
      });

      if (isMultiMeasure) html += `</div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;
  display.innerHTML = html;
  const colClass = [' columns-1c', '', ' columns-2c', ' columns-2'][columnsMode] || '';
  display.className = 'song-display' + colClass;
  if (columnsMode === 0 || columnsMode === 2 || window.innerWidth <= 768) {
    alignMeasureColumns();
  } else {
    clearMeasureColumnAlignment();
  }
  } catch (e) {
    console.error('renderSong crash:', e);
    document.getElementById('songDisplay').innerHTML =
      `<div style="padding:40px;color:#f66;font-family:monospace">FEL: ${e.message}</div>`;
  }
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

function updateColBtn() {
  const btn = document.getElementById('colBtn');
  const labels = ['1 smal', '1 bred', '2 smal', '2 bred'];
  btn.textContent = labels[columnsMode];
  btn.className = 'ctrl-btn active';
}

function toggleColumns() {
  columnsMode = (columnsMode + 1) % 4;
  updateColBtn();
  renderSong();
  savePrefs();
}

function toggleHideChords() {
  hideChords = !hideChords;
  document.getElementById('hideChordsBtn').className = 'ctrl-btn' + (hideChords ? '' : ' active');
  document.getElementById('songDisplay').classList.toggle('hide-chords', hideChords);
  savePrefs();
}

function toggleSongEditor() {
  songEditorMode = !songEditorMode;
  if (songEditorMode && scrollActive) toggleAutoScroll();
  document.getElementById('songEditorBtn').className = 'ctrl-btn' + (songEditorMode ? ' active' : '');
  renderSong();
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

// ─── Editor: transponera sångdata ───
function transposeSongData(semitones) {
  const s = songs[currentSong];
  s.key = transposeChordName(s.key, semitones);
  if (s.chordTemplates) {
    Object.keys(s.chordTemplates).forEach(name => {
      s.chordTemplates[name] = transposeChordName(s.chordTemplates[name], semitones);
    });
  }
  s.sections.forEach(sec => {
    sec.lines.forEach(line => {
      if (line.c && !line.c.startsWith('@')) {
        line.c = transposeChordName(line.c, semitones);
      }
    });
  });
  renderSong();
}

// ─── Song Editor ───

function renderSongEditor() {
  const s = songs[currentSong];
  const tplNames = s.chordTemplates ? Object.keys(s.chordTemplates) : [];
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  let html = `<div class="sed-wrap">`;

  // Metadata
  html += `<div class="sed-card">
    <div class="sed-card-title">Metadata</div>
    <div class="sed-meta-grid">
      <label class="sed-field">Titel<input class="sed-input" data-prop="title" value="${escHtml(s.title || '')}"></label>
      <label class="sed-field">Artist<input class="sed-input" data-prop="artist" value="${escHtml(s.artist || '')}"></label>
      <label class="sed-field">Tonart<input class="sed-input sed-input--sm" data-prop="key" value="${escHtml(s.key || '')}"></label>
      <label class="sed-field">Taktart<input class="sed-input sed-input--sm" data-prop="timeSignature" value="${escHtml(s.timeSignature || '')}"></label>
      <label class="sed-field">Svårigh.<input class="sed-input sed-input--sm" data-prop="difficulty" value="${escHtml(s.difficulty || '')}"></label>
    </div>
  </div>`;

  // ChordTemplates
  html += `<div class="sed-card">
    <div class="sed-card-title">Ackordmallar</div>
    <div class="sed-tpl-list">`;
  tplNames.forEach(name => {
    const tplMeasures = (s.chordTemplates[name] || '').split('|');
    html += `<div class="sed-tpl-row">
      <input class="sed-input sed-tpl-name" data-orig="${escHtml(name)}" value="${escHtml(name)}" placeholder="mallnamn">
      <span class="sed-colon">:</span>
      <div class="sed-tpl-measures">`;
    tplMeasures.forEach((m, mi) => {
      const ms = Math.max(4, m.length + 2);
      html += `<input class="sed-input sed-tpl-measure" data-name="${escHtml(name)}" data-mi="${mi}" value="${escHtml(m)}" size="${ms}" placeholder="ackord">`;
      if (tplMeasures.length > 1) {
        html += `<button class="sed-btn sed-btn--danger sed-del-tpl-measure" data-name="${escHtml(name)}" data-mi="${mi}">✕</button>`;
      }
    });
    html += `<button class="sed-btn sed-btn--add sed-add-tpl-measure" data-name="${escHtml(name)}">+ Takt</button>`;
    html += `</div>
      <button class="sed-btn sed-btn--danger sed-del-tpl" data-name="${escHtml(name)}">✕</button>
    </div>`;
  });
  html += `</div>
    <button class="sed-btn sed-btn--add" id="sed-add-tpl">+ Ny mall</button>
  </div>`;

  // Sections
  html += `<div id="sed-sections">`;
  s.sections.forEach((sec, si) => {
    html += renderEditorSection(s, sec, si, tplNames);
  });
  html += `</div>
  <div class="sed-section-actions">
    <button class="sed-btn sed-btn--add sed-add-section">+ Ny del</button>
  </div>`;

  // Save bar
  html += `<div class="sed-save-bar">
    <div class="sed-transpose-group">
      <span class="sed-save-note">Transponera:</span>
      <button class="sed-btn sed-transpose-btn" onclick="transposeSongData(-1)">♭</button>
      <button class="sed-btn sed-transpose-btn" onclick="transposeSongData(1)">♯</button>
    </div>
    <button class="sed-save-btn"${isLocal ? '' : ' disabled'}>💾 Spara till fil</button>
    <span class="sed-save-note">${isLocal ? `songs/${escHtml(s._filename || '?')}` : 'Sparning fungerar bara på localhost'}</span>
    <span class="sed-save-error" id="sed-save-error"></span>
  </div>`;

  html += `</div>`;
  return html;
}

function renderEditorSection(s, sec, si, tplNames) {
  let html = `<div class="sed-song-section" data-si="${si}">
    <div class="sed-section-header">
      <input class="sed-input sed-section-label" data-si="${si}" value="${escHtml(sec.label || '')}">
      <button class="sed-btn sed-btn--danger sed-del-section" data-si="${si}">✕ Ta bort</button>
    </div>
    <div class="sed-line-list">`;
  sec.lines.forEach((line, li) => {
    html += renderEditorLine(s, line, si, li, tplNames);
  });
  html += `</div>
    <button class="sed-btn sed-btn--add sed-add-line" data-si="${si}">+ Ny rad</button>
  </div>`;
  return html;
}

function renderEditorLine(s, line, si, li, tplNames) {
  const rawC = line.c || '';
  const isTemplate = rawC.startsWith('@') && s.chordTemplates && tplNames.length > 0;
  const tplKey = isTemplate ? rawC.slice(1) : '';
  const cStr = isTemplate ? (s.chordTemplates[tplKey] || '') : rawC;
  const cMeasures = cStr.split('|');
  const lMeasures = (line.l || '').split('|');
  const origLCount = lMeasures.length;
  const mismatch = isTemplate && origLCount !== cMeasures.length;
  while (lMeasures.length < cMeasures.length) lMeasures.push('');

  let html = `<div class="sed-line-row" data-si="${si}" data-li="${li}">`;

  // Header: mall-väljare + ta bort rad
  html += `<div class="sed-line-header">`;
  if (tplNames.length > 0) {
    html += `<select class="sed-select sed-chord-sel" data-si="${si}" data-li="${li}">`;
    tplNames.forEach(name => {
      html += `<option value="@${escHtml(name)}"${tplKey === name ? ' selected' : ''}>@${escHtml(name)}</option>`;
    });
    html += `<option value="__custom__"${!isTemplate ? ' selected' : ''}>Eget ackord…</option>`;
    html += `</select>`;
  }
  if (mismatch) {
    html += `<span class="sed-mismatch-badge">⚠ ${origLCount} text / ${cMeasures.length} takt</span>`;
    html += `<button class="sed-btn sed-sync-measures" data-si="${si}" data-li="${li}">Synka</button>`;
  }
  html += `<button class="sed-btn sed-btn--danger sed-del-line" data-si="${si}" data-li="${li}">✕ Rad</button>`;
  html += `</div>`;

  // En cell per takt
  html += `<div class="sed-measures-row">`;
  cMeasures.forEach((cPart, mi) => {
    const isPickup = mi === 0 && cPart.trim() === '.';
    html += `<div class="sed-measure-cell${isPickup ? ' sed-measure-cell--pickup' : ''}">`;
    if (isTemplate) {
      html += `<div class="sed-chord-readonly">${isPickup ? '(anakrus)' : (escHtml(cPart) || '—')}</div>`;
    } else {
      const cs = Math.max(6, cPart.length + 2);
      html += `<input class="sed-input sed-chord-measure" data-si="${si}" data-li="${li}" data-mi="${mi}" value="${escHtml(cPart)}" placeholder="ackord" size="${cs}">`;
    }
    const ls = Math.max(6, (lMeasures[mi] || '').length + 2);
    html += `<input class="sed-input sed-lyric-measure" data-si="${si}" data-li="${li}" data-mi="${mi}" value="${escHtml(lMeasures[mi] || '')}" placeholder="text" size="${ls}">`;
    if (!isTemplate && cMeasures.length > 1) {
      html += `<button class="sed-btn sed-btn--danger sed-del-measure" data-si="${si}" data-li="${li}" data-mi="${mi}">✕</button>`;
    }
    html += `</div>`;
  });
  if (!isTemplate) {
    html += `<button class="sed-btn sed-btn--add sed-add-measure" data-si="${si}" data-li="${li}">+ Takt</button>`;
  }
  html += `</div>`; // measures-row

  html += `</div>`; // line-row
  return html;
}

function attachEditorHandlers() {
  const s = songs[currentSong];

  // Metadata
  document.querySelectorAll('.sed-input[data-prop]').forEach(el => {
    el.addEventListener('change', () => { s[el.dataset.prop] = el.value; });
  });

  // Template name rename
  document.querySelectorAll('.sed-tpl-name').forEach(el => {
    el.addEventListener('change', () => {
      const origName = el.dataset.orig;
      const newName = el.value.trim();
      if (!newName || newName === origName) { el.value = origName; return; }
      if (s.chordTemplates[newName] !== undefined) {
        el.value = origName;
        el.style.borderColor = '#f88';
        setTimeout(() => el.style.borderColor = '', 1500);
        return;
      }
      s.chordTemplates[newName] = s.chordTemplates[origName];
      delete s.chordTemplates[origName];
      s.sections.forEach(sec => sec.lines.forEach(line => {
        if (line.c === '@' + origName) line.c = '@' + newName;
      }));
      renderSong();
    });
  });

  // Ackord per takt i mall (live)
  document.querySelectorAll('.sed-tpl-measure').forEach(el => {
    el.addEventListener('input', () => {
      el.size = Math.max(4, el.value.length + 2);
      const name = el.dataset.name;
      if (!s.chordTemplates) return;
      const parts = (s.chordTemplates[name] || '').split('|');
      while (parts.length <= +el.dataset.mi) parts.push('');
      parts[+el.dataset.mi] = el.value;
      s.chordTemplates[name] = parts.join('|');
    });
  });

  // Lägg till takt i mall
  document.querySelectorAll('.sed-add-tpl-measure').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      if (s.chordTemplates) s.chordTemplates[name] = (s.chordTemplates[name] || '') + '|';
      renderSong();
    });
  });

  // Ta bort takt från mall
  document.querySelectorAll('.sed-del-tpl-measure').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name, mi = +el.dataset.mi;
      if (!s.chordTemplates) return;
      const parts = (s.chordTemplates[name] || '').split('|');
      parts.splice(mi, 1);
      s.chordTemplates[name] = parts.join('|');
      renderSong();
    });
  });

  // Synka textantal till mallens taktantal
  document.querySelectorAll('.sed-sync-measures').forEach(el => {
    el.addEventListener('click', () => {
      const si = +el.dataset.si, li = +el.dataset.li;
      const line = s.sections[si].lines[li];
      const tplKey = line.c.startsWith('@') ? line.c.slice(1) : '';
      const tplCount = (s.chordTemplates?.[tplKey] || '').split('|').length;
      const lParts = (line.l || '').split('|');
      while (lParts.length < tplCount) lParts.push('');
      line.l = lParts.slice(0, tplCount).join('|');
      renderSong();
    });
  });

  // Delete template (expand references inline first)
  document.querySelectorAll('.sed-del-tpl').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      const val = s.chordTemplates?.[name] || '';
      s.sections.forEach(sec => sec.lines.forEach(line => {
        if (line.c === '@' + name) line.c = val;
      }));
      if (s.chordTemplates) delete s.chordTemplates[name];
      renderSong();
    });
  });

  // Add template
  document.getElementById('sed-add-tpl')?.addEventListener('click', () => {
    if (!s.chordTemplates) s.chordTemplates = {};
    let newName = 'ny_mall'; let i = 2;
    while (s.chordTemplates[newName] !== undefined) newName = 'ny_mall_' + (i++);
    s.chordTemplates[newName] = '';
    renderSong();
  });

  // Section label
  document.querySelectorAll('.sed-section-label').forEach(el => {
    el.addEventListener('change', () => {
      s.sections[+el.dataset.si].label = el.value || 'Del';
    });
  });

  // Delete section
  document.querySelectorAll('.sed-del-section').forEach(el => {
    el.addEventListener('click', () => {
      const si = +el.dataset.si;
      if (s.sections.length <= 1) return;
      s.sections.splice(si, 1);
      renderSong();
    });
  });

  // Add section
  document.querySelector('.sed-add-section')?.addEventListener('click', () => {
    const tplNames = s.chordTemplates ? Object.keys(s.chordTemplates) : [];
    s.sections.push({ label: 'Ny del', lines: [{ c: tplNames.length ? '@' + tplNames[0] : '', l: '' }] });
    renderSong();
  });

  // Mall-väljare: byt mellan template och eget ackord
  document.querySelectorAll('.sed-chord-sel').forEach(el => {
    el.addEventListener('change', () => {
      const si = +el.dataset.si, li = +el.dataset.li;
      const line = s.sections[si].lines[li];
      if (el.value === '__custom__') {
        const oldKey = line.c.startsWith('@') ? line.c.slice(1) : '';
        line.c = s.chordTemplates?.[oldKey] || '';
      } else {
        const tplKey = el.value.slice(1);
        const tplStr = s.chordTemplates?.[tplKey] || '';
        const tplCount = tplStr.split('|').length;
        const lParts = (line.l || '').split('|');
        while (lParts.length < tplCount) lParts.push('');
        line.l = lParts.slice(0, tplCount).join('|');
        line.c = el.value;
      }
      renderSong();
    });
  });

  // Ackord per takt (eget läge)
  document.querySelectorAll('.sed-chord-measure').forEach(el => {
    el.addEventListener('input', () => {
      el.size = Math.max(6, el.value.length + 2);
      const si = +el.dataset.si, li = +el.dataset.li, mi = +el.dataset.mi;
      const line = s.sections[si].lines[li];
      const parts = (line.c || '').split('|');
      while (parts.length <= mi) parts.push('');
      parts[mi] = el.value;
      line.c = parts.join('|');
    });
  });

  // Text per takt
  document.querySelectorAll('.sed-lyric-measure').forEach(el => {
    el.addEventListener('input', () => {
      el.size = Math.max(6, el.value.length + 2);
      const si = +el.dataset.si, li = +el.dataset.li, mi = +el.dataset.mi;
      const line = s.sections[si].lines[li];
      const parts = (line.l || '').split('|');
      while (parts.length <= mi) parts.push('');
      parts[mi] = el.value;
      line.l = parts.join('|');
    });
  });

  // Lägg till takt
  document.querySelectorAll('.sed-add-measure').forEach(el => {
    el.addEventListener('click', () => {
      const si = +el.dataset.si, li = +el.dataset.li;
      const line = s.sections[si].lines[li];
      line.c = (line.c || '') + '|';
      line.l = (line.l || '') + '|';
      renderSong();
    });
  });

  // Ta bort takt
  document.querySelectorAll('.sed-del-measure').forEach(el => {
    el.addEventListener('click', () => {
      const si = +el.dataset.si, li = +el.dataset.li, mi = +el.dataset.mi;
      const line = s.sections[si].lines[li];
      const cParts = (line.c || '').split('|');
      const lParts = (line.l || '').split('|');
      cParts.splice(mi, 1);
      lParts.splice(mi, 1);
      line.c = cParts.join('|');
      line.l = lParts.join('|');
      renderSong();
    });
  });

  // Delete line
  document.querySelectorAll('.sed-del-line').forEach(el => {
    el.addEventListener('click', () => {
      const si = +el.dataset.si, li = +el.dataset.li;
      if (s.sections[si].lines.length <= 1) return;
      s.sections[si].lines.splice(li, 1);
      renderSong();
    });
  });

  // Add line
  document.querySelectorAll('.sed-add-line').forEach(el => {
    el.addEventListener('click', () => {
      const si = +el.dataset.si;
      const tplNames = s.chordTemplates ? Object.keys(s.chordTemplates) : [];
      s.sections[si].lines.push({ c: tplNames.length ? '@' + tplNames[0] : '', l: '' });
      renderSong();
    });
  });

  // Save
  document.querySelector('.sed-save-btn')?.addEventListener('click', saveSongEditorToFile);
}

async function saveSongEditorToFile() {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  const s = songs[currentSong];
  if (!s._filename) return;
  const { _filename, ...exportSong } = s;
  if (exportSong.chordTemplates && Object.keys(exportSong.chordTemplates).length === 0) {
    delete exportSong.chordTemplates;
  }
  const errEl = document.getElementById('sed-save-error');
  try {
    const resp = await fetch('/save-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: _filename, content: exportSong })
    });
    if (!resp.ok) throw new Error(await resp.text());
    if (errEl) errEl.textContent = '';
    flashSaveIndicator();
  } catch (e) {
    if (errEl) errEl.textContent = 'Fel: ' + e.message;
    console.error('saveSongEditorToFile:', e);
  }
}

// ─── Start ───
init();

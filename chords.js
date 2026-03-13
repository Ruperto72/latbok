// ─── chords.js — SVG Guitar Chord Diagrams ───

// Chord library: [strings low E to high E] = fret number, 0=open, -1=muted
// Format: { frets: [E,A,D,G,B,e], fingers: [f,f,f,f,f,f], baseFret: 1 }
const CHORD_LIB = {
  // ─── Major ───
  'C':     { frets: [-1,3,2,0,1,0], fingers: [0,3,2,0,1,0] },
  'D':     { frets: [-1,-1,0,2,3,2], fingers: [0,0,0,1,3,2] },
  'E':     { frets: [0,2,2,1,0,0], fingers: [0,2,3,1,0,0] },
  'F':     { frets: [1,3,3,2,1,1], fingers: [1,3,4,2,1,1], barre: 1 },
  'G':     { frets: [3,2,0,0,0,3], fingers: [2,1,0,0,0,3] },
  'A':     { frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0] },
  'B':     { frets: [-1,2,4,4,4,2], fingers: [0,1,2,3,4,1], baseFret: 2, barre: 2 },
  'Bb':    { frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1], barre: 1 },
  'Db':    { frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1], baseFret: 1 },
  'Eb':    { frets: [-1,-1,1,3,4,3], fingers: [0,0,1,2,4,3], baseFret: 3 },
  'Ab':    { frets: [4,6,6,5,4,4], fingers: [1,3,4,2,1,1], baseFret: 4, barre: 4 },
  'Gb':    { frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], baseFret: 2, barre: 2 },
  'C#':    { frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1], baseFret: 1 },

  // ─── Minor ───
  'Am':    { frets: [-1,0,2,2,1,0], fingers: [0,0,2,3,1,0] },
  'Bm':    { frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1], baseFret: 2, barre: 2 },
  'Cm':    { frets: [-1,3,5,5,4,3], fingers: [0,1,3,4,2,1], baseFret: 3, barre: 3 },
  'Dm':    { frets: [-1,-1,0,2,3,1], fingers: [0,0,0,2,3,1] },
  'Em':    { frets: [0,2,2,0,0,0], fingers: [0,2,3,0,0,0] },
  'Fm':    { frets: [1,3,3,1,1,1], fingers: [1,3,4,1,1,1], barre: 1 },
  'Gm':    { frets: [3,5,5,3,3,3], fingers: [1,3,4,1,1,1], baseFret: 3, barre: 3 },
  'F#m':   { frets: [2,4,4,2,2,2], fingers: [1,3,4,1,1,1], baseFret: 2, barre: 2 },
  'G#m':   { frets: [4,6,6,4,4,4], fingers: [1,3,4,1,1,1], baseFret: 4, barre: 4 },
  'Bbm':   { frets: [-1,1,3,3,2,1], fingers: [0,1,3,4,2,1], barre: 1 },
  'C#m':   { frets: [-1,4,6,6,5,4], fingers: [0,1,3,4,2,1], baseFret: 4, barre: 4 },
  'Ebm':   { frets: [-1,-1,6,8,9,7], fingers: [0,0,1,3,4,2], baseFret: 6, barre: 6 },

  // ─── 7th ───
  'A7':    { frets: [-1,0,2,0,2,0], fingers: [0,0,2,0,3,0] },
  'B7':    { frets: [-1,2,1,2,0,2], fingers: [0,2,1,3,0,4] },
  'C7':    { frets: [-1,3,2,3,1,0], fingers: [0,3,2,4,1,0] },
  'D7':    { frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3] },
  'E7':    { frets: [0,2,0,1,0,0], fingers: [0,2,0,1,0,0] },
  'F#7':   { frets: [2,4,2,3,2,2], fingers: [1,3,1,2,1,1], baseFret: 2, barre: 2 },
  'G7':    { frets: [3,2,0,0,0,1], fingers: [3,2,0,0,0,1] },

  // ─── Minor 7th ───
  'Am7':   { frets: [-1,0,2,0,1,0], fingers: [0,0,2,0,1,0] },
  'Bm7':   { frets: [-1,2,0,2,0,2], fingers: [0,1,0,2,0,3] },
  'Dm7':   { frets: [-1,-1,0,2,1,1], fingers: [0,0,0,2,1,1] },
  'Em7':   { frets: [0,2,0,0,0,0], fingers: [0,2,0,0,0,0] },
  'Gm7':   { frets: [3,5,3,3,3,3], fingers: [1,3,1,1,1,1], baseFret: 3, barre: 3 },

  // ─── Major 7th ───
  'Cmaj7': { frets: [-1,3,2,0,0,0], fingers: [0,3,2,0,0,0] },
  'Dmaj7': { frets: [-1,-1,0,2,2,2], fingers: [0,0,0,1,2,3] },
  'Gmaj7': { frets: [3,2,0,0,0,2], fingers: [3,2,0,0,0,1] },

  // ─── sus4 ───
  'Dsus4': { frets: [-1,-1,0,2,3,3], fingers: [0,0,0,1,2,3] },
  'Asus4': { frets: [-1,0,2,2,3,0], fingers: [0,0,1,2,3,0] },
  'Esus4': { frets: [0,2,2,2,0,0], fingers: [0,2,3,4,0,0] },

  // ─── Augmented / Diminished ───
  'Bdim':  { frets: [-1,2,3,4,3,-1], fingers: [0,1,2,4,3,0] },
  'Bm7b5': { frets: [-1,2,3,2,3,-1], fingers: [0,1,3,2,4,0] },

  // ─── Slash chords (show base chord) ───
  'C/G':   { frets: [3,3,2,0,1,0], fingers: [3,4,2,0,1,0] },
  'C/B':   { frets: [-1,2,2,0,1,0], fingers: [0,2,3,0,1,0] },
  'C/D':   { frets: [-1,-1,0,0,1,0], fingers: [0,0,0,0,1,0] },
  'C/E':   { frets: [0,3,2,0,1,0], fingers: [0,3,2,0,1,0] },
  'C/F':   { frets: [1,3,2,0,1,0], fingers: [1,4,2,0,1,0] },
  'C/A':   { frets: [-1,0,2,0,1,0], fingers: [0,0,2,0,1,0] },
  'D/E':   { frets: [0,0,0,2,3,2], fingers: [0,0,0,1,3,2] },
  'E/B':   { frets: [-1,2,2,1,0,0], fingers: [0,2,3,1,0,0] },
  'G/B':   { frets: [-1,2,0,0,0,3], fingers: [0,1,0,0,0,3] },
  'G/D':   { frets: [-1,-1,0,0,0,3], fingers: [0,0,0,0,0,3] },
  'Am/E':  { frets: [0,0,2,2,1,0], fingers: [0,0,2,3,1,0] },

  // ─── 7+ / augmented 7 ───
  'E7+':   { frets: [0,2,0,1,1,0], fingers: [0,2,0,1,1,0] },
};

// Try to find a chord, including transposed versions
function lookupChord(name) {
  // Direct match
  if (CHORD_LIB[name]) return { ...CHORD_LIB[name], name };

  // Strip bass note for slash chords not in library
  if (name.includes('/')) {
    const base = name.split('/')[0];
    if (CHORD_LIB[base]) return { ...CHORD_LIB[base], name };
  }

  return null;
}

// Generate SVG chord diagram
function chordSVG(chordData, size = 60) {
  if (!chordData) return '';

  const { frets, name, baseFret = 1, barre } = chordData;
  const w = size;
  const h = size * 1.35;
  const padTop = size * 0.35;
  const padSide = size * 0.12;
  const gridW = w - padSide * 2;
  const gridH = h - padTop - size * 0.12;
  const stringSpacing = gridW / 5;
  const fretSpacing = gridH / 4;
  const dotR = stringSpacing * 0.28;
  const nutH = fretSpacing * 0.12;

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

  // Title
  const fontSize = size * 0.19;
  svg += `<text x="${w/2}" y="${fontSize + 1}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="${fontSize}" font-weight="700" fill="#e8c86a">${escHtml(name)}</text>`;

  const gridTop = padTop;
  const gridLeft = padSide;

  // Nut (thick bar at top) or fret position indicator
  if (baseFret === 1) {
    svg += `<rect x="${gridLeft}" y="${gridTop}" width="${gridW}" height="${nutH + 1.5}" rx="0.5" fill="#e8e4dc"/>`;
  } else {
    const fpSize = size * 0.14;
    svg += `<text x="${gridLeft - fpSize * 0.5}" y="${gridTop + fretSpacing * 0.6}" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="${fpSize}" fill="#8a8578">${baseFret}fr</text>`;
  }

  // Grid lines - frets (horizontal)
  for (let i = 0; i <= 4; i++) {
    const y = gridTop + i * fretSpacing;
    svg += `<line x1="${gridLeft}" y1="${y}" x2="${gridLeft + gridW}" y2="${y}" stroke="#555" stroke-width="${i === 0 && baseFret === 1 ? 0 : 0.8}"/>`;
  }

  // Grid lines - strings (vertical)
  for (let i = 0; i < 6; i++) {
    const x = gridLeft + i * stringSpacing;
    svg += `<line x1="${x}" y1="${gridTop}" x2="${x}" y2="${gridTop + gridH}" stroke="#555" stroke-width="0.8"/>`;
  }

  // Barre
  if (barre !== undefined) {
    const barFret = frets.reduce((min, f) => (f > 0 && f < min ? f : min), 99);
    const barreStrings = [];
    frets.forEach((f, i) => { if (f === barFret || (f > 0 && barre)) barreStrings.push(i); });
    const firstStr = barreStrings[0];
    const lastStr = barreStrings[barreStrings.length - 1];
    const y = gridTop + (barFret - (baseFret - 1) - 0.5) * fretSpacing;
    if (lastStr > firstStr) {
      svg += `<rect x="${gridLeft + firstStr * stringSpacing - dotR}" y="${y - dotR}" width="${(lastStr - firstStr) * stringSpacing + dotR * 2}" height="${dotR * 2}" rx="${dotR}" fill="#e8c86a" opacity="0.7"/>`;
    }
  }

  // Dots and markers
  frets.forEach((fret, i) => {
    const x = gridLeft + i * stringSpacing;
    const markerY = gridTop - size * 0.07;
    const markerSize = size * 0.1;

    if (fret === -1) {
      // X for muted
      svg += `<text x="${x}" y="${markerY + markerSize * 0.3}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="${markerSize}" fill="#8a8578">×</text>`;
    } else if (fret === 0) {
      // O for open
      svg += `<circle cx="${x}" cy="${markerY}" r="${dotR * 0.7}" fill="none" stroke="#8a8578" stroke-width="1"/>`;
    } else {
      // Dot for fretted note
      const adjustedFret = fret - (baseFret - 1);
      const y = gridTop + (adjustedFret - 0.5) * fretSpacing;
      svg += `<circle cx="${x}" cy="${y}" r="${dotR}" fill="#e8c86a"/>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

// Extract unique chords from a song, respecting transpose
function getUniqueChords(song, transposeSemitones) {
  const seen = new Set();
  const chords = [];

  song.sections.forEach(sec => {
    sec.lines.forEach(line => {
      const regex = /(\S+)/g;
      let m;
      while ((m = regex.exec(line.c)) !== null) {
        let name = m[1];
        if (transposeSemitones !== 0) {
          name = name.replace(/(?<![A-Za-z])([A-G])(#|b)?/g, (match, note, acc) => {
            const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            const FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
            let idx = SHARP.indexOf(note + (acc || ''));
            if (idx === -1) idx = FLAT.indexOf(note + (acc || ''));
            if (idx === -1) return match;
            let newIdx = (idx + transposeSemitones + 12) % 12;
            return transposeSemitones >= 0 ? SHARP[newIdx] : FLAT[newIdx];
          });
        }
        if (!seen.has(name)) {
          seen.add(name);
          chords.push(name);
        }
      }
    });
  });

  return chords;
}

// Render chord diagram strip for a song
function renderChordDiagrams(song, transposeSemitones) {
  const chordNames = getUniqueChords(song, transposeSemitones);
  const diagrams = chordNames
    .map(name => {
      const data = lookupChord(name);
      if (!data) return '';
      return `<div class="chord-diagram">${chordSVG(data, 56)}</div>`;
    })
    .filter(d => d !== '');

  if (diagrams.length === 0) return '';

  return `<div class="chord-diagrams-strip">${diagrams.join('')}</div>`;
}

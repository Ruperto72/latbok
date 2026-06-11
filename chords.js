// ─── chords.js — SVG Guitar Chord Diagrams & Music Theory ───

export const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

export function transposeChordName(chord, semitones) {
  if (semitones === 0) return chord;
  // Riktning för #/b-val: oberoende av om semitones är normaliserat till 0–11
  // eller skickas som ett litet negativt tal, ska "neråt" alltid ge b-stavning.
  let dir = ((semitones % 12) + 12) % 12;
  if (dir > 6) dir -= 12;
  return chord.replace(/(?<![A-Za-z])([A-G])(#|b)?/g, (match, note, acc) => {
    let idx = NOTES_SHARP.indexOf(note + (acc || ''));
    if (idx === -1) idx = NOTES_FLAT.indexOf(note + (acc || ''));
    if (idx === -1) return match;
    let newIdx = (((idx + semitones) % 12) + 12) % 12;
    return dir >= 0 ? NOTES_SHARP[newIdx] : NOTES_FLAT[newIdx];
  });
}

export function parseChordLine(chordStr) {
  const chords = [];
  const regex = /(\S+)/g;
  let m;
  while ((m = regex.exec(chordStr)) !== null) {
    chords.push({ name: m[1], pos: m.index });
  }
  return chords;
}

// Chord library: [strings low E to high E] = fret number, 0=open, -1=muted
// Format: { frets: [E,A,D,G,B,e], fingers: [f,f,f,f,f,f], baseFret: 1 }
export const CHORD_LIB = {
  // ─── Major ───
  'C':     { frets: [-1,3,2,0,1,0], fingers: [0,3,2,0,1,0] },
  'D':     { frets: [-1,-1,0,2,3,2], fingers: [0,0,0,1,3,2] },
  'E':     { frets: [0,2,2,1,0,0], fingers: [0,2,3,1,0,0] },
  'F':     { frets: [1,3,3,2,1,1], fingers: [1,3,4,2,1,1], barre: 1 },
  'G':     { frets: [3,2,0,0,0,3], fingers: [2,1,0,0,0,3] },
  'A':     { frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0] },
  'B':     { frets: [-1,2,4,4,4,2], fingers: [0,1,2,3,4,1], baseFret: 2, barre: 2 },
  'Bb':    { frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1], barre: 1 },
  'A#':    { frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1], barre: 1 },
  'Db':    { frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1], baseFret: 1 },
  'Eb':    { frets: [-1,-1,1,3,4,3], fingers: [0,0,1,2,4,3], baseFret: 3 },
  'Ab':    { frets: [4,6,6,5,4,4], fingers: [1,3,4,2,1,1], baseFret: 4, barre: 4 },
  'Gb':    { frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], baseFret: 2, barre: 2 },
  'F#':    { frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], baseFret: 2, barre: 2 },
  'G#':    { frets: [4,6,6,5,4,4], fingers: [1,3,4,2,1,1], baseFret: 4, barre: 4 },
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

  // ─── 7th (dominant) — alla 12 grundtoner täckta ───
  'A7':    { frets: [-1,0,2,0,2,0], fingers: [0,0,2,0,3,0] },
  'Bb7':   { frets: [-1,1,3,1,3,1], fingers: [0,1,3,1,3,1], barre: 1 },
  'B7':    { frets: [-1,2,1,2,0,2], fingers: [0,2,1,3,0,4] },
  'C7':    { frets: [-1,3,2,3,1,0], fingers: [0,3,2,4,1,0] },
  'C#7':   { frets: [-1,4,3,1,0,1], fingers: [0,4,3,1,0,1] },
  'D7':    { frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3] },
  'Eb7':   { frets: [-1,6,8,6,8,6], fingers: [0,1,3,1,4,1], baseFret: 6, barre: 6 },
  'E7':    { frets: [0,2,0,1,0,0], fingers: [0,2,0,1,0,0] },
  'F7':    { frets: [1,3,1,2,1,1], fingers: [1,3,1,2,1,1], barre: 1 },
  'F#7':   { frets: [2,4,2,3,2,2], fingers: [1,3,1,2,1,1], baseFret: 2, barre: 2 },
  'G7':    { frets: [3,2,0,0,0,1], fingers: [3,2,0,0,0,1] },
  'Ab7':   { frets: [4,6,4,5,4,4], fingers: [1,3,1,2,1,1], baseFret: 4, barre: 4 },

  // ─── Minor 7th — alla 12 grundtoner täckta ───
  'Am7':   { frets: [-1,0,2,0,1,0], fingers: [0,0,2,0,1,0] },
  'Bbm7':  { frets: [-1,1,3,1,2,1], fingers: [0,1,3,1,2,1], barre: 1 },
  'Bm7':   { frets: [-1,2,0,2,0,2], fingers: [0,1,0,2,0,3] },
  'Cm7':   { frets: [-1,3,5,3,4,3], fingers: [0,1,3,1,2,1], baseFret: 3, barre: 3 },
  'C#m7':  { frets: [-1,4,6,4,5,4], fingers: [0,1,3,1,2,1], baseFret: 4, barre: 4 },
  'Dm7':   { frets: [-1,-1,0,2,1,1], fingers: [0,0,0,2,1,1] },
  'Ebm7':  { frets: [-1,6,8,6,7,6], fingers: [0,1,3,1,2,1], baseFret: 6, barre: 6 },
  'Em7':   { frets: [0,2,0,0,0,0], fingers: [0,2,0,0,0,0] },
  'Fm7':   { frets: [-1,-1,3,5,4,4], fingers: [0,0,1,3,2,2] },
  'F#m7':  { frets: [-1,-1,4,6,5,5], fingers: [0,0,1,3,2,2], baseFret: 4 },
  'Gm7':   { frets: [3,5,3,3,3,3], fingers: [1,3,1,1,1,1], baseFret: 3, barre: 3 },
  'Abm7':  { frets: [-1,-1,6,8,7,7], fingers: [0,0,1,3,2,2], baseFret: 6 },

  // ─── Major 7th ───
  'Cmaj7': { frets: [-1,3,2,0,0,0], fingers: [0,3,2,0,0,0] },
  'Dmaj7': { frets: [-1,-1,0,2,2,2], fingers: [0,0,0,1,2,3] },
  'Gmaj7': { frets: [3,2,0,0,0,2], fingers: [3,2,0,0,0,1] },

  // ─── sus4 — alla 12 grundtoner täckta ───
  'Csus4': { frets: [-1,3,3,0,1,1], fingers: [0,3,4,0,1,1] },
  'C#sus4':{ frets: [-1,1,3,3,4,1], fingers: [0,1,3,3,4,1], baseFret: 4, barre: 4 },
  'Dsus4': { frets: [-1,-1,0,2,3,3], fingers: [0,0,0,1,2,3] },
  'Ebsus4':{ frets: [-1,-1,1,3,4,4], fingers: [0,0,1,3,4,4] },
  'Esus4': { frets: [0,2,2,2,0,0], fingers: [0,2,3,4,0,0] },
  'Fsus4': { frets: [1,3,3,3,1,1], fingers: [1,3,4,4,1,1], barre: 1 },
  'F#sus4':{ frets: [-1,-1,4,6,7,7], fingers: [0,0,1,3,4,4], baseFret: 4 },
  'Gsus4': { frets: [3,5,5,5,3,3], fingers: [1,3,4,4,1,1], baseFret: 3, barre: 3 },
  'Absus4':{ frets: [4,6,6,6,4,4], fingers: [1,3,4,4,1,1], baseFret: 4, barre: 4 },
  'Asus4': { frets: [-1,0,2,2,3,0], fingers: [0,0,1,2,3,0] },
  'Bbsus4':{ frets: [-1,1,3,3,4,1], fingers: [0,1,3,3,4,1], barre: 1 },
  'Bsus4': { frets: [7,9,9,9,7,7], fingers: [1,3,4,4,1,1], baseFret: 7, barre: 7 },

  // ─── sus2 — alla 12 grundtoner ───
  'Csus2': { frets: [-1,3,0,0,1,0], fingers: [0,3,0,0,1,0] },
  'C#sus2':{ frets: [-1,4,6,6,4,4], fingers: [0,1,3,4,1,1], baseFret: 4, barre: 4 },
  'Dsus2': { frets: [-1,-1,0,2,3,0], fingers: [0,0,0,1,3,0] },
  'Ebsus2':{ frets: [-1,-1,1,3,4,1], fingers: [0,0,1,3,4,1] },
  'Esus2': { frets: [0,2,4,4,0,0], fingers: [0,1,3,4,0,0] },
  'Fsus2': { frets: [-1,-1,3,0,1,1], fingers: [0,0,3,0,1,1] },
  'F#sus2':{ frets: [-1,-1,4,1,2,2], fingers: [0,0,4,1,2,3] },
  'Gsus2': { frets: [3,0,0,0,3,3], fingers: [1,0,0,0,3,4] },
  'Absus2':{ frets: [4,6,6,3,4,4], fingers: [1,3,4,1,1,1], baseFret: 4, barre: 4 },
  'Asus2': { frets: [-1,0,2,2,0,0], fingers: [0,0,2,3,0,0] },
  'Bbsus2':{ frets: [-1,1,3,3,1,1], fingers: [0,1,3,4,1,1], barre: 1 },
  'Bsus2': { frets: [-1,2,4,4,2,2], fingers: [0,1,3,4,1,1], baseFret: 2, barre: 2 },

  // ─── add9 ───
  'Cadd9': { frets: [-1,3,2,0,3,0], fingers: [0,2,1,0,3,0] },
  'Dadd9': { frets: [-1,-1,0,2,3,0], fingers: [0,0,0,1,3,0] },
  'Eadd9': { frets: [0,2,2,1,0,2], fingers: [0,2,3,1,0,4] },
  'Fadd9': { frets: [1,0,3,2,1,0], fingers: [1,0,4,3,2,0] },
  'Gadd9': { frets: [3,2,0,2,0,3], fingers: [3,1,0,2,0,4] },
  'Aadd9': { frets: [-1,0,2,4,2,0], fingers: [0,0,1,3,2,0] },

  // ─── Diminished ───
  'Cdim':  { frets: [-1,3,4,2,4,-1], fingers: [0,2,3,1,4,0] },
  'Ddim':  { frets: [-1,-1,0,1,3,1], fingers: [0,0,0,1,3,2] },
  'Edim':  { frets: [0,1,2,0,2,-1], fingers: [0,1,2,0,3,0] },
  'Fdim':  { frets: [-1,-1,3,4,3,4], fingers: [0,0,1,3,2,4] },
  'Gdim':  { frets: [3,4,5,3,5,-1], fingers: [1,2,3,1,4,0], baseFret: 3, barre: 3 },
  'Adim':  { frets: [-1,0,1,2,1,-1], fingers: [0,0,1,3,2,0] },
  'Bdim':  { frets: [-1,2,3,4,3,-1], fingers: [0,1,2,4,3,0] },

  // ─── Diminished 7th ───
  'Cdim7': { frets: [-1,3,4,2,4,2], fingers: [0,2,3,1,4,1] },
  'C#dim7':{ frets: [-1,4,2,3,2,-1], fingers: [0,4,1,3,2,0] },
  'Ddim7': { frets: [-1,-1,0,1,0,1], fingers: [0,0,0,1,0,2] },
  'Ebdim7':{ frets: [-1,-1,1,2,1,2], fingers: [0,0,1,3,2,4] },
  'Edim7': { frets: [0,1,2,0,2,0], fingers: [0,1,3,0,4,0] },
  'Fdim7': { frets: [1,2,3,1,3,1], fingers: [1,2,3,1,4,1], barre: 1 },
  'Gdim7': { frets: [3,4,2,3,2,-1], fingers: [2,3,1,4,1,0] },
  'Adim7': { frets: [-1,0,1,2,1,2], fingers: [0,0,1,3,2,4] },
  'Bdim7': { frets: [-1,2,0,1,0,1], fingers: [0,2,0,1,0,1] },

  // ─── Augmented ───
  'Caug':  { frets: [-1,3,2,1,1,0], fingers: [0,4,3,1,2,0] },
  'Daug':  { frets: [-1,-1,0,3,3,2], fingers: [0,0,0,2,3,1] },
  'Eaug':  { frets: [0,3,2,1,1,0], fingers: [0,4,3,1,2,0] },
  'Faug':  { frets: [1,0,3,2,2,1], fingers: [1,0,4,3,2,1], barre: 1 },
  'Gaug':  { frets: [3,2,1,0,0,3], fingers: [3,2,1,0,0,4] },
  'Aaug':  { frets: [-1,0,3,2,2,1], fingers: [0,0,4,3,2,1] },
  'Baug':  { frets: [-1,2,1,0,0,3], fingers: [0,2,1,0,0,3] },

  // ─── 9th (dominant) ───
  'A9':    { frets: [-1,0,2,1,2,0], fingers: [0,0,2,1,3,0] },
  'B9':    { frets: [-1,2,1,2,2,2], fingers: [0,2,1,3,3,3], baseFret: 2, barre: 2 },
  'C9':    { frets: [-1,3,2,3,3,3], fingers: [0,2,1,3,4,4] },
  'D9':    { frets: [-1,-1,0,2,1,0], fingers: [0,0,0,2,1,0] },
  'E9':    { frets: [0,2,0,1,0,2], fingers: [0,2,0,1,0,3] },
  'G9':    { frets: [3,0,0,0,0,1], fingers: [3,0,0,0,0,1] },

  // ─── m7b5 (half-diminished) ───
  'Bm7b5': { frets: [-1,2,3,2,3,-1], fingers: [0,1,3,2,4,0] },
  'Am7b5': { frets: [-1,0,1,0,1,3], fingers: [0,0,1,0,2,4] },
  'C#m7b5':{ frets: [-1,4,2,4,5,-1], fingers: [0,2,1,3,4,0], baseFret: 4 },
  'Dm7b5': { frets: [-1,-1,0,1,1,1], fingers: [0,0,0,1,2,3] },
  'Em7b5': { frets: [0,1,2,0,3,0], fingers: [0,1,2,0,3,0] },
  'F#m7b5':{ frets: [2,0,2,2,1,0], fingers: [2,0,3,4,1,0] },
  'Gm7b5': { frets: [3,4,3,3,6,-1], fingers: [1,2,1,1,4,0], baseFret: 3, barre: 3 },

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

// ─── Alternative voicings ───
// Each key maps to an array of { label, frets, fingers, baseFret?, barre? }
// The primary voicing from CHORD_LIB is always shown first; these are extras.
export const CHORD_VOICINGS = {
  // ─── Major ───
  'C': [
    { label: 'C (A-form, 3:e bandet)', frets: [-1,3,5,5,5,3], fingers: [0,1,3,3,3,1], baseFret: 3, barre: 3 },
    { label: 'C (E-form, 8:e bandet)', frets: [8,10,10,9,8,8], fingers: [1,3,4,2,1,1], baseFret: 8, barre: 8 },
    { label: 'C (öppen med hög G)', frets: [-1,3,2,0,1,3], fingers: [0,3,2,0,1,4] },
    { label: 'C (C-form, 12:e bandet)', frets: [-1,15,14,12,13,12], fingers: [0,4,3,1,2,1], baseFret: 12, barre: 12 },
    { label: 'C (D-form, 10:e bandet)', frets: [-1,-1,10,12,13,12], fingers: [0,0,1,3,4,2], baseFret: 10 },
  ],
  'D': [
    { label: 'D (A-form, 5:e bandet)', frets: [-1,5,7,7,7,5], fingers: [0,1,3,3,3,1], baseFret: 5, barre: 5 },
    { label: 'D (E-form, 10:e bandet)', frets: [10,12,12,11,10,10], fingers: [1,3,4,2,1,1], baseFret: 10, barre: 10 },
    { label: 'D (C-form, 2:a bandet)', frets: [-1,5,4,2,3,2], fingers: [0,4,3,1,2,1], baseFret: 2 },
    { label: 'D (öppen D + 5:e bandet)', frets: [-1,-1,0,7,7,5], fingers: [0,0,0,3,3,1], baseFret: 5 },
    { label: 'D (öppen D + 9:e bandet)', frets: [-1,-1,0,11,10,10], fingers: [0,0,0,3,1,2], baseFret: 9 },
  ],
  'E': [
    { label: 'E (A-form, 7:e bandet)', frets: [-1,7,9,9,9,7], fingers: [0,1,3,3,3,1], baseFret: 7, barre: 7 },
    { label: 'E (C-form, 3:e bandet)', frets: [-1,7,6,4,5,4], fingers: [0,4,3,1,2,1], baseFret: 4 },
    { label: 'E (utan bas, D–e)', frets: [-1,-1,2,1,0,0], fingers: [0,0,2,1,0,0] },
    { label: 'E (D-form, D–e)', frets: [-1,-1,2,4,5,4], fingers: [0,0,1,3,4,3], baseFret: 2 },
  ],
  'F': [
    { label: 'F (A-form, 8:e bandet)', frets: [-1,8,10,10,10,8], fingers: [0,1,3,3,3,1], baseFret: 8, barre: 8 },
    { label: 'F (C-form, 4:e bandet)', frets: [-1,8,7,5,6,5], fingers: [0,4,3,1,2,1], baseFret: 5 },
    { label: 'F (utan barré, D–e)', frets: [-1,-1,3,2,1,1], fingers: [0,0,3,2,1,1] },
    { label: 'F (D-form, 2:a bandet)', frets: [-1,-1,3,5,6,5], fingers: [0,0,1,3,4,3], baseFret: 3 },
  ],
  'G': [
    { label: 'G (E-form, 3:e bandet)', frets: [3,5,5,4,3,3], fingers: [1,3,4,2,1,1], baseFret: 3, barre: 3 },
    { label: 'G (A-form, 10:e bandet)', frets: [-1,10,12,12,12,10], fingers: [0,1,3,3,3,1], baseFret: 10, barre: 10 },
    { label: 'G (C-form, 6:e bandet)', frets: [-1,10,9,7,8,7], fingers: [0,4,3,1,2,1], baseFret: 7 },
    { label: 'G (öppen variant)', frets: [3,2,0,0,3,3], fingers: [2,1,0,0,3,4] },
    { label: 'G (utan bas, D–e)', frets: [-1,-1,5,4,3,3], fingers: [0,0,3,2,1,1], baseFret: 3 },
    { label: 'G (D-form, 4:e bandet)', frets: [-1,-1,5,7,8,7], fingers: [0,0,1,3,4,3], baseFret: 5 },
  ],
  'A': [
    { label: 'A (E-form, 5:e bandet)', frets: [5,7,7,6,5,5], fingers: [1,3,4,2,1,1], baseFret: 5, barre: 5 },
    { label: 'A (C-form, 8:e bandet)', frets: [-1,12,11,9,10,9], fingers: [0,4,3,1,2,1], baseFret: 9 },
    { label: 'A (öppen + 4:e bandet)', frets: [-1,0,7,6,5,5], fingers: [0,0,4,3,1,1], baseFret: 5 },
    { label: 'A (öppen + 6:e bandet)', frets: [-1,0,7,9,10,9], fingers: [0,0,1,3,4,3], baseFret: 7 },
    { label: 'A (A-form, 12:e bandet)', frets: [-1,12,14,14,14,12], fingers: [0,1,3,3,3,1], baseFret: 12, barre: 12 },
  ],
  'B': [
    { label: 'B (E-form, 7:e bandet)', frets: [7,9,9,8,7,7], fingers: [1,3,4,2,1,1], baseFret: 7, barre: 7 },
    { label: 'B (utan bas, 6:e bandet)', frets: [-1,-1,9,8,7,7], fingers: [0,0,3,2,1,1], baseFret: 7 },
    { label: 'B (D-form, 8:e bandet)', frets: [-1,-1,9,11,12,11], fingers: [0,0,1,3,4,3], baseFret: 9 },
    { label: 'B (C-form, 10:e bandet)', frets: [-1,14,13,11,12,11], fingers: [0,4,3,1,2,1], baseFret: 11 },
  ],
  'Bb': [
    { label: 'Bb (E-form, 6:e bandet)', frets: [6,8,8,7,6,6], fingers: [1,3,4,2,1,1], baseFret: 6, barre: 6 },
    { label: 'Bb (D-form, D–e)', frets: [-1,-1,3,3,3,1], fingers: [0,0,2,3,4,1], baseFret: 1 },
    { label: 'Bb (utan bas, G–e)', frets: [-1,-1,-1,3,3,1], fingers: [0,0,0,2,3,1] },
  ],
  'Eb': [
    { label: 'Eb (E-form, 11:e bandet)', frets: [-1,-1,5,3,4,3], fingers: [0,0,3,1,2,1], baseFret: 3, barre: 3 },
    { label: 'Eb (A-form, 6:e bandet)', frets: [-1,6,8,8,8,6], fingers: [0,1,3,3,3,1], baseFret: 6, barre: 6 },
  ],
  'Ab': [
    { label: 'Ab (A-form, utan E)', frets: [-1,4,6,6,6,4], fingers: [0,1,3,3,3,1], baseFret: 4, barre: 4 },
    { label: 'Ab (utan bas, D–e)', frets: [-1,-1,6,5,4,4], fingers: [0,0,3,2,1,1], baseFret: 4 },
  ],
  'F#': [
    { label: 'F# (A-form, 9:e bandet)', frets: [-1,9,11,11,11,9], fingers: [0,1,3,3,3,1], baseFret: 9, barre: 9 },
    { label: 'F# (utan bas, D–e)', frets: [-1,-1,4,3,2,2], fingers: [0,0,3,2,1,1], baseFret: 2 },
  ],
  'Db': [
    { label: 'Db (A-form, 4:e bandet)', frets: [-1,4,6,6,6,4], fingers: [0,1,3,3,3,1], baseFret: 4, barre: 4 },
    { label: 'Db (E-form, 9:e bandet)', frets: [9,11,11,10,9,9], fingers: [1,3,4,2,1,1], baseFret: 9, barre: 9 },
  ],

  // ─── Minor ───
  'Am': [
    { label: 'Am (E-form, 5:e bandet)', frets: [5,7,7,5,5,5], fingers: [1,3,4,1,1,1], baseFret: 5, barre: 5 },
    { label: 'Am (öppen + A-sträng)', frets: [-1,0,2,5,5,5], fingers: [0,0,1,3,3,3], baseFret: 5 },
    { label: 'Am (utan bas, 6:e bandet)', frets: [-1,-1,7,9,10,8], fingers: [0,0,1,3,4,2], baseFret: 7 },
    { label: 'Am (A-form, 12:e bandet)', frets: [-1,12,14,14,13,12], fingers: [0,1,3,4,2,1], baseFret: 12, barre: 12 },
  ],
  'Bm': [
    { label: 'Bm (E-form, 7:e bandet)', frets: [7,9,9,7,7,7], fingers: [1,3,4,1,1,1], baseFret: 7, barre: 7 },
    { label: 'Bm (utan bas, D–e)', frets: [-1,-1,4,4,3,2], fingers: [0,0,3,4,2,1], baseFret: 2 },
    { label: 'Bm (A-form, utan E)', frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1], baseFret: 2, barre: 2 },
  ],
  'Cm': [
    { label: 'Cm (E-form, 8:e bandet)', frets: [8,10,10,8,8,8], fingers: [1,3,4,1,1,1], baseFret: 8, barre: 8 },
    { label: 'Cm (A-form, utan E)', frets: [-1,3,5,5,4,3], fingers: [0,1,3,4,2,1], baseFret: 3, barre: 3 },
    { label: 'Cm (utan bas, D–e)', frets: [-1,-1,5,5,4,3], fingers: [0,0,3,4,2,1], baseFret: 3 },
  ],
  'Dm': [
    { label: 'Dm (A-form, 5:e bandet)', frets: [-1,5,7,7,6,5], fingers: [0,1,3,4,2,1], baseFret: 5, barre: 5 },
    { label: 'Dm (E-form, 10:e bandet)', frets: [10,12,12,10,10,10], fingers: [1,3,4,1,1,1], baseFret: 10, barre: 10 },
  ],
  'Em': [
    { label: 'Em (A-form, 7:e bandet)', frets: [-1,7,9,9,8,7], fingers: [0,1,3,4,2,1], baseFret: 7, barre: 7 },
    { label: 'Em (öppen + 7:e bandet)', frets: [0,10,9,0,8,0], fingers: [0,4,3,0,2,0], baseFret: 7 },
    { label: 'Em (utan bas, D–e)', frets: [-1,-1,2,4,5,3], fingers: [0,0,1,3,4,2], baseFret: 2 },
  ],
  'Fm': [
    { label: 'Fm (A-form, 8:e bandet)', frets: [-1,8,10,10,9,8], fingers: [0,1,3,4,2,1], baseFret: 8, barre: 8 },
    { label: 'Fm (utan bas, D–e)', frets: [-1,-1,3,1,1,1], fingers: [0,0,3,1,1,1], barre: 1 },
    { label: 'Fm (D-form, G–e)', frets: [-1,-1,-1,10,9,8], fingers: [0,0,0,3,2,1], baseFret: 8 },
  ],
  'Gm': [
    { label: 'Gm (A-form, 10:e bandet)', frets: [-1,10,12,12,11,10], fingers: [0,1,3,4,2,1], baseFret: 10, barre: 10 },
    { label: 'Gm (utan bas, D–e)', frets: [-1,-1,5,3,3,3], fingers: [0,0,3,1,1,1], baseFret: 3, barre: 3 },
    { label: 'Gm (D-form, G–e)', frets: [-1,-1,-1,3,3,3], fingers: [0,0,0,1,1,1], baseFret: 3, barre: 3 },
  ],
  'F#m': [
    { label: 'F#m (A-form, 9:e bandet)', frets: [-1,9,11,11,10,9], fingers: [0,1,3,4,2,1], baseFret: 9, barre: 9 },
    { label: 'F#m (utan bas, D–e)', frets: [-1,-1,4,2,2,2], fingers: [0,0,3,1,1,1], baseFret: 2, barre: 2 },
  ],
  'C#m': [
    { label: 'C#m (utan bas, D–e)', frets: [-1,-1,6,6,5,4], fingers: [0,0,3,4,2,1], baseFret: 4 },
    { label: 'C#m (E-form, 9:e bandet)', frets: [9,11,11,9,9,9], fingers: [1,3,4,1,1,1], baseFret: 9, barre: 9 },
  ],
  'Bbm': [
    { label: 'Bbm (E-form, 6:e bandet)', frets: [6,8,8,6,6,6], fingers: [1,3,4,1,1,1], baseFret: 6, barre: 6 },
    { label: 'Bbm (utan bas, D–e)', frets: [-1,-1,3,3,2,1], fingers: [0,0,3,4,2,1] },
  ],

  // ─── Dominant 7 ───
  // CAGED-former: E7=[n,n+2,n,n+1,n,n]  A7=[x,n,n+2,n,n+2,n]  D7=[x,x,n,n+2,n+1,n+2]
  'A7': [
    { label: 'A7 (E-form, 5:e bandet)', frets: [5,7,5,6,5,5], fingers: [1,3,1,2,1,1], baseFret: 5, barre: 5 },
    { label: 'A7 (A-form, öppen)', frets: [-1,0,2,0,2,0], fingers: [0,0,2,0,3,0] },
    { label: 'A7 (D-form, 7:e bandet)', frets: [-1,-1,7,9,8,9], fingers: [0,0,1,3,2,4], baseFret: 7 },
    { label: 'A7 (utan bas, G–e)', frets: [-1,-1,-1,2,2,3], fingers: [0,0,0,1,1,2] },
  ],
  'B7': [
    { label: 'B7 (E-form, 7:e bandet)', frets: [7,9,7,8,7,7], fingers: [1,3,1,2,1,1], baseFret: 7, barre: 7 },
    { label: 'B7 (A-form, 2:a bandet)', frets: [-1,2,4,2,4,2], fingers: [0,1,3,1,4,1], baseFret: 2, barre: 2 },
    { label: 'B7 (D-form, 9:e bandet)', frets: [-1,-1,9,11,10,11], fingers: [0,0,1,3,2,4], baseFret: 9 },
    { label: 'B7 (utan bas, D–e)', frets: [-1,-1,1,2,0,2], fingers: [0,0,1,3,0,4] },
  ],
  'C7': [
    { label: 'C7 (E-form, 8:e bandet)', frets: [8,10,8,9,8,8], fingers: [1,3,1,2,1,1], baseFret: 8, barre: 8 },
    { label: 'C7 (A-form, 3:e bandet)', frets: [-1,3,5,3,5,3], fingers: [0,1,3,1,4,1], baseFret: 3, barre: 3 },
    { label: 'C7 (D-form, 10:e bandet)', frets: [-1,-1,10,12,11,12], fingers: [0,0,1,3,2,4], baseFret: 10 },
    { label: 'C7 (öppen variant)', frets: [-1,3,2,3,1,0], fingers: [0,3,2,4,1,0] },
  ],
  'D7': [
    { label: 'D7 (E-form, 10:e bandet)', frets: [10,12,10,11,10,10], fingers: [1,3,1,2,1,1], baseFret: 10, barre: 10 },
    { label: 'D7 (A-form, 5:e bandet)', frets: [-1,5,7,5,7,5], fingers: [0,1,3,1,4,1], baseFret: 5, barre: 5 },
    { label: 'D7 (D-form, öppen)', frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3] },
    { label: 'D7 (utan bas, D–e)', frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3] },
  ],
  'E7': [
    { label: 'E7 (E-form, öppen)', frets: [0,2,0,1,0,0], fingers: [0,2,0,1,0,0] },
    { label: 'E7 (A-form, 7:e bandet)', frets: [-1,7,9,7,9,7], fingers: [0,1,3,1,4,1], baseFret: 7, barre: 7 },
    { label: 'E7 (D-form, 2:a bandet)', frets: [-1,-1,2,4,3,4], fingers: [0,0,1,3,2,4], baseFret: 2 },
    { label: 'E7 (öppen variant)', frets: [0,2,0,1,3,0], fingers: [0,2,0,1,3,0] },
  ],
  'F7': [
    { label: 'F7 (E-form, 1:a bandet)', frets: [1,3,1,2,1,1], fingers: [1,3,1,2,1,1], baseFret: 1, barre: 1 },
    { label: 'F7 (A-form, 8:e bandet)', frets: [-1,8,10,8,10,8], fingers: [0,1,3,1,4,1], baseFret: 8, barre: 8 },
    { label: 'F7 (D-form, 3:e bandet)', frets: [-1,-1,3,5,4,5], fingers: [0,0,1,3,2,4], baseFret: 3 },
    { label: 'F7 (utan bas, D–e)', frets: [-1,-1,3,2,4,1], fingers: [0,0,2,1,4,1] },
  ],
  'G7': [
    { label: 'G7 (E-form, 3:e bandet)', frets: [3,5,3,4,3,3], fingers: [1,3,1,2,1,1], baseFret: 3, barre: 3 },
    { label: 'G7 (A-form, 10:e bandet)', frets: [-1,10,12,10,12,10], fingers: [0,1,3,1,4,1], baseFret: 10, barre: 10 },
    { label: 'G7 (D-form, 5:e bandet)', frets: [-1,-1,5,7,6,7], fingers: [0,0,1,3,2,4], baseFret: 5 },
    { label: 'G7 (öppen variant)', frets: [3,2,0,0,0,1], fingers: [3,2,0,0,0,1] },
  ],

  // ─── Minor 7 ───
  // CAGED-former: Em7=[n,n+2,n,n,n,n]  Am7=[x,n,n+2,n,n+1,n]  Dm7=[x,x,n,n+2,n+1,n+1]
  'Am7': [
    { label: 'Am7 (öppen)', frets: [-1,0,2,0,1,0], fingers: [0,0,2,0,1,0] },
    { label: 'Am7 (E-form, 5:e bandet)', frets: [5,7,5,5,5,5], fingers: [1,3,1,1,1,1], baseFret: 5, barre: 5 },
    { label: 'Am7 (D-form, 7:e bandet)', frets: [-1,-1,7,9,8,8], fingers: [0,0,1,3,2,2], baseFret: 7 },
  ],
  'Dm7': [
    { label: 'Dm7 (D-form, öppen)', frets: [-1,-1,0,2,1,1], fingers: [0,0,0,2,1,1] },
    { label: 'Dm7 (A-form, 5:e bandet)', frets: [-1,5,7,5,6,5], fingers: [0,1,3,1,2,1], baseFret: 5, barre: 5 },
    { label: 'Dm7 (E-form, 10:e bandet)', frets: [10,12,10,10,10,10], fingers: [1,3,1,1,1,1], baseFret: 10, barre: 10 },
  ],
  'Em7': [
    { label: 'Em7 (E-form, öppen)', frets: [0,2,0,0,0,0], fingers: [0,2,0,0,0,0] },
    { label: 'Em7 (D-form, 2:a bandet)', frets: [-1,-1,2,4,3,3], fingers: [0,0,1,3,2,2], baseFret: 2 },
    { label: 'Em7 (A-form, 7:e bandet)', frets: [-1,7,9,7,8,7], fingers: [0,1,3,1,2,1], baseFret: 7, barre: 7 },
  ],
  'Bm7': [
    { label: 'Bm7 (A-form, 2:a bandet)', frets: [-1,2,4,2,3,2], fingers: [0,1,3,1,2,1], baseFret: 2, barre: 2 },
    { label: 'Bm7 (E-form, 7:e bandet)', frets: [7,9,7,7,7,7], fingers: [1,3,1,1,1,1], baseFret: 7, barre: 7 },
    { label: 'Bm7 (D-form, 9:e bandet)', frets: [-1,-1,9,11,10,10], fingers: [0,0,1,3,2,2], baseFret: 9 },
  ],
  'Cm7': [
    { label: 'Cm7 (A-form, 3:e bandet)', frets: [-1,3,5,3,4,3], fingers: [0,1,3,1,2,1], baseFret: 3, barre: 3 },
    { label: 'Cm7 (E-form, 8:e bandet)', frets: [8,10,8,8,8,8], fingers: [1,3,1,1,1,1], baseFret: 8, barre: 8 },
    { label: 'Cm7 (D-form, 10:e bandet)', frets: [-1,-1,10,12,11,11], fingers: [0,0,1,3,2,2], baseFret: 10 },
  ],
  'F#m7': [
    { label: 'F#m7 (E-form, 2:a bandet)', frets: [2,4,2,2,2,2], fingers: [1,3,1,1,1,1], baseFret: 2, barre: 2 },
    { label: 'F#m7 (D-form, 4:e bandet)', frets: [-1,-1,4,6,5,5], fingers: [0,0,1,3,2,2], baseFret: 4 },
    { label: 'F#m7 (A-form, 9:e bandet)', frets: [-1,9,11,9,10,9], fingers: [0,1,3,1,2,1], baseFret: 9, barre: 9 },
  ],
  'Gm7': [
    { label: 'Gm7 (E-form, 3:e bandet)', frets: [3,5,3,3,3,3], fingers: [1,3,1,1,1,1], baseFret: 3, barre: 3 },
    { label: 'Gm7 (D-form, 5:e bandet)', frets: [-1,-1,5,7,6,6], fingers: [0,0,1,3,2,2], baseFret: 5 },
    { label: 'Gm7 (A-form, 10:e bandet)', frets: [-1,10,12,10,11,10], fingers: [0,1,3,1,2,1], baseFret: 10, barre: 10 },
  ],
};

// Enharmonic equivalents: C#=Db, D#=Eb, F#=Gb, G#=Ab, A#=Bb (and reverse)
export const ENHARMONIC = {
  'C#':'Db','Db':'C#','D#':'Eb','Eb':'D#',
  'F#':'Gb','Gb':'F#','G#':'Ab','Ab':'G#','A#':'Bb','Bb':'A#'
};

export function toEnharmonic(name) {
  const m = name.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return null;
  const alt = ENHARMONIC[m[1]];
  return alt ? alt + m[2] : null;
}

// Try to find a chord, including enharmonic equivalents and slash chord fallback
export function lookupChord(name) {
  // Direct match
  if (CHORD_LIB[name]) return { ...CHORD_LIB[name], name };

  // Try enharmonic equivalent (e.g. A#m → Bbm, D#7 → Eb7)
  const enh = toEnharmonic(name);
  if (enh && CHORD_LIB[enh]) return { ...CHORD_LIB[enh], name };

  // Strip bass note for slash chords not in library
  if (name.includes('/')) {
    const base = name.split('/')[0];
    if (CHORD_LIB[base]) return { ...CHORD_LIB[base], name };
    const enhBase = toEnharmonic(base);
    if (enhBase && CHORD_LIB[enhBase]) return { ...CHORD_LIB[enhBase], name };
  }

  return null;
}

export function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Generate SVG chord diagram
export function chordSVG(chordData, size = 60) {
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

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ackorddiagram för ${escHtml(name)}">`;

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
export function getUniqueChords(song, transposeSemitones) {
  const seen = new Set();
  const chords = [];

  song.sections.forEach(sec => {
    sec.lines.forEach(line => {
      const rawC = line.c || '';
      const cStr = rawC.startsWith('@') && song.chordTemplates
        ? (song.chordTemplates[rawC.slice(1)] || '')
        : rawC;
      const flatStr = cStr.split('|').join(' ');
      const regex = /(\S+)/g;
      let m;
      while ((m = regex.exec(flatStr)) !== null) {
        let name = m[1];
        if (transposeSemitones !== 0) {
          name = transposeChordName(name, transposeSemitones);
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

// Get all voicings for a chord name (primary + alternatives)
export function getAllVoicings(name) {
  const primary = lookupChord(name);
  if (!primary) return [];

  const voicings = [{ ...primary, label: `${name} (standard)` }];

  // Look up alternatives by the canonical library key
  const keys = [name];
  const enh = toEnharmonic(name);
  if (enh) keys.push(enh);
  // Strip suffix-less root for matching (e.g. "C#m" → try "C#m")
  if (name.includes('/')) keys.push(name.split('/')[0]);

  for (const key of keys) {
    const alts = CHORD_VOICINGS[key];
    if (alts) {
      alts.forEach(v => {
        // Avoid duplicates based on fret pattern
        const sig = v.frets.join(',');
        if (!voicings.some(existing => existing.frets.join(',') === sig)) {
          voicings.push({ ...v, name });
        }
      });
    }
  }

  return voicings;
}

// Render chord diagram strip for a song
export function renderChordDiagrams(song, transposeSemitones) {
  const chordNames = getUniqueChords(song, transposeSemitones);
  const diagrams = chordNames
    .map(name => {
      const data = lookupChord(name);
      if (!data) return '';
      return `<div class="chord-diagram" data-chord="${escHtml(name)}" role="button" tabindex="0" aria-label="Visa greppvarianter för ${escHtml(name)}">${chordSVG(data, 56)}</div>`;
    })
    .filter(d => d !== '');

  if (diagrams.length === 0) return '';

  return `<div class="chord-diagrams-strip">${diagrams.join('')}</div>`;
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHORD_LIB, ENHARMONIC, NOTES_SHARP, NOTES_FLAT,
  transposeChordName, parseChordLine,
  lookupChord, toEnharmonic, escHtml,
  getUniqueChords,
  isUgChordLine, parseUgImportText,
} from '../chords.js';

// ─── transposeChordName ───

describe('transposeChordName', () => {
  it('returns chord unchanged when semitones is 0', () => {
    assert.equal(transposeChordName('Am', 0), 'Am');
    assert.equal(transposeChordName('G7', 0), 'G7');
  });

  it('transposes up by 1 semitone', () => {
    assert.equal(transposeChordName('C', 1), 'C#');
    assert.equal(transposeChordName('E', 1), 'F');
    assert.equal(transposeChordName('B', 1), 'C');
  });

  it('transposes down by 1 semitone', () => {
    assert.equal(transposeChordName('C', -1), 'B');
    assert.equal(transposeChordName('Db', -1), 'C');
    assert.equal(transposeChordName('F', -1), 'E');
  });

  it('transposes minor chords', () => {
    assert.equal(transposeChordName('Am', 3), 'Cm');
    assert.equal(transposeChordName('Em', 2), 'F#m');
  });

  it('transposes 7th chords', () => {
    assert.equal(transposeChordName('G7', 2), 'A7');
    assert.equal(transposeChordName('D7', 5), 'G7');
  });

  it('transposes slash chords', () => {
    assert.equal(transposeChordName('C/G', 2), 'D/A');
    assert.equal(transposeChordName('G/B', 5), 'C/E');
  });

  it('wraps around the octave', () => {
    assert.equal(transposeChordName('C', 12), 'C');
    assert.equal(transposeChordName('A', 3), 'C');
  });

  it('handles complex chord names', () => {
    assert.equal(transposeChordName('F#m7', 2), 'G#m7');
    assert.equal(transposeChordName('Bbm7b5', 1), 'Bm7b5');
  });

  it('spells "downward" transpositions with flats regardless of normalization', () => {
    // 10 = ((-2) + 12) % 12, dvs samma transponering som -2 men normaliserat till 0–11
    assert.equal(transposeChordName('F', 10), 'Eb');
    assert.equal(transposeChordName('Bb', 10), 'Ab');
    assert.equal(transposeChordName('Cm', 10), 'Bbm');
    assert.equal(transposeChordName('F', -2), 'Eb');
  });
});

// ─── parseChordLine ───

describe('parseChordLine', () => {
  it('parses single chord', () => {
    const result = parseChordLine('Am');
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Am');
    assert.equal(result[0].pos, 0);
  });

  it('parses multiple chords with positions', () => {
    const result = parseChordLine('C       G');
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'C');
    assert.equal(result[0].pos, 0);
    assert.equal(result[1].name, 'G');
    assert.equal(result[1].pos, 8);
  });

  it('returns empty array for empty string', () => {
    assert.deepEqual(parseChordLine(''), []);
  });
});

// ─── lookupChord ───

describe('lookupChord', () => {
  it('finds direct chord', () => {
    const result = lookupChord('Am');
    assert.ok(result);
    assert.equal(result.name, 'Am');
    assert.deepEqual(result.frets, [-1, 0, 2, 2, 1, 0]);
  });

  it('finds enharmonic equivalent', () => {
    const result = lookupChord('A#');
    assert.ok(result);
    assert.equal(result.name, 'A#');
  });

  it('falls back to base chord for unknown slash chords', () => {
    const result = lookupChord('Am/G');
    assert.ok(result);
    assert.equal(result.name, 'Am/G');
  });

  it('returns null for unknown chord', () => {
    assert.equal(lookupChord('Xz9'), null);
  });
});

// ─── toEnharmonic ───

describe('toEnharmonic', () => {
  it('converts sharps to flats', () => {
    assert.equal(toEnharmonic('C#'), 'Db');
    assert.equal(toEnharmonic('F#'), 'Gb');
  });

  it('converts flats to sharps', () => {
    assert.equal(toEnharmonic('Db'), 'C#');
    assert.equal(toEnharmonic('Bb'), 'A#');
  });

  it('preserves suffix', () => {
    assert.equal(toEnharmonic('C#m'), 'Dbm');
    assert.equal(toEnharmonic('Bbm7'), 'A#m7');
  });

  it('returns null for natural notes', () => {
    assert.equal(toEnharmonic('C'), null);
    assert.equal(toEnharmonic('G'), null);
  });

  it('returns null for invalid input', () => {
    assert.equal(toEnharmonic('xyz'), null);
  });
});

// ─── escHtml ───

describe('escHtml', () => {
  it('escapes ampersands', () => {
    assert.equal(escHtml('A & B'), 'A &amp; B');
  });

  it('escapes angle brackets', () => {
    assert.equal(escHtml('<script>'), '&lt;script&gt;');
  });

  it('leaves normal text unchanged', () => {
    assert.equal(escHtml('Hello World'), 'Hello World');
  });
});

// ─── CHORD_LIB completeness ───

describe('CHORD_LIB', () => {
  it('has all 12 major chords', () => {
    const roots = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    roots.forEach(root => {
      const found = CHORD_LIB[root] || CHORD_LIB[ENHARMONIC[root]];
      assert.ok(found, `Missing major chord: ${root}`);
    });
  });

  it('has common minor chords', () => {
    ['Am','Bm','Cm','Dm','Em','Fm','Gm','F#m'].forEach(chord => {
      assert.ok(CHORD_LIB[chord], `Missing: ${chord}`);
    });
  });

  it('has sus4 chords for all 12 roots', () => {
    const roots = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    roots.forEach(root => {
      const name = root + 'sus4';
      const alt = ENHARMONIC[root];
      const found = CHORD_LIB[name] || (alt && CHORD_LIB[alt + 'sus4']);
      assert.ok(found, `Missing sus4 chord: ${name}`);
    });
  });

  it('has sus2 chords for all 12 roots', () => {
    const roots = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    roots.forEach(root => {
      const name = root + 'sus2';
      const alt = ENHARMONIC[root];
      const found = CHORD_LIB[name] || (alt && CHORD_LIB[alt + 'sus2']);
      assert.ok(found, `Missing sus2 chord: ${name}`);
    });
  });

  it('has dominant 7th chords for all 12 roots', () => {
    const roots = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    roots.forEach(root => {
      const name = root + '7';
      const alt = ENHARMONIC[root];
      const found = CHORD_LIB[name] || (alt && CHORD_LIB[alt + '7']);
      assert.ok(found, `Missing 7th chord: ${name}`);
    });
  });

  it('every chord has 6 frets', () => {
    Object.entries(CHORD_LIB).forEach(([name, data]) => {
      assert.equal(data.frets.length, 6, `${name} should have 6 frets`);
    });
  });

  it('every chord has 6 fingers', () => {
    Object.entries(CHORD_LIB).forEach(([name, data]) => {
      assert.equal(data.fingers.length, 6, `${name} should have 6 fingers`);
    });
  });
});

// ─── NOTES arrays ───

describe('NOTES arrays', () => {
  it('NOTES_SHARP has 12 entries', () => {
    assert.equal(NOTES_SHARP.length, 12);
  });

  it('NOTES_FLAT has 12 entries', () => {
    assert.equal(NOTES_FLAT.length, 12);
  });

  it('both start with C', () => {
    assert.equal(NOTES_SHARP[0], 'C');
    assert.equal(NOTES_FLAT[0], 'C');
  });
});

// ─── isUgChordLine ───

describe('isUgChordLine', () => {
  it('recognizes a simple chord line', () => {
    assert.equal(isUgChordLine('G          D'), true);
  });

  it('recognizes chord lines with extended qualities', () => {
    assert.equal(isUgChordLine('Am7   Dsus4   G/B   Cmaj7'), true);
  });

  it('ignores trailing repeat markers like x2', () => {
    assert.equal(isUgChordLine('C   G   x2'), true);
    assert.equal(isUgChordLine('C   G   (2x)'), true);
  });

  it('rejects lyric lines', () => {
    assert.equal(isUgChordLine('Amazing grace how sweet the sound'), false);
  });

  it('rejects blank lines', () => {
    assert.equal(isUgChordLine(''), false);
    assert.equal(isUgChordLine('   '), false);
  });

  it('accepts N.C. as a no-chord marker', () => {
    assert.equal(isUgChordLine('N.C.'), true);
  });
});

// ─── parseUgImportText ───

describe('parseUgImportText', () => {
  it('pairs a chord line with the lyric line below it, preserving alignment', () => {
    const text = [
      '[Verse 1]',
      'G          D',
      'Amazing grace, how sweet the sound',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.equal(result.sections.length, 1);
    assert.equal(result.sections[0].label, 'Vers 1');
    assert.deepEqual(result.sections[0].lines, [
      { c: 'G          D', l: 'Amazing grace, how sweet the sound' },
    ]);
  });

  it('maps common English section names to Swedish labels', () => {
    const text = [
      '[Verse]',
      'C',
      'Text',
      '[Chorus]',
      'G',
      'Text',
      '[Bridge]',
      'Am',
      'Text',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections.map(s => s.label), ['Vers', 'Refräng', 'Brygga']);
  });

  it('numbers repeated unlabeled sections', () => {
    const text = [
      '[Verse]',
      'C',
      'Text ett',
      '[Verse]',
      'G',
      'Text två',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections.map(s => s.label), ['Vers', 'Vers 2']);
  });

  it('falls back to auto-numbered verses split by blank lines when there are no headers', () => {
    const text = [
      'C          G',
      'Första raden',
      '',
      'D          Am',
      'Andra raden',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections.map(s => s.label), ['Vers 1', 'Vers 2']);
  });

  it('handles an instrumental chord-only line with no lyric below', () => {
    const text = ['[Intro]', 'G   D   Em   C'].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections[0].lines, [{ c: 'G   D   Em   C', l: '' }]);
  });

  it('keeps lyric-only lines with no chords', () => {
    const text = ['[Verse]', 'Spoken word intro with no chords'].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections[0].lines, [{ c: '', l: 'Spoken word intro with no chords' }]);
  });

  it('extracts Key and Capo metadata lines without treating them as lyrics', () => {
    const text = [
      'Key: G',
      'Capo: 3rd fret',
      '[Verse]',
      'C',
      'Text',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.equal(result.key, 'G');
    assert.equal(result.capo, '3rd fret');
    assert.equal(result.sections[0].lines.length, 1);
  });

  it('skips common metadata lines like "Tabbed by"', () => {
    const text = ['Tabbed by: someone', '[Verse]', 'C', 'Text'].join('\n');
    const result = parseUgImportText(text);
    assert.equal(result.sections[0].lines.length, 1);
    assert.equal(result.sections[0].lines[0].l, 'Text');
  });

  it('detects "Title by Artist" on the first line', () => {
    const text = ['Wonderwall by Oasis', '[Verse]', 'Em7', 'Text'].join('\n');
    const result = parseUgImportText(text);
    assert.equal(result.title, 'Wonderwall');
    assert.equal(result.artist, 'Oasis');
  });

  it('returns no sections for empty input', () => {
    const result = parseUgImportText('');
    assert.deepEqual(result.sections, []);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHORD_LIB, ENHARMONIC, NOTES_SHARP, NOTES_FLAT,
  transposeChordName, parseChordLine,
  lookupChord, toEnharmonic, escHtml,
  getUniqueChords,
  isUgChordLine, parseUgImportText, preferSharpSpelling, rescueChordLines,
  isUgInlineChordLine, parseUgInlineChordLine,
  renderChordFlow,
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

  it('stavar alltid med #, även neråt', () => {
    // 10 = ((-2) + 12) % 12, dvs samma transponering som -2 men normaliserat till 0–11
    assert.equal(transposeChordName('F', 10), 'D#');
    assert.equal(transposeChordName('Bb', 10), 'G#');
    assert.equal(transposeChordName('Cm', 10), 'A#m');
    assert.equal(transposeChordName('F', -2), 'D#');
  });

  it('tolkar b-stavad indata men svarar med #', () => {
    assert.equal(transposeChordName('Bb', 1), 'B');
    assert.equal(transposeChordName('Eb', 2), 'F');
    assert.equal(transposeChordName('Abm7', 1), 'Am7');
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

  // Värdena hamnar i attribut (value="…", data-file="…"), så citattecken
  // måste escapas — annars kapas ett häfte som heter Vår "22" av vid citatet.
  it('escapes quotes', () => {
    assert.equal(escHtml('Vår "22"'), 'Vår &quot;22&quot;');
    assert.equal(escHtml("Blinka's"), 'Blinka&#39;s');
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

  it('känner igen tal före sus/add, t.ex. 7sus4', () => {
    assert.equal(isUgChordLine('Dm7        G7sus4  G7 C'), true);
    assert.equal(isUgChordLine('C6add11'), true);
  });

  it('känner igen 7+ och andra alterationer', () => {
    assert.equal(isUgChordLine('      Am    E7+     Am  B7'), true);
    assert.equal(isUgChordLine('C7b9   G7#5   Bm7b5'), true);
  });

  it('behandlar taktstreck som avgränsare', () => {
    assert.equal(isUgChordLine('|C|G/B|Am|Em/G|F|F|C/E|Dm7|'), true);
    assert.equal(isUgChordLine('|G6 G7|C|'), true);
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

// rescueChordLines är importens andra skyddsnät och nås inte via
// parseUgImportText så länge UG_CHORD_TOKEN_RE täcker hela biblioteket — det
// gör den idag. Testas därför direkt, så nätet är känt fungerande den dag
// regexen får en lucka.
describe('rescueChordLines', () => {
  it('parar en ackordrad i l med textraden under', () => {
    const sek = { label: 'Vers', lines: [
      { c: '', l: 'Dm7   G7  C' },
      { c: '', l: 'Marken blir grön' },
    ] };
    assert.deepEqual(rescueChordLines(sek).lines, [
      { c: 'Dm7   G7  C', l: 'Marken blir grön' },
    ]);
  });

  it('flyttar en ackordrad utan text under till c', () => {
    const sek = { label: 'Intro', lines: [{ c: '', l: '|C|G/B|Am|' }] };
    assert.deepEqual(rescueChordLines(sek).lines, [{ c: '|C|G/B|Am|', l: '' }]);
  });

  it('rör inte rader som redan har ackorden i c', () => {
    const sek = { label: 'Vers', lines: [{ c: 'C  G', l: 'Text här' }] };
    assert.deepEqual(rescueChordLines(sek).lines, [{ c: 'C  G', l: 'Text här' }]);
  });

  it('rör inte ren sångtext', () => {
    const sek = { label: 'Vers', lines: [{ c: '', l: 'Marken blir grön igen' }] };
    assert.deepEqual(rescueChordLines(sek).lines, [{ c: '', l: 'Marken blir grön igen' }]);
  });

  it('behåller sektionens etikett', () => {
    const sek = { label: 'Refräng', lines: [{ c: '', l: 'C G' }] };
    assert.equal(rescueChordLines(sek).label, 'Refräng');
  });
});

describe('preferSharpSpelling', () => {
  it('byter alla fem b-stavningarna mot #', () => {
    assert.equal(preferSharpSpelling('Db Eb Gb Ab Bb'), 'C# D# F# G# A#');
  });

  it('behåller kolumnpositionerna', () => {
    const före = 'Bb           A        Dm';
    const efter = preferSharpSpelling(före);
    assert.equal(efter, 'A#           A        Dm');
    assert.equal(efter.length, före.length);
    assert.equal(efter.indexOf('Dm'), före.indexOf('Dm'));
  });

  it('rör inte b som inte är förtecken', () => {
    assert.equal(preferSharpSpelling('Bbm7b5'), 'A#m7b5');
    assert.equal(preferSharpSpelling('C7b9'), 'C7b9');
  });

  it('tar basnoten i slash-ackord', () => {
    assert.equal(preferSharpSpelling('F/Bb'), 'F/A#');
  });

  it('lämnar Cb och Fb orörda hellre än att flytta kolumner', () => {
    assert.equal(preferSharpSpelling('Cb Fb'), 'Cb Fb');
  });
});

describe('parseUgImportText', () => {
  it('normaliserar b-ackord till # vid import', () => {
    const text = [
      '[Verse 1]',
      'Bb         Ab',
      'Text på raden',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections[0].lines, [
      { c: 'A#         G#', l: 'Text på raden' },
    ]);
  });

  it('lägger 7sus4-rader i c, inte i l', () => {
    const text = ['[Verse 1]', 'Dm7        G7sus4  G7 C', 'Marken blir grön   i- gen.'].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections[0].lines, [
      { c: 'Dm7        G7sus4  G7 C', l: 'Marken blir grön   i- gen.' },
    ]);
  });

  it('lägger en taktstrecksrad utan text i c', () => {
    const text = ['[Intro]', '|C|G/B|Am|Em/G|'].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections[0].lines, [{ c: '|C|G/B|Am|Em/G|', l: '' }]);
  });

  it('normaliserar b-ackord även i inline-format och tonart', () => {
    const text = ['Key: Bb', '[Verse 1]', '[Bb]Text [Eb]här'].join('\n');
    const result = parseUgImportText(text);
    assert.equal(result.key, 'A#');
    assert.ok(result.sections[0].lines[0].c.includes('A#'));
    assert.ok(result.sections[0].lines[0].c.includes('D#'));
  });

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

// ─── isUgInlineChordLine ───

describe('isUgInlineChordLine', () => {
  it('recognizes inline bracket chords mixed with lyrics', () => {
    assert.equal(isUgInlineChordLine('[G]Amazing [D]grace'), true);
  });

  it('recognizes a line that is only a single bracket chord', () => {
    assert.equal(isUgInlineChordLine('[C]'), true);
  });

  it('does not treat a section header as inline chords', () => {
    assert.equal(isUgInlineChordLine('[Verse 1]'), false);
    assert.equal(isUgInlineChordLine('[Chorus]'), false);
  });

  it('returns false for plain lyric lines without brackets', () => {
    assert.equal(isUgInlineChordLine('Amazing grace how sweet the sound'), false);
  });
});

// ─── parseUgInlineChordLine ───

describe('parseUgInlineChordLine', () => {
  it('lifts inline chords into a separate chord line at matching positions', () => {
    const result = parseUgInlineChordLine('[G]Amazing [D]grace');
    assert.deepEqual(result, { c: 'G       D', l: 'Amazing grace' });
  });

  it('handles a line with only one inline chord and no lyrics', () => {
    assert.deepEqual(parseUgInlineChordLine('[C]'), { c: 'C', l: '' });
  });

  it('keeps colliding adjacent chords at least one space apart', () => {
    const result = parseUgInlineChordLine('[Am]a[C]b');
    assert.equal(result.l, 'ab');
    const chords = result.c.trim().split(/\s+/);
    assert.deepEqual(chords, ['Am', 'C']);
  });
});

// ─── parseUgImportText (inline format) ───

describe('parseUgImportText with inline chords', () => {
  it('converts inline-bracket lines into c/l pairs', () => {
    const text = ['[Verse 1]', '[G]Amazing [D]grace, how [Em]sweet the [C]sound'].join('\n');
    const result = parseUgImportText(text);
    assert.equal(result.sections.length, 1);
    assert.equal(result.sections[0].lines.length, 1);
    assert.equal(result.sections[0].lines[0].l, 'Amazing grace, how sweet the sound');
    assert.ok(result.sections[0].lines[0].c.includes('G'));
  });

  it('mixes classic and inline formats in the same song', () => {
    const text = [
      '[Verse 1]',
      'G          D',
      'Amazing grace, how sweet the sound',
      '[Chorus]',
      '[C]Praise [G]God from whom all blessings flow',
    ].join('\n');
    const result = parseUgImportText(text);
    assert.deepEqual(result.sections.map(s => s.label), ['Vers 1', 'Refräng']);
    assert.equal(result.sections[1].lines[0].l, 'Praise God from whom all blessings flow');
  });
});

// ─── renderChordFlow ───

describe('renderChordFlow', () => {
  const flow = (lyric, chordStr, semi = 0) =>
    renderChordFlow(lyric, parseChordLine(chordStr), semi);
  // Plockar bort hela ankarelementen (inklusive ackordnamnet inuti) så att
  // bara sångtexten blir kvar — den ska alltid vara oförändrad.
  const plain = html =>
    html.replace(/<span class="cl-anchor">.*?<\/span><\/span><\/span>/g, '');

  it('väver in ackorden vid rätt teckenposition', () => {
    const html = flow('I en evighet levde jag', '     C       F');
    assert.ok(html.startsWith('I en <span class="cl-anchor">'));
    assert.ok(html.includes('>C<'));
    assert.ok(html.includes('evighet '));
  });

  it('bevarar textinnehållet exakt', () => {
    const lyric = 'I en evighet levde jag som om du inte fanns';
    assert.equal(plain(flow(lyric, '     C       F         G7')), lyric);
  });

  it('behåller ackord vars offset pekar bortom radens slut', () => {
    // Ackordraden är längre än texten — G7 får inte tappas bort (den gamla
    // renderingen klippte bort ackord som hamnade utanför radbredden)
    const html = flow('kort text', '     C                   G7');
    assert.ok(html.includes('>C<'));
    assert.ok(html.includes('>G7<'));
    assert.equal(plain(html), 'kort text');
  });

  it('lägger ackord i textordning även vid udda positioner', () => {
    const html = flow('abcdef', '  X  Y');
    assert.ok(html.indexOf('>X<') < html.indexOf('>Y<'));
  });

  it('returnerar ren text när raden saknar ackord', () => {
    assert.equal(flow('bara text', ''), 'bara text');
  });

  it('transponerar ackordnamnen', () => {
    const html = flow('I en evighet', '     C', 2);
    assert.ok(html.includes('>D<'));
    assert.ok(!html.includes('>C<'));
  });

  it('escapar html i både text och ackordnamn', () => {
    const html = renderChordFlow('a<b>c', [{ name: '<X>', pos: 1 }]);
    assert.ok(!html.includes('<b>'));
    assert.ok(html.includes('&lt;b&gt;'));
    assert.ok(html.includes('&lt;X&gt;'));
  });

  it('hanterar tom text utan att krascha', () => {
    assert.equal(plain(renderChordFlow('', [])), '');
  });
});

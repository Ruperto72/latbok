import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { parseChordLine, transposeChordName, escHtml } = require('../app.js');

// ─── parseChordLine ───────────────────────────────────────────────────────────

describe('parseChordLine', () => {
  it('parsar ett enstaka ackord', () => {
    expect(parseChordLine('Am')).toEqual([{ name: 'Am', pos: 0 }]);
  });

  it('parsar flera ackord med korrekt position', () => {
    const result = parseChordLine('G            C/G        G');
    expect(result).toEqual([
      { name: 'G',   pos: 0 },
      { name: 'C/G', pos: 13 },
      { name: 'G',   pos: 24 },
    ]);
  });

  it('returnerar tom array för tom sträng', () => {
    expect(parseChordLine('')).toEqual([]);
  });

  it('returnerar tom array för sträng med bara mellanslag', () => {
    expect(parseChordLine('   ')).toEqual([]);
  });

  it('parsar ackord med suffix (Am7, Cmaj7, Dsus4)', () => {
    const result = parseChordLine('Am7   Cmaj7  Dsus4');
    expect(result.map(c => c.name)).toEqual(['Am7', 'Cmaj7', 'Dsus4']);
  });

  it('bevarar exakt teckenposition', () => {
    const result = parseChordLine('        Am');
    expect(result).toEqual([{ name: 'Am', pos: 8 }]);
  });

  it('parsar slash-ackord', () => {
    const result = parseChordLine('C/G  E/B');
    expect(result[0].name).toBe('C/G');
    expect(result[1].name).toBe('E/B');
  });
});

// ─── transposeChordName ───────────────────────────────────────────────────────

describe('transposeChordName', () => {
  it('returnerar oförändrat ackord vid 0 halvsteg', () => {
    expect(transposeChordName('G', 0)).toBe('G');
    expect(transposeChordName('Am7', 0)).toBe('Am7');
  });

  it('transponerar uppåt ett halvsteg', () => {
    expect(transposeChordName('C', 1)).toBe('C#');
    expect(transposeChordName('E', 1)).toBe('F');
    expect(transposeChordName('B', 1)).toBe('C');
  });

  it('transponerar nedåt ett halvsteg', () => {
    expect(transposeChordName('C', -1)).toBe('B');
    expect(transposeChordName('F', -1)).toBe('E');
    expect(transposeChordName('Bb', -1)).toBe('A');
  });

  it('transponerar ett helt oktavvarv (12 halvsteg = samma ton)', () => {
    expect(transposeChordName('G', 12)).toBe('G');
    expect(transposeChordName('Am', 12)).toBe('Am');
  });

  it('bevarar ackordkvalitet (m, 7, maj7, sus4)', () => {
    expect(transposeChordName('Am', 3)).toBe('Cm');
    expect(transposeChordName('G7', 2)).toBe('A7');
    expect(transposeChordName('Cmaj7', 2)).toBe('Dmaj7');
    // Positiv transponering använder sharps (D# inte Eb)
    expect(transposeChordName('Dsus4', 1)).toBe('D#sus4');
  });

  it('transponerar slash-ackord (båda delarna)', () => {
    expect(transposeChordName('C/G', 2)).toBe('D/A');
    // Positiv transponering använder sharps
    expect(transposeChordName('G/B', 1)).toBe('G#/C');
    expect(transposeChordName('Am/E', 3)).toBe('Cm/G');
  });

  it('hanterar flats vid nedåttransponering', () => {
    expect(transposeChordName('D', -1)).toBe('Db');
    expect(transposeChordName('G', -1)).toBe('Gb');
  });

  it('hanterar sharps vid uppåttransponering', () => {
    expect(transposeChordName('F', 1)).toBe('F#');
    expect(transposeChordName('C', 2)).toBe('D');
  });

  it('transponerar korrekt runt hela kretsen', () => {
    let chord = 'C';
    for (let i = 0; i < 12; i++) chord = transposeChordName(chord, 1);
    expect(chord).toBe('C');
  });
});

// ─── escHtml ──────────────────────────────────────────────────────────────────

describe('escHtml', () => {
  it('escapar &', () => expect(escHtml('a & b')).toBe('a &amp; b'));
  it('escapar <', () => expect(escHtml('<div>')).toBe('&lt;div&gt;'));
  it('escapar >', () => expect(escHtml('a > b')).toBe('a &gt; b'));
  it('lämnar vanlig text oförändrad', () => expect(escHtml('Hello')).toBe('Hello'));
  it('hanterar tom sträng', () => expect(escHtml('')).toBe(''));
  it('escapar kombinationer', () => {
    expect(escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });
});

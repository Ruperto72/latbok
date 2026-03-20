import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { CHORD_LIB, lookupChord, getUniqueChords } = require('../chords.js');

// ─── lookupChord ──────────────────────────────────────────────────────────────

describe('lookupChord', () => {
  it('hittar ett vanligt ackord direkt', () => {
    const result = lookupChord('G');
    expect(result).not.toBeNull();
    expect(result.name).toBe('G');
    expect(result.frets).toHaveLength(6);
  });

  it('hittar mollackord', () => {
    const result = lookupChord('Am');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Am');
  });

  it('hittar slash-ackord som finns i biblioteket', () => {
    const result = lookupChord('C/G');
    expect(result).not.toBeNull();
    expect(result.name).toBe('C/G');
  });

  it('faller tillbaka på basackordet för okänt slash-ackord', () => {
    // C/X finns inte men C finns
    const result = lookupChord('C/X');
    expect(result).not.toBeNull();
    expect(result.frets).toEqual(CHORD_LIB['C'].frets);
  });

  it('returnerar null för okänt ackord', () => {
    expect(lookupChord('Xyz')).toBeNull();
  });

  it('returnerar null för tom sträng', () => {
    expect(lookupChord('')).toBeNull();
  });

  it('inkluderar name-egenskapen i resultatet', () => {
    const result = lookupChord('Em');
    expect(result.name).toBe('Em');
  });

  it('gör en shallow spread — frets-arrayen är samma referens (känd begränsning)', () => {
    // lookupChord använder { ...CHORD_LIB[name] } vilket är en shallow copy.
    // frets/fingers är fortfarande samma arrayobjekt som i CHORD_LIB.
    // TODO: deep-copy frets/fingers för att förhindra oavsiktliga mutationer.
    const result = lookupChord('G');
    expect(result.frets).toBe(CHORD_LIB['G'].frets);
  });
});

// ─── getUniqueChords ──────────────────────────────────────────────────────────

const makeSong = (lines) => ({
  sections: [{ label: 'Test', lines }]
});

describe('getUniqueChords', () => {
  it('extraherar unika ackord från en enkel låt', () => {
    const song = makeSong([
      { c: 'G    C    G', l: 'text' },
    ]);
    const result = getUniqueChords(song, 0);
    expect(result).toEqual(['G', 'C']);
  });

  it('deduplicerar ackord som upprepas', () => {
    const song = makeSong([
      { c: 'Am   F', l: 'rad 1' },
      { c: 'Am   G', l: 'rad 2' },
    ]);
    const result = getUniqueChords(song, 0);
    expect(result).toEqual(['Am', 'F', 'G']);
  });

  it('transponerar ackord korrekt', () => {
    const song = makeSong([{ c: 'C  G  Am', l: 'text' }]);
    const result = getUniqueChords(song, 2);
    expect(result).toContain('D');
    expect(result).toContain('A');
    expect(result).toContain('Bm');
    expect(result).not.toContain('C');
  });

  it('hanterar tomma ackordsrader', () => {
    const song = makeSong([
      { c: '', l: 'bara text' },
      { c: 'G', l: 'med ackord' },
    ]);
    expect(getUniqueChords(song, 0)).toEqual(['G']);
  });

  it('hanterar låt utan ackord alls', () => {
    const song = makeSong([{ c: '', l: 'text' }]);
    expect(getUniqueChords(song, 0)).toEqual([]);
  });

  it('samlar ackord från flera sektioner', () => {
    const song = {
      sections: [
        { label: 'Vers', lines: [{ c: 'G  D', l: 'text' }] },
        { label: 'Refräng', lines: [{ c: 'Em  C', l: 'text' }] },
      ]
    };
    const result = getUniqueChords(song, 0);
    expect(result).toEqual(['G', 'D', 'Em', 'C']);
  });

  it('returnerar 0 halvsteg transponering oförändrat', () => {
    const song = makeSong([{ c: 'Am  F  C  G', l: 'text' }]);
    expect(getUniqueChords(song, 0)).toEqual(['Am', 'F', 'C', 'G']);
  });
});

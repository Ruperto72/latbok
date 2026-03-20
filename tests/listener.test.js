import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { normalizeText, levenshteinLight, buildLyricIndex, findBestMatch, detectLanguage } = require('../listener.js');

// ─── normalizeText ────────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('gör text lowercase', () => {
    expect(normalizeText('Amazing Grace')).toBe('amazing grace');
  });

  it('tar bort skiljetecken', () => {
    expect(normalizeText('Hello, world!')).toBe('hello world');
    expect(normalizeText("it's a test.")).toBe('it s a test');
  });

  it('kollapsar flera mellanslag till ett', () => {
    expect(normalizeText('a   b   c')).toBe('a b c');
  });

  it('trimmar ledande och avslutande blanksteg', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('hanterar em-dash och bindestreck', () => {
    expect(normalizeText('well—done')).toBe('well done');
    expect(normalizeText('well-done')).toBe('well done');
  });

  it('returnerar tom sträng för tom input', () => {
    expect(normalizeText('')).toBe('');
  });
});

// ─── levenshteinLight ─────────────────────────────────────────────────────────

describe('levenshteinLight', () => {
  it('returnerar 0 för identiska strängar', () => {
    expect(levenshteinLight('grace', 'grace')).toBe(0);
    expect(levenshteinLight('', '')).toBe(0);
  });

  it('returnerar 1 för en substitution', () => {
    expect(levenshteinLight('grace', 'graco')).toBe(1);
    expect(levenshteinLight('test', 'text')).toBe(1);
  });

  it('returnerar 1 för en deletion', () => {
    expect(levenshteinLight('grace', 'grce')).toBe(1);
    expect(levenshteinLight('hello', 'helo')).toBe(1);
  });

  it('returnerar 1 för en insertion', () => {
    expect(levenshteinLight('grace', 'graace')).toBe(1);
    expect(levenshteinLight('helo', 'hello')).toBe(1);
  });

  it('returnerar 2 tidigt om stränglängdsskillnad > 1', () => {
    expect(levenshteinLight('abc', 'abcde')).toBe(2);
    expect(levenshteinLight('hello', 'hi')).toBe(2);
  });

  it('returnerar 2 för strängar som är för olika', () => {
    expect(levenshteinLight('abc', 'xyz')).toBe(2);
  });

  it('hanterar en tom och en icke-tom sträng', () => {
    expect(levenshteinLight('', 'a')).toBe(1);
    expect(levenshteinLight('a', '')).toBe(1);
  });
});

// ─── buildLyricIndex ─────────────────────────────────────────────────────────

describe('buildLyricIndex', () => {
  const song = {
    sections: [
      {
        label: 'Vers 1',
        lines: [
          { c: 'G', l: 'Amazing Grace, how sweet the sound,' },
          { c: '',  l: '' },
          { c: 'D', l: 'that saved a wretch like me.' },
        ]
      },
      {
        label: 'Vers 2',
        lines: [
          { c: 'G', l: 'I once was lost,' },
        ]
      }
    ]
  };

  it('bygger ett platt index med si och li', () => {
    const index = buildLyricIndex(song);
    expect(index[0].si).toBe(0);
    expect(index[0].li).toBe(0);
    expect(index[1].si).toBe(0);
    expect(index[1].li).toBe(2);
    expect(index[2].si).toBe(1);
    expect(index[2].li).toBe(0);
  });

  it('filtrerar bort tomma rader', () => {
    const index = buildLyricIndex(song);
    expect(index).toHaveLength(3);
    expect(index.every(l => l.raw.trim() !== '')).toBe(true);
  });

  it('normaliserar text i index', () => {
    const index = buildLyricIndex(song);
    expect(index[0].text).toBe('amazing grace how sweet the sound');
  });

  it('bevarar originaltext i raw', () => {
    const index = buildLyricIndex(song);
    expect(index[0].raw).toBe('Amazing Grace, how sweet the sound,');
  });

  it('returnerar tom array för låt utan text', () => {
    const empty = { sections: [{ label: 'X', lines: [{ c: 'G', l: '' }] }] };
    expect(buildLyricIndex(empty)).toEqual([]);
  });
});

// ─── findBestMatch ────────────────────────────────────────────────────────────

describe('findBestMatch', () => {
  const song = {
    sections: [{
      label: 'Vers',
      lines: [
        { c: '', l: 'Amazing Grace how sweet the sound' },
        { c: '', l: 'that saved a wretch like me' },
        { c: '', l: 'I once was lost but now am found' },
        { c: '', l: 'was blind but now I see' },
      ]
    }]
  };
  const index = buildLyricIndex(song);

  it('hittar en tydlig matchning', () => {
    const match = findBestMatch('amazing grace how sweet', index);
    expect(match).not.toBeNull();
    expect(match.si).toBe(0);
    expect(match.li).toBe(0);
  });

  it('hittar matchning i mitten av låten', () => {
    const match = findBestMatch('once was lost but now', index);
    expect(match).not.toBeNull();
    expect(match.li).toBe(2);
  });

  it('returnerar null för alldeles för kort transkript', () => {
    expect(findBestMatch('hi', index)).toBeNull();
  });

  it('returnerar null för tom sträng', () => {
    expect(findBestMatch('', index)).toBeNull();
  });

  it('tolererar stavfel (fuzzy matching)', () => {
    // "grase" vs "grace" — 1 tecken fel
    const match = findBestMatch('amazing grase how sweet', index);
    expect(match).not.toBeNull();
    expect(match.li).toBe(0);
  });

  it('startar sökning från angivet index (forward bias)', () => {
    // Söker från rad 2, ska hitta rad 2 trots att rad 0 också matchar "now"
    const match = findBestMatch('once was lost', index, 2);
    expect(match).not.toBeNull();
    expect(match.li).toBe(2);
  });

  it('returnerar null om ingen rad når min-tröskel', () => {
    const match = findBestMatch('xyz abc def ghi', index);
    expect(match).toBeNull();
  });
});

// ─── detectLanguage ───────────────────────────────────────────────────────────

describe('detectLanguage', () => {
  const makeSong = (text) => ({
    sections: [{ lines: [{ l: text }] }]
  });

  it('detekterar engelska', () => {
    const song = makeSong('Amazing Grace how sweet the sound that saved a wretch like me');
    expect(detectLanguage(song)).toBe('en-US');
  });

  it('detekterar svenska', () => {
    const song = makeSong('Och jag kan inte se att det ska gå bra');
    expect(detectLanguage(song)).toBe('sv-SE');
  });

  it('detekterar italienska', () => {
    const song = makeSong('Una mattina bella ciao della partigiano');
    expect(detectLanguage(song)).toBe('it-IT');
  });

  it('faller tillbaka på svenska som default', () => {
    const song = makeSong('aaaa bbbb cccc');
    expect(detectLanguage(song)).toBe('sv-SE');
  });
});

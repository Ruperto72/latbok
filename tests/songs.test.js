import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const songsDir = join(__dirname, '..', 'songs');

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

// Ladda index.json och alla låtfiler
const indexFile = JSON.parse(readFileSync(join(songsDir, 'index.json'), 'utf-8'));
const songFiles = readdirSync(songsDir).filter(f => f.endsWith('.json') && f !== 'index.json');

// ─── index.json ───────────────────────────────────────────────────────────────

describe('songs/index.json', () => {
  it('är en array', () => {
    expect(Array.isArray(indexFile)).toBe(true);
  });

  it('innehåller bara strängar', () => {
    indexFile.forEach(entry => expect(typeof entry).toBe('string'));
  });

  it('alla filer i index existerar faktiskt på disk', () => {
    indexFile.forEach(filename => {
      const path = join(songsDir, filename);
      let exists = true;
      try { readFileSync(path); } catch { exists = false; }
      expect(exists, `Saknad fil: ${filename}`).toBe(true);
    });
  });

  it('inga duplicerade filnamn i index', () => {
    const unique = new Set(indexFile);
    expect(unique.size).toBe(indexFile.length);
  });
});

// ─── Varje låtfil ─────────────────────────────────────────────────────────────

songFiles.forEach(filename => {
  describe(`songs/${filename}`, () => {
    let song;

    try {
      song = JSON.parse(readFileSync(join(songsDir, filename), 'utf-8'));
    } catch (e) {
      it('är giltig JSON', () => { throw e; });
      return;
    }

    it('är giltig JSON', () => {
      expect(song).toBeTruthy();
    });

    it('har title (sträng)', () => {
      expect(typeof song.title).toBe('string');
      expect(song.title.trim().length).toBeGreaterThan(0);
    });

    it('har artist (sträng)', () => {
      expect(typeof song.artist).toBe('string');
    });

    it('har key (sträng)', () => {
      expect(typeof song.key).toBe('string');
      expect(song.key.trim().length).toBeGreaterThan(0);
    });

    it('har giltig difficulty', () => {
      expect(VALID_DIFFICULTIES).toContain(song.difficulty);
    });

    it('har sections (array med minst en sektion)', () => {
      expect(Array.isArray(song.sections)).toBe(true);
      expect(song.sections.length).toBeGreaterThan(0);
    });

    it('varje sektion har label (sträng)', () => {
      song.sections.forEach((sec, i) => {
        expect(typeof sec.label, `sections[${i}].label`).toBe('string');
      });
    });

    it('varje sektion har lines (array)', () => {
      song.sections.forEach((sec, i) => {
        expect(Array.isArray(sec.lines), `sections[${i}].lines`).toBe(true);
      });
    });

    it('varje rad har c och l som strängar', () => {
      song.sections.forEach((sec, si) => {
        sec.lines.forEach((line, li) => {
          expect(typeof line.c, `sections[${si}].lines[${li}].c`).toBe('string');
          expect(typeof line.l, `sections[${si}].lines[${li}].l`).toBe('string');
        });
      });
    });

    it('ackordsrader innehåller inga ogiltiga tecken', () => {
      // Tillåtna: bokstäver, #, b, /, siffror, mellanslag
      const validChordChars = /^[A-Ga-g#b/0-9\s+maj dimsusMm]*$/;
      song.sections.forEach((sec, si) => {
        sec.lines.forEach((line, li) => {
          if (line.c.trim()) {
            expect(
              validChordChars.test(line.c),
              `Ogiltiga tecken i sections[${si}].lines[${li}].c: "${line.c}"`
            ).toBe(true);
          }
        });
      });
    });

    it('c och l har rimlig längdbalans (c aldrig längre än l + 20 tecken)', () => {
      song.sections.forEach((sec, si) => {
        sec.lines.forEach((line, li) => {
          if (line.c.trim() && line.l.trim()) {
            expect(
              line.c.length,
              `sections[${si}].lines[${li}].c är mycket längre än .l`
            ).toBeLessThanOrEqual(line.l.length + 20);
          }
        });
      });
    });
  });
});

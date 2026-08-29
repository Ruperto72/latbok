import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHORD_LIB, CHORD_VOICINGS } from '../chords.js';

// Testet räknar ut vilka toner varje grepp faktiskt ger och jämför med
// ackordnamnet — annars kan ett felskrivet band ligga kvar obemärkt.

const NOTER = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const TONKLASS = {
  'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,
  'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,
};
const TOMMA_STRÄNGAR = [4, 9, 2, 7, 11, 4];   // E A D G B E

const FORMLER = {
  '':     [0, 4, 7],
  'm':    [0, 3, 7],
  '7':    [0, 4, 7, 10],
  'm7':   [0, 3, 7, 10],
  '6':    [0, 4, 7, 9],
  'm6':   [0, 3, 7, 9],
  '7sus4':[0, 5, 7, 10],
  'maj7': [0, 4, 7, 11],
  'sus4': [0, 5, 7],
  'sus2': [0, 2, 7],
  'add9': [0, 4, 7, 2],
  'dim':  [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'aug':  [0, 4, 8],
  '9':    [0, 4, 7, 10, 2],
  'm7b5': [0, 3, 6, 10],
  '7+':   [0, 4, 8, 10],
};

function delaNamn(namn) {
  const m = namn.match(/^([A-G][#b]?)(.*)$/);
  return m ? { rot: m[1], suffix: m[2] } : null;
}

function toner(frets) {
  return frets.map((f, i) => (f < 0 ? null : (TOMMA_STRÄNGAR[i] + f) % 12));
}

// Alla grepp utom slash-ackorden, som har en egen basnot
const GRUNDACKORD = Object.entries(CHORD_LIB).filter(([namn]) => !namn.includes('/'));

describe('CHORD_LIB — täckning', () => {
  for (const suffix of Object.keys(FORMLER)) {
    it(`${suffix || 'dur'} finns för alla 12 grundtoner`, () => {
      const täckta = new Set();
      for (const [namn] of GRUNDACKORD) {
        const d = delaNamn(namn);
        if (d && d.suffix === suffix) täckta.add(TONKLASS[d.rot]);
      }
      const saknas = [...Array(12).keys()].filter(pc => !täckta.has(pc)).map(pc => NOTER[pc]);
      assert.deepEqual(saknas, [], `saknar ${suffix || 'dur'} med grundton ${saknas.join(', ')}`);
    });
  }
});

describe('CHORD_LIB — greppens toner', () => {
  for (const [namn, data] of GRUNDACKORD) {
    it(`${namn} ger rätt toner`, () => {
      const { rot, suffix } = delaNamn(namn);
      const formel = FORMLER[suffix];
      assert.ok(formel, `okänt suffix "${suffix}" i ${namn}`);

      const grundton = TONKLASS[rot];
      const väntade = new Set(formel.map(iv => (grundton + iv) % 12));
      const kvint = (grundton + 7) % 12;
      const klingande = toner(data.frets).filter(t => t !== null);

      for (const t of new Set(klingande)) {
        assert.ok(väntade.has(t), `${namn}: ${NOTER[t]} hör inte till ackordet`);
      }
      for (const t of väntade) {
        // Kvinten får utelämnas i täta grepp, övriga toner måste finnas med
        if (t !== kvint) assert.ok(klingande.includes(t), `${namn}: saknar ${NOTER[t]}`);
      }
      assert.equal(klingande[0], grundton, `${namn}: grundtonen ska ligga i basen`);
    });
  }
});

describe('CHORD_LIB — slash-ackord', () => {
  const slash = Object.entries(CHORD_LIB).filter(([namn]) => namn.includes('/'));
  for (const [namn, data] of slash) {
    it(`${namn} har rätt bas och inga främmande toner`, () => {
      const [grund, bas] = namn.split('/');
      const { rot, suffix } = delaNamn(grund);
      const grundton = TONKLASS[rot];
      const basTon = TONKLASS[bas];
      const väntade = new Set(FORMLER[suffix].map(iv => (grundton + iv) % 12));
      väntade.add(basTon);

      const klingande = toner(data.frets).filter(t => t !== null);
      for (const t of new Set(klingande)) {
        assert.ok(väntade.has(t), `${namn}: ${NOTER[t]} hör inte till ackordet`);
      }
      assert.equal(klingande[0], basTon, `${namn}: ${bas} ska ligga i basen`);
    });
  }
});

describe('CHORD_VOICINGS — alternativa grepp', () => {
  for (const [namn, varianter] of Object.entries(CHORD_VOICINGS)) {
    const { rot, suffix } = delaNamn(namn.split('/')[0]);
    const grundton = TONKLASS[rot];
    const väntade = new Set(FORMLER[suffix].map(iv => (grundton + iv) % 12));
    for (const v of varianter) {
      it(`${v.label} innehåller bara ackordets toner`, () => {
        const klingande = toner(v.frets).filter(t => t !== null);
        for (const t of new Set(klingande)) {
          assert.ok(väntade.has(t), `${v.label}: ${NOTER[t]} hör inte till ackordet`);
        }
        // Omvändningar och basfria grepp är tillåtna, men grundtonen ska finnas
        assert.ok(klingande.includes(grundton), `${v.label}: saknar grundtonen ${rot}`);
      });
    }
  }
});

describe('Diagramfönstret', () => {
  const alla = [
    ...Object.entries(CHORD_LIB).map(([namn, d]) => [namn, d]),
    ...Object.entries(CHORD_VOICINGS).flatMap(([namn, vs]) => vs.map(v => [v.label || namn, v])),
  ];
  for (const [namn, data] of alla) {
    it(`${namn} ryms i sina fyra band`, () => {
      const base = data.baseFret ?? 1;
      const greppade = data.frets.filter(f => f > 0);
      for (const f of greppade) {
        assert.ok(f >= base && f <= base + 3,
          `${namn}: band ${f} ligger utanför fönstret ${base}–${base + 3}`);
      }
    });
  }
});

describe('Fingersättningar', () => {
  const alla = [
    ...Object.entries(CHORD_LIB),
    ...Object.entries(CHORD_VOICINGS).flatMap(([namn, vs]) => vs.map(v => [v.label || namn, v])),
  ];
  for (const [namn, data] of alla) {
    it(`${namn} har en fingersättning som matchar greppet`, () => {
      assert.equal(data.frets.length, 6, `${namn}: sex strängar krävs`);
      assert.equal(data.fingers.length, 6, `${namn}: sex fingerpositioner krävs`);
      data.frets.forEach((f, i) => {
        const finger = data.fingers[i];
        if (f > 0) assert.ok(finger >= 1 && finger <= 4, `${namn}: sträng ${i} greppas men har finger ${finger}`);
        else assert.equal(finger, 0, `${namn}: sträng ${i} är öppen/stum men har finger ${finger}`);
      });
    });
  }
});

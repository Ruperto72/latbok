// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { renderSong, __setAppState } = require('../app.js');

// ─── Hjälpare ─────────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <div id="songDisplay"></div>
    <span id="topbarTitle"></span>
  `;
}

function defaultState(overrides = {}) {
  return {
    songs: [{
      title: 'Testlåt',
      artist: 'Testartist',
      key: 'G',
      bpm: '120',
      difficulty: 'beginner',
      sections: [
        {
          label: 'Vers',
          lines: [
            { c: 'G        Am', l: 'Hello world today' },
          ]
        }
      ]
    }],
    currentSong: 0,
    transposeSemitones: 0,
    fontSize: 13,
    twoColumns: false,
    editMode: false,
    chordOffsets: {},
    ...overrides,
  };
}

function display() {
  return document.getElementById('songDisplay');
}

// ─── Returnar tidigt om inga låtar ────────────────────────────────────────────

describe('renderSong — tom låtlista', () => {
  beforeEach(setupDOM);

  it('renderar ingenting om songs är tom', () => {
    __setAppState({ songs: [] });
    const before = display().innerHTML;
    renderSong();
    expect(display().innerHTML).toBe(before);
  });
});

// ─── Header ───────────────────────────────────────────────────────────────────

describe('renderSong — header', () => {
  beforeEach(() => {
    setupDOM();
    __setAppState(defaultState());
    renderSong();
  });

  it('renderar låttitel i <h2>', () => {
    expect(display().querySelector('h2').textContent).toBe('Testlåt');
  });

  it('renderar artist', () => {
    expect(display().querySelector('.artist').textContent).toBe('Testartist');
  });

  it('visar tonart, bpm och svårighet i .info', () => {
    const info = display().querySelector('.info').textContent;
    expect(info).toContain('G');
    expect(info).toContain('120');
    expect(info).toContain('beginner');
  });

  it('sätter #topbarTitle till låttiteln', () => {
    expect(document.getElementById('topbarTitle').textContent).toBe('Testlåt');
  });

  it('transponerar tonart i .info', () => {
    __setAppState(defaultState({ transposeSemitones: 2 }));
    renderSong();
    const info = display().querySelector('.info').textContent;
    expect(info).toContain('A');
    expect(info).not.toMatch(/\bG\b/);
  });

  it('renderar sektionsetikett', () => {
    expect(display().querySelector('.section-label').textContent).toBe('Vers');
  });
});

// ─── Renderingsväg 1: ackord + lyrik (cl-pair) ───────────────────────────────

describe('renderSong — normal: ackord + lyrik', () => {
  beforeEach(() => {
    setupDOM();
    __setAppState(defaultState());
    renderSong();
  });

  it('skapar .cl-pair för rader med både ackord och lyrik', () => {
    expect(display().querySelectorAll('.cl-pair').length).toBeGreaterThan(0);
  });

  it('renderar ackordnamn i .chord-name', () => {
    const names = [...display().querySelectorAll('.chord-name')].map(el => el.textContent.trim());
    expect(names).toContain('G');
    expect(names).toContain('Am');
  });

  it('fördelar lyriktext i .chord-text', () => {
    const texts = [...display().querySelectorAll('.chord-text')].map(el => el.textContent);
    const combined = texts.join('');
    // All lyric words should appear somewhere
    expect(combined).toContain('Hello');
    expect(combined).toContain('world');
  });

  it('använder INTE .cl-chord-only när lyrik finns', () => {
    expect(display().querySelector('.cl-chord-only')).toBeNull();
  });

  it('transponerar ackord vid transposeSemitones > 0', () => {
    __setAppState(defaultState({ transposeSemitones: 3 }));
    renderSong();
    const names = [...display().querySelectorAll('.chord-name')].map(el => el.textContent.trim());
    // G + 3 = A#/Bb, Am + 3 = Cm
    expect(names.some(n => n === 'A#' || n === 'Bb')).toBe(true);
    expect(names).toContain('Cm');
  });
});

// ─── Renderingsväg 2: bara ackord (cl-chord-only) ────────────────────────────

describe('renderSong — normal: bara ackord', () => {
  beforeEach(() => {
    setupDOM();
    __setAppState(defaultState({
      songs: [{
        title: 'T', artist: 'A', key: 'C', difficulty: 'beginner',
        sections: [{
          label: 'Intro',
          lines: [{ c: 'C   G   Am   F', l: '' }]
        }]
      }]
    }));
    renderSong();
  });

  it('skapar .cl-chord-only för rader utan lyrik', () => {
    expect(display().querySelector('.cl-chord-only')).not.toBeNull();
  });

  it('renderar alla ackord i raden', () => {
    const names = [...display().querySelectorAll('.cl-chord-only .chord-name')].map(el => el.textContent);
    expect(names).toContain('C');
    expect(names).toContain('G');
    expect(names).toContain('Am');
    expect(names).toContain('F');
  });

  it('använder INTE .cl-pair när lyrik saknas', () => {
    expect(display().querySelector('.cl-pair')).toBeNull();
  });

  it('transponerar ackord i chord-only-läge', () => {
    __setAppState(defaultState({
      transposeSemitones: 2,
      songs: [{
        title: 'T', artist: 'A', key: 'C', difficulty: 'beginner',
        sections: [{ label: 'X', lines: [{ c: 'C   G', l: '' }] }]
      }]
    }));
    renderSong();
    const names = [...display().querySelectorAll('.chord-name')].map(el => el.textContent);
    expect(names).toContain('D');
    expect(names).toContain('A');
  });
});

// ─── Renderingsväg 3: bara lyrik (cl-segment-plain) ──────────────────────────

describe('renderSong — normal: bara lyrik', () => {
  beforeEach(() => {
    setupDOM();
    __setAppState(defaultState({
      songs: [{
        title: 'T', artist: 'A', key: 'C', difficulty: 'beginner',
        sections: [{
          label: 'Brygga',
          lines: [{ c: '', l: 'Bara text utan ackord' }]
        }]
      }]
    }));
    renderSong();
  });

  it('skapar .cl-segment-plain för rader utan ackord', () => {
    expect(display().querySelector('.cl-segment-plain')).not.toBeNull();
  });

  it('innehåller lyriktext', () => {
    const plain = display().querySelector('.cl-segment-plain');
    expect(plain.textContent).toBe('Bara text utan ackord');
  });

  it('ingen .cl-chord-only skapas', () => {
    expect(display().querySelector('.cl-chord-only')).toBeNull();
  });

  it('cl-segment-plain wrappas i .cl-pair', () => {
    // Kod: html += `<div class="cl-pair"><span class="cl-segment-plain">...`
    const pair = display().querySelector('.cl-pair');
    expect(pair).not.toBeNull();
    expect(pair.querySelector('.cl-segment-plain')).not.toBeNull();
  });
});

// ─── Renderingsväg 4: redigeringsläge (editMode) ─────────────────────────────

describe('renderSong — redigeringsläge', () => {
  beforeEach(() => {
    setupDOM();
    __setAppState(defaultState({ editMode: true }));
    renderSong();
  });

  it('visar .edit-banner', () => {
    expect(display().querySelector('.edit-banner')).not.toBeNull();
  });

  it('renderar ackord som .chord-tag.editable', () => {
    const tags = display().querySelectorAll('.chord-tag.editable');
    expect(tags.length).toBeGreaterThan(0);
  });

  it('chord-tag har data-key-attribut', () => {
    const tag = display().querySelector('.chord-tag.editable');
    expect(tag.dataset.key).toMatch(/^\d+-\d+-\d+-\d+$/);
  });

  it('chord-tag har data-base-pos-attribut', () => {
    const tag = display().querySelector('.chord-tag.editable');
    expect(tag.dataset.basePos).toBeDefined();
  });

  it('renderar lyrik i .cl-abs-lyric-row', () => {
    expect(display().querySelector('.cl-abs-lyric-row')).not.toBeNull();
    expect(display().querySelector('.cl-abs-lyric-row').textContent).toContain('Hello');
  });

  it('använder INTE cl-pair i redigeringsläge', () => {
    expect(display().querySelector('.cl-pair')).toBeNull();
  });

  it('renderar INTE .edit-banner i normalläge', () => {
    __setAppState(defaultState({ editMode: false }));
    renderSong();
    expect(display().querySelector('.edit-banner')).toBeNull();
  });
});

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('renderSong — layout', () => {
  beforeEach(() => {
    setupDOM();
    __setAppState(defaultState());
    renderSong();
  });

  it('song-display saknar columns-2 klass som standard', () => {
    expect(display().className).not.toContain('columns-2');
  });

  it('lägger till columns-2 klass vid twoColumns: true', () => {
    __setAppState(defaultState({ twoColumns: true }));
    renderSong();
    expect(display().className).toContain('columns-2');
  });

  it('font-size sätts på .song-body', () => {
    __setAppState(defaultState({ fontSize: 17 }));
    renderSong();
    const body = display().querySelector('.song-body');
    expect(body.style.fontSize).toBe('17px');
  });
});

// ─── HTML-escaping ────────────────────────────────────────────────────────────

describe('renderSong — HTML-escaping', () => {
  it('escapar HTML i ackordnamn', () => {
    setupDOM();
    __setAppState(defaultState({
      songs: [{
        title: 'T', artist: 'A', key: 'C', difficulty: 'beginner',
        sections: [{ label: 'X', lines: [{ c: '<b>', l: 'text' }] }]
      }]
    }));
    renderSong();
    expect(display().innerHTML).not.toContain('<b>');
    expect(display().innerHTML).toContain('&lt;b&gt;');
  });

  it('escapar HTML i lyriken', () => {
    setupDOM();
    __setAppState(defaultState({
      songs: [{
        title: 'T', artist: 'A', key: 'C', difficulty: 'beginner',
        sections: [{ label: 'X', lines: [{ c: '', l: '<script>alert(1)</script>' }] }]
      }]
    }));
    renderSong();
    expect(display().innerHTML).not.toContain('<script>');
  });

  it('escapar HTML i sektionsetiketter', () => {
    setupDOM();
    __setAppState(defaultState({
      songs: [{
        title: 'T', artist: 'A', key: 'C', difficulty: 'beginner',
        sections: [{ label: '<img src=x onerror=alert(1)>', lines: [{ c: '', l: '' }] }]
      }]
    }));
    renderSong();
    expect(display().innerHTML).not.toContain('<img');
  });
});

// ─── Felhantering ─────────────────────────────────────────────────────────────

describe('renderSong — felhantering', () => {
  it('kastar TypeError om #songDisplay saknas (catch-blocket har samma bug)', () => {
    // renderSong catch-blocket anropar songDisplay.innerHTML = ... — kraschar om elementet saknas.
    // Detta är en känd begränsning. Testet dokumenterar nuvarande beteende.
    document.body.innerHTML = '<span id="topbarTitle"></span>';
    __setAppState(defaultState());
    expect(() => renderSong()).toThrow(TypeError);
  });

  it('visar felmeddelande i #songDisplay vid intern krasch', () => {
    setupDOM();
    // En låt utan sections orsakar ett internt fel
    __setAppState({
      songs: [{ title: 'T', artist: 'A', key: 'C', difficulty: 'beginner' }],
      currentSong: 0,
      transposeSemitones: 0,
      editMode: false,
      twoColumns: false,
      fontSize: 13,
      chordOffsets: {},
    });
    renderSong();
    expect(display().innerHTML).toContain('FEL');
  });
});

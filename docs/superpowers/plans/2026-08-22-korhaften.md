# Körhäften Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Låta flera körer använda samma app och var och en se sitt eget häfte — ett urval av låtar ur en delad pool.

**Architecture:** Låtfilerna ligger platt i `songs/` och listas i `songs/index.json` (poolen). Ett häfte är en fil under `songs/haften/` som listar filnamn i menyordning; `songs/haften/index.json` namnger häftena. Appen väljer aktivt häfte via `?haft=` → `localStorage` → första häftet. Arkivfunktionen tas bort helt.

**Tech Stack:** Vanilla ES-moduler (ingen ramverk), esbuild för `dist/`, `node --test` för enhetstester, Python `http.server` som lokal utvecklingsserver.

**Spec:** [docs/superpowers/specs/2026-08-22-korhaften-design.md](../specs/2026-08-22-korhaften-design.md)

## Global Constraints

- All användarsynlig text är på svenska.
- Häftes-`id` måste matcha `^[a-z0-9_-]+$`. `__alla` är reserverat för pseudo-häftet "Alla låtar".
- Häften och redigering fungerar bara lokalt (`localhost` / `127.0.0.1`) — GitHub Pages har ingen backend. Samma `isLocalHost()`-villkor som redan döljer redigeraren.
- `CACHE_NAME` i `sw.js` bumpas till `korhaftet-v16`, och `dist/sw.js` måste få samma värde (sker via `npm run dist`).
- När en fil i roten ändras ska `dist/` uppdateras — kör `npm run dist`.
- Inga onödiga kommentarer. Kommentera bara det som inte är uppenbart.
- Ordningen i en häftesfil är manuell och ska aldrig sorteras om. Poolen `songs/index.json` sorteras alfabetiskt.

---

### Task 1: Modulen `haften.js` med enhetstester

Ren logik för häften, utan DOM eller fetch. Allt annat i planen bygger på den här modulens signaturer.

**Files:**
- Create: `haften.js`
- Create: `tests/haften.test.js`
- Modify: `package.json` (test-scriptet)

**Interfaces:**
- Consumes: inget
- Produces:
  - `ALL_SONGS_ID: string` — konstanten `'__alla'`
  - `parseHaftenIndex(raw: unknown) => Array<{id: string, namn: string}>`
  - `resolveHaftId(haften: Array<{id}>, urlId: string|null, savedId: string|null) => string|null`
  - `haftenForSong(haftLists: Record<string, string[]>, filename: string) => string[]`
  - `withSongInHaften(haftLists: Record<string, string[]>, filename: string, valdaIds: string[]) => Record<string, string[]>`

- [ ] **Step 1: Skriv de fallerande testerna**

Skapa `tests/haften.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SONGS_ID,
  parseHaftenIndex, resolveHaftId,
  haftenForSong, withSongInHaften,
} from '../haften.js';

describe('parseHaftenIndex', () => {
  it('behåller giltiga poster', () => {
    const raw = [{ id: 'demestkoren', namn: 'Demestkören' }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'demestkoren', namn: 'Demestkören' }]);
  });

  it('ger tom lista för icke-array', () => {
    assert.deepEqual(parseHaftenIndex(null), []);
    assert.deepEqual(parseHaftenIndex({}), []);
    assert.deepEqual(parseHaftenIndex('x'), []);
  });

  it('ignorerar poster med ogiltigt id', () => {
    const raw = [
      { id: 'Stora Kören', namn: 'Stora kören' },
      { id: 'kammarkören', namn: 'Kammarkören' },
      { namn: 'Utan id' },
      { id: 'ok', namn: 'OK' },
    ];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'ok', namn: 'OK' }]);
  });

  it('ignorerar poster med tomt eller saknat namn', () => {
    const raw = [{ id: 'a', namn: '' }, { id: 'b' }, { id: 'c', namn: 'C' }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'c', namn: 'C' }]);
  });

  it('ignorerar det reserverade id:t __alla', () => {
    const raw = [{ id: ALL_SONGS_ID, namn: 'Fusk' }, { id: 'ok', namn: 'OK' }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'ok', namn: 'OK' }]);
  });

  it('kastar bort extra fält', () => {
    const raw = [{ id: 'a', namn: 'A', hemligt: true }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'a', namn: 'A' }]);
  });
});

describe('resolveHaftId', () => {
  const haften = [{ id: 'a', namn: 'A' }, { id: 'b', namn: 'B' }];

  it('låter url-id vinna över sparat id', () => {
    assert.equal(resolveHaftId(haften, 'b', 'a'), 'b');
  });

  it('faller tillbaka på sparat id när url-id är okänt', () => {
    assert.equal(resolveHaftId(haften, 'finns-inte', 'b'), 'b');
  });

  it('faller tillbaka på sparat id när url-id saknas', () => {
    assert.equal(resolveHaftId(haften, null, 'b'), 'b');
  });

  it('faller tillbaka på första häftet när båda är okända', () => {
    assert.equal(resolveHaftId(haften, 'x', 'y'), 'a');
    assert.equal(resolveHaftId(haften, null, null), 'a');
  });

  it('ger null när det inte finns några häften', () => {
    assert.equal(resolveHaftId([], 'a', 'b'), null);
  });

  it('accepterar __alla när det finns i listan', () => {
    const medAlla = [...haften, { id: ALL_SONGS_ID, namn: 'Alla låtar' }];
    assert.equal(resolveHaftId(medAlla, ALL_SONGS_ID, null), ALL_SONGS_ID);
    assert.equal(resolveHaftId(medAlla, null, ALL_SONGS_ID), ALL_SONGS_ID);
  });
});

describe('haftenForSong', () => {
  const lists = { a: ['x.json', 'y.json'], b: ['y.json'], c: [] };

  it('ger häftena som innehåller låten', () => {
    assert.deepEqual(haftenForSong(lists, 'y.json'), ['a', 'b']);
    assert.deepEqual(haftenForSong(lists, 'x.json'), ['a']);
  });

  it('ger tom lista för en låt utan häfte', () => {
    assert.deepEqual(haftenForSong(lists, 'z.json'), []);
  });
});

describe('withSongInHaften', () => {
  it('lägger till sist och bevarar ordningen', () => {
    const lists = { a: ['x.json', 'y.json'] };
    assert.deepEqual(withSongInHaften(lists, 'z.json', ['a']), { a: ['x.json', 'y.json', 'z.json'] });
  });

  it('tar bort ur häften som inte är valda', () => {
    const lists = { a: ['x.json', 'y.json'], b: ['y.json'] };
    assert.deepEqual(withSongInHaften(lists, 'y.json', ['a']), { a: ['x.json', 'y.json'], b: [] });
  });

  it('lämnar listan orörd när inget ändras', () => {
    const lists = { a: ['x.json'], b: [] };
    assert.deepEqual(withSongInHaften(lists, 'x.json', ['a']), { a: ['x.json'], b: [] });
  });

  it('duplicerar inte en låt som redan finns', () => {
    const lists = { a: ['x.json'] };
    assert.deepEqual(withSongInHaften(lists, 'x.json', ['a']), { a: ['x.json'] });
  });

  it('muterar inte indata', () => {
    const lists = { a: ['x.json'] };
    withSongInHaften(lists, 'y.json', ['a']);
    assert.deepEqual(lists, { a: ['x.json'] });
  });
});
```

- [ ] **Step 2: Kör testerna och verifiera att de fallerar**

```bash
node --test tests/haften.test.js
```

Förväntat: FAIL — `Cannot find module` för `../haften.js`.

- [ ] **Step 3: Skriv `haften.js`**

```js
// ─── Körhäftet — häften (låturval per kör) ───

export const ALL_SONGS_ID = '__alla';

const ID_RE = /^[a-z0-9_-]+$/;

export function parseHaftenIndex(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(h =>
      h && typeof h.id === 'string' && ID_RE.test(h.id) && h.id !== ALL_SONGS_ID &&
      typeof h.namn === 'string' && h.namn !== ''
    )
    .map(h => ({ id: h.id, namn: h.namn }));
}

export function resolveHaftId(haften, urlId, savedId) {
  const finns = id => haften.some(h => h.id === id);
  if (urlId && finns(urlId)) return urlId;
  if (savedId && finns(savedId)) return savedId;
  return haften.length > 0 ? haften[0].id : null;
}

export function haftenForSong(haftLists, filename) {
  return Object.keys(haftLists).filter(id => haftLists[id].includes(filename));
}

export function withSongInHaften(haftLists, filename, valdaIds) {
  const out = {};
  for (const [id, lista] of Object.entries(haftLists)) {
    const skaIngå = valdaIds.includes(id);
    const ingårRedan = lista.includes(filename);
    if (skaIngå && !ingårRedan) out[id] = [...lista, filename];
    else if (!skaIngå && ingårRedan) out[id] = lista.filter(f => f !== filename);
    else out[id] = [...lista];
  }
  return out;
}
```

- [ ] **Step 4: Utöka test-scriptet**

I `package.json`, byt raden:

```json
    "test": "node --test tests/chords.test.js"
```

till:

```json
    "test": "node --test tests/chords.test.js tests/haften.test.js"
```

- [ ] **Step 5: Kör hela testsviten**

```bash
npm test
```

Förväntat: PASS — både `chords.test.js` och `haften.test.js` gröna, inga fallerande tester.

- [ ] **Step 6: Commit**

```bash
git add haften.js tests/haften.test.js package.json
git commit -m "Lägg till haften.js med logik för häftesurval"
```

---

### Task 2: Datamigrering och byggskript

Flytta låtdatan till den nya strukturen. Efter den här uppgiften fungerar appen fortfarande som förut (den läser bara `songs/index.json` och hittar inte längre `songs/archive/`, vilket den redan hanterar med `.catch(() => null)`).

**Files:**
- Move: `songs/archive/amazing_grace.json` → `songs/amazing_grace.json`
- Delete: `songs/archive/` (hela mappen inklusive `index.json`)
- Modify: `songs/index.json`
- Create: `songs/haften/index.json`
- Create: `songs/haften/demestkoren.json`
- Modify: `scripts/build.js` (rad 41–52: arkivkopieringen)
- Modify: `SONGS_GUIDE.md`

**Interfaces:**
- Consumes: inget
- Produces: filstrukturen `songs/haften/index.json` (`[{id, namn}]`) och `songs/haften/<id>.json` (`string[]`) som Task 4–7 läser

- [ ] **Step 1: Flytta den arkiverade låten och ta bort arkivmappen**

```bash
git mv songs/archive/amazing_grace.json songs/amazing_grace.json
git rm songs/archive/index.json
```

- [ ] **Step 2: Uppdatera poolen `songs/index.json`**

Ersätt hela innehållet med den alfabetiskt sorterade poolen. `amazing_grace.json` kommer från arkivet och `bella_ciao_takt.json` låg redan i `songs/` utan att vara indexerad. `template.json` är en mall och ska inte med.

```json
[
  "amazing_grace.json",
  "bella_ciao.json",
  "bella_ciao_takt.json",
  "fattig_bonddrang.json",
  "nar_vi_tva_blir_en.json",
  "parleporten.json",
  "sang_till_friheten.json",
  "somliga_gar_med_trasiga_skor.json",
  "trubaduren.json",
  "uti_var_hage.json",
  "visa_fran_utanmyra.json",
  "what_a_wondergul_world.json"
]
```

- [ ] **Step 3: Skapa häftesindexet**

`songs/haften/index.json`:

```json
[
  { "id": "demestkoren", "namn": "Demestkören" }
]
```

- [ ] **Step 4: Skapa Demestkörens häfte**

`songs/haften/demestkoren.json` — dagens tio låtar i den ordning de låg i `songs/index.json` före migreringen. Ordningen är menyordningen och ska inte sorteras.

```json
[
  "bella_ciao.json",
  "fattig_bonddrang.json",
  "nar_vi_tva_blir_en.json",
  "parleporten.json",
  "sang_till_friheten.json",
  "uti_var_hage.json",
  "visa_fran_utanmyra.json",
  "what_a_wondergul_world.json",
  "trubaduren.json",
  "somliga_gar_med_trasiga_skor.json"
]
```

- [ ] **Step 5: Verifiera att varje indexerad låtfil finns**

```bash
node -e "const fs=require('fs');const pool=JSON.parse(fs.readFileSync('songs/index.json'));const haft=JSON.parse(fs.readFileSync('songs/haften/demestkoren.json'));const saknas=[...pool,...haft].filter(f=>!fs.existsSync('songs/'+f));const utanfor=haft.filter(f=>!pool.includes(f));console.log('saknade filer:',saknas);console.log('i häfte men inte i poolen:',utanfor);"
```

Förväntat: båda listorna tomma (`saknade filer: []` och `i häfte men inte i poolen: []`).

- [ ] **Step 6: Uppdatera byggskriptet**

I `scripts/build.js`, ta bort hela arkivblocket:

```js
// Copy archived songs if they exist
try {
  mkdirSync(join(DIST, 'songs', 'archive'), { recursive: true });
  readdirSync(join('songs', 'archive')).forEach(f => {
    if (f.endsWith('.json')) {
      cpSync(join('songs', 'archive', f), join(DIST, 'songs', 'archive', f));
    }
  });
} catch (e) {
  // Ignore if archive doesn't exist
}
```

och ersätt det med kopiering av häftesmappen:

```js
// Copy häften
mkdirSync(join(DIST, 'songs', 'haften'), { recursive: true });
readdirSync(join('songs', 'haften')).forEach(f => {
  if (f.endsWith('.json')) {
    cpSync(join('songs', 'haften', f), join(DIST, 'songs', 'haften', f));
  }
});
```

- [ ] **Step 7: Kör bygget och kontrollera resultatet**

```bash
npm run dist && ls dist/songs/haften && ls dist/songs | grep -c json
```

Förväntat: `dist/songs/haften` innehåller `demestkoren.json` och `index.json`. Ingen `dist/songs/archive`-mapp skapas.

- [ ] **Step 8: Dokumentera filformatet i SONGS_GUIDE.md**

Lägg till detta avsnitt direkt efter avsnittet "## Filnamn" (efter exemplet med `songs/index.json`):

````markdown
## Häften

Ett häfte är ett urval ur låtpoolen — en kör ser bara sitt eget häfte. Låtfilerna
ligger alltid platt i `songs/`; häftena pekar bara ut vilka som ingår.

```
songs/index.json               hela poolen: alla låtfiler
songs/haften/index.json        [{ "id": "demestkoren", "namn": "Demestkören" }]
songs/haften/demestkoren.json  ["bella_ciao.json", "parleporten.json", ...]
```

Ordningen i häftesfilen är menyordningen — den sorteras aldrig om automatiskt.
`songs/index.json` hålls alfabetiskt sorterad.

**Lägga till en låt i ett häfte för hand:** lägg filnamnet i
`songs/haften/<id>.json` (och i `songs/index.json` om låten är ny). Kör du
`python server.py` går det snabbare via kryssrutorna längst ned i låtredigeraren.

**Nytt häfte:** lägg till `{ "id": "...", "namn": "..." }` i
`songs/haften/index.json` och skapa `songs/haften/<id>.json` med en tom array.
Id:t måste matcha `[a-z0-9_-]+` — det används i URL:en (`?haft=<id>`) — och
`__alla` är reserverat.

Samma låt kan ingå i flera häften. Redigerar du låten slår ändringen igenom för
alla körer som har den.
````

- [ ] **Step 9: Commit**

```bash
git add songs SONGS_GUIDE.md scripts/build.js
git commit -m "Migrera låtdata till häftesstruktur"
```

---

### Task 3: Ta bort arkivfunktionen

Arkivet ersätts av häften och tas bort ur klient, gränssnitt, server och dokumentation. Efter den här uppgiften ska appen fungera precis som i dag, minus arkivet.

**Files:**
- Modify: `app.js` (rad 52–53, 62, 71–86, 90, 170–171, 190, 333–339, 369, 911, 962, 1162, 1205–1304, 1479, 1488, 1932)
- Modify: `index.html` (rad 87–93)
- Modify: `style.css` (rad 1526–1551)
- Modify: `server.py` (rad 11, 38–92)
- Modify: `README.md` (rad 34–37)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: inget
- Produces: `songs`-arrayen innehåller inte längre fältet `isArchived`; funktionerna `toggleArchiveSong` och `showArchivePage` finns inte längre

- [ ] **Step 1: Rensa laddningen i `app.js`**

I `loadSongs()`: ta bort de två raderna som hämtar `songs/archive/index.json`, hela `loadedArchive`-blocket, och raden `song.isArchived = false;`. Sätt ihop resultatet så här:

```js
    songs = loadedActive.filter(s => s !== null);

    const subtitle = document.querySelector('.sidebar-header p');
    if (subtitle) subtitle.textContent = `${songs.length} låtar — ackord & text`;
```

- [ ] **Step 2: Rensa övriga `isArchived`-användningar i `app.js`**

- I `init()`: ta bort de två raderna som döljer `mobileArchiveRow`.
- I `renderSongList()`: ta bort raden `if (s.isArchived) return; // Dölj arkiverade låtar från menyn`.
- Ta bort hela funktionen `updateMobileArchiveBtn()` och anropet till den i `toggleSettingsSheet()`.
- I `saveNewSongToBackend()`: byt `songs.filter(s => !s.isArchived).map(s => s._filename)` mot `songs.map(s => s._filename)`.
- I `saveVariantSong()` och `saveUgImportSong()`: ta bort raderna `newSong.isArchived = false;` respektive `song.isArchived = false;`.
- Ta bort hela funktionerna `toggleArchiveSong()` och `showArchivePage()`.
- I `Object.assign(window, {...})`: ta bort `toggleArchiveSong, showArchivePage,`.

- [ ] **Step 3: Ta bort arkivknappen ur redigerarens spara-rad**

I `renderSongEditor()`, ta bort raden `const archiveLabel = ...` och raden med arkivknappen:

```js
    <button class="sed-btn sed-btn--danger" onclick="toggleArchiveSong()"${isLocal ? '' : ' disabled'}>${archiveLabel}</button>
```

- [ ] **Step 4: Ta bort arkivraden ur `index.html`**

Ta bort hela blocket:

```html
      <div class="mobile-sheet__row mobile-sheet__row--desktop-only" id="mobileArchiveRow">
        <span class="mobile-sheet__label">Arkiv</span>
        <div style="display: flex; gap: 8px;">
          <button class="mobile-sheet__toggle" id="mobileArchiveBtn" onclick="toggleArchiveSong()">Arkivera</button>
          <button class="mobile-sheet__toggle" onclick="showArchivePage()">Öppna</button>
        </div>
      </div>
```

- [ ] **Step 5: Ta bort arkiv-CSS**

I `style.css`, ta bort reglerna `.archive-page`, `.archive-list`, `.archive-item` och `.archive-item:hover`.

- [ ] **Step 6: Ta bort arkivendpointerna ur `server.py`**

Ta bort hela `elif self.path in ['/archive-song', '/unarchive-song']:`-grenen (inklusive den nästlade `update_index`) samt raderna `import threading` och `index_lock = threading.Lock()`. Kvar i `do_POST` blir `/save-song` följt av `else: self._respond(404, 'Not found')`.

- [ ] **Step 7: Verifiera att inget arkiv-anrop finns kvar**

```bash
grep -rn -i "isarchived\|archive" app.js index.html style.css server.py scripts/build.js
```

Förväntat: inga träffar.

- [ ] **Step 8: Kör testerna och bygget**

```bash
npm test && npm run dist
```

Förväntat: alla tester gröna, `Build complete → dist/`.

- [ ] **Step 9: Kontrollera appen manuellt**

Starta `python server.py`, öppna `http://localhost:8005`. Kontrollera: låtlistan visar tio låtar, ⚙-menyn saknar Arkiv-raden, låtredigeraren saknar Arkivera-knappen, inga fel i konsolen.

- [ ] **Step 10: Uppdatera dokumentationen**

- `README.md`: ta bort avsnittet "### Arkivering (lokal server krävs)" med dess tre punkter.
- `CLAUDE.md`: ta bort hela avsnittet "## Arkivering", och ta bort raderna om `songs/archive/` ur listan under "## Låtdata".

- [ ] **Step 11: Commit**

```bash
git add app.js index.html style.css server.py README.md CLAUDE.md dist
git commit -m "Ta bort arkivfunktionen"
```

---

### Task 4: Ladda häften och lägg till väljaren

Appen läser häftesstrukturen, väljer aktivt häfte och visar en väljare i sidopanelen.

**Files:**
- Modify: `app.js` (import, state, `loadFromStorage`, `savePrefs`, `loadSongs`, `selectSong`, `init`, window-exporten)
- Modify: `index.html` (`.sidebar-header`)
- Modify: `style.css` (ny regel efter `.sidebar-header p`)

**Interfaces:**
- Consumes: `ALL_SONGS_ID`, `parseHaftenIndex`, `resolveHaftId` från `haften.js` (Task 1); filstrukturen från Task 2
- Produces:
  - modulvariabeln `haften: Array<{id, namn}>` — häftena som visas i väljaren, med `{ id: '__alla', namn: 'Alla låtar' }` sist när appen körs lokalt
  - modulvariabeln `haftLists: Record<string, string[]>` — alla häftesfiler, nyckel = häftes-id, **utan** `__alla`
  - modulvariabeln `currentHaftId: string|null`
  - `changeHaft(id: string): Promise<void>` — exponerad på `window`

- [ ] **Step 1: Importera modulen och lägg till state i `app.js`**

Utöka importblocket högst upp med en ny rad efter `chords.js`-importen:

```js
import { ALL_SONGS_ID, parseHaftenIndex, resolveHaftId } from './haften.js';
```

Lägg till under `let songs = [];`:

```js
let haften = [];        // [{ id, namn }] — inklusive __alla lokalt
let haftLists = {};     // { häftes-id: [filnamn] }
let currentHaftId = null;
let currentSongFile = null;
let haftUrlConsumed = false;
```

- [ ] **Step 2: Spara häfte och låt-filnamn i prefs**

I `loadFromStorage()`, lägg till inuti `if (raw) { ... }`:

```js
      if (p.haftId) currentHaftId = p.haftId;
      if (p.currentSongFile) currentSongFile = p.currentSongFile;
```

Ta bort raden `if (p.currentSong !== undefined) currentSong = p.currentSong;` — indexet är inte längre meningsfullt när häftet kan byta. Gamla sparade prefs saknar `currentSongFile` och landar då på första låten, vilket är acceptabelt.

Byt ut hela `savePrefs()`-kroppens `localStorage.setItem`-rad mot:

```js
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      fontSize, columnsMode, hideChords, sidebarHidden, scrollLevel,
      haftId: currentHaftId,
      currentSongFile: songs[currentSong]?._filename || null,
    }));
```

- [ ] **Step 3: Skriv om `loadSongs()`**

Ersätt hela funktionen med:

```js
async function loadSongs(bustCache = false) {
  const qs = bustCache ? `?t=${Date.now()}` : '';
  try {
    const poolResp = await fetch(`songs/index.json${qs}`).catch(() => null);
    const poolFiles = poolResp && poolResp.ok ? await poolResp.json() : [];

    const haftenResp = await fetch(`songs/haften/index.json${qs}`).catch(() => null);
    const haftenRaw = haftenResp && haftenResp.ok ? await haftenResp.json().catch(() => null) : null;
    const definierade = parseHaftenIndex(haftenRaw);

    haftLists = {};
    await Promise.all(definierade.map(async (h) => {
      const resp = await fetch(`songs/haften/${h.id}.json${qs}`).catch(() => null);
      const lista = resp && resp.ok ? await resp.json().catch(() => null) : null;
      haftLists[h.id] = Array.isArray(lista) ? lista : [];
    }));

    haften = definierade.length > 0 && isLocalHost()
      ? [...definierade, { id: ALL_SONGS_ID, namn: 'Alla låtar' }]
      : definierade;

    const urlId = haftUrlConsumed ? null : new URLSearchParams(location.search).get('haft');
    haftUrlConsumed = true;
    currentHaftId = resolveHaftId(haften, urlId, currentHaftId);

    // Utan häften (saknad eller trasig index.json) visas hela poolen.
    const files = currentHaftId && currentHaftId !== ALL_SONGS_ID
      ? haftLists[currentHaftId] || []
      : poolFiles;

    const loaded = await Promise.all(
      files.map(async (filename) => {
        try {
          const resp = await fetch(`songs/${filename}${qs}`);
          if (!resp.ok) return null;
          const song = await resp.json();
          song._filename = filename;
          return song;
        } catch (e) {
          console.warn(`Could not load songs/${filename}:`, e);
          return null;
        }
      })
    );

    songs = loaded.filter(s => s !== null);

    const idx = songs.findIndex(s => s._filename === currentSongFile);
    currentSong = idx !== -1 ? idx : 0;

    renderHaftSelect();

    const subtitle = document.querySelector('.sidebar-header p');
    if (subtitle) subtitle.textContent = `${songs.length} låtar — ackord & text`;

  } catch (e) {
    console.error('Failed to load song index:', e);
    document.getElementById('songDisplay').innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--text-dim)">
        <p style="font-size:40px;margin-bottom:12px">⚠️</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:13px">
          Kunde inte ladda låtfiler.<br>
          Kontrollera att songs/index.json finns.
        </p>
      </div>`;
  }
}
```

Notera: `isLocalHost()` är definierad längre ned i filen men hissas som funktionsdeklaration, så anropet fungerar.

- [ ] **Step 4: Lägg till `renderHaftSelect()` och `changeHaft()`**

Lägg in direkt efter `loadSongs()`:

```js
function renderHaftSelect() {
  const wrap = document.getElementById('haftSelectWrap');
  const sel = document.getElementById('haftSelect');
  if (!wrap || !sel) return;
  if (haften.length < 2) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  sel.innerHTML = haften.map(h =>
    `<option value="${escHtml(h.id)}"${h.id === currentHaftId ? ' selected' : ''}>${escHtml(h.namn)}</option>`
  ).join('');
}

async function changeHaft(id) {
  if (id === currentHaftId) return;
  if (scrollActive) toggleAutoScroll();
  songEditorMode = false;
  variantEditorMode = false;
  variantEditorSong = null;
  currentHaftId = id;
  currentSongFile = null;
  await loadSongs(true);
  updateMobileEditorBtn();
  renderSongList();
  renderSong();
  savePrefs();
}
```

- [ ] **Step 5: Håll `currentSongFile` uppdaterad vid låtbyte**

I `selectSong(idx)`, lägg till direkt efter `currentSong = idx;`:

```js
  currentSongFile = songs[idx]?._filename || null;
```

I `init()`, ta bort raden `if (currentSong >= songs.length) currentSong = 0;` — `loadSongs()` sätter nu `currentSong` själv. Gör samma sak i `reloadSongs()`.

- [ ] **Step 6: Exponera `changeHaft` för HTML**

I `Object.assign(window, {...})`, lägg till `changeHaft,` i första raden efter `toggleSidebar, reloadSongs,`.

- [ ] **Step 7: Lägg till väljaren i `index.html`**

Ersätt `.sidebar-header`-blocket med:

```html
    <div class="sidebar-header">
      <h1>Körhäftet</h1>
      <div class="haft-select-wrap" id="haftSelectWrap" style="display:none">
        <select class="haft-select" id="haftSelect" aria-label="Välj häfte" onchange="changeHaft(this.value)"></select>
      </div>
      <p aria-live="polite">Laddar låtar...</p>
    </div>
```

- [ ] **Step 8: Styla väljaren**

Lägg till i `style.css` direkt efter regeln `.sidebar-header p`:

```css
.haft-select {
  width: 100%;
  margin-top: 10px;
  padding: 7px 9px;
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  cursor: pointer;
}
```

- [ ] **Step 9: Bygg och testa manuellt**

```bash
npm test && npm run dist
```

Starta `python server.py` och öppna `http://localhost:8005`. Kontrollera:

1. Väljaren visas med "Demestkören" och "Alla låtar" (två val ⇒ synlig).
2. "Demestkören" visar tio låtar; "Alla låtar" visar tolv (inklusive `amazing_grace` och `bella_ciao_takt`).
3. Välj en låt, ladda om sidan — samma låt öppnas igen.
4. Byt häfte, ladda om — samma häfte är kvar.
5. `http://localhost:8005/?haft=demestkoren` väljer Demestkören även om "Alla låtar" var sparat.
6. `http://localhost:8005/?haft=finnsinte` faller tillbaka på det sparade häftet utan fel i konsolen.

- [ ] **Step 10: Commit**

```bash
git add app.js index.html style.css dist
git commit -m "Ladda häften och lägg till häftesväljare i sidopanelen"
```

---

### Task 5: Redigera häftesmedlemskap

Kryssrutor i låtredigeraren plus serverstöd. Här åtgärdas också buggen där `songs/index.json` skulle tömmas när minnet bara innehåller ett häftes låtar.

**Files:**
- Modify: `server.py` (nya hjälpfunktioner, `/save-song`, ny `/set-song-haften`)
- Modify: `app.js` (`saveNewSongToBackend`, spara-raden i `renderSongEditor`, ny `setSongHaften`, window-exporten)
- Modify: `style.css` (ny regel intill `.sed-save-bar`)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `haften`, `haftLists`, `ALL_SONGS_ID` (Task 4); `withSongInHaften`, `haftenForSong` från `haften.js` (Task 1)
- Produces:
  - `POST /set-song-haften` med body `{ "filename": "x.json", "haften": ["demestkoren"] }` → `200 OK`
  - `POST /save-song` lägger själv till nya låtfilnamn i `songs/index.json`
  - `setSongHaften(): Promise<void>` — exponerad på `window`

- [ ] **Step 1: Lägg till hjälpfunktioner i `server.py`**

Lägg in efter importblocket, före `class Handler`:

```python
import re
import threading

HAFTEN_DIR = os.path.join('songs', 'haften')
POOL_INDEX = os.path.join('songs', 'index.json')
ID_RE = re.compile(r'^[a-z0-9_-]+$')

index_lock = threading.Lock()


def _read_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _valid_song_filename(name):
    return bool(name) and not any(c in name for c in '/\\:') and name.endswith('.json')
```

`import re` och `import threading` läggs bland de befintliga importerna högst upp; resten direkt under.

- [ ] **Step 2: Låt `/save-song` underhålla poolindexet**

I `/save-song`-grenen, direkt efter att filen skrivits och före `self._respond(200, 'OK')`:

```python
                if filename not in ('index.json', 'template.json'):
                    with index_lock:
                        pool = _read_json(POOL_INDEX, [])
                        if filename not in pool:
                            pool.append(filename)
                            pool.sort()
                            _write_json(POOL_INDEX, pool)
```

- [ ] **Step 3: Lägg till `/set-song-haften`**

Ny gren i `do_POST`, mellan `/save-song`-grenen och `else:`:

```python
        elif self.path == '/set-song-haften':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                filename = data.get('filename')
                valda = data.get('haften')

                if not _valid_song_filename(filename):
                    self._respond(400, 'Ogiltigt filnamn')
                    return
                if not isinstance(valda, list):
                    self._respond(400, 'haften måste vara en lista')
                    return

                with index_lock:
                    for h in _read_json(os.path.join(HAFTEN_DIR, 'index.json'), []):
                        hid = h.get('id')
                        if not hid or not ID_RE.match(hid):
                            continue
                        path = os.path.join(HAFTEN_DIR, hid + '.json')
                        lista = _read_json(path, [])
                        if hid in valda and filename not in lista:
                            lista.append(filename)
                        elif hid not in valda and filename in lista:
                            lista = [f for f in lista if f != filename]
                        else:
                            continue
                        _write_json(path, lista)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
```

- [ ] **Step 4: Verifiera endpointen mot en körande server**

Starta `python server.py` i ett fönster och kör i ett annat:

```bash
curl -s -X POST localhost:8005/set-song-haften -H 'Content-Type: application/json' -d '{"filename":"amazing_grace.json","haften":["demestkoren"]}' && echo && tail -3 songs/haften/demestkoren.json
```

Förväntat: `OK`, och `amazing_grace.json` ligger **sist** i häftesfilen. Kör sedan samma anrop med `"haften":[]` och kontrollera att raden försvinner och att övriga låtar behåller sin ordning:

```bash
curl -s -X POST localhost:8005/set-song-haften -H 'Content-Type: application/json' -d '{"filename":"amazing_grace.json","haften":[]}' && echo && cat songs/haften/demestkoren.json
```

Förväntat: `OK`, tio låtar kvar i ursprunglig ordning.

Kontrollera även avvisning av skräpindata:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8005/set-song-haften -H 'Content-Type: application/json' -d '{"filename":"../hemlig.json","haften":[]}'
```

Förväntat: `400`.

- [ ] **Step 5: Sluta bygga om poolindexet från klienten**

Ersätt `saveNewSongToBackend()` i `app.js` med:

```js
// Sparar en ny låtfil via den lokala servern. Servern lägger själv till
// filnamnet i songs/index.json. Kastar vid nätverksfel/icke-OK-svar.
async function saveNewSongToBackend(filename, songObj) {
  const resp = await fetch('/save-song', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content: songObj }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}
```

- [ ] **Step 6: Lägg till kryssrutorna i redigerarens spara-rad**

Utöka importen från `haften.js` i `app.js`:

```js
import { ALL_SONGS_ID, parseHaftenIndex, resolveHaftId, withSongInHaften, haftenForSong } from './haften.js';
```

I `renderSongEditor()`, före `html += `<div class="sed-save-bar">``:

```js
  const ingårI = haftenForSong(haftLists, s._filename);
  const haftCheckboxes = isLocal
    ? haften.filter(h => h.id !== ALL_SONGS_ID).map(h =>
        `<label class="sed-haft-check"><input type="checkbox" value="${escHtml(h.id)}"${ingårI.includes(h.id) ? ' checked' : ''} onchange="setSongHaften()"> ${escHtml(h.namn)}</label>`
      ).join('')
    : '';
```

Lägg in i `sed-save-bar`-markupen, på raden där arkivknappen låg (mellan Klona-knappen och `sed-save-note`):

```js
    ${haftCheckboxes ? `<span class="sed-save-note">Ingår i:</span>${haftCheckboxes}` : ''}
```

- [ ] **Step 7: Lägg till `setSongHaften()`**

Lägg in i `app.js` direkt efter `renderSongEditor()`:

```js
async function setSongHaften() {
  const s = songs[currentSong];
  if (!s || !s._filename) return;
  const valda = [...document.querySelectorAll('.sed-haft-check input:checked')].map(i => i.value);
  try {
    const resp = await fetch('/set-song-haften', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: s._filename, haften: valda }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    haftLists = withSongInHaften(haftLists, s._filename, valda);
  } catch (e) {
    alert('Kunde inte uppdatera häften: ' + e.message);
  }
}
```

Låtlistan uppdateras medvetet inte direkt — kryssar du ur det häfte du tittar på ligger låten kvar tills du laddar om. Att rycka bort den öppna låten mitt i redigeringen vore värre.

Lägg till `setSongHaften,` i `Object.assign(window, {...})` intill `changeHaft`.

- [ ] **Step 8: Styla kryssrutorna**

Lägg till i `style.css` direkt efter `.haft-select`-regeln:

```css
.sed-haft-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
}
```

- [ ] **Step 9: Bygg och testa manuellt**

```bash
npm test && npm run dist
```

Starta servern och kontrollera i `http://localhost:8005`:

1. Välj "Alla låtar", öppna `amazing_grace`, slå på Redigera låt. Kryssrutan "Demestkören" är omarkerad.
2. Kryssa i den. Kontrollera att `songs/haften/demestkoren.json` fått `amazing_grace.json` sist.
3. Ladda om sidan, byt till Demestkören — låten finns nu i listan sist.
4. Kryssa ur den igen och kontrollera att filen är tillbaka till tio låtar.
5. Kontrollera att `songs/index.json` fortfarande har alla tolv låtar efter en sparning i redigeraren.

- [ ] **Step 10: Dokumentera endpointen i CLAUDE.md**

I `CLAUDE.md` under "## Projektöversikt", byt meningen om `POST /save-song` mot:

```markdown
PWA för körsånger, hostad på GitHub Pages. Ingen backend i produktion — `POST /save-song`
och `POST /set-song-haften` fungerar bara lokalt via `python server.py`.
```

Lägg till ett avsnitt "## Häften" efter "## Låtdata":

```markdown
## Häften

Ett häfte är ett urval ur låtpoolen — varje kör ser sitt eget.

- `songs/index.json` — hela poolen, alla låtfiler (alfabetisk ordning)
- `songs/haften/index.json` — `[{ "id": "demestkoren", "namn": "Demestkören" }]`
- `songs/haften/<id>.json` — filnamnen som ingår, i menyordning (sortera aldrig om)

Aktivt häfte väljs via `?haft=<id>` → `localStorage` → första häftet. Pseudo-häftet
`__alla` ("Alla låtar") visar hela poolen och finns bara lokalt.

Häftesmedlemskap ändras med kryssrutorna i låtredigeraren, som anropar
`POST /set-song-haften` — bara lokalt. Se [SONGS_GUIDE.md](SONGS_GUIDE.md) för
handredigering.
```

- [ ] **Step 11: Commit**

```bash
git add server.py app.js style.css CLAUDE.md songs dist
git commit -m "Redigera häftesmedlemskap från låtredigeraren"
```

---

### Task 6: Häftesval vid Ultimate Guitar-import

En importerad låt ska kunna hamna direkt i rätt häfte.

**Files:**
- Modify: `app.js` (`openUgImportDialog`, `saveUgImportSong`)

**Interfaces:**
- Consumes: `haften`, `ALL_SONGS_ID` (Task 4); `POST /set-song-haften` (Task 5)
- Produces: inget nytt

- [ ] **Step 1: Lägg till kryssrutor i importdialogen**

I `openUgImportDialog()`, före `dialog.innerHTML = ...`:

```js
  const haftVal = local
    ? haften.filter(h => h.id !== ALL_SONGS_ID).map(h =>
        `<label class="sed-haft-check"><input type="checkbox" class="ug-haft-check" value="${escHtml(h.id)}"${h.id === currentHaftId ? ' checked' : ''}> ${escHtml(h.namn)}</label>`
      ).join('')
    : '';
```

Lägg in i `dialog.innerHTML`, direkt före `</div>` som avslutar sista `variant-save-dialog-group`-blocket före knappraden:

```js
    ${haftVal ? `<div class="variant-save-dialog-group">
      <label class="variant-save-dialog-label">Lägg i häfte</label>
      <div>${haftVal}</div>
    </div>` : ''}
```

Det häfte som är aktivt just nu är förkryssat — det är nästan alltid dit man importerar.

- [ ] **Step 2: Skicka valen vid sparning**

I `saveUgImportSong()`, efter `await saveNewSongToBackend(filename, song);`:

```js
    const valda = [...document.querySelectorAll('.ug-haft-check:checked')].map(i => i.value);
    if (valda.length > 0) {
      await fetch('/set-song-haften', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, haften: valda }),
      });
    }
```

Ta bort raden `songs.push(song);` — `loadSongs(true)` längre ned hämtar ändå om listan, och en push av en låt som inte ingår i det aktiva häftet ger en spöklåt i menyn.

- [ ] **Step 3: Bygg och testa manuellt**

```bash
npm test && npm run dist
```

Starta servern. Öppna "⭳ Importera från Ultimate Guitar", klistra in:

```
[Vers 1]
G          D
Amazing grace, how sweet the sound
```

Sätt titeln till "Testlåt", kontrollera att "Demestkören" är förkryssad, klicka Tolka text och sedan Spara till fil. Kontrollera:

1. `songs/testlat.json` finns.
2. `testlat.json` ligger i `songs/index.json` (alfabetiskt inplacerad).
3. `testlat.json` ligger sist i `songs/haften/demestkoren.json`.
4. Låten syns i menyn.

Städa upp efteråt:

```bash
rm songs/testlat.json
node -e "const fs=require('fs');for(const p of ['songs/index.json','songs/haften/demestkoren.json']){const a=JSON.parse(fs.readFileSync(p)).filter(f=>f!=='testlat.json');fs.writeFileSync(p,JSON.stringify(a,null,2)+'\n');}"
git diff --stat songs
```

Förväntat: `git diff --stat songs` visar inga ändringar (bortsett från eventuell radslutsnormalisering).

- [ ] **Step 4: Commit**

```bash
git add app.js dist
git commit -m "Välj häfte vid import från Ultimate Guitar"
```

---

### Task 7: Service worker och slutdokumentation

Häftesfilerna ska precachas så appen fungerar offline, och cachen måste bytas ut på mobilerna.

**Files:**
- Modify: `sw.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: filstrukturen från Task 2
- Produces: inget

- [ ] **Step 1: Bumpa cachenamnet**

I `sw.js`:

```js
const CACHE_NAME = 'korhaftet-v16';
```

- [ ] **Step 2: Precacha häftesindexet**

Lägg till i `PRECACHE_URLS` efter `'./songs/index.json',`:

```js
  './songs/haften/index.json',
```

- [ ] **Step 3: Precacha varje häftesfil**

I `install`-lyssnaren, efter det befintliga `try`-blocket som cachar låtfilerna:

```js
      try {
        const resp = await fetch('./songs/haften/index.json');
        const haften = await resp.json();
        await cache.addAll(haften.map(h => `./songs/haften/${h.id}.json`));
      } catch (e) {
        console.warn('SW: could not precache häften', e);
      }
```

Fetch-hanteraren behöver inte ändras — `url.pathname.includes('/songs/')` täcker redan `songs/haften/`, så häftesfilerna hämtas network-first och uppdateras utan cachebump.

- [ ] **Step 4: Bygg och verifiera att `dist/sw.js` följer med**

```bash
npm run dist && grep -n "CACHE_NAME\|haften" dist/sw.js
```

Förväntat: `dist/sw.js` innehåller `korhaftet-v16` och båda häftesreferenserna.

- [ ] **Step 5: Verifiera offline-läget**

Starta servern, öppna `http://localhost:8005`, ladda om en gång så service workern installeras. Öppna DevTools → Application → Service Workers, kryssa i Offline och ladda om.

Förväntat: låtlistan och den valda låten visas fortfarande, inga 404 i konsolen för `songs/haften/`.

- [ ] **Step 6: Uppdatera README.md**

Lägg till ett avsnitt om häften där arkiveringsavsnittet låg (efter övriga funktionsavsnitt):

```markdown
### Häften per kör

- **Välj häfte** — väljaren högst upp i sidopanelen (visas när det finns mer än ett häfte)
- **Dela en länk** — `?haft=demestkoren` öppnar appen direkt i rätt häfte
- **Delad låtpool** — samma låt kan ingå i flera häften; en rättning slår igenom för alla
- **Alla låtar** — extra val som visar hela poolen, bara när appen körs lokalt
```

- [ ] **Step 7: Kör hela sviten en sista gång**

```bash
npm test && npm run dist && git status --short
```

Förväntat: alla tester gröna, bygget klart, och `git status` visar bara filerna som ska committas.

- [ ] **Step 8: Commit**

```bash
git add sw.js README.md dist
git commit -m "Precacha häftesfiler och bumpa cachen till v16"
```

---

## Slutverifiering

Efter Task 7, kontrollera mot specen:

- [ ] Väljaren döljs när `songs/haften/index.json` tas bort — appen visar hela poolen i stället för en tom meny. Testa med `mv songs/haften/index.json /tmp/` och lägg tillbaka den efteråt.
- [ ] `?haft=demestkoren` fungerar från en annan enhet på samma nät.
- [ ] `grep -rn -i "archive\|isArchived" app.js index.html style.css server.py scripts/build.js sw.js` ger inga träffar.
- [ ] `npm test` grönt.

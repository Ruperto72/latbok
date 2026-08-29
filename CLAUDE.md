# CLAUDE.md — Låtbok

## Projektöversikt

PWA för körsånger, hostad på GitHub Pages. Ingen backend i produktion — `POST /save-song`
och `POST /set-song-haften` fungerar bara lokalt via `python server.py`.

## Byggsystem

Källkod ligger i roten (`app.js`, `chords.js`, `sw.js`, `style.css`, `index.html`). GitHub Pages serverar direkt från roten — `dist/` är gitignorerad och används bara som lokal byggd kopia:

```bash
npm run dist   # stämplar sw.js + bygger dist/ med esbuild + kopierar assets
npm test       # enhetstester för chords.js, haften.js och ackordbiblioteket
```

`.github/workflows/test.yml` kör `npm test` och `npm run cache:check` på varje push
och pull request.

När du ändrar en fil i roten ska motsvarande fil i `dist/` uppdateras också, antingen via `npm run dist` eller manuellt.

## Service Worker & mobilcache

`sw.js` (och `dist/sw.js`) cachar statiska filer med **cache-first**. Mobila enheter fastnar i gammal cache om `CACHE_NAME` inte byts.

`CACHE_NAME` stämplas automatiskt med en hash av de cachade källfilerna
(`index.html`, `app.js`, `chords.js`, `haften.js`, `style.css`, `manifest.json`):

```bash
npm run cache         # stämplar sw.js — körs automatiskt av npm run dist
npm run cache:check   # felar om sw.js inte matchar källfilerna (körs i CI)
```

**Regel: kör `npm run dist` (eller `npm run cache`) innan du committar en ändring i
någon av de filerna, och ta med `sw.js` i commiten.** CI kör `npm run cache:check`
och felar annars. `dist/sw.js` skrivs av bygget och behöver inte röras för hand.

## Ackordbiblioteket

`CHORD_LIB` i `chords.js` ska ha alla 12 grundtoner i varje kategori (dur, moll, 7, m7,
6, m6, maj7, maj9, sus4, 7sus4, sus2, add9, dim, dim7, aug, 9, m7b5, 7+). En stavning per grundton räcker —
`lookupChord()` slår upp enharmoniska namn (`D#m` → `Ebm`).

`tests/chords-lib.test.js` räknar ut tonerna ur `frets` (stämning E A D G B E) och jämför
med ackordformeln, kollar att grundtonen ligger i basen och att alla greppade band ryms i
diagramfönstret `baseFret`…`baseFret+3`. Lägg aldrig till ett grepp utan att köra `npm test`.

## Låtdata

- `songs/index.json` — hela poolen: filnamnen för alla låtar, i alfabetisk ordning. Styr inte menyordningen — det gör häftesfilen (se nedan)
- `songs/*.json` — en fil per låt
- `songs/template.json` — mall för nya låtar
- Song-filer hämtas **network-first** av service workern, så de uppdateras utan cache-bump

**Se [SONGS_GUIDE.md](SONGS_GUIDE.md) för steg-för-steg instruktioner när du lägger till nya låtar.**

## Häften

Ett häfte är ett urval ur låtpoolen — varje kör ser sitt eget.

- `songs/index.json` — hela poolen, alla låtfiler (alfabetisk ordning)
- `songs/haften/index.json` — `[{ "id": "demestkoren", "namn": "Demestkören" }]`
- `songs/haften/<id>.json` — filnamnen som ingår, i menyordning (sortera aldrig om)

Aktivt häfte väljs via `?haft=<id>` → `localStorage` → första häftet. Pseudo-häftet
`__alla` ("Alla låtar") visar hela poolen och finns bara lokalt.

**Reserverade id:n:** `RESERVED_HAFT_IDS` i `haften.js` (`__alla` och `index`) speglas av
`RESERVED_HAFT_IDS` i `server.py`, och båda måste hållas i synk. `index` är reserverat för
att `songs/haften/<id>.json` annars pekar ut häftesregistret självt — ett häfte som heter
"Index" får därför id `index-2` via `uniqueHaftId()`.

Häften administreras i dialogen "Hantera häften" (`openHaftManagerDialog()`, under
⚙ Inställningar) — häftesväljare, namnfält, **+ Skapa**, och två kolumner: hela
låtpoolen med kryssruta per låt till vänster, häftets låtar i menyordning till höger.
Bara lokalt; raden `#mobileHaftRow` döljs annars av `isLocal`-checken i `init()`.

- Ändringar hålls i `haftManager` tills **💾 Spara häftet** → ett `POST /save-haft`
  `{ id, namn, filenames }`. `haftManagerDirty()` jämför mot `sparatNamn`/`sparadeFiler`
  och varnar innan man byter häfte eller stänger
- Id:t räknas ut från namnet med `slugifyHaftId()` + `uniqueHaftId()`; ordningen ändras
  med `moveInList()`, medlemskap med `toggleInHaft()` (nya låtar hamnar sist)
- `renderHaftManagerPool()` ritar bara om vid sökning eller häftesbyte —
  `syncHaftManagerPoolChecks()` uppdaterar kryssrutorna på plats så scrollpositionen
  överlever ett klick

`songs` innehåller bara **aktivt häftes** låtar, så poolkolumnen kan inte hämta titlar
därifrån. `pool` + `poolMeta` på modulnivå i `app.js` håller hela poolen; `ensurePoolMeta()`
fyller på titlar för resten och måste köras om efter `loadSongs(true)`, som nollställer
`poolMeta`.

Kryssrutorna i låtredigeraren finns kvar som genväg för enstaka låtar och anropar
`POST /set-song-haften`. Se [SONGS_GUIDE.md](SONGS_GUIDE.md) för handredigering.

## Radering

Två endpoints i `server.py`, båda bara lokalt och båda bakom en `confirm()` som visar
konsekvensen:

- `POST /delete-haft { id }` — tar bort posten ur `songs/haften/index.json` och raderar
  `songs/haften/<id>.json`. Låtfilerna rörs inte. Knappen 🗑 Radera häftet i häftesvyn
- `POST /delete-song { filename }` — plockar låten ur `songs/index.json`, ur varje häfte
  som innehåller den, och raderar `songs/<filnamn>`. Knappen 🗑 Radera låt i låtredigeraren

`/delete-song` kräver att filnamnet finns i `songs/index.json`, vilket samtidigt spärrar
`index.json` och `template.json` från att raderas. **Referenserna skrivs före filen tas
bort** — ett avbrott mitt i ska lämna en föräldralös fil, inte ett häfte som pekar på
något som saknas.

Efter en radering kör klienten `loadSongs(true)`, som bygger om `pool`, `poolMeta`,
`haften` och `haftLists` från disk. Raderas det aktiva häftet nollställs `currentHaftId`
först så att `resolveHaftId()` väljer ett nytt.

## Import från urklipp

Importdialogen (`openUgImportDialog()`) sparar via `POST /save-song` och är därför
**bara tillgänglig lokalt**, precis som låtredigeraren. Raden "Importera" i mobilbladet
(`#mobileImportRow`) döljs via `isLocal`-checken i `init()`, och `openUgImportDialog()`
returnerar direkt om appen inte körs på localhost. Koden använder fortfarande
`ug`-prefix internt (`ugImport*`, `.ug-import-*`) sedan funktionen var Ultimate
Guitar-specifik — texten i gränssnittet är källoberoende.

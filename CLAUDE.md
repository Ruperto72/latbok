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
maj7, sus4, sus2, add9, dim, dim7, aug, 9, m7b5, 7+). En stavning per grundton räcker —
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

Häftesmedlemskap ändras med kryssrutorna i låtredigeraren, som anropar
`POST /set-song-haften` — bara lokalt. Se [SONGS_GUIDE.md](SONGS_GUIDE.md) för
handredigering.

Häften skapas, byter namn och ordnas om i dialogen "Hantera häften"
(`openHaftManagerDialog()`, under ⚙ Inställningar). Den sparar via `POST /save-haft`
{ id, namn, filenames } och är precis som redigeraren bara tillgänglig lokalt —
raden `#mobileHaftRow` döljs annars av `isLocal`-checken i `init()`. Id:t räknas ut
från namnet med `slugifyHaftId()` + `uniqueHaftId()` i `haften.js`; låtordningen
ändras med `moveInList()` och är den ordning låtarna får i menyn.

## Import från urklipp

Importdialogen (`openUgImportDialog()`) sparar via `POST /save-song` och är därför
**bara tillgänglig lokalt**, precis som låtredigeraren. Raden "Importera" i mobilbladet
(`#mobileImportRow`) döljs via `isLocal`-checken i `init()`, och `openUgImportDialog()`
returnerar direkt om appen inte körs på localhost. Koden använder fortfarande
`ug`-prefix internt (`ugImport*`, `.ug-import-*`) sedan funktionen var Ultimate
Guitar-specifik — texten i gränssnittet är källoberoende.

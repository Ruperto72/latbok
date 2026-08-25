# CLAUDE.md — Körhäftet

## Projektöversikt

PWA för körsånger, hostad på GitHub Pages. Ingen backend i produktion — `POST /save-song`
och `POST /set-song-haften` fungerar bara lokalt via `python server.py`.

## Byggsystem

Källkod ligger i roten (`app.js`, `chords.js`, `sw.js`, `style.css`, `index.html`). GitHub Pages serverar direkt från roten — `dist/` är gitignorerad och används bara som lokal byggd kopia:

```bash
npm run dist   # bygger dist/ med esbuild + kopierar assets
npm test       # enhetstester för chords.js och haften.js
```

När du ändrar en fil i roten ska motsvarande fil i `dist/` uppdateras också, antingen via `npm run dist` eller manuellt.

## Service Worker & mobilcache

`sw.js` (och `dist/sw.js`) cachar statiska filer med **cache-first**. Mobila enheter fastnar i gammal cache om `CACHE_NAME` inte byts.

**Regel: bumpa `CACHE_NAME` varje gång `app.js`, `chords.js`, `style.css` eller `index.html` ändras och ska ut i produktion.**

```js
const CACHE_NAME = 'korhaftet-v3';  // öka versionsnumret
```

Ändringen måste göras i **både** `sw.js` och `dist/sw.js`.

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

## Import från urklipp

Importdialogen (`openUgImportDialog()`) sparar via `POST /save-song` och är därför
**bara tillgänglig lokalt**, precis som låtredigeraren. Raden "Importera" i mobilbladet
(`#mobileImportRow`) döljs via `isLocal`-checken i `init()`, och `openUgImportDialog()`
returnerar direkt om appen inte körs på localhost. Koden använder fortfarande
`ug`-prefix internt (`ugImport*`, `.ug-import-*`) sedan funktionen var Ultimate
Guitar-specifik — texten i gränssnittet är källoberoende.

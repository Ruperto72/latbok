# CLAUDE.md — Körhäftet

## Projektöversikt

PWA för körsånger, hostad på GitHub Pages. Ingen backend i produktion — `POST /save-song` fungerar bara lokalt via `python server.py`.

## Byggsystem

Källkod ligger i roten (`app.js`, `chords.js`, `sw.js`, `style.css`, `index.html`). GitHub Pages serverar direkt från roten — `dist/` är gitignorerad och används bara som lokal byggd kopia:

```bash
npm run dist   # bygger dist/ med esbuild + kopierar assets
npm test       # enhetstester för chords.js
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

- `songs/index.json` — lista med filnamn för aktiva låtar, styr menyordningen
- `songs/*.json` — en fil per aktiv låt
- `songs/template.json` — mall för nya låtar
- `songs/archive/` — mapp för arkiverade låtar
- `songs/archive/index.json` — lista med arkiverade låtfilnamn
- `songs/archive/*.json` — arkiverade låtfiler
- Song-filer hämtas **network-first** av service workern, så de uppdateras utan cache-bump

**Se [SONGS_GUIDE.md](SONGS_GUIDE.md) för steg-för-steg instruktioner när du lägger till nya låtar.**

## Arkivering

Använare kan arkivera och återställa låtar via en "Arkivera"/"Återställ"-knapp (sista knappen i mobilvyn).

**Lokalt** (development): `POST /archive-song` och `POST /unarchive-song` hanteras av `server.py`, som flyttar filer mellan `songs/` och `songs/archive/` samt uppdaterar motsvarande `index.json`-filer.

**I produktion** (GitHub Pages): Arkiveringen fungerar inte — det finns ingen backend. Knappen döljs via `isLocal`-check.

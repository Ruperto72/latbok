# CLAUDE.md — Körhäftet

Körhäftet är en statisk webbapp (GitHub Pages) för körmusiker — ett digitalt ackord- och texthäfte med gitarrackord, transponering och speech recognition.

---

## Projektstruktur

```
latbok/
├── index.html          # Single-page skelett
├── app.js              # Kärnlogik: laddning, rendering, drag, localStorage
├── chords.js           # Ackordbibliotek (~60 ackord) + SVG-diagram
├── listener.js         # Web Speech API – "Följ med"-läge
├── style.css           # Mörkt tema, responsiv layout, print-stilar
├── songs/
│   ├── index.json      # Manifest: lista av filnamn
│   └── *.json          # Enskilda låtfiler
└── manifest.json       # PWA-manifest
```

---

## Låtformat (JSON-schema)

```json
{
  "title": "Låttitel",
  "artist": "Artist",
  "key": "G",
  "difficulty": "beginner | intermediate | advanced",
  "bpm": "120",
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        {
          "c": "G            C/G        G",
          "l": "Amazing Grace, how sweet the sound,"
        }
      ]
    }
  ]
}
```

### Regler för `c`/`l`-par

- `"c"` = ackordsrad. Ackordets **teckenposition** (index i strängen) avgör var det renderas ovanför texten.
- `"l"` = lyrikkrad. Tom sträng `""` är OK — då renderas bara ackorden.
- Flera ackord i en rad separeras med mellanslag. Positionen är det enda som styr placeringen.
- `"c": ""` + `"l": "text"` = ren textrad utan ackord.

### Taktmarkeringar (planerat/pågående)

Takter markeras med `|` i ackordsraden:

```
"c": "G      C    | Am     F    | G"
"l": "Ama-  zing  | Grace  how  | sweet"
```

- Varje segment mellan `|` = en takt
- Flera ackord inom en takt är naturligt — de positioneras med mellanslag som vanligt
- Rendering: **fri taktbredd** (Alt A) — varje takt tar så mycket utrymme texten kräver
- Fast taktbredd (Alt B) kräver tidsignatur och beat-distribution — ej implementerat

### Tonart och tidsignatur

- `"key"` används för transponering och visas i headern
- `"bpm"` visas som metadata men används inte programmatiskt
- Tidsignatur (`"timeSignature"`) finns **inte** i schemat ännu — under utredning

---

## Nyckelkod i app.js

| Funktion | Rad | Beskrivning |
|---|---|---|
| `parseChordLine(str)` | 167 | Extraherar `[{name, pos}]` från ackordsträng med regex `/(\S+)/g` |
| `transposeChordName(chord, n)` | 177 | Transponerar ett ackord n halvsteg |
| `renderSong()` | 204 | Huvud-renderer. Tre lägen: normal, edit (drag), chord-only |
| `attachDragHandlers()` | 336 | Mus/touch-drag för att flytta ackord i edit-läge |
| `saveCurrentSongToFile()` | 427 | Skriver tillbaka pixeloffsets till teckenpositioner, POSTar till `/save-song` (localhost only) |
| `resetPositions()` | 482 | Rensar chordOffsets för aktuell låt |

### State-variabler

```js
let currentSong = 0;          // Index i songs[]
let transposeSemitones = 0;   // 0–11
let fontSize = 13;            // px, min 9 max 20
let twoColumns = false;
let editMode = false;
let chordOffsets = {};        // { "songIdx-si-li-ci": pixelOffset }
```

### localStorage-nycklar

- `korhaftet-chord-offsets` — pixeloffsets per ackord
- `korhaftet-preferences` — fontSize, twoColumns, currentSong

---

## Rendering — tre lägen

### Normal (default)
Ackord + text renderas som `<span class="cl-segment-chord">` med ackordnamnet ovanför textbiten. Texten delas upp i segment vid varje ackord.

### Edit-läge
Ackord renderas med `position: absolute; left: calc(Xch + Ypx)`. Drag-handlers uppdaterar `chordOffsets`. Sparat med debounce (800ms).

### Chord-only (tom lyrik)
Ackord renderas inline med beräknat mellanslag emellan.

---

## chords.js

- `CHORD_LIB` — ~60 gitarrackord med fret/finger-data
- `lookupChord(name)` — slash-ackord (`C/G`) faller tillbaka på rotackordet
- `chordSVG(data, size)` — genererar inline SVG med grid, fingrar, barre, öppna/dämpade strängar
- `getUniqueChords(song, transpose)` — samlar unika ackord för diagramstripp i toppen

---

## listener.js (Speech Recognition)

- Bygger ett platt index av alla låttexter med `buildLyricIndex(song)`
- `findBestMatch(transcript, index)` — fuzzy-matchning: exakta ord, substring, 1-tecken Levenshtein + framåt-bias
- Auto-highlightar aktuell sektion vid igenkänning
- Startar om automatiskt vid transient-fel

---

## Utvecklingsflöde

### Lokal server (för filsparning)
```bash
# app.js POSTar till /save-song endast på localhost
# Kräver en lokal HTTP-server som hanterar POST /save-song
```

### Lägga till en låt
1. Skapa `songs/nytt_filnamn.json` enligt schemat ovan
2. Lägg till `"nytt_filnamn.json"` i `songs/index.json`

### Transponering
- Görs client-side i `transposeChordName()` — ackorden i JSON-filerna ändras inte
- Slash-ackord (`C/G`, `Am/E`) transponeras korrekt — regex matchar varje notnamn separat

---

## Konventioner

- **Teckenposition är sanning** — ackordsplacering styrs av mellanslag i `"c"`-strängen, inte av separata offset-fält
- **Inga frameworks** — vanilla JS, inga beroenden utom Google Fonts
- **Statisk deploy** — allt fungerar utan server (läsläge). Filsparning kräver localhost-server
- **Svenska i UI** — alla knappar, labels och felmeddelanden på svenska
- **Mörkt tema** — CSS-variabler i `:root`, guldaccenter (`#c8a84b`)

---

## Pågående arbete

### Taktmarkeringar / tidsignaturdetektering
- Branch: `claude/detect-time-signatures-WnW0d`
- Mål: stöd för `|`-separatorer i `"c"`-strängen för visuell taktgrupperingen
- Valt tillvägagångssätt: **Alt A** (fri taktbredd) som första steg
- `parseChordLine()` behöver uppdateras för att hantera `|`-tecken
- Renderaren behöver rendera taktgränser visuellt

### Ej implementerat (framtida)
- Tidsignatur-fält i JSON (`"timeSignature": "3/4"`)
- Fast taktbredd (Alt B) med beat-distribution
- BPM används programmatiskt (klickspår, animation)

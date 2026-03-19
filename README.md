# Körhäftet — Ackord & Text

En modern webbapp för körsånger med ackord, byggd som en ren statisk sida för GitHub Pages. Ingen server, inga beroenden — bara HTML, CSS och JavaScript.

## Funktioner

### Visning
- **Taktbaserad layout** — med `timeSignature: "4/4"` visas varje rad som 4 lika breda taktkolumner, ackord och text hålls ihop per takt
- **Ackorddiagram** — SVG-genererade gitarrgrepp visas automatiskt för varje låts unika ackord
- **Responsiv layout** — ackord och text wrappas naturligt på mobil, ingen horisontell scrollning
- **2-kolumnläge** — komprimera långa låtar med balanserade kolumner
- **Justerbar textstorlek** — versrubriker och avstånd skalas proportionellt

### Transponering
- **Tonartsbyte** med ♭/♯-knappar
- Ackorddiagrammen uppdateras automatiskt vid transponering

### Redigering (Justera ackord-läge)
- **Dra ackord** horisontellt för att finjustera placeringen inom en takt
- **Redigera låttext** direkt i webbläsaren — klicka på en textrad för att ändra
- **Lägg till/ta bort taktstreck** — klicka på ett taktstreck för att ta bort det, eller använd `+|` för att lägga till ett nytt
- **Sparas automatiskt** i webbläsaren (localStorage) per användare
- **Exportfunktion** — ladda ner justerade ackordpositioner som JSON för att baka in permanent
- **Återställ** — nollställ justeringar per låt

### Följ med-läge (experimentellt)
- **Taligenkänning** via Web Speech API — appen lyssnar på kören och scrollar automatiskt till rätt vers
- **Automatisk språkdetektering** — stöd för svenska, engelska, italienska m.fl.
- **Fuzzy matching** — tolerant matchning som hanterar taligenkänningens brister
- Kräver Chrome/Edge och HTTPS (GitHub Pages ger det automatiskt)

### Övrigt
- **Döljbar sidopanel** — hamburgaremenyn fungerar både på mobil och desktop
- **Mobilanpassad** med sidopanel och hamburgaremeny
- **Utskriftsvänlig** — skriv ut direkt från webbläsaren
- **Mörkt tema** med guldiga ackord

## Projektstruktur

```
korhaftet/
├── index.html          ← Huvudsida (HTML-skelett)
├── style.css           ← All styling
├── app.js              ← Huvudlogik (rendering, transponering, drag, export)
├── chords.js           ← Ackordbibliotek och SVG-diagramgenerator
├── listener.js         ← Taligenkänning och "Följ med"-funktionen
├── README.md
└── songs/              ← Låtfiler (en JSON-fil per låt)
    ├── index.json      ← Lista med alla låtfiler (styr menyn)
    ├── amazing_grace.json
    ├── bella_ciao.json
    ├── fattig_bonddrang.json
    ├── fran_djursholm_till_danvikstull.json
    ├── parleporten.json
    ├── sang_till_friheten.json
    ├── uti_var_hage.json
    └── visa_fran_utanmyra.json
```

## Lägga till en ny låt

### 1. Skapa en JSON-fil i `songs/`

#### Taktbaserat format (rekommenderat för 4/4-låtar)

Separera takter med `|` i både `"c"` (ackord) och `"l"` (text). Varje rad bör ha exakt 4 takter (3 `|`-tecken).

```json
{
  "title": "Låtens namn",
  "artist": "Artist / Kompositör",
  "key": "Am",
  "timeSignature": "4/4",
  "difficulty": "beginner",
  "chordTemplates": {
    "vers": "Am|F|G|Am",
    "refr": "F|G|C|Am"
  },
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        { "c": "@vers", "l": "Här skrivs |texten uppdelad |i fyra |takter." },
        { "c": "Am|F|G|Am", "l": "Eller ange |ackorden |direkt per |takt." }
      ]
    },
    {
      "label": "Refräng",
      "lines": [
        { "c": "@refr", "l": "Refrängen |kan ha en |annan |ackordföljd." }
      ]
    }
  ]
}
```

**Ackordmallar** (`chordTemplates`) låter dig namnge återkommande ackordföljder och referera till dem med `@mallnamn` i `"c"`-fältet. Webbsidan visar ackorden som vanligt.

Varje rad har två fält:
- `"c"` — ackordrad, antingen `@mallnamn` eller ackord separerade med `|` (ett ackord per takt)
- `"l"` — textrad separerad med `|` (en takt per segment)

**Obs:** Om ett ord delas av ett taktstreck (t.ex. `"än|då"`) hanterar appen detta automatiskt — hela ordet visas i rätt takt.

#### Fritt format (för låtar utan taktstruktur)

```json
{
  "title": "Låtens namn",
  "artist": "Artist / Kompositör",
  "key": "Am",
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        { "c": "Am        F     G", "l": "Här skrivs texten med ackord ovanför." },
        { "c": "C              Am", "l": "Ackorden placeras med mellanslag." }
      ]
    }
  ]
}
```

### 2. Lägg till filnamnet i `songs/index.json`

```json
[
  "amazing_grace.json",
  "bella_ciao.json",
  "din_nya_lat.json"
]
```

Ordningen i listan styr ordningen i menyn.

### 3. Pusha till GitHub — klart!

Appen läser `songs/index.json` vid laddning och hämtar varje låtfil dynamiskt. Nya låtar dyker upp automatiskt i menyn.

## Ackordbibliotek

Filen `chords.js` innehåller ~80 vanliga gitarrackord med fingersättningar. Diagram genereras som SVG direkt i webbläsaren. Ackord som saknas i biblioteket hoppas över.

För att lägga till ett nytt ackord, utöka `CHORD_LIB` i `chords.js`:

```javascript
'Cadd9': { frets: [-1,3,2,0,3,0], fingers: [0,2,1,0,3,0] },
```

Format: `frets` = greppet per sträng (E A D G B e), där -1 = dämpad, 0 = öppen.

## Publicering

Sidan hostas gratis via GitHub Pages:

1. Skapa ett repo på GitHub
2. Ladda upp alla filer
3. Gå till **Settings → Pages → Branch: main → Save**
4. Sidan blir tillgänglig på `https://ditt-användarnamn.github.io/reponamn/`

## Webbläsarstöd

| Funktion | Chrome/Edge | Safari | Firefox |
|---|---|---|---|
| Grundfunktioner | ✅ | ✅ | ✅ |
| Ackorddiagram | ✅ | ✅ | ✅ |
| Taktbaserad layout | ✅ | ✅ | ✅ |
| Ackordjustering (drag) | ✅ | ✅ | ✅ |
| Följ med (taligenkänning) | ✅ | ❌ | ❌ |

## Låtlista

1. Amazing Grace — John Newton
2. Bella Ciao — Traditionell (italiensk)
3. Fattig Bonddräng — Astrid Lindgren / Georg Riedel
4. Från Djursholm till Danvikstull — Orup
5. Pärleporten — Christer Sjögren
6. Sång till Friheten — Björn Afzelius
7. Uti Vår Hage — Traditionell (svensk)
8. Visa Från Utanmyra — Trad. / Monica Zetterlund

# Körhäftet — Ackord & Text

En modern webbapp för körsånger med ackord, byggd som en ren statisk sida för GitHub Pages. Ingen server, inga beroenden — bara HTML, CSS och JavaScript.

## Funktioner

### Visning
- **Taktbaserad layout** — varje rad visas som lika breda taktkolumner; ackord och text hålls ihop per takt
- **Ackorddiagram** — SVG-genererade gitarrgrepp visas automatiskt för varje låts unika ackord
- **Responsiv layout** — på mobil wrappas 4-taktsrader om till 2+2 utan att text pressas ihop
- **2-kolumnläge** — komprimera långa låtar med balanserade kolumner (desktop)
- **Justerbar textstorlek** — versrubriker och avstånd skalas proportionellt

### Transponering
- **Tonartsbyte** med ♭/♯-knappar
- Ackorddiagrammen uppdateras automatiskt vid transponering

### Autoscroll
- **Jämnt flöde** — scrolla sidan automatiskt med ▶ Scrolla-knappen
- **Hastighetskontroll** — skala 1–9 justerar scrollhastigheten

### Låtredaktör (desktop)
Knappen **✎ Redigera låt** öppnar ett strukturerat redigeringsläge direkt i webbläsaren:
- **Metadata** — titel, artist, tonart, taktart, svårighet
- **Ackordmallar** — skapa, byt namn på och ta bort mallar; alla rader som refererar till en mall uppdateras automatiskt
- **Delar & rader** — lägg till/ta bort delar och rader; välj ackordmall per rad eller skriv ackord fritt
- **Texteditering** — redigera lyrics direkt; använd `|` för att markera taktgränser
- **Spara till fil** — skriver ändringarna tillbaka till JSON-filen via en lokal server (fungerar på localhost)

### Övrigt
- **Döljbar sidopanel** — hamburgaremenyn fungerar både på mobil och desktop
- **Utskriftsvänlig** — skriv ut direkt från webbläsaren
- **Mörkt tema** med guldiga ackord

## Projektstruktur

```
korhaftet/
├── index.html          ← Huvudsida (HTML-skelett)
├── style.css           ← All styling
├── app.js              ← Huvudlogik (rendering, transponering, redaktör, autoscroll)
├── chords.js           ← Ackordbibliotek och SVG-diagramgenerator
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

#### Med ackordmallar (rekommenderat)

Definiera återkommande ackordföljder i `chordTemplates` och referera till dem med `@mallnamn` i `"c"`-fältet. Separera takter med `|` i både ackord och text.

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
        { "c": "@vers", "l": "Andra raden |med samma |ackord|följd." }
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

Varje rad har två fält:
- `"c"` — ackordrad: antingen `@mallnamn` eller ackord separerade med `|`
- `"l"` — textrad separerad med `|` (ett segment per takt)

**Obs:** Om ett ord delas av ett taktstreck hanterar appen detta automatiskt — hela ordet visas i rätt takt.

#### Utan ackordmallar (fritt format)

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

Appen läser `songs/index.json` vid laddning och hämtar varje låtfil dynamiskt.

## Ackordbibliotek

Filen `chords.js` innehåller ~80 vanliga gitarrackord med fingersättningar. Diagram genereras som SVG direkt i webbläsaren. Ackord som saknas i biblioteket hoppas över.

För att lägga till ett nytt ackord, utöka `CHORD_LIB` i `chords.js`:

```javascript
'Cadd9': { frets: [-1,3,2,0,3,0], fingers: [0,2,1,0,3,0] },
```

Format: `frets` = greppet per sträng (E A D G B e), där -1 = dämpad, 0 = öppen.

## Lokal låtserver

Låtredaktörens sparfunktion kräver en lokal server som hanterar `POST /save-song`. Starta med:

```bash
node server.js
```

På GitHub Pages (produktion) är sparknappen inaktiverad — redigera JSON-filerna lokalt och pusha.

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
| Autoscroll | ✅ | ✅ | ✅ |
| Låtredaktör | ✅ | ✅ | ✅ |

## Låtlista

1. Amazing Grace — John Newton
2. Bella Ciao — Traditionell (italiensk)
3. Fattig Bonddräng — Astrid Lindgren / Georg Riedel
4. Från Djursholm till Danvikstull — Orup
5. Pärleporten — Christer Sjögren
6. Sång till Friheten — Björn Afzelius
7. Uti Vår Hage — Traditionell (svensk)
8. Visa Från Utanmyra — Trad. / Monica Zetterlund

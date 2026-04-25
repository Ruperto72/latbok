# Körhäftet — Ackord & Text

En modern webbapp för körsånger med ackord, byggd som en PWA för GitHub Pages. ES-moduler, offline-stöd via Service Worker och valfritt byggsystem med esbuild.

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
- **Validering** — visar varningar för saknade fält, ogiltig taktart och okända ackord i realtid

### Tillgänglighet
- **Skip-link** — hoppa direkt till innehåll med tangentbordet
- **ARIA-attribut** — roller, etiketter och live-regioner för skärmläsare
- **Tangentbordsnavigering** — alla kontroller och låtlistan nåbara via Tab/Enter
- **Focus-visible** — tydlig fokusindikator

### Offline & PWA
- **Service Worker** — cache-first för statiska filer, network-first för låtdata
- **Installerbar** — lägg till på hemskärmen via webbläsaren
- **Fungerar utan nät** — alla låtar cachas vid första besöket

### Övrigt
- **Döljbar sidopanel** — hamburgaremenyn fungerar både på mobil och desktop
- **Utskriftsvänlig** — skriv ut direkt från webbläsaren
- **Mörkt tema** med guldiga ackord

## Projektstruktur

```
korhaftet/
├── index.html          ← Huvudsida (HTML-skelett)
├── style.css           ← All styling
├── app.js              ← Huvudlogik (rendering, redaktör, autoscroll) — ES-modul
├── chords.js           ← Ackordbibliotek, transponering, SVG-diagram — ES-modul
├── sw.js               ← Service Worker (offline-caching)
├── package.json        ← npm-skript och devDependencies
├── scripts/
│   └── build.js        ← Fullständigt dist-bygge (esbuild + kopiera assets)
├── tests/
│   └── chords.test.js  ← Enhetstester (Node.js test runner)
├── README.md
└── songs/              ← Låtfiler (en JSON-fil per låt)
    ├── index.json      ← Lista med alla låtfiler (styr menyn)
    └── *.json          ← En fil per låt
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

### Förslag (anakrus) — text som börjar före första takten

Många visor börjar med en eller några stavelser innan första taktslaget. Markera detta med `.` (punkt) som första takt i ackordmallen — cellen renderas då kursivt med streckad taktlinje och utan ackordnamn.

**Tumregler:**

| | Förklaring |
|---|---|
| `.` som första takt | Förslag — texten visas kursivt med streckad kant |
| Antal `\|` i `c` och `l` | Måste vara lika — varje takt matchar ett lyrikavsnitt |
| `chordTemplates` | Återanvänd ackordföljder med `@mallnamn` |
| Avslutande `\|` | Ok att ha — sista cellen lämnas tom |

---

#### Exempel 1 — 4/4 utan förslag

Texten börjar direkt på ettan.

```json
{
  "title": "En enkel visa",
  "artist": "Trad.",
  "key": "G",
  "timeSignature": "4/4",
  "difficulty": "nybörjare",
  "chordTemplates": {
    "vers":    "G|D|Em|C",
    "refräng": "C|G|D|G"
  },
  "sections": [
    {
      "label": "Vers",
      "lines": [
        { "c": "@vers",    "l": "Solen skiner |över skog och |mark i dag |och det är |" },
        { "c": "@refräng", "l": "skönt att |vara här till |sist nu |äntligen." }
      ]
    },
    {
      "label": "Refräng",
      "lines": [
        { "c": "@refräng", "l": "Sjung nu |alla med |oss här i |kväll." },
        { "c": "@vers",    "l": "höj din |röst mot |himlen klar |och varm." }
      ]
    }
  ]
}
```

---

#### Exempel 2 — 4/4 med förslag

Texten börjar med en eller ett par stavelser före ettan. `.` i mallen ger en smal förslags­cell utan ackord.

```json
{
  "title": "Sommarpsalm",
  "artist": "Trad.",
  "key": "C",
  "timeSignature": "4/4",
  "difficulty": "nybörjare",
  "chordTemplates": {
    "vers_a": ".|C|Am|F|G",
    "vers_b": ".|F|G|C|C"
  },
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        { "c": "@vers_a", "l": "Nu är det |dags att |sjunga vår |sommarvisa |" },
        { "c": "@vers_b", "l": "för dig och |mig och |alla vi |känner. |" },
        { "c": "@vers_a", "l": "Himlen är |blå och |fåglarna |sjunger fritt |" },
        { "c": "@vers_b", "l": "en sång om |ljus och |glädje som |bränner." }
      ]
    }
  ]
}
```

---

#### Exempel 3 — 3/4 (valstakt) med förslag

Vanligt i svenska folkvisor — ett eller två förslags­stavelser, sedan tre slag per takt.

```json
{
  "title": "Vallvisa",
  "artist": "Trad.",
  "key": "Am",
  "timeSignature": "3/4",
  "difficulty": "nybörjare",
  "chordTemplates": {
    "vers_a": ".|Am|Am|E7|E7",
    "vers_b": ".|Am|E7|Am|Am"
  },
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        { "c": "@vers_a", "l": "Långt i |skogen |bortom |stigen |" },
        { "c": "@vers_b", "l": "hördes |klockor |klinga |sakta. |" },
        { "c": "@vers_a", "l": "Där gick |herden |med sin |hjord |" },
        { "c": "@vers_b", "l": "mot den |kvällens |röda |himmel." }
      ]
    },
    {
      "label": "Vers 2",
      "lines": [
        { "c": "@vers_a", "l": "Stilla |sjöng han |gamla |visor |" },
        { "c": "@vers_b", "l": "om en |sommar |som var |borta. |" },
        { "c": "@vers_a", "l": "Och hans |röst bar |ut i |natten |" },
        { "c": "@vers_b", "l": "över |dalar |mörka |djupa." }
      ]
    }
  ]
}
```

---

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

Filen `chords.js` innehåller ~170 gitarrackord med fingersättningar, uppdelat i kategorier:

| Kategori | Täckning |
|---|---|
| Dur | Alla 12 grundtoner |
| Moll | Alla vanliga (Am, Bm, Cm, Dm, Em, Fm, Gm, F#m, G#m, Bbm, C#m, Ebm) |
| 7 (dominant) | Alla 12 grundtoner |
| m7 (moll 7) | Alla 12 grundtoner |
| maj7 | C, D, G |
| sus4 | Alla 12 grundtoner |
| sus2 | Alla 12 grundtoner |
| add9 | C, D, E, F, G, A |
| dim | C, D, E, F, G, A, B |
| dim7 | C, C#, D, Eb, E, F, G, A, B |
| aug | C, D, E, F, G, A, B |
| 9 (dominant) | A, B, C, D, E, G |
| m7b5 (halvförminskad) | A, B, C#, D, E, F#, G |
| Slash-ackord | C/G, C/B, C/E, G/B, Am/E m.fl. |

Diagram genereras som SVG direkt i webbläsaren. Ackord som saknas i biblioteket hoppas över (och visas som varning i redaktören).

För att lägga till ett nytt ackord, utöka `CHORD_LIB` i `chords.js`:

```javascript
'Cadd9': { frets: [-1,3,2,0,3,0], fingers: [0,2,1,0,3,0] },
```

Format: `frets` = greppet per sträng (E A D G B e), där -1 = dämpad, 0 = öppen.

## Utveckling

### Installera beroenden

```bash
npm install
```

### Byggsystem

| Kommando | Beskrivning |
|---|---|
| `npm run build` | Bundla och minifiera JS till `dist/app.bundle.js` (esbuild) |
| `npm run build:dev` | Bundla utan minifiering (med sourcemap) |
| `npm run watch` | Bundla vid filändringar |
| `npm run dist` | Bygg komplett dist-mapp (JS + assets + songs) |
| `npm test` | Kör enhetstester (33 st, Node.js test runner) |

Byggsystemet är valfritt — appen fungerar direkt utan bygge tack vare ES-moduler (`type="module"`).

### Tester

Testerna finns i `tests/chords.test.js` och täcker:
- Transponering (upp, ner, oktavhopp, slash-ackord, komplexa suffix)
- Chord-parsing (positioner, tomma strängar)
- Ackorduppslag (direkt, enharmoniskt, slash-fallback)
- Enharmoniska konverteringar
- HTML-escaping
- Ackordbibliotekens fullständighet (alla 12 grundtoner för dur, 7, sus4, sus2)

### Lokal låtserver

Låtredaktörens sparfunktion kräver en lokal server som hanterar `POST /save-song`. Starta med:

```bash
python server.py
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
9. När Vi Två Blir En - Gyllene Tider




https://www.infoom.se/gitarr-ackord/ackord.php?ackord=E&ackord_namn=E
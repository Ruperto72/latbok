# Guide — Lägga till nya låtar

## Snabbstart

1. Kopiera `songs/template.json`
2. Fyll i: `title`, `artist`, `key`, `difficulty`
3. Lägg till `chordTemplates` (ackordsekvenser)
4. Lägg till `sections` (verser/refräng)
5. Lägg till filnamnet i `songs/index.json`

## Struktur

```json
{
  "title": "Låtens namn",
  "artist": "Artist / Traditionell",
  "key": "Am",
  "timeSignature": "4/4",
  "difficulty": "Lätt",
  "chordTemplates": {
    "vers": ".|Am|Am|Dm|Am",
    "refräng": ".|C|F|G|C"
  },
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        {
          "c": "@vers",
          "l": "Primera |línea de la |canción"
        },
        {
          "c": "@refräng",
          "l": "Refräng |línea"
        }
      ]
    }
  ]
}
```

### Fälten

- **title**: Låtens namn
- **artist**: Kompositör eller "Traditionell"
- **key**: Grundtonart (Am, C, G, etc)
- **timeSignature**: Taktart (vanligtvis "4/4")
- **difficulty**: "Lätt", "Medel" eller "Svår"
- **chordTemplates**: Återanvändbara ackordsekvenser. Skriv `@namn` för att referera till dem
- **sections**: Verser, refräng, bridge etc
  - **label**: Visas i appen ("Vers 1", "Refräng")
  - **lines**: Textrader med ackord
    - **c**: Referens till `@chordTemplate` eller direkt ackordsekvens ("Am|Dm|G|C")
    - **l**: Textraden. Använd `|` för att markera var ackorden startar

## Att märka ackordutsättningar

Använd `|` för att visa var ackordet byts:

```
l": "Det |var en |gång"
```

Med `"c": "@vers"` och `"vers": ".|Am|G|D"` blir det:
```
Det    var en      gång
Am     G           D
```

## Filnamn

Använd `snake_case`:
- `bella_ciao.json` ✓
- `amazing_grace.json` ✓
- `Bella Ciao.json` ✗

Lägg till filnamnet i `songs/index.json`:

```json
[
  "amazing_grace.json",
  "bella_ciao.json",
  "min_nya_lat.json"
]
```

## Exempel: Amazing Grace

```json
{
  "title": "Amazing Grace",
  "artist": "John Newton",
  "key": "G",
  "timeSignature": "3/4",
  "difficulty": "Lätt",
  "chordTemplates": {
    "vers": ".|G|G|D|D|G|Em|D|G"
  },
  "sections": [
    {
      "label": "Vers 1",
      "lines": [
        {
          "c": "@vers",
          "l": "Amazing |grace, how |sweet the |sound, That |saved a |wretch like |me! I |once was |lost, but |now am |found, Was |blind, but |now I |see."
        }
      ]
    }
  ]
}
```

## Skapa varianter

Du kan enkelt skapa varianter av befintliga låtar för att testa nya arrangemang:

1. Öppna låten i redigeringsvyn
2. Klicka [Klona]-knappen (visas bara lokalt)
3. Variant Editor öppnas med en kopia av låten
4. Gör ändringar:
   - **Ackord**: Redigera ackordsmallar direkt eller använd macro-knapparna
   - **Makron**: Transponera, förläng/förkorta verser med en klick
5. Förhandsvisa ändringar i real-time
6. Klicka [Spara som ny låt] när du är nöjd
7. Ny låt visas i menyn

Varianterna sparas som helt oberoende låtfiler — ingen länkning till originalet.

## Tips

- **Håll det enkelt**: Du behöver inte alla verser — börja med 1-2
- **Testa i appen**: Lägg filen i `songs/`, kör `npm run dist`, öppna appen och se att det fungerar
- **Kopiera från befintliga**: `bella_ciao.json` är ett bra exempel
- **Svårighetsgrader**: "Lätt", "Medel", "Svår" — använd dessa strikt för konsistens

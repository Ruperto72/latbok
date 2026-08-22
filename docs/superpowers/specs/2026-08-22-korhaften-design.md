# Design — Körhäften (flera körer, ett repo)

## Bakgrund

Körhäftet visar i dag en enda låtlista. `songs/index.json` är en platt array av
filnamn som styr hela menyn, och `songs/archive/` är en parallell mapp med egen
`index.json` för arkiverade låtar.

Flera körer ska kunna använda samma app och var och en se sitt eget häfte.

## Beslut

Låtarna ligger kvar i en **delad pool** i `songs/`. Ett häfte är ett **urval** ur
poolen — en lista med filnamn. Samma låt kan ingå i flera häften utan att
dupliceras, och en redigering slår igenom för alla körer som sjunger den.

Arkivfunktionen **tas bort**. Med delad pool skulle en fysisk flytt till
`songs/archive/` slå sönder andra körers häften, och en låt ingår nu antingen i
ett häfte eller inte. Det finns en (1) arkiverad låt i dag, så borttagningen är
billig.

## Datamodell

```
songs/index.json               hela poolen: alla låtfiler
songs/haften/index.json        [{ "id": "demestkoren", "namn": "Demestkören" }]
songs/haften/demestkoren.json  ["bella_ciao.json", "parleporten.json", ...]
songs/<låt>.json               oförändrat format
```

- Låtfilerna rörs aldrig av häfteshanteringen — de ligger platt i `songs/`.
- Ordningen i häftesfilen styr menyordningen för det häftet.
- `songs/index.json` behålls som poolen. Den behövs: GitHub Pages kan inte lista
  en katalog, och service workern precachar utifrån den.
- Häftes-`id` används i URL och `localStorage` och måste matcha `[a-z0-9_-]+`.
  `namn` är det som visas i gränssnittet.

Vid start finns ett häfte: `demestkoren` / "Demestkören", med dagens tio låtar
ur `songs/index.json` i nuvarande ordning.

## Val av häfte

Aktivt häfte bestäms i denna ordning:

1. `?haft=<id>` i URL:en, om id:t finns i `songs/haften/index.json`
2. Sparat id i `localStorage`, om det fortfarande finns
3. Första häftet i `songs/haften/index.json`

URL:en skrivs inte om efter att parametern lästs, så länken förblir delbar och
bokmärkbar. Ett giltigt `?haft=` sparas i `localStorage` och gäller tills
användaren byter.

### Pseudo-häftet "Alla låtar"

Id `__alla` läser `songs/index.json` rakt av och visar hela poolen. Det läggs
bara till i väljaren när `isLocal` (samma villkor som döljer redigera-läget i
dag). Körerna ser bara sitt eget häfte; redaktören når allt, inklusive låtar som
inte ingår i något häfte.

## Gränssnitt

En `<select>` i `.sidebar-header`, under `<h1>Körhäftet</h1>` och ovanför
undertexten "N låtar — ackord & text". Native select: fungerar på mobil, är
tangentbordsnavigerbar och kräver ingen extra JS.

Byte av häfte laddar om låtlistan, sparar valet och hoppar till häftets första
låt.

Väljaren visas bara när det finns mer än ett val. I produktion med ett enda
häfte syns den alltså inte; lokalt syns den, eftersom `__alla` tillkommer.

Om `songs/haften/index.json` saknas eller är tom faller appen tillbaka på
`songs/index.json` och döljer väljaren — appen ska aldrig visa en tom meny på
grund av en trasig häftesfil.

## State och persistens

`PREFS_KEY`-objektet får `haftId`.

`currentSong` sparas i dag som ett **index** i `songs`-arrayen. Med häften pekar
samma index på olika låtar i olika häften. Det byts till att spara **filnamnet**
(`currentSongFile`) och slå upp indexet efter laddning, med fallback till första
låten när filnamnet inte finns i det aktiva häftet.

## Redigering (bara lokalt)

`Arkivera`-knappen i låtredigerarens fot ersätts av kryssrutor:

```
Ingår i:  ☑ Demestkören
```

En kryssruta per häfte i `songs/haften/index.json`. Ändring anropar ny endpoint:

```
POST /set-song-haften
{ "filename": "bella_ciao.json", "haften": ["demestkoren"] }
```

`server.py` uppdaterar varje häftesfil: lägger till filnamnet **sist** i de
häften som är ikryssade (ordningen är manuell och ska inte sorteras om) och tar
bort det ur övriga. Återanvänder mönstret från nuvarande `update_index`.

UG-importdialogen får samma kryssrutor, så en importerad låt hamnar direkt i
rätt häfte.

### Bugg som måste åtgärdas samtidigt

`saveNewSongToBackend()` i `app.js` bygger om hela `songs/index.json` från
låtarna i minnet. När minnet bara innehåller ett häftes låtar skulle poolen tyst
tömmas vid nästa sparning.

Underhållet av `songs/index.json` flyttas därför in i `server.py`s `/save-song`:
när en ny låtfil sparas läggs filnamnet till i poolindexet server-side.
Ombyggnaden på klientsidan tas bort.

## Migrering

1. `songs/archive/amazing_grace.json` → `songs/amazing_grace.json`
2. `songs/archive/` tas bort
3. `songs/index.json` utökas med `amazing_grace.json` och `bella_ciao_takt.json`
   (den senare ligger redan i `songs/` men saknas i indexet)
4. `songs/haften/index.json` och `songs/haften/demestkoren.json` skapas;
   häftesfilen får dagens tio låtar i nuvarande ordning

`amazing_grace.json` och `bella_ciao_takt.json` hamnar utanför alla häften och
nås via "Alla låtar" lokalt.

## Borttagning av arkivet

- `app.js`: `isArchived`, arkivsidan, `toggleArchiveSong()`, laddning av
  `songs/archive/`
- `index.html`: `mobileArchiveRow`
- `style.css`: arkivsidans regler
- `server.py`: `/archive-song`, `/unarchive-song`
- Dokumentation: arkivavsnitten i `CLAUDE.md` och `README.md`

## Moduler

Logiken för häften läggs i en ny modul, `haften.js`, med rena funktioner:

- `resolveHaftId(haften, urlId, savedId)` → id enligt prioritetsordningen ovan.
  `haften` är listan som visas i väljaren, alltså med `__alla` inkluderat när
  appen körs lokalt — då är `__alla` ett giltigt sparat eller länkat id.
- `parseHaftenIndex(raw)` → validerad lista, ignorerar poster med ogiltigt id
- `haftenForSong(haftLists, filename)` → vilka häften en låt ingår i
- `withSongInHaften(haftLists, filename, valdaIds)` → uppdaterade listor

`app.js` sköter fetch, DOM och state. `haften.js` är ren och testbar — till
skillnad från `app.js`, som inte har enhetstester.

## Testning

`tests/haften.test.js` med `node --test`, samma mönster som
`tests/chords.test.js`. `npm test` körs mot båda filerna.

Fall som ska täckas: prioritetsordningen för val av häfte, okänt eller ogiltigt
`?haft=`, sparat id som inte längre finns, tom eller trasig häftesindexfil, samt
att `withSongInHaften` lägger till sist och bevarar ordningen.

Manuell verifiering lokalt: byta häfte i väljaren, ladda om, dela `?haft=`-länk,
kryssa i/ur häften i redigeraren, importera en låt till ett häfte.

## Cache och service worker

`sw.js` precachar även `songs/haften/index.json` och varje häftesfil.
`/songs/`-prefixet i fetch-hanteraren täcker redan de nya sökvägarna
(network-first), så inga låtdata fastnar i cachen.

`CACHE_NAME` bumpas till `korhaftet-v16` i **både** `sw.js` och `dist/sw.js`.

## Dokumentation

`SONGS_GUIDE.md` får ett avsnitt om häftesfilernas format och hur man lägger en
låt i ett häfte för hand. `README.md` och `CLAUDE.md` uppdateras: ny
katalogstruktur, arkivet borta, ny endpoint.

## Utanför scope

- Att skapa eller döpa om häften i appen — häften läggs upp genom att skapa
  filerna i repot
- Häfteshantering i produktion (GitHub Pages har ingen backend, samma
  begränsning som redigering och sparning har i dag)
- Behörigheter eller att dölja ett häfte för någon som känner till dess id

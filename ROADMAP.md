# Roadmap — Körhäftet

## Planerade funktioner

### GitHub-integration för låtredigering
**Mål:** Kunna redigera och spara låtar direkt från appen när den körs via GitHub Pages — utan att behöva klona repot lokalt.

**Hur det fungerar:**
1. Användaren anger ett GitHub Personal Access Token (sparas i `localStorage`)
2. Spara-knappen i redaktören anropar GitHub REST API (`PUT /repos/.../contents/songs/låt.json`)
3. Ändringen committas direkt till repot
4. GitHub Pages publicerar den uppdaterade versionen automatiskt (~1 min)

**Vad som behöver byggas:**
- Inställningssida med fält för GitHub-token, repo-ägare och repo-namn
- Logik för att hämta filens nuvarande SHA (krävs av API:et för att uppdatera)
- Ersätt/komplettera nuvarande "Spara till fil"-logik (som kräver lokal server) med GitHub API-anrop
- Felhantering: token saknas, nätverksfel, konflikt (SHA har ändrats)
- Visuell feedback: "Sparar...", "Sparat till GitHub ✓", felmeddelande

**Beroenden:** GitHub Personal Access Token med `repo`-scope


## Genomförda funktioner

### ✅ Import från urklipp
**Mål:** Kunna klistra in ackord/text kopierad från en ackordsida på webben (t.ex.
Ultimate Guitar) och få det omvandlat till en färdig låtfil, istället för att skriva
om låtar för hand.
*(Implementerat 2026-08-17: Dialogen tolkar ackordrad-ovanför-textrad och inline-ackord
med `[Vers]`/`[Chorus]`-headers, gissar titel/artist/tonart, visar förhandsvisning och
sparar via lokal server. Importen är bara tillgänglig lokalt, precis som låtredaktören.)*

### ✅ Häften — ett urval per kör
**Mål:** Låta flera körer använda samma app och var och en se sitt eget urval ur en
delad låtpool.
*(Implementerat 2026-08-22: `songs/index.json` är poolen, `songs/haften/<id>.json` listar
låtarna i ett häfte i menyordning. Aktivt häfte väljs via `?haft=<id>`, sparas i
`localStorage` och byts i väljaren i sidopanelen. Häftesmedlemskap kryssas i från
låtredigeraren och UG-importen via `POST /set-song-haften` — bara lokalt.)*

### ✅ Arkivering av låtar — borttagen
**Mål:** Flytta låtar till ett arkiv för att hålla det aktiva urvalet rent.
*(Implementerat 2026-05-05, borttaget 2026-08-22: Ersatt av häften. Med en delad pool
skulle en fysisk flytt till `songs/archive/` slå sönder andra körers häften — en låt
ingår nu antingen i ett häfte eller inte.)*

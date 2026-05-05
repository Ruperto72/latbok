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

### ✅ Arkivering av låtar
**Mål:** Flytta låtar till ett arkiv för att hålla det aktiva urvalet rent.
*(Implementerat 2026-05-05: Låtar döljs från huvudlistan och kan nås, hanteras och återställas från en separat arkivsida.)*

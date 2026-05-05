# Design: Song Variant Workflow

**Date:** 2026-05-05  
**Feature:** Clone and create song arrangement variants  
**Purpose:** Enable rapid experimentation with different chord progressions and song structures without manual file creation

---

## Overview

Users can clone an existing song and modify its arrangement (chords, song structure, transpositions) in a dedicated **Variant Editor** view. Once satisfied, the variant is saved as a new, independent song file.

**Use case:** A user has "Bella Ciao" and wants to test a slower version with different chords. They clone it, apply macros to adjust the arrangement, preview the result, and save it as "bella_ciao_slow.json".

---

## Architecture & Data Flow

```
Song Editor View (existing)
  ↓
[Clone Button] → Open Variant Editor
  ↓
Variant Editor View (new)
  ├─ Display chord templates (list)
  ├─ Macro tools (add/remove measures, transpose)
  ├─ Live preview
  └─ [Save as new song] → Confirm → Update songs/index.json
```

**Data model:** A variant is a completely independent song file. No relationships, no versioning links—just a copy of the original that can be modified freely.

---

## UI Components

### Variant Editor View (New)

**Header:**
- Title: "Variant of [Original Song Name]"
- [Back] button → return to main menu
- Visual indicator that this is a temporary workspace

**Chord Templates Section:**
- Each template on one row:
  - Template name (editable input)
  - Chord sequence display (editable)
  - [+ Measure] button → add chord slot
  - [- Measure] button → remove chord slot (if >1 measure)
  - Example: `vers_a: .|Am|Am|Dm|Am|` with individual add/remove per chord

**Macro Tools Section:**
- Quick-action buttons for bulk changes:
  - "Transpose +1 semitone" / "-1"
  - "Extend all verses by 1 measure"
  - "Shorten all verses by 1 measure"
  - "Fix missing measures in text" (existing from current editor)
- Macros apply to all templates immediately; preview updates in real-time

**Live Preview:**
- Same rendering as current `renderSong()` 
- Shows how the song looks with current modifications
- Updates when templates or structure changes

**Save Section:**
- [Save as new song] button (bottom)
- Opens modal dialog:
  - Title: pre-filled with `[Original Title] (variant)` (editable)
  - Artist: pre-filled from original (editable)
  - Key: pre-filled from original (editable, useful after transposition)
  - Validation: same as current song validation
- On success: close Variant Editor, show confirmation, return to main menu

---

## Clone Flow

1. In current **Song Editor**, add new button: [Clone]
2. Click → Opens Variant Editor with original song's data as default
3. All fields auto-filled:
   - Chord templates (exact copy)
   - Sections (exact copy)
   - Metadata (title gets " (variant)" suffix, editable)
4. User modifies as needed
5. User saves via [Save as new song]

---

## Macro Implementation

**Two levels of modification:**

### Template-level (per chord sequence)
- Manual add/remove buttons on each chord
- Example: `vers_a: .|Am|Am|Dm|Am|` → [+] → `.|Am|Am|Dm|Am|C|`

### Global-level (all templates at once)
- **Transpose ±1:** Uses existing `transposeChord()` function
  - Applies to every chord in every template
  - Am → A#m, Dm → D#m, G → G#, etc.
- **Extend verser:** Add 1 measure to all templates
  - `vers_a` and `vers_b` each gain one chord slot at end
- **Shorten verser:** Remove 1 measure from all templates
  - Removes last chord from each template

---

## Saving & File Structure

**Saved variants are independent song files in `songs/`:**

Example:
- Original: `bella_ciao.json`
- Variant (saved): `bella_ciao_slow.json` or `bella_ciao_variant_1.json` (user-determined)

No special versioning or relational system—they are treated as completely separate songs.

**Save process:**
1. Validate song (same `validateSong()` as current editor)
2. `POST /save-song` with new filename and content
3. Update `songs/index.json` with new filename
4. Close Variant Editor
5. Show success message, return to main menu

---

## Error Handling & Validation

**In Variant Editor:**
- Chord validation (same as current editor):
  - Display unknown chords in validation panel
  - Allow saving even with invalid chords (users may test)
- Filename validation:
  - No `/` or `\` in filename
  - Prevent duplicate filenames (warn user: "A song with this name already exists")
  - Auto-append `.json` suffix

**Edge cases:**
- Cloning an archived song: Allowed; variant is a regular song
- Transposing key: Title metadata can be manually adjusted to reflect new key

---

## Local vs. Production

**Local development (`localhost`):**
- Clone button visible and functional
- Saving works via `POST /save-song` (server.py)

**Production (GitHub Pages):**
- Clone button hidden/disabled (no backend POST)
- Same pattern as existing archive functionality (`isLocal` check)

---

## Testing Strategy

**Manual test flow:**
1. Open an existing song (e.g., "Bella Ciao")
2. Click [Clone] button
3. Verify Variant Editor opens with pre-filled data
4. Test macro: [Transpose +1] → Check all chords change
5. Test macro: [Extend verser] → Check each template gets extra measure
6. Edit template name and chord sequence directly
7. Observe live preview updates
8. Click [Save as new song]
9. Fill dialog: keep defaults or modify
10. Click Save
11. Verify new song appears in main menu
12. Open new song → confirm all changes persisted

**Edge case testing:**
- Clone → modify nothing → save (should work)
- Clone → create invalid chords → save (should warn, but allow)
- Clone → use existing song name (should warn)
- Clone from archived song (should work)

---

## Constraints & Assumptions

- **Scope:** This feature is **clone + modify + save**. No diff viewer, no draft system, no undo/redo.
- **Data:** Variants are fully independent files—no shared state with original after cloning.
- **Scale:** Song files are small JSON (~2-5KB typical). No performance concerns for cloning.
- **Future expansion:** Once this works, we can add:
  - Side-by-side comparison view (original vs. variant)
  - Undo/redo within Variant Editor
  - Save as draft instead of final

---

## File Locations & Implementation Notes

**Files to modify/create:**
- `app.js`:
  - Add [Clone] button in current song editor
  - New function `toggleVariantEditor()` 
  - New function `renderVariantEditor(song)` — the full UI
  - New macro functions: `transposeAllChords()`, `extendAllMeasures()`, etc.
  - Save logic reuses existing `saveSong()` pattern
- `style.css`:
  - New styles for `.variant-editor` container
  - Styles for macro buttons, template list rows, preview pane
- `server.py`:
  - No changes needed (reuses existing `/save-song` endpoint)
- `SONGS_GUIDE.md`:
  - Document that variants are just cloned songs, no special metadata

**No changes to:**
- `chords.js` (validation functions already exist)
- `sw.js` (service worker—no special caching for variants)
- `index.html` (no new DOM structure at top level)

---

## Acceptance Criteria

✅ User can click [Clone] on any song in the editor  
✅ Variant Editor opens with original data pre-filled  
✅ User can modify chord templates and apply macros  
✅ Live preview updates as user makes changes  
✅ User can save variant as a new song file  
✅ New song appears in main menu  
✅ Clone button hidden in production (GitHub Pages)  
✅ Variants are fully independent files in `songs/`  

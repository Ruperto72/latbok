# Mobile Menu Redesign

**Date:** 2026-04-28  
**Status:** Approved

## Problem

On mobile, the topbar uses `flex-wrap: wrap` with multiple controls. When the user changes font size (or when a song lacks bar lines, causing different content layout), the topbar height changes — causing the entire menu to jump visually. This is disruptive when reading a songbook.

## Goal

- Eliminate layout jumps caused by the topbar on mobile
- Keep auto-scroll one tap away at all times
- Move secondary controls (font size, chords, transpose, scroll speed) out of sight until needed
- Leave the desktop experience completely unchanged

## Design

### Mobile (≤768px)

The topbar is **hidden entirely** on mobile. It is replaced by a fixed **bottom bar** that never changes height.

#### Bottom Bar

Three elements always visible:

| Position | Element | Action |
|----------|---------|--------|
| Left | ☰ icon button | Open/close song list sidebar |
| Center | ▶ Scrolla / ■ Stopp | Toggle auto-scroll |
| Right | ⚙ icon button | Open/close settings sheet |

The center button is prominent (accent color when active, neutral otherwise). Left and right buttons are small icon buttons.

#### Settings Bottom Sheet

Tapping ⚙ slides up a bottom sheet that appears above the bottom bar (anchored to it). It contains:

- **Textstorlek** — `−` / value / `+`
- **Ackord** — toggle button (on/off)
- **Transponera** — `♭` and `♯` buttons
- **Scrollhastighet** — `−` / value / `+`

The sheet is dismissed by tapping ⚙ again, tapping outside, or swiping down. While open, the ⚙ button is highlighted (accent border/color).

The existing hamburger button (`.menu-toggle`) that is currently fixed at `top: 12px; left: 12px` is removed on mobile — its function moves to the bottom bar ☰ button.

### Desktop (≥769px)

No changes. The existing topbar with all controls remains exactly as-is.

## Technical Notes

- The `@media (max-width: 768px)` block in [style.css](style.css) currently adds `padding-left: 56px` to `.topbar` to make room for `.menu-toggle`. Both of these go away on mobile.
- The bottom bar should be `position: fixed; bottom: 0; left: 0; right: 0` with a safe-area inset for iOS home indicator (`padding-bottom: env(safe-area-inset-bottom)`).
- `.main` needs `padding-bottom` on mobile equal to the bottom bar height (56px) plus `env(safe-area-inset-bottom)` to prevent content from hiding behind the fixed bar.
- The settings sheet uses a CSS transform slide-up animation. It sits above the bottom bar (`z-index` stacking).
- All existing JS functions (`toggleAutoScroll`, `changeFontSize`, `toggleHideChords`, `transpose`, `changeScrollSpeed`, `toggleSidebar`) are reused — only the HTML wiring changes.

## Out of Scope

- No changes to the song editor (already desktop-only)
- No changes to the chord diagram popup
- No changes to the sidebar itself
- No changes to column layout (already desktop-only on mobile)

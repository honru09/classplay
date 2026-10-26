---
name: ClassPlay Design System
description: Poki-inspired aqua light theme with solid stepped surfaces, original feed covers, and zero glassmorphism
colors:
  bg: "#8ef1d9"
  panel: "#ffffff"
  panel2: "#dbe7fd"
  line: "rgba(37, 64, 140, 0.15)"
  text: "#17233f"
  muted: "#2c3f63"
  amber: "#f59e0b"
  cyan: "#0369a1"
  violet: "#7c3aed"
  pink: "#db2777"
  header-bg: "#ffffff"
  player-bg: "#000000"
  player-border: "rgba(23, 35, 63, 0.2)"
  toolbar-bg: "#ffffff"
  theatre-bg: "#000000"
  loading-scrim: "rgba(14, 25, 48, 0.78)"
  facade-shade: "linear-gradient(180deg, rgba(10, 20, 40, 0.05), rgba(10, 20, 40, 0.6) 82%)"
  grad: "linear-gradient(92deg, #38bdf8, #34d399 52%, #fbbf24)"
typography:
  ui: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  display: "'Avenir Next', 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif"
radii:
  tile: "20px"
  card: "16px"
  chip: "999px"
  button: "999px"
  search: "999px"
  player: "20px"
  toolbar: "14px"
shadows:
  card: "0 1px 2px rgba(21, 18, 51, 0.05), 0 8px 20px rgba(23, 35, 63, 0.07)"
  card-hover: "0 6px 14px rgba(23, 35, 63, 0.1), 0 18px 34px rgba(23, 35, 63, 0.13)"
  tile: "0 1px 2px rgba(21, 18, 51, 0.06), 0 10px 24px rgba(23, 35, 63, 0.13)"
  tile-hover: "0 6px 14px rgba(23, 35, 63, 0.12), 0 20px 36px rgba(23, 35, 63, 0.18)"
  player: "0 30px 60px -18px rgba(23, 35, 63, 0.35)"
  sticky: "0 16px 34px rgba(23, 35, 63, 0.25)"
dimensions:
  wrap-max: "1180px"
  side-rail-width: "300px"
  toolbar-height: "48px"
  h-budget-desktop: "calc(min(78svh, 680px) - 52px)"
  h-budget-mobile: "calc(72svh - 48px)"
  theatre-z: "99999"
motion:
  press-feedback: "120ms"
  fade-in: "160ms"
  hover-transition: "180ms"
  timeout-error: "12000ms"
---

# ClassPlay Design System (v9)

## 1. Design Read

A bright, tactile school games shelf designed to transition a student from browsing to playing with zero friction. The aesthetic pairs Poki's high-energy aqua canvas (`#8ef1d9`) and dense square tile mosaic with Hooda Math's clean, opaque paper surfaces (`#ffffff`, `--panel2: #dbe7fd`) and high-contrast solid ink typography (`#17233f`, `--muted: #2c3f63`).

## 2. Solid Surfaces & The Anti-Glass Discipline

- **Zero Backdrop-Filter**: Benchmarked leaders (Poki, CrazyGames, CoolMath, Hooda Math) avoid content glassmorphism entirely. Cards, panels, headers, toolbars, and sticky controls rely strictly on solid fills, hairline borders (`--line: rgba(37, 64, 140, 0.15)`), and physical drop shadows.
- **Surface Elevation**:
  - Base canvas: `--bg #8ef1d9` with subtle white/teal geometric facets (3–9% opacity).
  - Main containers & header: `--panel #ffffff`.
  - Secondary panels, chips & tile backings: `--panel2 #dbe7fd`.
  - Contrast section bands: `--band-deep #17233f`.
- **Text Ink**: High-contrast solid ink (`#17233f`) for primary headings and body; `--muted #2c3f63` for descriptions, achieving ≥7:1 composited contrast. Gradient text is strictly quarantined to the brand logo wordmark.

## 3. The Poki Tile System

- **Geometry**: Aspect ratio 1:1 square tiles, 20px border radius, full-bleed original feed artwork.
- **Label Discipline**: Titles live on hover pills (`#ffffff` solid pill with soft shadow) on pointer-fine devices, leaving artwork completely clean.
- **Mosaic Rhythm**: Runs of 12 tiles where positions 0 and 5 scale to 2×2 hero tiles. At 2, 3, and 6 columns, this packs with zero gaps across all viewport widths.
- **Tactile Response**: Tile active state provides immediate press feedback in 120ms (`transform: scale(0.97); opacity: 0.92;`), with an unmistakable 2px solid cyan focus ring.

## 4. Player-First Staging & Ratio-Correct Geometry

- **Top Placement**:
  - Desktop game page player top lands at ≤170px.
  - Mobile game page player top lands at ≤200px.
  - Removed decorative stage art bursts, 54px top padding, and disc plates completely.
- **Ratio-Correct Frame Sizing**:
  - Solves container width from a viewport height budget:
    `width = min(100%, calc(var(--h-budget) * var(--ratio)))`
    `aspect-ratio: var(--game-w) / var(--game-h)`
  - Portrait games (e.g., Block Drop Escape Puzzle at 0.46 ratio) render as slim, tall, centered frames with zero letterbox distortion.
  - Ultrawide games (e.g., Smashling at 2.22 ratio) expand across full container width without vertical clipping.
- **AUTO-LOAD & Guarded Display Discipline**:
  - The poster facade paints first as the LCP element.
  - The iframe begins construction automatically on page load without requiring a tap (spec §2.3 amended).
  - Designed in-frame LOADING state: dimmed poster, smooth CSS spinner (`@keyframes playerSpin`, reduced-motion safe), title, and reassurance hint.
  - Critical CSS display rule: elements toggled via `hidden` (facade, loading, error) are strictly guarded with `:not([hidden])` and carry `display: none !important` when hidden. On load, the facade's computed display is `'none'` and the iframe receives keyboard focus if in the viewport.
  - 12s timeout presents a designed in-frame ERROR state with an unlimited [Try again] recovery path and a [Browse more games] escape.

## 5. Toolbar, Theatre Mode & Side Rail

- **Toolbar**: Anchored beneath the player frame. Contains truncating title and inline-SVG action buttons (Restart, Fullscreen, Next game). No emoji as functional icons.
- **Theatre Mode**: Fallback when native `requestFullscreen` fails or is rejected (iOS Safari). Transitions the shell into a fixed `100dvh` overlay (`z-index: 99999`) with a floating Exit button and Escape key listener.
- **Desktop ≥1100px Layout**: Two columns consisting of the main player/prose area and a 300px side rail housing "Up next" related games and "Jump back in" history cards.

## 6. Contextual Mobile Sticky Bar

- Positioned fixed along the bottom edge on screens ≤760px.
- Driven by an `IntersectionObserver` watching `#playerFrame`: remains completely hidden while the player is in viewport, sliding up only when the player scrolls off-screen.
- Contextual CTA: "Play" before first activation, transforming to "Back to game" once playing. Tapping centers the game frame smoothly.

## 7. Accessibility & Motion

- Strict compliance with `prefers-reduced-motion`: animation iterations drop to instant transitions; spinners remain stationary.
- Keyboard navigation: visible `:focus-visible` rings, single back link with clean focus, and iframe automatically receives focus on load (when in viewport).

## 8. Brand Mark (SpriteBuddy)

- **Identity**: The official ClassPlay brand mark is **CP2-C "SpriteBuddy"** — a friendly, organic mint-aqua puzzle ghost character (`#8ef1d9`) featuring an arcade dome silhouette, straight flanks, a 3-scallop wavy skirt, oversized expressive white eyes (`#ffffff`) with inquisitive ink navy pupils (`#17233f`), sky blue blush accents (`#38bdf8`), and an eager smile.
- **Source Assets**:
  - Standalone Mark: `/home/hatch/workspace/game-site/redesign/logo-v9/round2/cp2-variant-c-mark.svg`
  - Horizontal Lockup: `/home/hatch/workspace/game-site/redesign/logo-v9/round2/cp2-variant-c-lockup.svg`
- **Surface & Canvas Integration**:
  - Header & Light Surfaces: SpriteBuddy lives natively on solid white panels (`--panel: #ffffff`), where its mint aqua body (`#8ef1d9`) and deep ink navy facial cut-outs (`#17233f`, 14.2:1 contrast) project maximum friendliness and school-safe warmth.
  - PWA / App / Maskable Icons: Rendered with the full-bleed Poki aqua background (`#8ef1d9`) and a crisp white circular surface (`#ffffff`) centered within the 80% safe zone. This guarantees zero boundary clipping across Android adaptive icon masks (circles, squircle, teardrop) and iOS home screens while preserving high-contrast visibility.
- **Favicon Simplification (16px / 32px)**:
  - For browser tab legibility, sub-pixel details (1.5px specular sparkle dots and 3px 80% opacity blush circles) are omitted to prevent chromatic blurring on low-DPI displays.
  - The mint aqua dome silhouette, 3-scallop skirt, high-contrast white eye sclera, solid ink navy pupils, and curved smile are preserved with reinforced stroke weight, ensuring instant recognition at 16×16 and 32×32 pixels on both light and dark browser themes.

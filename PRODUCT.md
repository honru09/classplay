# ClassPlay — Product Specification (v9)

ClassPlay is a school-safe free browser games portal built for Chromebooks, desktop PCs and mobile browsers. Every game runs in a standard browser tab with zero downloads, zero installs and zero sign-ups.

## 1. Audience & Core Task

- **Target Audience**: Students on school Chromebooks, classroom environments, teachers, parents, and casual players seeking wholesome, screened web games.
- **Curation Discipline**: Strictly school-safe. Zero shooters, zero horror, zero zombie/gore games. Focused on thinking, logic, puzzles, gentle agility, and classroom-appropriate 2-player sports.
- **Core Value Proposition**: Instant play in 1 tap (auto-load). No popups blocking the first click, no intrusive overlays, zero platform-level play friction.
- **Audience Demand Hierarchy (ClassPlay)**: Puzzle & merge (deep engagement, thinking) > sports & 2-player classroom games > agility & skill > .io multiplayer > educational & brain games > casual & simulation.

## 2. Core Journey: 1 Tap to Play (Auto-Load)

1. **Tap 1 (Browse to Game Page)**:
   - User enters homepage or category hub.
   - Immediate feedback on tile press (120ms transform/opacity, visible focus ring).
   - Intent prefetch: pointerenter, focusin, or touchstart on any game tile or search result prefetches the destination game page (`link rel="prefetch"` once per URL).
   - User lands on player-first game page.
2. **Auto-Load (Zero Extra Clicks)**:
   - Player arrives near top of viewport (desktop top ≤170px, mobile top ≤200px).
   - Facade poster displays original game art as the initial LCP element.
   - The game begins loading automatically behind the poster without requiring a second click (spec §2.3 amended).
   - In-frame LOADING state renders immediately: dimmed poster, reduced-motion safe spinner, "Loading {title}…", hint line.
   - On iframe `load`, game crossfades in (160ms), player marks `data-state="playing"`, facade computed display is `'none'`, and focus transfers into the iframe (if in viewport) so arrow keys and space drive gameplay immediately.

## 3. Product Structure & Key Pages

### 3.1 Home Page (`/`)
- **Header**: Sticky solid white bar (`#ffffff`), logo with solid text, instant client-side search index ranked revenue-first, horizontal category pills.
- **Title Strip**: Compact H1 and lede preserving SEO indexing while placing games high on screen.
- **Jump Back In Rail**: Client-side shelf populated from `localStorage` (`cp-recent`, max 8, deduped). Renders as the first shelf if items exist; reserves 0 space (zero CLS) if empty.
- **Featured Shelf**:
  - 12-tile mosaic supercell completely led by GameMonetize titles within school-safe categories (puzzle first, then sports/agility/.io).
  - Slots 0 and 5 (2×2 hero tiles) are occupied by high-appeal landscape GM titles (`Save My Human` and `Simulator GT Motorsport`).
- **Category Bands**: Alternating solid panel bands (white `#ffffff` and deep navy `#17233f`) hosting Math, Puzzle, Brain, Quick Breaks, 2 Player, and Sports shelves.
- **Why ClassPlay**: Plain prose disclosure explaining school safety and Chromebook compatibility.

### 3.2 Category Hubs (`/[hub]/`)
- Themed hubs (Classroom, Math, Puzzle, Brain, Sports, Chromebook, Breaks, 2 Player).
- Clean hero banner with category tagline.
- Dynamic "Jump back in" rail if history exists.
- 48-tile catalog grid sorted revenue-first.
- Descriptive educational context text drawer.

### 3.3 Game Pages (`/games/[slug]/`)
- **Back Navigation**: Single "← All games" back link replacing bloated crumbs while preserving `BreadcrumbList` JSON-LD.
- **Compact Title Row**: Single-line H1, primary category chip, and control summary chips.
- **Player Area**:
  - Stage key-art, 54px burst padding, and disc plate completely removed.
  - Ratio-correct frame sizing for ratios 0.46 through 2.22 solved from height budget (`desktop: calc(min(78svh, 680px) - 52px)`, `mobile: calc(72svh - 48px)`), centered via `margin-inline: auto`.
  - Head contains per-game `preconnect` and `dns-prefetch` for embed origin.
  - AUTO-LOAD start with designed LOADING state, 12s timeout ERROR state with [Try again] recovery and [Browse more games].
- **Player Toolbar**:
  - Attached directly below frame. Truncating game title (never wraps).
  - Inline SVG action buttons: Restart, Fullscreen (with Theatre Mode fallback), Next game.
- **Theatre Mode**:
  - Fallback when native `requestFullscreen` fails or is rejected (iOS Safari).
  - Fixed full-viewport overlay (`100dvh`, `z-index: 99999`) with dedicated Exit control and Escape key support.
- **Desktop ≥1100px Two-Column Layout**:
  - Main column: player, toolbar, lede, prose About and How-to sections, FAQ accordion.
  - 300px Side rail: "Up next" compact vertical cards followed by "Jump back in" history cards.
- **Contextual Mobile Sticky Bar**:
  - Position fixed bottom bar with solid white background.
  - Monitored by `IntersectionObserver`: completely hidden while the player is on screen, appears when scrolled away.
  - Dynamic button label: "Play" before activation, "Back to game" once playing.
  - Tap scrolls player smoothly into viewport center.

## 4. Revenue-First Ordering Engine

Placement reflects current commercial reality: GameMonetize generates revenue (45% share, approved domains), whereas GameDistribution currently yields $0.
- Implemented in `src/lib/games.mjs` via `scoreGame(game)`:
  1. `MONETIZED_SOURCES = new Set(['gamemonetize'])`: GM games prioritized.
  2. Category demand weight tailored for ClassPlay (Puzzle/Merge 700 > Sports/Football 600 > Agility 550 > Racing 500 > .IO 450 > Strategy 400 > Casual 200).
  3. Session-depth bonus (.io, merge, puzzle, endless-runner tags).
  4. Horror safeguard demotion.
  5. Deterministic tie-breaker via catalog index and existing featured flag.
- GD games are preserved in all catalog filters, SEO pages, and alphabetical listings; ordering changes, membership never drops (all 80 games intact: 17 GM + 63 GD).
- Related games use relevance score first, then revenue score tie-breaking ("revenue-first within relevance").
- Search index uses exact prefix match first, then revenue score.

## 5. Hard Constraints & Compliance

- Zero changes to URLs, slugs, canonicals, page titles, or meta descriptions.
- Zero edits to `src/data/*.json`.
- Zero `backdrop-filter` declarations across entire codebase. All surfaces solid.
- No fabricated metrics, ratings, or player counts.
- Covers remain original feed thumbnails.

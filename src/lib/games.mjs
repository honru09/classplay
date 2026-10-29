import gdGames from '../data/games.json';
import gmGames from '../data/games-gm.json';

export { gdGames, gmGames };

export const MONETIZED_SOURCES = new Set(['gamemonetize']);

const normTitle = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const CATEGORY_WEIGHTS = {
  'Puzzle': 700,
  'Merge': 680,
  'Match-3': 660,
  'Educational': 650,
  'Quiz': 640,
  'Sports': 600,
  'Football': 600,
  'Agility': 550,
  'Racing & Driving': 500,
  '.IO': 450,
  'Strategy': 400,
  'Boardgames': 400,
  'Cards': 400,
  'Mahjong & Connect': 400,
  'Casual': 200,
  'Simulation': 200,
  'Adventure': 200,
};
const DEFAULT_CAT_WEIGHT = 300;

export function isHorror(g) {
  const text = `${g.title} ${(g.tags || []).join(' ')}`.toLowerCase();
  return /horror|scary|granny|zombie|creepy|deadfloor/i.test(text);
}

function sessionDepthBonus(g) {
  const text = `${g.title} ${(g.categories || []).join(' ')} ${(g.tags || []).join(' ')}`.toLowerCase();
  let bonus = 0;
  if (/(\.io|\bio\b|multiplayer)/i.test(text)) bonus += 60;
  if (/(endless|runner|running|dash|slope)/i.test(text)) bonus += 50;
  if (/(merge|puzzle|2048|tetris)/i.test(text)) bonus += 40;
  if (/(football|soccer|sports)/i.test(text)) bonus += 30;
  return bonus;
}

/**
 * Revenue-first ordering scoring function (V9 spec §3.2).
 * 1. Monetized source first (gamemonetize)
 * 2. Category demand weight (school-safe: puzzle first, then sports, agility, .io)
 * 3. Session-depth weight
 * 4. Existing featured flag, then stable catalog order
 */
export function scoreGame(g, index = 0) {
  let s = 0;
  if (MONETIZED_SOURCES.has(g.source)) s += 100000;

  let maxCat = 0;
  for (const c of g.categories || []) {
    const w = CATEGORY_WEIGHTS[c] ?? DEFAULT_CAT_WEIGHT;
    if (w > maxCat) maxCat = w;
  }
  s += (maxCat || DEFAULT_CAT_WEIGHT);
  s += sessionDepthBonus(g);
  if (isHorror(g)) s -= 50000;
  if (g.featured) s += 20;
  s -= (index ?? 0) * 0.001;
  return s;
}

/**
 * Merged catalog accessor — orders all games revenue-first without dropping any.
 */
function mergeCatalogs(primary, extra) {
  const combined = [...extra, ...primary];
  const seenSlugs = new Set();
  const seenTitles = new Set();
  const raw = [];
  for (const g of combined) {
    const t = normTitle(g.title);
    if (seenSlugs.has(g.slug) || seenTitles.has(t)) continue;
    seenSlugs.add(g.slug);
    seenTitles.add(t);
    raw.push(g);
  }
  return raw.sort((a, b) => scoreGame(b) - scoreGame(a));
}

export const allGames = mergeCatalogs(gdGames, gmGames);

/** Join the Astro base path with a site-relative path. */
export function u(path = '') {
  const base = import.meta.env.BASE_URL || '/';
  return (base.endsWith('/') ? base : base + '/') + path.replace(/^\//, '');
}

export const gameUrl = (g) => u(`games/${g.slug}/`);

const hasCat = (g, cats) => (g.categories || []).some((c) => cats.includes(c));
const text = (g) => `${g.title} ${g.instructions} ${(g.tags || []).join(' ')}`;

/**
 * Builds the 12-tile Featured mosaic per spec §3.3:
 * - GM-led within school-safe categories (puzzle first — CP holds 9 GM puzzle titles — then sports/agility/.io)
 * - Both 2x2 hero tiles (indices 0 and 5) are strongest landscape GM titles
 * - Exactly 12 tiles
 */
export function buildFeatured(games) {
  const gmSafe = games.filter((g) => MONETIZED_SOURCES.has(g.source) && !isHorror(g));
  const isLandscape = (g) => (g.width / g.height) >= 1.25;

  // Slot 0: strongest landscape GM puzzle title
  const hero0 = gmSafe.find((g) => isLandscape(g) && (g.categories || []).includes('Puzzle'));
  // Slot 5: strongest landscape GM sports / .io / agility title
  const hero5 = gmSafe.find(
    (g) => g !== hero0 && isLandscape(g) && (g.categories || []).some((c) => ['Sports', 'Football', '.IO', 'Agility'].includes(c)),
  );

  const picked = new Set([hero0, hero5].filter(Boolean));
  const slots = new Array(12);
  slots[0] = hero0;
  slots[5] = hero5;

  const remainingSlots = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11];
  let rIdx = 0;
  for (const g of gmSafe) {
    if (rIdx >= remainingSlots.length) break;
    if (!picked.has(g)) {
      picked.add(g);
      slots[remainingSlots[rIdx++]] = g;
    }
  }

  // Fallback if GM games < 12 (CP has 17 so this won't happen, but good for safety)
  if (rIdx < remainingSlots.length) {
    for (const g of games) {
      if (rIdx >= remainingSlots.length) break;
      if (!picked.has(g)) {
        picked.add(g);
        slots[remainingSlots[rIdx++]] = g;
      }
    }
  }

  return slots;
}

/** Named shelves used by the home page and the hub pages. */
export const shelves = {
  featured: () => buildFeatured(allGames),
  newGames: () => allGames.slice(-12),
  popular: () => [...allGames].slice(0, 36),
  chromebook: () => [...allGames].slice(0, 36),
  math: () => {
    const mathCatEdu = ['Educational', 'Quiz'];
    const mathCatPuzzle = [
      'Puzzle',
      'Merge',
      'Match-3',
      'Cards',
      'Mahjong & Connect',
      'Boardgames',
      'Educational',
      'Quiz',
    ];
    const mathRegex = /2048|math|number|count|merge|quiz|trivia|sudoku|calc/i;
    const strict = allGames.filter((g) => {
      const cats = g.categories || [];
      const tags = g.tags || [];
      if (hasCat(g, mathCatEdu)) return true;
      if (hasCat(g, mathCatPuzzle)) {
        if (mathRegex.test(g.title) || tags.some((t) => mathRegex.test(t))) return true;
      }
      return false;
    });
    if (strict.length < 8) {
      const strictSlugs = new Set(strict.map((g) => g.slug));
      const relaxed = allGames.filter((g) => {
        if (strictSlugs.has(g.slug)) return true;
        const cats = g.categories || [];
        const tags = g.tags || [];
        if (cats.includes('Merge')) return true;
        if (/2048|merge/i.test(g.title) || tags.some((t) => /2048|merge/i.test(t))) return true;
        return false;
      });
      return relaxed;
    }
    return strict;
  },
  driving: () =>
    allGames.filter(
      (g) =>
        hasCat(g, ['Racing & Driving']) &&
        !['float-for-brainrots', 'boombitz-bomb-chips'].includes(g.slug),
    ),
  puzzle: () => allGames.filter((g) => hasCat(g, ['Puzzle', 'Merge', 'Match-3'])),
  brain: () => {
    const pureBrainCats = ['Strategy', 'Educational', 'Cards', 'Boardgames', 'Quiz'];
    return allGames.filter(
      (g) =>
        hasCat(g, pureBrainCats) ||
        /\b(chess|logic|memory|brain)\b/i.test(g.title) ||
        (g.tags || []).some((t) => /\b(chess|logic|memory|brain)\b/i.test(t)),
    );
  },
  sports: () => allGames.filter((g) => hasCat(g, ['Sports', 'Football'])),
  agility: () => allGames.filter((g) => hasCat(g, ['Agility'])),
  io: () => allGames.filter((g) => hasCat(g, ['.IO'])),
  twoPlayer: () =>
    allGames.filter((g) => /2 ?player|two player|multiplayer|1 ?vs ?1|versus|2players|co-op/i.test(text(g))),
  classroom: () => {
    const picks = [
      ...shelves.math().slice(0, 8),
      ...shelves.puzzle().slice(0, 6),
      ...shelves.brain().slice(0, 5),
      ...shelves.agility().slice(0, 6),
      ...shelves.sports().slice(0, 4),
      ...shelves.twoPlayer().slice(0, 3),
    ];
    return [...new Map(picks.map((g) => [g.slug, g])).values()];
  },
  breaks: () => {
    const picks = [
      ...shelves.featured(),
      ...shelves.agility().slice(0, 8),
      ...shelves.io().slice(0, 5),
      ...shelves.puzzle().slice(0, 6),
      ...shelves.sports().slice(0, 4),
    ];
    return [...new Map(picks.map((g) => [g.slug, g])).values()].slice(0, 36);
  },
};

/** Related games: (1) same primary category, (2) shared tags count, (3) revenue-first score (spec C7) */
export function relatedGames(game, n = 6) {
  const primaryCat = (game.categories && game.categories[0]) || '';
  const gameTags = game.tags || [];
  const scored = allGames
    .filter((g) => g.slug !== game.slug)
    .map((g) => {
      const sameCat = (g.categories && g.categories[0] === primaryCat) ? 1 : 0;
      const sharedTags = (g.tags || []).filter((t) => gameTags.includes(t)).length;
      const score = scoreGame(g);
      return { g, sameCat, sharedTags, score };
    })
    .sort((a, b) => {
      if (b.sameCat !== a.sameCat) return b.sameCat - a.sameCat;
      if (b.sharedTags !== a.sharedTags) return b.sharedTags - a.sharedTags;
      return b.score - a.score;
    });
  return scored.slice(0, n).map((s) => s.g);
}

export function gameFaqs(game) {
  return [
    {
      q: `Is ${game.title} free to play?`,
      a: `Yes — ${game.title} is free on ClassPlay, like every game here. It opens in a regular browser tab with no downloads, no installs and no account, so it is ready the moment the page loads.`,
    },
    {
      q: `Do I need to download or sign up?`,
      a: `No downloads and no sign-up. ClassPlay runs entirely in Chrome or any modern browser tab, keeping student devices clean and secure.`,
    },
    {
      q: `Does ${game.title} work on a school Chromebook?`,
      a: `Yes. ClassPlay games are picked to run well on school Chromebooks: they load in Chrome, ask for very little from the hardware, and use simple keyboard, mouse or touch controls. Nothing needs to be installed first.`,
    },
    {
      q: `Is ${game.title} appropriate for the classroom?`,
      a: `ClassPlay only lists games we would be comfortable seeing on a classroom screen — no shooters, no horror, no zombie titles. Every game page shows its category, a plain-language description and the controls, so a teacher or parent can see exactly what it is before anyone presses play.`,
    },
  ];
}

/**
 * Cross-shelf deduplication for home pages (B2):
 * - Process shelves in page order
 * - A game shown in 2 earlier home shelves is skipped
 * - No two home shelves may share more than 40% of the smaller shelf
 */
export function buildHomeShelves(shelfSpecs) {
  const appearances = new Map();
  const completed = [];

  for (const spec of shelfSpecs) {
    const selected = [];
    const pool = spec.pool || [];
    const max = spec.max || 10;

    for (const game of pool) {
      if (selected.length >= max) break;
      const count = appearances.get(game.slug) || 0;
      if (count >= 2) continue;
      if (selected.some((s) => s.slug === game.slug)) continue;

      let violates = false;
      for (const prev of completed) {
        let inter = 0;
        for (const pg of prev.games) {
          if (pg.slug === game.slug || selected.some((s) => s.slug === pg.slug)) {
            inter++;
          }
        }
        const smaller = Math.min(prev.games.length, max);
        if (smaller > 0 && inter / smaller > 0.40) {
          violates = true;
          break;
        }
      }

      if (!violates) {
        selected.push(game);
      }
    }

    // Backfill from pool if needed without exceeding count 2 or 40% overlap
    if (selected.length < Math.min(max, pool.length)) {
      for (const game of pool) {
        if (selected.length >= max) break;
        const count = appearances.get(game.slug) || 0;
        if (count >= 2) continue;
        if (selected.some((s) => s.slug === game.slug)) continue;

        let violates = false;
        for (const prev of completed) {
          let inter = 0;
          for (const pg of prev.games) {
            if (pg.slug === game.slug || selected.some((s) => s.slug === pg.slug)) {
              inter++;
            }
          }
          const smaller = Math.min(prev.games.length, selected.length + 1);
          if (smaller > 0 && inter / smaller > 0.40) {
            violates = true;
            break;
          }
        }
        if (!violates) {
          selected.push(game);
        }
      }
    }

    for (const g of selected) {
      appearances.set(g.slug, (appearances.get(g.slug) || 0) + 1);
    }
    completed.push({ name: spec.name, games: selected });
  }

  return completed;
}

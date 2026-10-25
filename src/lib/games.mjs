import gdGames from '../data/games.json';
import gmGames from '../data/games-gm.json';

export { gdGames, gmGames };

const normTitle = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Merged catalog accessor — the single place pages/components read games from.
 * The data files hold the ClassPlay subset only (see scripts/filter-catalog.mjs):
 * GD games keep their order, GM games are interleaved (1 after every 4 GD
 * games), and duplicates lose to GD. Both files are ordered
 * educational-leaning first, so every shelf leads with thinking games.
 */
function mergeCatalogs(primary, extra) {
  const seenSlugs = new Set();
  const seenTitles = new Set();
  const keep = (g) => {
    const t = normTitle(g.title);
    if (seenSlugs.has(g.slug) || seenTitles.has(t)) return false;
    seenSlugs.add(g.slug);
    seenTitles.add(t);
    return true;
  };
  const out = [];
  let j = 0;
  primary.forEach((g, i) => {
    if (keep(g)) out.push(g);
    if ((i + 1) % 4 === 0 && j < extra.length) {
      const e = extra[j++];
      if (keep(e)) out.push(e);
    }
  });
  while (j < extra.length) {
    const e = extra[j++];
    if (keep(e)) out.push(e);
  }
  return out;
}

export const allGames = mergeCatalogs(gdGames, gmGames);

/** Join the Astro base path with a site-relative path. */
export function u(path = '') {
  const base = import.meta.env.BASE_URL || '/';
  return (base.endsWith('/') ? base : base + '/') + path.replace(/^\//, '');
}

export const gameUrl = (g) => u(`games/${g.slug}/`);

const hasCat = (g, cats) => g.categories.some((c) => cats.includes(c));
const text = (g) => `${g.title} ${g.instructions} ${g.tags.join(' ')}`;

/** Named shelves used by the home page and the hub pages. */
export const shelves = {
  featured: () => allGames.filter((g) => g.featured),
  popular: () => [...allGames].slice(0, 36),
  chromebook: () => [...allGames].slice(0, 36),
  math: () =>
    allGames.filter(
      (g) =>
        hasCat(g, ['Puzzle', 'Merge', 'Educational', 'Match-3', 'Cards', 'Mahjong & Connect', 'Boardgames', 'Quiz']) ||
        /2048|math|number|merge|count/i.test(g.title),
    ),
  puzzle: () => allGames.filter((g) => hasCat(g, ['Puzzle', 'Merge', 'Match-3'])),
  brain: () =>
    allGames.filter(
      (g) =>
        hasCat(g, ['Puzzle', 'Strategy', 'Educational', 'Cards', 'Boardgames', 'Quiz', 'Merge']) ||
        /chess|memory|logic|brain/i.test(g.title),
    ),
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

export function relatedGames(game, n = 6) {
  const scored = allGames
    .filter((g) => g.slug !== game.slug)
    .map((g) => ({
      g,
      score:
        g.categories.filter((c) => game.categories.includes(c)).length * 2 +
        g.tags.filter((t) => game.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.g);
}

export function gameFaqs(game) {
  return [
    {
      q: `Is ${game.title} free to play?`,
      a: `Yes — ${game.title} is free on ClassPlay, like every game here. It opens in a regular browser tab with no downloads, no installs and no account, so it is ready the moment the page loads.`,
    },
    {
      q: `Can I play ${game.title} on a school Chromebook?`,
      a: `Yes. ClassPlay games are picked to run well on school Chromebooks: they load in Chrome, ask for very little from the hardware, and use simple keyboard, mouse or touch controls. Nothing needs to be installed first.`,
    },
    {
      q: `Is ${game.title} appropriate for the classroom?`,
      a: `ClassPlay only lists games we would be comfortable seeing on a classroom screen — no shooters, no horror, no zombie titles. Every game page shows its category, a plain-language description and the controls, so a teacher or parent can see exactly what it is before anyone presses play.`,
    },
    {
      q: `Does ${game.title} work on phones and tablets?`,
      a: game.mobile
        ? `Yes. ${game.title} supports touch controls, so it works on phones and tablets as well as computers. For the biggest screen, use the fullscreen button above the game.`
        : `${game.title} plays in any modern mobile browser, but it is most comfortable with a keyboard and a larger screen, such as a Chromebook or laptop. The fullscreen button above the game gives it more room.`,
    },
  ];
}

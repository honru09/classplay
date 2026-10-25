#!/usr/bin/env node
/**
 * ClassPlay — GameMonetize catalog generator.
 *
 * Pulls the public GameMonetize feed (paginated), selects ~60 quality titles
 * across the site's category families, normalizes them into the same record
 * shape as src/data/games.json, and writes src/data/games-gm.json.
 * src/lib/games.mjs merges the two files into one catalog (GD wins on
 * duplicate titles/slugs).
 *
 * Usage:  node scripts/fetch-gm.mjs        (run AFTER fetch-games.mjs —
 *          dedupe is checked against the current src/data/games.json)
 * No API keys or accounts are required — the feed is public.
 *
 * Revenue attribution is DOMAIN-based: GameMonetize credits plays by the
 * embedding domain (classplay.online must be registered in the publisher
 * account), so embed URLs are used verbatim from the feed — there is no
 * publisher ID to append. The feed `url` serves the game wrapped in the
 * GameMonetize SDK/ad layer (verified: HTTP 200, text/html, no
 * X-Frame-Options / CSP frame-ancestors headers).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SITE_BASE = 'https://classplay.online';
const OUT = new URL('../src/data/games-gm.json', import.meta.url).pathname;
const GD_FILE = new URL('../src/data/games.json', import.meta.url).pathname;

const GM_FEED = (page) => `https://gamemonetize.com/feed.php?format=0&num=200&page=${page}`;
const FEED_PAGES = 5; // up to 1,000 titles of pool

// --- text helpers (mirrored from fetch-games.mjs) ---------------------------
function decodeEntities(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function cleanText(s = '', max = 900) {
  const t = decodeEntities(String(s))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (end > max * 0.4 ? cut.slice(0, end + 1) : cut).trim();
}
function rewriteDescription(game) {
  let d = cleanText(game.description, 420);
  d = d.replace(/\s*(Play (it |this )?online[^.]*\.?|Play now[^.]*\.?)\s*$/i, '').trim();
  if (d && !/[.!?]$/.test(d)) d += '.';
  const genre = (game.categories[0] || 'browser').toLowerCase();
  return `${d} Play ${game.title} free on ClassPlay — a ${genre} game that runs right in your browser with no downloads or sign-ups, on Chromebooks, laptops and phones.`.trim();
}
function slugify(title) {
  return title.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function normTitle(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'ClassPlay data builder' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// --- selection policy ---------------------------------------------------------
// GM category -> site family. Labels deliberately reuse the GD category names
// so the shelves in src/lib/games.mjs pick GM games up unchanged.
const FAMILIES = [
  { label: 'Racing & Driving', gm: ['Racing'], n: 10 },
  { label: 'Agility', gm: ['Arcade', 'Hypercasual'], n: 14, runnerFirst: true },
  { label: 'Puzzle', gm: ['Puzzle'], n: 12 },
  { label: '.IO', gm: ['.IO', 'Multiplayer'], n: 6 },
  { label: 'Sports', gm: ['Sports', 'Soccer'], n: 8 },
  { label: null, gm: ['Shooting', 'Action'], n: 10 }, // label per-game below
];
const LABEL_BY_GM_CAT = { Shooting: 'Shooter', Action: 'Battle' };
const SKIP_CATS = new Set(['Girls', 'Boys', 'Cooking']);
const UNSAFE = /kiss|dating|dress[ -]?up|make ?up|makeover|pregnan|barbie/i;
const RUNNER = /run|rush|dash|slope|tunnel|parkour|subway|jump|dodge|obby|escape|temple/i;

async function main() {
  // ---- existing GD catalog (dedupe baseline) --------------------------------
  const gdGames = JSON.parse(readFileSync(GD_FILE, 'utf8'));
  const gdTitles = new Set(gdGames.map((g) => normTitle(g.title)));
  const gdSlugs = new Set(gdGames.map((g) => g.slug));

  // ---- pull GM feed -----------------------------------------------------------
  const raw = [];
  for (let p = 1; p <= FEED_PAGES; p++) {
    const page = await fetchJson(GM_FEED(p));
    if (!Array.isArray(page) || page.length === 0) break;
    raw.push(...page);
    if (page.length < 200) break;
  }
  console.log(`GM feed: ${raw.length} games`);

  // ---- normalize + quality gate ------------------------------------------------
  const pool = raw
    .filter((g) => g && g.title && g.url && g.thumb)
    .map((g) => {
      const title = decodeEntities(g.title).trim();
      return {
        title,
        slug: slugify(title),
        gmCategory: decodeEntities(g.category || ''),
        embedBase: g.url,
        thumb: g.thumb,
        tags: g.tags ? String(g.tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
        description: g.description || '',
        instructions: g.instructions || '',
        width: +g.width || 800,
        height: +g.height || 600,
      };
    })
    .filter(
      (g) =>
        cleanText(g.description).length >= 60 &&
        !SKIP_CATS.has(g.gmCategory) &&
        !UNSAFE.test(`${g.title} ${g.tags.join(' ')}`),
    );

  // ---- family fill (feed order = popularity order) ------------------------------
  const seenTitles = new Set();
  const seenSlugs = new Set();
  const skippedDupes = [];
  const picked = [];
  const take = (g, label) => {
    const key = normTitle(g.title);
    if (gdTitles.has(key) || gdSlugs.has(g.slug)) {
      skippedDupes.push(`${g.title} (already on GD)`);
      return false;
    }
    if (seenTitles.has(key) || seenSlugs.has(g.slug)) return false;
    seenTitles.add(key);
    seenSlugs.add(g.slug);
    picked.push({ ...g, label });
    return true;
  };

  for (const fam of FAMILIES) {
    let candidates = pool.filter((g) => fam.gm.includes(g.gmCategory));
    if (fam.runnerFirst) {
      // stable sort: runner-signal titles first, feed order preserved otherwise
      candidates = candidates
        .map((g, i) => ({ g, i, r: RUNNER.test(`${g.title} ${g.tags.join(' ')}`) ? 0 : 1 }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map((x) => x.g);
    }
    let added = 0;
    for (const g of candidates) {
      if (added >= fam.n) break;
      const label = fam.label ?? LABEL_BY_GM_CAT[g.gmCategory] ?? 'Action';
      if (take(g, label)) added++;
    }
    console.log(`family ${fam.label ?? fam.gm.join('/')}: +${added}`);
  }

  // ---- finalize ------------------------------------------------------------------
  const finalGames = picked.map((g) => {
    const pageUrl = `${SITE_BASE}/games/${g.slug}/`;
    return {
      title: g.title,
      slug: g.slug,
      source: 'gamemonetize',
      embedUrl: g.embedBase, // verbatim — attribution is by embedding domain
      pageUrl,
      thumb: g.thumb,
      categories: [g.label],
      tags: g.tags.slice(0, 8),
      description: rewriteDescription({ title: g.title, description: g.description, categories: [g.label] }),
      instructions: cleanText(g.instructions, 700),
      width: g.width,
      height: g.height,
      mobile: true,
      featured: false,
      topMatch: null,
    };
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(finalGames, null, 2));
  const byCat = {};
  for (const g of finalGames) byCat[g.categories[0]] = (byCat[g.categories[0]] || 0) + 1;
  console.log(`Wrote ${finalGames.length} GM games -> ${OUT}`);
  console.log(`  by category: ${JSON.stringify(byCat)}`);
  if (skippedDupes.length) {
    console.log(`Skipped duplicates of GD titles (${skippedDupes.length}):`);
    [...new Set(skippedDupes)].forEach((t) => console.log('  ' + t));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

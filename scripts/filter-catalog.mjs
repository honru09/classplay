#!/usr/bin/env node
/**
 * ClassPlay — classroom catalog filter.
 *
 * Step 3 of the data refresh flow (after fetch-games.mjs and fetch-gm.mjs,
 * which pull the full licensed feeds). This script turns the full catalog in
 * src/data/games.json + src/data/games-gm.json into the ClassPlay subset:
 *
 *   1. Classroom-safe exclusion: no Shooter-category games, no
 *      zombie/horror/scary/ghost-tagged titles, no gun/weapon/fps tags,
 *      no fighting/brawl Battle titles, no "steal" titles.
 *   2. Selection of ~80 games favoring puzzle, math/number, quiz, strategy
 *      and gentle arcade, with per-family caps so no single genre floods
 *      the catalog.
 *   3. Educational-leaning games are ordered first in each file and the
 *      top 12 overall are flagged `featured` (the home page leads with
 *      thinking games, not racers — the opposite emphasis to TabArcade).
 *   4. Per-domain attribution rewrite: pageUrl and the GD embed's
 *      gd_sdk_referrer_url are repointed at https://classplay.online
 *      (GameMonetize attribution is domain-based; its embed URLs are
 *      left untouched). Descriptions are re-branded to ClassPlay.
 *
 * Usage:  node scripts/filter-catalog.mjs
 * Idempotent: safe to re-run on already-filtered data.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SITE_BASE = 'https://classplay.online';
const TARGET_TOTAL = 80;

const read = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const write = (f, data) =>
  writeFileSync(new URL(`../src/data/${f}`, import.meta.url), JSON.stringify(data, null, 2) + '\n');

/* ---------------- classroom-safe exclusion ---------------- */
const BAD_TAGS = new Set([
  'zombie', 'horror', 'scary', 'ghost', 'shooting', 'shoot', 'shooter',
  "shoot 'em up", 'shoot-em-up', 'first person shooter', 'gun', 'weapons',
  'kill', 'killer', 'fighting',
]);
const BAD_TEXT = /zombie|sniper|horror|scary|undead|steal/i;

function exclusionReason(g) {
  if (g.categories.includes('Shooter')) return 'shooter category';
  const tags = g.tags.map((t) => t.toLowerCase());
  // On sports titles, "shoot" tags mean kicking a ball, not a weapon.
  const isSports = g.categories.includes('Sports') || g.categories.includes('Football');
  const badTag = tags.find(
    (t) => BAD_TAGS.has(t) && !(isSports && (t === 'shoot' || t === 'shoot-em-up')),
  );
  if (badTag) return `tag: ${badTag}`;
  if (BAD_TEXT.test(g.title)) return 'title keyword';
  if (g.categories.includes('Battle')) {
    // Battle shelf is fighting/battleroyale/tank titles — not classroom fare.
    // (Gentle head-to-head play lives in Sports and .IO, which we keep.)
    return 'battle category';
  }
  return null;
}

/* ---------------- family scoring ---------------- */
const BRAIN_CATS = ['Puzzle', 'Merge', 'Match-3', 'Educational', 'Quiz', 'Strategy'];
function familyOf(g) {
  const c = g.categories;
  if (c.some((x) => BRAIN_CATS.includes(x)) || /2048|math|number|merge|count/i.test(g.title)) return 'brain';
  if (c.includes('Sports') || c.includes('Football')) return 'sports';
  if (c.includes('Agility')) return 'agility';
  if (c.includes('.IO')) return 'io';
  if (c.includes('Racing & Driving')) return 'racing';
  return 'other';
}
const FAMILY_SCORE = { brain: 100, sports: 70, agility: 60, io: 55, other: 50, racing: 45 };
const FAMILY_CAPS = { brain: 34, sports: 12, agility: 14, io: 10, racing: 9, other: 99 };

function main() {
  const files = [
    { name: 'games.json', games: read('games.json') },
    { name: 'games-gm.json', games: read('games-gm.json') },
  ];
  const pool = files.flatMap((f) => f.games.map((g) => ({ g, file: f.name })));
  console.log(`Pool: ${pool.length} games`);

  const excluded = [];
  const eligible = [];
  for (const item of pool) {
    const reason = exclusionReason(item.g);
    if (reason) excluded.push(`${item.g.slug} (${reason})`);
    else eligible.push(item);
  }
  console.log(`Excluded ${excluded.length}:`);
  excluded.forEach((e) => console.log('  - ' + e));

  // Score + stable sort (feed order breaks ties), then apply family caps.
  const scored = eligible
    .map((item, i) => ({ ...item, i, fam: familyOf(item.g), score: FAMILY_SCORE[familyOf(item.g)] }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  const counts = {};
  const selected = [];
  for (const item of scored) {
    if (selected.length >= TARGET_TOTAL) break;
    if ((counts[item.fam] || 0) >= FAMILY_CAPS[item.fam]) continue;
    counts[item.fam] = (counts[item.fam] || 0) + 1;
    selected.push(item);
  }
  console.log(`Selected ${selected.length}:`, counts);

  // Featured = top 12 overall (educational-leaning by construction).
  const featuredSlugs = new Set(selected.slice(0, 12).map((s) => s.g.slug));
  const globalRank = new Map(selected.map((s, r) => [s.g.slug, r]));

  // Rewrite + regroup per file, each file sorted by global rank so the
  // merged catalog (GD first, GM interleaved) also leads with thinking games.
  for (const f of files) {
    const mine = selected
      .filter((s) => s.file === f.name)
      .sort((a, b) => globalRank.get(a.g.slug) - globalRank.get(b.g.slug))
      .map(({ g }) => {
        const pageUrl = `${SITE_BASE}/games/${g.slug}/`;
        let embedUrl = g.embedUrl;
        if (embedUrl.includes('gd_sdk_referrer_url=')) {
          embedUrl = embedUrl.replace(
            /gd_sdk_referrer_url=[^&]+/,
            `gd_sdk_referrer_url=${encodeURIComponent(pageUrl)}`,
          );
        }
        return {
          ...g,
          embedUrl,
          pageUrl,
          description: g.description.replaceAll('TabArcade', 'ClassPlay'),
          featured: featuredSlugs.has(g.slug),
        };
      });
    write(f.name, mine);
    console.log(`${f.name}: ${mine.length} games`);
  }
  console.log('Featured:', [...featuredSlugs].join(', '));
}

main();

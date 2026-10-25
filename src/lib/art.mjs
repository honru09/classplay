import { u } from './games.mjs';

/**
 * Hero "pop-out" key art: AI-generated character art with the background
 * keyed out to real transparency (public/art/<slug>.webp). Only games in
 * the ClassPlay subset are listed — art for excluded titles (shooters,
 * fighting games) was removed along with the games.
 */
const ART_SLUGS = new Set([
  'snow-rider-neo',
  'geometry-vibes-2-online',
  'cube-snake-2048',
  'tennis-masters-2026',
  'color-sort-party',
]);

export const artUrl = (game) => (game && ART_SLUGS.has(game.slug) ? u(`art/${game.slug}.webp`) : null);

/** Per-category accent color driving card glows, chips and stage lighting.
 *  Deep, saturated tones chosen to stay readable on the light theme. */
const ACCENTS = {
  'Racing & Driving': '#ea580c',
  Agility: '#65a30d',
  Puzzle: '#9333ea',
  Merge: '#9333ea',
  'Match-3': '#9333ea',
  '.IO': '#0891b2',
  Sports: '#16a34a',
  Football: '#16a34a',
  Adventure: '#d97706',
  Casual: '#db2777',
  Simulation: '#0284c7',
  Strategy: '#4f46e5',
  Educational: '#0d9488',
  Quiz: '#0d9488',
};

export const accentFor = (game) => ACCENTS[game?.categories?.[0]] || '#b45309';

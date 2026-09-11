/**
 * Writes neutral SVG placeholders into public/images/placeholders/ so the
 * skeleton has something to show before real photos arrive.
 *   node scripts/make-placeholders.mjs
 *
 * Pieces have no placeholder: a piece with a 360° spin shows its own first
 * frame, and a piece with nothing shows an empty plate. A stand-in pot would
 * only ever be mistaken for real work.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const PAPER = '#f6f4ef';
const PANEL = '#e4e0d6';
const INK = '#232120';
const SOFT = '#8b867c';

mkdirSync('public/images/placeholders', { recursive: true });
const out = (name, svg) => writeFileSync(`public/images/placeholders/${name}`, svg);

out(
  'portrait.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="${PANEL}"/>
  <circle cx="400" cy="400" r="130" fill="none" stroke="${SOFT}" stroke-width="3"/>
  <path d="M180 1000c0-190 100-330 220-330s220 140 220 330z" fill="none" stroke="${SOFT}" stroke-width="3"/>
  <text x="400" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${SOFT}">portrait to come</text>
</svg>`
);

out(
  'post-1.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="${PANEL}"/>
  <rect x="60" y="60" width="1480" height="780" fill="none" stroke="${SOFT}" stroke-width="2"/>
  <text x="800" y="470" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="${SOFT}">photograph to come</text>
</svg>`
);

out(
  'og.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="80" y="200" width="64" height="2" fill="${INK}"/>
  <text x="80" y="300" font-family="Georgia, serif" font-size="66" fill="${INK}">Lauren Becherer</text>
  <text x="80" y="374" font-family="Georgia, serif" font-size="66" font-style="italic" fill="${SOFT}">Pottery</text>
</svg>`
);

console.log('wrote 3 placeholders to public/images/placeholders/');

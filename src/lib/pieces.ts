/**
 * One ordering for the whole site.
 *
 * Every page that lists pieces sorts through here, so the wall, the home page,
 * the shop, and the "more work" strip agree. Astro's content loader gives no
 * stable order of its own, and several pieces are usually photographed in a
 * single session and share a date, so without an explicit tie-break the order
 * of the wall could change between builds.
 */
import type { CollectionEntry } from 'astro:content';
import { spinLibrary } from './spins';

type Piece = CollectionEntry<'pieces'>;

/**
 * Newest first, with featured pieces pinned to the front. Pieces made on the
 * same day fall back to `order` (lowest first), then to the title, so the
 * result is the same on every build.
 */
export function comparePieces(a: Piece, b: Piece): number {
  if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;

  const byDate = b.data.date.valueOf() - a.data.date.valueOf();
  if (byDate !== 0) return byDate;

  const ao = a.data.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.data.order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;

  return a.data.title.localeCompare(b.data.title, 'en');
}

export function sortPieces(pieces: Piece[]): Piece[] {
  return pieces.slice().sort(comparePieces);
}

/**
 * The pieces a visitor should be able to see and buy.
 *
 * One rule, used by the home page, the wall and the shop, so a piece cannot be
 * live in one place and missing from another. A sold piece drops off the site;
 * `showInPortfolio` is the manual switch for anything not ready to be shown.
 */
export function listablePieces(pieces: Piece[]): Piece[] {
  return sortPieces(pieces.filter((p) => p.data.showInPortfolio && p.data.status !== 'sold'));
}

/** Hue of a piece's glaze, in degrees, from its sampled mid tone. */
function hueOf(p: Piece): number {
  const rec = spinLibrary.find((s) => s.id === p.data.spin);
  const hex = rec?.palette?.mid;
  if (!hex) return 0;
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  let h: number;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Largest stride below n that shares no factor with it, so the walk visits every piece. */
function coprimeStride(n: number): number {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  for (let s = Math.max(2, Math.round(n * 0.618)); s > 1; s--) if (gcd(s, n) === 1) return s;
  return 1;
}

/**
 * Break up the colour clumps on a wall of pieces.
 *
 * The glazes are not evenly spread around the wheel: most of them sit in a narrow band of
 * tans and olives, with a handful of greens and one blue. Sorting by hue therefore makes the
 * clumping worse, not better, and shuffling randomly would rearrange the wall on every build.
 * Ranking by hue and then walking that ranking with a stride coprime to the count visits
 * every piece exactly once while putting a large hue gap between neighbours, and gives the
 * same answer every time.
 */
export function spreadByHue(pieces: Piece[]): Piece[] {
  const n = pieces.length;
  if (n < 4) return pieces;
  const ranked = pieces.slice().sort((a, b) => hueOf(a) - hueOf(b) || comparePieces(a, b));
  const stride = coprimeStride(n);
  const out: Piece[] = [];
  for (let i = 0, k = 0; i < n; i++, k = (k + stride) % n) out.push(ranked[k]);
  return out;
}

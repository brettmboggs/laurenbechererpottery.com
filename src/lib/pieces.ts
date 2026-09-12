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

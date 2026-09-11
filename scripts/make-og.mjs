/**
 * Renders public/images/og.png (1200×630) — the image shown when the site is
 * shared on iMessage, Instagram DMs, Facebook, and so on. Social platforms do
 * not accept SVG, so this bakes a PNG.
 *
 *   node scripts/make-og.mjs
 *
 * The pot in it is a real photograph, pulled from the imported spin frames,
 * so the card shows actual work rather than an illustration of it. Run
 * `npm run spins` first; falls back to a plain typographic card if no frames
 * have been imported yet.
 */
import sharp from 'sharp';
import { writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';

const PAPER = '#f6f4ef';
const INK = '#232120';
const SOFT = '#55514a';

/**
 * Show whichever piece leads the site, so the social card and the home page
 * hero never drift apart. Read straight from the piece files rather than
 * hardcoding an id here: two lists of the same thing is one too many.
 */
function heroSpinId() {
  const dir = 'src/content/pieces';
  if (!existsSync(dir)) return null;
  const field = (text, name) => text.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1].trim();
  const pieces = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(`${dir}/${f}`, 'utf8');
      return {
        spin: field(text, 'spin'),
        featured: field(text, 'featured') === 'true',
        order: Number(field(text, 'order') ?? Number.MAX_SAFE_INTEGER),
        date: field(text, 'date') ?? '',
      };
    })
    .filter((p) => p.spin);

  // Same rule as src/lib/pieces.ts: featured first, then newest, then order.
  pieces.sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      b.date.localeCompare(a.date) ||
      a.order - b.order
  );
  return pieces[0]?.spin ?? null;
}

let chosen = null;
if (existsSync('src/data/spins.json')) {
  const { spins } = JSON.parse(readFileSync('src/data/spins.json', 'utf8'));
  const heroId = heroSpinId();
  const ordered = [spins.find((s) => s.id === heroId), ...spins].filter(Boolean);
  for (const spin of ordered) {
    const path = `public${spin.base}/d/00.webp`;
    if (existsSync(path)) { chosen = path; break; }
  }
}

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <text x="80" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="66" fill="${INK}">Lauren Becherer</text>
  <text x="80" y="374" font-family="Georgia, 'Times New Roman', serif" font-size="66" font-style="italic" fill="${SOFT}">Pottery</text>
  <text x="82" y="440" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="4" fill="${SOFT}">WHEEL-THROWN STONEWARE, ONE PIECE AT A TIME</text>
  <rect x="80" y="200" width="64" height="2" fill="${INK}"/>
</svg>`;

const layers = [];
if (chosen) {
  const pot = await sharp(chosen).resize(470, 470, { fit: 'cover' }).toBuffer();
  layers.push({ input: pot, left: 650, top: 80 });
}

const png = await sharp(Buffer.from(text)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
writeFileSync('public/images/og.png', png);
console.log(
  `wrote public/images/og.png (${(png.length / 1024).toFixed(0)} KB)` +
    (chosen ? ` using ${chosen}` : ' — no spin frames found, typographic card only')
);

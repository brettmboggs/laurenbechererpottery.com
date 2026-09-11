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
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const PAPER = '#f6f4ef';
const INK = '#232120';
const SOFT = '#55514a';

// Prefer a piece whose glaze reads clearly at small sizes.
const preferred = ['stoneware-planter', 'bud-vase', 'celadon-cup', 'periwinkle-planter'];
let chosen = null;
if (existsSync('src/data/spins.json')) {
  const { spins } = JSON.parse(readFileSync('src/data/spins.json', 'utf8'));
  const order = spins.slice().sort((a, b) => preferred.indexOf(a.id) - preferred.indexOf(b.id));
  for (const spin of order) {
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

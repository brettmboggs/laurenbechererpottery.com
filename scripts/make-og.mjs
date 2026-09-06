/**
 * Renders public/images/og.png (1200×630) — the image shown when the site is shared
 * on Instagram DMs, iMessage, Facebook, etc. Social platforms don't accept SVG.
 *   node scripts/make-og.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9b3e6"/><stop offset=".35" stop-color="#f7c059"/><stop offset=".58" stop-color="#ffb577"/>
      <stop offset=".76" stop-color="#ff6b57"/><stop offset=".9" stop-color="#e0476b"/><stop offset="1" stop-color="#6b3f6e"/>
    </linearGradient>
    <radialGradient id="sun" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#fff6d8"/><stop offset=".6" stop-color="#f7c059"/><stop offset="1" stop-color="#f7c059" stop-opacity="0"/></radialGradient>
    <clipPath id="above"><rect x="0" y="0" width="1200" height="430"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#sky)"/>
  <circle cx="600" cy="400" r="190" fill="url(#sun)" clip-path="url(#above)"/>
  <rect x="0" y="430" width="1200" height="200" fill="#3e1f3c" opacity=".92"/>
  <rect x="0" y="430" width="1200" height="6" fill="#6b3f6e"/>
  <text x="600" y="520" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="64" fill="#fff7ee">Lauren Becherer Pottery</text>
  <text x="600" y="572" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#ffd2ad" letter-spacing="2">HANDMADE CERAMICS IN SUMMER-SUNSET HUES</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync('public/images/og.png', png);
console.log(`wrote public/images/og.png (${(png.length / 1024).toFixed(0)} KB)`);

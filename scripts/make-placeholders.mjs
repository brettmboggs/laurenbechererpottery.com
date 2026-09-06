/**
 * Writes simple sunset-gradient SVG placeholders into public/images/placeholders/
 * so the skeleton has something to show before real photos arrive.
 *   node scripts/make-placeholders.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const grad = (id, angle) => `<linearGradient id="${id}" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="#c9b3e6"/><stop offset=".3" stop-color="#f7c059"/><stop offset=".55" stop-color="#ffb577"/><stop offset=".75" stop-color="#ff6b57"/><stop offset=".9" stop-color="#e0476b"/><stop offset="1" stop-color="#6b3f6e"/></linearGradient>`;

const vase = (path, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs>${grad('g', 90)}</defs>
<rect width="800" height="1000" fill="url(#g)"/>
<ellipse cx="400" cy="860" rx="240" ry="34" fill="#3e1f3c" opacity=".25"/>
<path d="${path}" fill="#3e1f3c" opacity=".92"/>
<text x="400" y="960" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#fff7ee" opacity=".85">${label}</text></svg>`;

mkdirSync('public/images/placeholders', { recursive: true });
const out = (name, svg) => writeFileSync(`public/images/placeholders/${name}`, svg);

out('piece-1.svg', vase('M360 150h80l-8 90c90 40 150 130 150 250 0 160-80 340-182 360S218 650 218 490c0-120 60-210 150-250z', 'placeholder · bottle vase'));
out('piece-2.svg', vase('M250 380h300v300c0 90-60 160-150 160S250 770 250 680zM550 430h70c50 0 80 40 80 90s-30 90-80 90h-70v-50h60c25 0 40-15 40-40s-15-40-40-40h-60z', 'placeholder · mug'));
out('piece-3.svg', vase('M120 480h560c0 200-120 340-280 340S120 680 120 480z', 'placeholder · bowl'));
out('post-1.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs>${grad('g', 80)}</defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="800" cy="520" r="200" fill="#fff6d8" opacity=".9"/><rect y="640" width="1600" height="260" fill="#3e1f3c" opacity=".8"/></svg>`);
out('portrait.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs>${grad('g', 100)}</defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="400" cy="380" r="150" fill="#3e1f3c" opacity=".85"/><path d="M130 1000c0-220 120-380 270-380s270 160 270 380z" fill="#3e1f3c" opacity=".85"/><text x="400" y="80" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#fff7ee" opacity=".85">portrait placeholder</text></svg>`);
out('og.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs>${grad('g', 70)}</defs><rect width="1200" height="630" fill="url(#g)"/><text x="600" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#fff7ee">Lauren Becherer Pottery</text><text x="600" y="370" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#fff7ee" opacity=".9">Handmade ceramics in summer-sunset hues</text></svg>`);
console.log('wrote 6 placeholders to public/images/placeholders/');

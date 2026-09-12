/**
 * The paper the site is printed on.
 *
 *   node scripts/make-paper.mjs
 *
 * Writes public/images/paper.webp: a seamless tile of cold-press watercolour
 * paper, as light and shadow rather than as colour. It replaced a browser noise
 * filter whose grey specks read as dust on the screen.
 *
 * The surface is a height field — broad, faint mottling plus the fine rounded
 * tooth of cold-press paper — lit from above. The tile is a shadow map:
 * white where the surface faces the light, a warm brown where it turns away.
 * global.css multiplies it into the page background, where white changes
 * nothing. Near-white paper has almost no room to get lighter, so the relief is
 * carried by the shade, as it is on real paper; the page ground is lifted by the
 * average shade (printed below) so that, textured, it lands back on --paper.
 * Every octave repeats a whole number of times across the tile, so it tiles
 * without a seam.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/images/paper.webp');

const SIZE = 512; // shown at 512 CSS px; paper is soft, so 1x is enough
const SEED = 7;

// Deterministic hash for lattice gradients, so a rebuild gives the same paper.
const hash = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Periodic gradient noise: `cells` lattice cells across the tile, wrapping. */
function noise(cells, seed) {
  const grad = (ix, iy) => {
    const a = hash(((ix % cells) + cells) % cells, ((iy % cells) + cells) % cells, seed) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (px, py) => {
    const x = (px / SIZE) * cells;
    const y = (py / SIZE) * cells;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const dot = (ix, iy) => {
      const [gx, gy] = grad(ix, iy);
      return gx * (x - ix) + gy * (y - iy);
    };
    const u = fade(fx), v = fade(fy);
    const a = dot(x0, y0) + u * (dot(x0 + 1, y0) - dot(x0, y0));
    const b = dot(x0, y0 + 1) + u * (dot(x0 + 1, y0 + 1) - dot(x0, y0 + 1));
    return a + v * (b - a);
  };
}

/**
 * Periodic cellular noise: `cells` jittered points per side, wrapping. Returns
 * a dome over each point — 1 at the point, falling to 0 at the cell's edge —
 * which is the shape of cold-press tooth: rounded bumps packed irregularly.
 */
function domes(cells, seed) {
  const step = SIZE / cells;
  const pt = (cx, cy) => {
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    return [
      (cx + hash(wx, wy, seed)) * step,
      (cy + hash(wx, wy, seed + 1)) * step,
      0.6 + hash(wx, wy, seed + 2) * 0.4, // each bump its own height
    ];
  };
  return (px, py) => {
    const cx = Math.floor(px / step), cy = Math.floor(py / step);
    let best = Infinity, bh = 1;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const [x, y, h] = pt(cx + i, cy + j);
        const d = Math.hypot(px - x, py - y) / step;
        if (d < best) { best = d; bh = h; }
      }
    }
    const t = Math.max(0, 1 - best / 0.9);
    return t * t * (3 - 2 * t) * bh; // smooth shoulders, no crease at the edge
  };
}

// The tooth, at two sizes, with a little fine gradient noise so no two bumps
// have the same surface.
const tooth = [
  [domes(36, SEED), 1.0],
  [domes(90, SEED + 10), 0.3],
  [noise(64, SEED + 3), 0.2],
];

const height = new Float32Array(SIZE * SIZE);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let h = 0;
    for (const [n, w] of tooth) h += n(x, y) * w;
    height[y * SIZE + x] = h;
  }
}

// A light blur, wrapping at the edges, so the tooth reads as soft relief under
// diffuse light rather than as crisp specks.
for (let pass = 0; pass < 2; pass++) {
  const src = height.slice();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let acc = 0;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++)
          acc += src[((y + j + SIZE) % SIZE) * SIZE + ((x + i + SIZE) % SIZE)];
      height[y * SIZE + x] = acc / 9;
    }
  }
}

// Light from above and a touch to the left, low across the surface so the tooth
// throws shade. A strong diagonal gave every bump the same slant.
const at = (x, y) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
const shade = new Float32Array(SIZE * SIZE);
let sum = 0, sq = 0;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = at(x + 1, y) - at(x - 1, y);
    const dy = at(x, y + 1) - at(x, y - 1);
    const s = -(dx * 0.3 + dy * 0.95);
    shade[y * SIZE + x] = s;
    sum += s;
    sq += s * s;
  }
}
const mean = sum / shade.length;
const sd = Math.sqrt(sq / shade.length - mean * mean);

// Levels of shade per standard deviation of relief facing away from the light,
// and the depth of the broad mottling. Kept low: felt more than seen.
const SHADE = 2.2;
const MOTTLE = 1.5;
// Shade is warm, never grey: blue drops fastest, as in the linen.
const TINT = [1, 1.06, 1.35];

const broad = [noise(2, SEED + 20), noise(5, SEED + 21)];
const px = Buffer.alloc(SIZE * SIZE * 3);
let total = 0;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    const z = Math.max(-3, Math.min(3, (shade[i] - mean) / sd));
    const m = Math.max(0, Math.min(1, 0.5 + (broad[0](x, y) * 0.9 + broad[1](x, y) * 0.5)));
    const d = Math.max(0, -z) * SHADE + m * MOTTLE;
    total += d;
    for (let c = 0; c < 3; c++) px[i * 3 + c] = Math.round(255 - d * TINT[c]);
  }
}

const info = await sharp(px, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .webp({ quality: 92, effort: 6 })
  .toFile(out);
const avg = total / (SIZE * SIZE);
console.log(`paper.webp ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
console.log(`average shade ${avg.toFixed(1)} levels (red; green ×${TINT[1]}, blue ×${TINT[2]}) — lift --ground by this`);

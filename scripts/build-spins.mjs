#!/usr/bin/env node
/**
 * Import 360° spin assets from the photography project into the site.
 *
 *   node scripts/build-spins.mjs [--source ../] [--force]
 *
 * Reads pieces.json from the photography project, copies only the frame
 * directories that manifest approves, resizes them into the two sizes the
 * site actually serves, and writes src/data/spins.json.
 *
 * Only the linen frames are imported. Cutouts are deliberately not used: every
 * piece is shown as photographed, and the viewer offers no choice between the
 * two.
 *
 * WHAT THIS SCRIPT EXISTS TO ABSORB
 * ---------------------------------
 * The source frames are not uniform, and none of that irregularity should
 * reach the browser:
 *
 *   - Frame files are named fNN.webp everywhere except spin-demo/frames,
 *     which uses nNN.webp. Output is always NN.webp.
 *   - Frames are 1000px everywhere except spin-demo/cutout, which is 1100px.
 *     Output is always the same size within a variant.
 *   - Two pieces have measured rotation angles, two do not. Output always
 *     carries an angle per frame; even spacing is synthesised when the
 *     shoot could not be measured, and `measured` records which it was.
 *   - spin-cup/frames and spin-cup/cutout hold 45 frames, 34 of them
 *     optical-flow interpolated. They are rejected work. See DENY below.
 *
 * Every delivered frame is a real photograph. Nothing here synthesises an
 * in-between frame, and nothing here should ever start.
 *
 * Output is committed to the repo. The photography project is not available
 * to CI, so the site builds from what this script leaves behind.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const source = path.resolve(root, flag('source', '..'));
const force = args.includes('--force');

/**
 * Directories that must never be served, whatever a future manifest says.
 * These hold optical-flow interpolated frames that were reviewed and
 * rejected for looking "weird and morphy". A smooth fake spin is worse than
 * a steppy honest one; the whole point of the site is that the glaze reads
 * true. If the manifest is ever edited to point at one of these, the build
 * stops rather than quietly shipping synthesised frames.
 */
const DENY = ['spin-cup/frames', 'spin-cup/cutout'];

/**
 * The ladder of widths the site serves. The browser picks from these by
 * srcset for the still frame, and the turntable runtime picks by measuring
 * how big the piece is actually drawn — so a phone, a laptop and a 4K panel
 * each get a size that suits them instead of one compromise for all three.
 *
 * A rung is only built if the master is at least that big. Nothing is ever
 * upscaled: an invented pixel is worse than a missing one.
 *
 * It stops at 1200 on purpose. The page is at most 1240px wide and the viewer
 * column about 570 CSS pixels, so 1200 already covers a 2x display; a 1600
 * rung would almost never be chosen and would add about half again to what the
 * repository carries.
 */
const WIDTHS = [400, 800, 1200];

/** Quality per rung. Small rungs are seen small, so they can be leaner. */
const qualityFor = (w) => (w <= 400 ? 80 : w <= 800 ? 84 : 88);

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('  !', ...a);

class ImportError extends Error {}

/** Read a frame directory and return its files in frame order. */
async function readFrames(dir, expected, label) {
  const abs = path.join(source, dir);
  if (!existsSync(abs)) {
    throw new ImportError(`${label}: directory not found: ${abs}`);
  }
  const files = (await readdir(abs))
    .filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  if (files.length === 0) throw new ImportError(`${label}: no image files in ${dir}`);

  // Frame order comes from the zero-padded number in the filename, not from
  // the prefix, which differs between directories.
  const numbered = files.map((f) => {
    const m = f.match(/(\d+)\.[a-z]+$/i);
    if (!m) throw new ImportError(`${label}: cannot read a frame number from "${f}"`);
    return { file: f, n: Number(m[1]) };
  });
  numbered.sort((a, b) => a.n - b.n);

  if (expected != null && numbered.length !== expected) {
    throw new ImportError(
      `${label}: manifest says ${expected} frames, ${dir} holds ${numbered.length}. ` +
        `Fix the manifest or the directory; do not guess which is right.`
    );
  }
  return numbered.map((x) => path.join(abs, x.file));
}

/** Resize one frame set to one width. Returns the number written. */
async function emit(files, outDir, size) {
  await mkdir(outDir, { recursive: true });
  const quality = qualityFor(size);
  let written = 0;
  for (const [i, file] of files.entries()) {
    const out = path.join(outDir, `${String(i).padStart(2, '0')}.webp`);
    if (!force && existsSync(out)) continue;
    // `fit: contain` with a transparent pad keeps every piece on a common
    // square canvas even where a master was exported at a different size.
    await sharp(file)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality, effort: 5 })
      .toFile(out);
    written++;
  }
  return written;
}

/** Widths worth building for a master of this size. Never upscales. */
function ladderFor(masterPx) {
  const rungs = WIDTHS.filter((w) => w <= masterPx);
  // A master smaller than the first rung still deserves its own size.
  if (rungs.length === 0) rungs.push(masterPx);
  // Give the largest available detail a home even if it falls between rungs.
  else if (masterPx < WIDTHS[WIDTHS.length - 1] && rungs[rungs.length - 1] < masterPx) {
    // Only worth a rung of its own if it is meaningfully sharper than the last.
    if (masterPx >= rungs[rungs.length - 1] * 1.25) rungs.push(masterPx);
  }
  return rungs;
}

/**
 * Angles per frame, always present in the output.
 * Measured angles are uneven (steps run 12–51°), so the viewer maps playback
 * position through them to turn the piece at a constant rate. Where the
 * shoot could not be measured, even spacing is the honest assumption.
 */
function resolveAngles(piece) {
  const { angles, frame_count: count } = piece;
  if (Array.isArray(angles) && angles.length > 0) {
    if (angles.length !== count) {
      throw new ImportError(
        `${piece.id}: ${angles.length} angles for ${count} frames. These must match.`
      );
    }
    return { angles: angles.map((a) => ((a % 360) + 360) % 360), measured: true };
  }
  return {
    angles: Array.from({ length: count }, (_, i) => (i * 360) / count),
    measured: false,
  };
}

async function main() {
  const manifestPath = path.join(source, 'pieces.json');
  if (!existsSync(manifestPath)) {
    throw new ImportError(
      `No pieces.json at ${manifestPath}. Pass --source <photography project> if it lives elsewhere.`
    );
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  log(`Reading ${manifestPath} (generated ${manifest.generated})`);

  const outRoot = path.join(root, 'public', 'spins');
  const spins = [];
  const problems = [];

  for (const piece of manifest.pieces) {
    log(`\n${piece.id} — ${piece.working_name}`);

    for (const dir of [piece.frames_dir, piece.cutout_dir].filter(Boolean)) {
      if (DENY.includes(dir.replace(/\/$/, ''))) {
        throw new ImportError(
          `${piece.id}: manifest points at ${dir}, which holds interpolated frames ` +
            `that were rejected. Use the real photographs instead.`
        );
      }
    }

    let frames;
    try {
      frames = await readFrames(piece.frames_dir, piece.frame_count, piece.id);
    } catch (err) {
      if (!(err instanceof ImportError)) throw err;
      problems.push(err.message);
      warn(err.message);
      continue;
    }

    const { angles, measured } = resolveAngles(piece);
    const dir = path.join(outRoot, piece.id);
    await mkdir(dir, { recursive: true });

    // The master's own size sets the ceiling. The photography pipeline now
    // exports at the native crop, so this is whatever the camera actually
    // resolved around the piece rather than a number someone picked.
    const master = await sharp(frames[0]).metadata();
    const masterPx = Math.min(master.width ?? 0, master.height ?? 0);
    const widths = ladderFor(masterPx);

    for (const w of widths) {
      const n = await emit(frames, path.join(dir, String(w)), w);
      log(`  ${w}px: ${n ? `wrote ${n}` : 'up to date'}, ${frames.length} frames`);
    }

    // Clear the old fixed-size folders and any rung this master can no longer
    // justify, so a shrinking source never leaves stale, sharper-looking files.
    for (const stale of ['w', 'd', 'c', ...WIDTHS.filter((w) => !widths.includes(w)).map(String)]) {
      await rm(path.join(dir, stale), { recursive: true, force: true });
    }

    spins.push({
      id: piece.id,
      workingName: piece.working_name,
      count: frames.length,
      shot: piece.shot,
      angles: angles.map((a) => Math.round(a * 100) / 100),
      anglesMeasured: measured,
      anglesNote: piece.angles_note ?? null,
      widths,
      masterPx,
      base: `/spins/${piece.id}`,
      palette: piece.palette,
      caveats: piece.caveats ?? [],
      source: { frames: piece.frames_dir },
    });
  }

  const dataDir = path.join(root, 'src', 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, 'spins.json'),
    JSON.stringify(
      {
        $comment:
          'Generated by scripts/build-spins.mjs from the photography project. Do not edit by hand.',
        generated: manifest.generated,
        imported: new Date().toISOString().slice(0, 10),
        principle: manifest.principle,
        spins,
      },
      null,
      2
    ) + '\n'
  );
  log(`\nWrote src/data/spins.json — ${spins.length} spin${spins.length === 1 ? '' : 's'}`);

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof ImportError ? `\nError: ${err.message}` : err);
  process.exit(1);
});

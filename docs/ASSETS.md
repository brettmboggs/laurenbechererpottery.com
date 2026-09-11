# Asset specs for the viewers

## Photos
- JPG/PNG/WebP/HEIC from a phone are fine; the admin converts uploads to WebP and caps them at 2400 px.
- Cover photos: square. Wall tiles are square, to match the spin frames.
  A piece with a 360° spin needs no cover at all; its first frame is used.
- Journal covers: landscape (16:9).

## 360° spins

Spins are not uploaded through the admin. They come from the photography
project next door (`../`), which holds the raw shoots, the focus-stacked
frames, the measured rotation angles, and `pieces.json` describing all of it.

**Adding a piece is three steps and no code:**

1. Shoot it and process it in the photography project, leaving a frame folder.
2. Add an entry to `pieces.json` there: id, frame directory, frame count,
   cutout directory (or `null`), measured angles (or `null`), and the sampled
   glaze palette.
3. Run `npm run spins` here, then set the piece's **360° spin folder** field in
   the admin to that id.

`npm run spins` copies the frames in, resizes them into the sizes the site
serves, and rewrites `src/data/spins.json`. Both the frames and that file are
committed — CI has no access to the photography project.

### What the import absorbs

The source shoots are not uniform, and none of the irregularity reaches the
browser. The script normalises frame names (one folder uses `nNN`, the rest
`fNN`) and frame sizes (one cutout set was exported at 1100px, the rest at
1000px), and it always emits an angle per frame, synthesising even spacing
where a shoot could not be measured.

It also refuses to serve rejected work. `spin-cup/frames` holds 45 frames, 34
of them optical-flow interpolated; they looked wrong and were killed. The
import stops rather than copy them, whatever the manifest says.

### Sizes served

| Variant | Size | Used for |
| --- | --- | --- |
| `w` | 420px | Wall tiles and the home page |
| `d` | 1000px | The viewer on a piece's own page, and the home page hero |

`d` is the native size of the delivered frames, so nothing is resampled and
the glaze reads exactly as shot. The wall size is small on purpose: a 16-frame
set costs roughly 11 MB of decoded bitmap at 420px and about 64 MB at 1000px,
and decoded memory — not download size — is what a wall of spinning pieces runs
out of. One piece at full size on its own page is fine; a grid of them is not.

### Cutouts are not used

Every piece is shown as photographed, on its linen. Cutouts were tried and
dropped: they looked worse, and a background switch was one more control that
earned nothing. The site imports only the linen frames, and the viewer offers
no choice between treatments.

This also means a piece whose glaze will not separate from the backdrop — one
already cannot be cut out at all — is ordinary rather than an exception. The
cutout frames still exist in the photography project if it is ever revisited.

### Shooting notes for the next one

- A single frame of the **empty backdrop**, shot before the piece is placed,
  is what makes a cutout possible. It has been asked for twice. You cannot
  tell which glazes will need it until afterwards.
- 12–16 positions is plenty. Steps do not need to be even; if the angles can
  be measured afterwards, the viewer uses them and the turn plays at a
  constant rate regardless.
- Matte glazes with vertical landmarks measure well. Glossy glazes with
  horizontal throwing rings do not — the highlights stay put while the surface
  moves, and every correlation comes back weak.

## 3D models (dormant)

The `<model-viewer>` path is still wired up and still documented below, but no
real scan exists yet and no piece points at one. A piece with a `.glb` gets a
3D tab automatically; until then nothing loads the viewer bundle.

- Format: **.glb** (binary glTF 2.0). `.gltf` + separate textures also works but `.glb` is one file and simpler for the admin.
- Target size: under **15 MB** per model for fast loading on phones. 5–8 MB is ideal.
- Geometry: 50k–200k triangles is plenty for a pot. Decimate heavier scans.
- Textures: 2048×2048 base color (+ normal/roughness if you have them), JPEG inside the GLB. Avoid 8k textures.
- Scale: real-world meters (a 9-inch vase ≈ 0.23 m tall) so the AR "View in your space" button shows true size.
- Origin: bottom-center of the piece, Y up.
- Animations: any animation clips embedded in the GLB play automatically and loop.

### Good pipelines
- **Phone photogrammetry:** Polycam, KIRI Engine, or Scaniverse → export GLB → (optional) open in Blender → *File → Export → glTF 2.0*, tick *Compression* (Draco) → upload.
- **Blender from scratch:** model → UV → bake → export glTF 2.0 with Draco compression. Draco-compressed GLBs are supported by the viewer.
- **Quick compression:** `npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp` shrinks most scans 3–10×.

## Typography

One typeface across the site: **Jost**, a light geometric sans in the Futura
line, self-hosted from `@fontsource/jost` so no third party sits in the
critical path. Light (300) carries display sizes; body text is 400, because a
300 weight at paragraph size goes thin enough to hurt on a phone or in
daylight.

Jost stands in for **Airspace Light**, which was the font originally chosen.
Airspace is a commercial font by Ivanna Ivashka, sold on Creative Market: about
$15 for a desktop licence and about $13 for a webfont licence. The copies
circulating on free-font sites are labelled demo/trial by those sites, so they
are not licensed for a site that sells work. Jost matches its airy geometry,
small x-height and long extenders, and is openly licensed.

Swapping Airspace in later is two changes: add the licensed woff2 to
`public/fonts/`, and point `--font-display` in `src/styles/global.css` at it.
Nothing else references a family name.

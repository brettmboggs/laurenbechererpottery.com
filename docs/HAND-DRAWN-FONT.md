# Lauren Hand — a font made from Lauren's handwriting

> **Retired from the site, September 2026.** The site now sets Montserrat for
> everything, on an off-white ground with charcoal type.
> Lauren Hand is no longer loaded anywhere — `src/styles/fonts.css` is gone and
> nothing references the family.
>
> The work is kept, not deleted: the font files are still in `public/fonts/`, the
> source sheets in `design/handwriting/`, and the build pipeline in
> `scripts/handfont/`. Bringing it back for a logo, a signature, or an accent is
> a matter of adding an `@font-face` rule and pointing something at it. The rest
> of this document describes how it was made.

The font is a real OpenType face traced from the lettering sheet Lauren drew
(marker = Bold, pen = Regular).

| File | What |
| --- | --- |
| `design/handwriting/sheet-b.jpg` | The source photo (sheet-a is the second shot, not used) |
| `public/fonts/lauren-hand-{regular,bold}.{woff2,otf}` | The fonts the site loads (`src/styles/fonts.css`) |
| `scripts/handfont/segment.py` | Finds and labels every drawn character on the sheet |
| `scripts/handfont/build_font.py` | Traces the ink to Bézier outlines and assembles the fonts |

Nothing in the pipeline invents letterforms. Every outline is traced from the ink.
The only "made" glyphs are ones she didn't draw: space, quotes (her comma, raised),
colon and semicolon (her period and comma stacked), ellipsis (three periods),
en/em dashes (her hyphen stretched), and a middle dot. Punctuation is placed
where type expects it (period on the baseline, comma straddling it, dashes centred
on the x-height) but the shapes are hers.

## Rebuilding the font (after a new or corrected sheet)

Requirements: Python 3 with `opencv-python numpy fonttools potracer brotli`
(`pip install --user fonttools potracer brotli`; OpenCV and NumPy are already installed here).

```bash
python scripts/handfont/segment.py design/handwriting/sheet-b.jpg build/handfont-b
```

Check `build/handfont-b/debug.png`: every character should have a red box and the
right green label, and the console should print `mapping OK`. The row order and
character order are defined at the top of `segment.py` (`ROWS`); if a new sheet uses
a different layout, update that list.

```bash
python scripts/handfont/build_font.py build/handfont-b public/fonts
```

Check `build/handfont-b/specimen.png`, then commit the four files in `public/fonts/`.

## Fixing a single letter

If one glyph needs redrawing, Lauren can letter just that character on a fresh
sheet and Brett can splice it in: run `segment.py` on the new sheet, copy the new
glyph's box from its `glyphs.json` into the old one (same `char` and `weight`),
paste the pixels into `bw.png` with any image editor, and rebuild. Or, in
Illustrator: open `public/fonts/lauren-hand-bold.otf` glyphs via a font editor
such as FontForge (free) and replace the outline directly.

## Photographing a sheet well

Flat, even daylight, no shadows across the page, phone parallel to the paper,
dark pen on white or cream paper, one character per position with clear gaps.
The current sheet worked at 3024×4032 from a phone camera without special setup.

## Also available: lettered images

Site settings in the admin still has **Hand-drawn logo** and **Hand-lettered home
headline** image fields, in case Lauren wants a one-off lockup drawn as art rather
than typed in the font.

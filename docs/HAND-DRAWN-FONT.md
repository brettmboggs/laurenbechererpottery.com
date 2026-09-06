# Hand-drawn lettering and font

The site has three hooks for Lauren's own lettering. Use any or all of them.
Each one is a field in the admin under **Site settings**, so nothing needs code.

| Hook | What it does | Best for |
| --- | --- | --- |
| **Hand-drawn logo** | Replaces the typed "Lauren Becherer Pottery" in the header with an image | The one thing everyone sees, on every page |
| **Hand-lettered home headline** | Replaces the big home-page headline with an image (the typed text still exists for Google and screen readers) | A single showpiece line |
| **Hand-drawn font file** | Loads a real font made from her handwriting and uses it for *every* heading on the site (with Young Serif as fallback while it loads) | Everything else: page titles, piece names, journal headings |

Recommended: do the logo + headline as drawn images (highest quality, full control
over every letter), and make a font for the rest.

---

## Route A: lettered images (logo, headline)

1. Draw on white paper with a dark pen, or on an iPad (Procreate: 300 dpi, transparent background, export PNG).
2. Paper route: photograph flat in daylight, then remove the background. Free options: remove.bg, Photoshop's *Select Subject*, or Adobe Express *Remove background*.
3. Make it a vector so it stays crisp at any size (optional but worth it): Illustrator *Image Trace → Black and White Logo → Expand*, or Inkscape *Path → Trace Bitmap*. Export **SVG**. If you skip this, export a **PNG at least 2000 px wide with a transparent background**.
4. Colour: plum `#3e1f3c` for the logo. For the headline, plum, or the sunset gradient if you want to get fancy in Illustrator.
5. Admin → Site settings → upload to **Hand-drawn logo** and/or **Hand-lettered home headline**. Save.

Sizing: the header logo displays 44 px tall, so a wide horizontal lockup works best. The headline image scales to the width of the text column (about 560 px on desktop).

## Route B: a font from her handwriting (everything else)

Free tool: **Calligraphr** (https://www.calligraphr.com). The free tier makes one font with up to 75 characters, which covers upper case, lower case, digits and the punctuation we need.

1. Sign up → *Templates* → select **Minimal English** (A–Z, a–z, 0–9) and add `. , ' ! ? & -` from the Punctuation set. Keep the total ≤ 75.
2. Download the template PDF, print it, and have Lauren letter each box with a felt-tip or brush pen. Consistent pen and pressure matters more than perfection. Slightly irregular is the charm.
3. Scan or photograph the sheets (flat, bright, no shadows) → *My Fonts* → *Upload Template*.
4. Adjust baseline and size in Calligraphr's editor if a few letters sit oddly. *Build Font* → download the **TTF**.
5. Optional but recommended: convert TTF → WOFF2 for a smaller download. Free: https://transfonter.org (tick WOFF2 only) or https://cloudconvert.com/ttf-to-woff2.
6. Admin → Site settings → **Hand-drawn font file** → upload the `.woff2` (or `.ttf`). Save.

Every heading now uses her font. If a letter looks wrong, fix it in Calligraphr, rebuild, and re-upload; the file name can stay the same.

### If it ends up too loose for smaller headings

Say so and I'll limit the handwriting font to the big headlines and keep Young Serif for piece names and cards. That's a two-line CSS change.

## Paid shortcut

If you'd rather not fiddle: **Fontself** (Illustrator/Photoshop extension, ~$50) or **iFontMaker** (iPad, ~$8) build fonts from drawn letters in an afternoon and export OTF/TTF directly.

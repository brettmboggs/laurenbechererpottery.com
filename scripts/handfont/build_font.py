"""
Step 2 of the handwriting → font pipeline.
Traces every segmented glyph to Bézier outlines and assembles two OpenType fonts
(marker = Bold 700, pen = Regular 400) plus WOFF2 copies and a specimen image.

  python scripts/handfont/build_font.py build/handfont-b public/fonts

Nothing here invents letterforms: every outline is traced from Lauren's ink.
Only glyphs she didn't draw (space, quotes, colon, semicolon, dashes, ellipsis)
are composed from pieces she did draw (the comma, the period, the hyphen).
"""
import sys, os, json
import numpy as np
import cv2
import potrace
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from fontTools.agl import UV2AGL

IN_DIR, OUT_DIR = sys.argv[1], sys.argv[2]
os.makedirs(OUT_DIR, exist_ok=True)
meta = json.load(open(os.path.join(IN_DIR, "glyphs.json")))
bw = cv2.imread(os.path.join(IN_DIR, "bw.png"), cv2.IMREAD_GRAYSCALE)  # white paper, black ink

FAMILY = "Lauren Hand"
UPM = 1000
CAP_HEIGHT = 700          # font units; everything else scales relative to the drawn caps
UPSCALE = 2               # trace at 2× for smoother curves
SIDE_BEARING = {"bold": 45, "regular": 55}
WEIGHTS = {"bold": ("Bold", 700), "regular": ("Regular", 400)}

DESCENDERS = set("gjpqy,Q/")                 # never used to fit the baseline
BASELINE_ANCHORS_SYMBOLS = set("!@#%")          # symbols that reliably sit on the line


def xy(p):
    return (p.x, p.y) if hasattr(p, "x") else (p[0], p[1])


def anchor_points(row_glyphs):
    pts = []
    for g in row_glyphs:
        c = g["char"]
        if c in DESCENDERS:
            continue
        if not c.isalnum() and c not in BASELINE_ANCHORS_SYMBOLS:
            continue
        pts.append((g["x"] + g["w"] / 2, g["y"] + g["h"]))
    return np.array(pts, dtype=float)


def sheet_slope(rows):
    """The page is photographed slightly tilted. Measure that tilt on rows with many
    anchors spread across the page, and reuse it everywhere (short rows can't fit a slope)."""
    slopes = []
    for gs in rows.values():
        pts = anchor_points(gs)
        if len(pts) >= 8 and (pts[:, 0].max() - pts[:, 0].min()) > 0.35 * bw.shape[1]:
            a, b = np.polyfit(pts[:, 0], pts[:, 1], 1)
            res = np.abs(pts[:, 1] - (a * pts[:, 0] + b))
            keep = res < max(8.0, 2.5 * np.median(res))
            if keep.sum() >= 5:
                a, _ = np.polyfit(pts[keep, 0], pts[keep, 1], 1)
            slopes.append(a)
    return float(np.median(slopes)) if slopes else 0.0


def fit_baseline(row_glyphs, slope):
    """Baseline for a row: shared sheet slope, intercept from the median of this row's anchors."""
    pts = anchor_points(row_glyphs)
    if len(pts) == 0:
        pts = np.array([[g["x"] + g["w"] / 2, g["y"] + g["h"]] for g in row_glyphs], dtype=float)
    b = float(np.median(pts[:, 1] - slope * pts[:, 0]))
    return lambda x: slope * x + b


def trace_glyph(g):
    """Return list of contours; each contour = list of ('line'|'curve', points...) in image px (2× upscaled)."""
    pad = 6
    x0, y0 = max(0, g["x"] - pad), max(0, g["y"] - pad)
    x1, y1 = min(bw.shape[1], g["x"] + g["w"] + pad), min(bw.shape[0], g["y"] + g["h"] + pad)
    crop = bw[y0:y1, x0:x1]
    crop = cv2.resize(crop, None, fx=UPSCALE, fy=UPSCALE, interpolation=cv2.INTER_CUBIC)
    crop = cv2.GaussianBlur(crop, (3, 3), 0)
    ink = crop < 128
    # potracer treats *zero* as the foreground it traces, so hand it the inverse of the ink mask
    bmp = potrace.Bitmap(~ink)
    path = bmp.trace(turdsize=int(12 * UPSCALE), turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                     alphamax=1.0, opticurve=True, opttolerance=0.25)
    contours = []
    for curve in path:
        segs = []
        start = xy(curve.start_point)
        for seg in curve.segments:
            if seg.is_corner:
                segs.append(("line", xy(seg.c)))
                segs.append(("line", xy(seg.end_point)))
            else:
                segs.append(("curve", xy(seg.c1), xy(seg.c2), xy(seg.end_point)))
        contours.append((start, segs))
    # offsets to convert crop px back to sheet px: sheet = crop/UPSCALE + (x0, y0)
    return contours, (x0, y0)


def build_weight(weight):
    style, wclass = WEIGHTS[weight]
    glyphs = [g for g in meta["glyphs"] if g["weight"] == weight]
    rows = {}
    for g in glyphs:
        rows.setdefault(g["row"], []).append(g)
    slope = sheet_slope(rows)
    baselines = {r: fit_baseline(gs, slope) for r, gs in rows.items()}
    print(f"  {weight}: sheet tilt {slope:+.4f} px/px")

    # --- scale from the drawn capital height -------------------------------------
    cap_px = np.median([baselines[g["row"]](g["x"] + g["w"] / 2) - g["y"] for g in glyphs if g["char"].isupper() and g["char"] not in "QJ"])
    s = CAP_HEIGHT / cap_px
    x_px = np.median([baselines[g["row"]](g["x"] + g["w"] / 2) - g["y"] for g in glyphs if g["char"] in "acemnorsuvwxz"])
    x_height = int(round(x_px * s))
    sb = SIDE_BEARING[weight]

    charstrings, metrics, cmap = {}, {}, {}
    order = [".notdef", "space"]
    bounds_top, bounds_bottom = 0, 0
    recorded = {}   # char -> (RecordingPen, advance) for composing missing glyphs

    def add_glyph(name, pen_recording, advance):
        t2 = T2CharStringPen(advance, None)
        pen_recording.replay(t2)
        charstrings[name] = t2.getCharString()
        metrics[name] = (advance, 0)
        if name not in order:
            order.append(name)

    for g in glyphs:
        ch = g["char"]
        contours, (ox, oy) = trace_glyph(g)
        base = baselines[g["row"]](g["x"] + g["w"] / 2)
        # Glyphs that sit on the baseline are snapped to it individually, so a letter drawn a
        # touch high or low on the sheet doesn't bounce in running text. Descenders, floating
        # marks (~ ^ - + = ·) and brackets keep their drawn position relative to the row.
        drawn_bottom = g["y"] + g["h"]
        h_units = g["h"] * s
        near_base = abs(drawn_bottom - base) < 0.3 * cap_px
        sits = ch in "!?." or ch.isdigit() or ((ch.isalpha() and ch not in DESCENDERS or ch in "@#%&*") and near_base)
        if sits:
            base = drawn_bottom
        # Marks with a conventional vertical position: keep her shape, place it where type expects it.
        # value = where the glyph's bottom edge lands, in font units above the baseline
        placed = {
            ",": -h_units / 2,                       # comma straddles the baseline
            "-": x_height / 2 - h_units / 2,         # hyphen, plus, equals, tilde centred on x-height
            "+": x_height / 2 - h_units / 2,
            "=": x_height / 2 - h_units / 2,
            "~": x_height / 2 - h_units / 2,
            "^": CAP_HEIGHT - h_units,               # caret hangs from cap height
        }
        if ch in placed:
            base = drawn_bottom + placed[ch] / s
        rec = RecordingPen()
        # sheet px -> font units: X = (px - glyph_left) * s + sb ; Y = (baseline - py) * s
        def fx(p):
            px, py = p
            sx, sy = px / UPSCALE + ox, py / UPSCALE + oy
            return ((sx - g["x"]) * s + sb, (base - sy) * s)
        for start, segs in contours:
            rec.moveTo(fx(start))
            for seg in segs:
                if seg[0] == "line":
                    rec.lineTo(fx(seg[1]))
                else:
                    rec.curveTo(fx(seg[1]), fx(seg[2]), fx(seg[3]))
            rec.closePath()
        adv = int(round(g["w"] * s + 2 * sb))
        top = (base - g["y"]) * s
        bottom = (base - (g["y"] + g["h"])) * s
        bounds_top, bounds_bottom = max(bounds_top, top), min(bounds_bottom, bottom)
        g["_top"], g["_bottom"] = top, bottom
        name = UV2AGL.get(ord(ch), f"uni{ord(ch):04X}")
        add_glyph(name, rec, adv)
        cmap[ord(ch)] = name
        recorded[ch] = (rec, adv, top, bottom)

    # --- glyphs she didn't draw, composed from ones she did -------------------------
    def shifted(rec, dx, dy):
        out = RecordingPen()
        rec.replay(TransformPen(out, (1, 0, 0, 1, dx, dy)))
        return out

    def combine(*parts):
        out = RecordingPen()
        for p in parts:
            p.replay(out)
        return out

    comma, comma_adv, comma_top, comma_bottom = recorded[","]
    period, period_adv, period_top, period_bottom = recorded["."]
    hyphen, hyphen_adv, *_ = recorded["-"]

    apos = shifted(comma, 0, CAP_HEIGHT - comma_top)                       # comma lifted to cap height
    add_glyph("quotesingle", apos, comma_adv); cmap[0x27] = "quotesingle"
    for cp, nm in ((0x2019, "quoteright"), (0x2018, "quoteleft")):
        add_glyph(nm, apos, comma_adv); cmap[cp] = nm
    dbl = combine(apos, shifted(apos, comma_adv - sb, 0))
    dbl_adv = 2 * comma_adv - sb
    for cp, nm in ((0x22, "quotedbl"), (0x201C, "quotedblleft"), (0x201D, "quotedblright")):
        add_glyph(nm, dbl, dbl_adv); cmap[cp] = nm
    colon = combine(period, shifted(period, 0, x_height - period_top))
    add_glyph("colon", colon, period_adv); cmap[0x3A] = "colon"
    semi = combine(comma, shifted(period, (comma_adv - period_adv) / 2, x_height - period_top))
    add_glyph("semicolon", semi, comma_adv); cmap[0x3B] = "semicolon"
    ell = combine(period, shifted(period, period_adv - sb, 0), shifted(period, 2 * (period_adv - sb), 0))
    add_glyph("ellipsis", ell, 3 * period_adv - 2 * sb); cmap[0x2026] = "ellipsis"
    for cp, nm, k in ((0x2013, "endash", 1.5), (0x2014, "emdash", 2.2)):
        out = RecordingPen(); hyphen.replay(TransformPen(out, (k, 0, 0, 1, sb * (1 - k), 0)))
        add_glyph(nm, out, int(hyphen_adv * k)); cmap[cp] = nm
    add_glyph("periodcentered", shifted(period, 0, x_height / 2 - (period_top + period_bottom) / 2), period_adv); cmap[0xB7] = "periodcentered"

    # .notdef and space
    charstrings[".notdef"] = T2CharStringPen(500, None).getCharString(); metrics[".notdef"] = (500, 0)
    charstrings["space"] = T2CharStringPen(int(0.28 * UPM), None).getCharString(); metrics["space"] = (int(0.28 * UPM), 0)
    cmap[0x20] = "space"; cmap[0xA0] = "space"

    tallest = sorted(glyphs, key=lambda g: -g["_top"])[:4]
    lowest = sorted(glyphs, key=lambda g: g["_bottom"])[:4]
    print(f"  {weight}: tallest " + ", ".join(f"{g['char']}={g['_top']:.0f}" for g in tallest) +
          " | lowest " + ", ".join(f"{g['char']}={g['_bottom']:.0f}" for g in lowest))
    # Fixed vertical metrics (a huge @ or $ shouldn't push every line of text apart).
    ascender, descender = 920, -300

    fb = FontBuilder(UPM, isTTF=False)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    ps_name = f"{FAMILY.replace(' ', '')}-{style}"
    fb.setupCFF(ps_name, {"FullName": f"{FAMILY} {style}", "FamilyName": FAMILY, "Weight": style, "version": "1.000",
                          "Notice": "Handwriting of Lauren Becherer. All rights reserved."}, charstrings, {})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ascender, descent=descender)
    fb.setupNameTable({"familyName": FAMILY, "styleName": style, "psName": ps_name, "fullName": f"{FAMILY} {style}",
                       "version": "Version 1.000", "copyright": "Handwriting of Lauren Becherer.",
                       "manufacturer": "Lauren Becherer Pottery", "uniqueFontIdentifier": f"{ps_name};1.000"})
    fb.setupOS2(version=4, sTypoAscender=ascender, sTypoDescender=descender, sTypoLineGap=0,
                usWinAscent=ascender, usWinDescent=-descender, usWeightClass=wclass,
                sxHeight=x_height, sCapHeight=CAP_HEIGHT, fsSelection=(0x20 if weight == "bold" else 0x40) | 0x80)
    fb.setupHead(macStyle=(1 if weight == "bold" else 0))
    fb.setupPost()
    slug = f"lauren-hand-{weight}"
    otf_path = os.path.join(OUT_DIR, f"{slug}.otf")
    fb.save(otf_path)
    f = TTFont(otf_path); f.flavor = "woff2"; f.save(os.path.join(OUT_DIR, f"{slug}.woff2"))
    print(f"{weight:8s} glyphs={len(order):3d} cap_px={cap_px:.0f} scale={s:.3f} xHeight={x_height} asc={ascender} desc={descender} -> {slug}.otf/.woff2")
    return otf_path


paths = {w: build_weight(w) for w in ("bold", "regular")}

# --- specimen -------------------------------------------------------------------
from PIL import Image, ImageDraw, ImageFont
W, y = 2000, 40
img = Image.new("RGB", (W, 1700), (255, 247, 238))
d = ImageDraw.Draw(img)
plum = (62, 31, 60)
lines = [
    ("bold", 150, "Lauren Becherer Pottery"),
    ("bold", 90, "Clay, fire, and the last light of the day."),
    ("bold", 64, "abcdefghijklmnopqrstuvwxyz"),
    ("bold", 64, "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890"),
    ("bold", 64, "~!@#$%^&*()-+=./,? \"quotes\" 'it's' a:b; c… en–dash em—dash"),
    ("regular", 90, "Wheel-thrown & hand-built, fired at sunset."),
    ("regular", 64, "abcdefghijklmnopqrstuvwxyz"),
    ("regular", 64, "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890"),
    ("regular", 64, "~!@#$%^&*()-+=./,? \"quotes\" 'it's' a:b; c… en–dash em—dash"),
    ("regular", 48, "Sunset Bottle Vase · $120 · Available · Shop / Portfolio / Journal / About / Client Portal"),
]
for weight, size, text in lines:
    font = ImageFont.truetype(paths[weight], size)
    d.text((40, y), text, font=font, fill=plum)
    y += int(size * 1.45)
img.save(os.path.join(IN_DIR, "specimen.png"))
print("specimen ->", os.path.join(IN_DIR, "specimen.png"))

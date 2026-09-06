"""
Step 1 of the handwriting → font pipeline.
Cleans the photographed glyph sheet, finds every drawn character, groups multi-part
characters (i, j, !, ?, =, %) and labels them in reading order.

  python scripts/handfont/segment.py design/handwriting/sheet-b.jpg build/handfont

Outputs (in the out dir):
  bw.png        clean black-on-white binary image (full resolution)
  glyphs.json   [{char, weight, row, x, y, w, h}], plus row baselines/metrics
  debug.png     the sheet with boxes + labels so a human can verify the mapping
"""
import sys, json, os
import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

SYMBOLS = list("~!@#$%^&*()-+=./,?")
ROWS = [
    ("bold", list("abcdefghijklmnop")), ("bold", list("qrstuvwxyz")),
    ("bold", list("ABCDEFGHIJKLMNOP")), ("bold", list("QRSTUVWXYZ")),
    ("bold", SYMBOLS), ("bold", list("1234567890")),
    ("regular", list("abcdefghijklmnopqrst")), ("regular", list("uvwxyz")),
    ("regular", list("ABCDEFGHIJKLMNOP")), ("regular", list("QRSTUVWXYZ")),
    ("regular", SYMBOLS), ("regular", list("1234567890")),
]

img = cv2.imread(SRC)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
H, W = gray.shape

# --- 1. Flatten lighting and binarize -----------------------------------------
gray = cv2.medianBlur(gray, 3)
bw = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 61, 18)

# --- 2. Connected components, drop noise and page-edge junk -------------------
n, labels, stats, cents = cv2.connectedComponentsWithStats(bw, connectivity=8)
keep = []
for i in range(1, n):
    x, y, w, h, area = stats[i]
    if area < 50 or (w < 6 and h < 6):
        continue
    # anything hugging the page edge is table, shadow, or paper texture — never a glyph
    if x < W * 0.025 or y < H * 0.025 or x + w > W * 0.975 or y + h > H * 0.975:
        continue
    if h > H * 0.12 or w > W * 0.5:                              # far too big to be a glyph
        continue
    keep.append(i)

mask = np.isin(labels, keep)
bw = np.where(mask, 255, 0).astype(np.uint8)

# --- 3. Rows by clustering the vertical centres of full-size letters ----------
# Descenders touch the next row, so blank-band detection fails. Instead: take the
# "core" components (real letters, not dots/dashes), sort by centre, and split
# wherever the jump between neighbours is bigger than a fraction of letter height.
all_h = np.array([stats[i][3] for i in keep])
core_h = np.median(all_h)
core = [i for i in keep if stats[i][3] > 0.45 * core_h]
core.sort(key=lambda i: stats[i][1] + stats[i][3] / 2)
rows_core = [[core[0]]]
for i in core[1:]:
    prev = rows_core[-1][-1]
    cy, pcy = stats[i][1] + stats[i][3] / 2, stats[prev][1] + stats[prev][3] / 2
    if cy - pcy > 0.7 * core_h:
        rows_core.append([i])
    else:
        rows_core[-1].append(i)
rows_core = [r for r in rows_core if len(r) >= 4]           # a real row has several letters
bands = []
for r in rows_core:
    top = min(stats[i][1] for i in r); bot = max(stats[i][1] + stats[i][3] for i in r)
    bands.append([int(top), int(bot)])

def band_of(cy, h):
    best, best_d = None, None
    for r, (a, b) in enumerate(bands):
        if a - 0.6 * core_h <= cy <= b + 0.6 * core_h:
            d = abs(cy - (a + b) / 2)
            if best is None or d < best_d:
                best, best_d = r, d
    return best

# --- 4. Group components into glyphs (same row + horizontal overlap) ----------
comps = []
for i in keep:
    x, y, w, h, area = stats[i]
    r = band_of(y + h / 2, h)
    if r is None:
        continue
    comps.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "row": r, "ids": [i], "area": int(area)})

def overlap(a, b, pad=4):
    return not (a["x"] + a["w"] + pad < b["x"] or b["x"] + b["w"] + pad < a["x"])

glyphs = []
for r in range(len(bands)):
    row = sorted([c for c in comps if c["row"] == r], key=lambda c: c["x"])
    groups = []
    for c in row:
        merged_into = None
        for g in groups:
            if overlap(g, c):
                merged_into = g; break
        if merged_into is None:
            groups.append(dict(c))
        else:
            g = merged_into
            nx, ny = min(g["x"], c["x"]), min(g["y"], c["y"])
            g["w"] = max(g["x"] + g["w"], c["x"] + c["w"]) - nx
            g["h"] = max(g["y"] + g["h"], c["y"] + c["h"]) - ny
            g["x"], g["y"] = nx, ny
            g["ids"] += c["ids"]
    # a second pass in case a merge created new overlaps (e.g. % pieces)
    changed = True
    while changed:
        changed = False
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                if overlap(groups[i], groups[j]):
                    a, b = groups[i], groups[j]
                    nx, ny = min(a["x"], b["x"]), min(a["y"], b["y"])
                    a["w"] = max(a["x"] + a["w"], b["x"] + b["w"]) - nx
                    a["h"] = max(a["y"] + a["h"], b["y"] + b["h"]) - ny
                    a["x"], a["y"] = nx, ny
                    a["ids"] += b["ids"]
                    groups.pop(j); changed = True; break
            if changed: break
    for g in groups:
        g["area"] = sum(stats[i][4] for i in g["ids"])
    groups.sort(key=lambda g: g["x"])
    glyphs.append(groups)

def union(a, b):
    nx, ny = min(a["x"], b["x"]), min(a["y"], b["y"])
    a["w"] = max(a["x"] + a["w"], b["x"] + b["w"]) - nx
    a["h"] = max(a["y"] + a["h"], b["y"] + b["h"]) - ny
    a["x"], a["y"] = nx, ny
    a["ids"] += b["ids"]; a["area"] += b["area"]

def is_small(g):
    return g["h"] < 0.45 * core_h and len(g["ids"]) == 1

# 4b. A lone small piece (a dot) that sits alone in its row but directly under/over a
#     glyph in the neighbouring row belongs to that glyph (the ? and ! dots).
for r in range(len(glyphs)):
    for g in list(glyphs[r]):
        if not is_small(g):
            continue
        for rr in (r - 1, r + 1):
            if not (0 <= rr < len(glyphs)):
                continue
            cands = [o for o in glyphs[rr] if overlap(o, g, pad=6)]
            if not cands:
                continue
            o = min(cands, key=lambda o: abs((o["y"] + o["h"]) - g["y"]) if rr < r else abs(o["y"] - (g["y"] + g["h"])))
            gap = (g["y"] - (o["y"] + o["h"])) if rr < r else (o["y"] - (g["y"] + g["h"]))
            if gap < 0.7 * core_h:
                union(o, g); glyphs[r].remove(g); break
    glyphs[r].sort(key=lambda g: g["x"])

# 4c. If a row still has more pieces than expected, the extras are paper specks:
#     drop the smallest lone pieces until the count matches.
for r in range(len(glyphs)):
    exp_n = len(ROWS[r][1]) if r < len(ROWS) else 0
    while len(glyphs[r]) > exp_n:
        smalls = [g for g in glyphs[r] if is_small(g)]
        if not smalls:
            break
        glyphs[r].remove(min(smalls, key=lambda g: g["area"]))

# --- 5. Report + label ---------------------------------------------------------
print(f"found {len(bands)} rows (expected {len(ROWS)})")
labeled = []
ok = True
for r, groups in enumerate(glyphs):
    exp = ROWS[r][1] if r < len(ROWS) else []
    flag = "" if len(groups) == len(exp) else "  <-- MISMATCH"
    if flag: ok = False
    print(f"row {r:2d}: found {len(groups):2d} expected {len(exp):2d} {flag}")
    for k, g in enumerate(groups):
        ch = exp[k] if k < len(exp) else "?"
        labeled.append({"char": ch, "weight": ROWS[r][0] if r < len(ROWS) else "?", "row": r,
                        "x": g["x"], "y": g["y"], "w": g["w"], "h": g["h"], "parts": len(g["ids"])})

# --- 6. Debug image ------------------------------------------------------------
dbg = cv2.cvtColor(255 - bw, cv2.COLOR_GRAY2BGR)
for g in labeled:
    cv2.rectangle(dbg, (g["x"], g["y"]), (g["x"] + g["w"], g["y"] + g["h"]), (60, 90, 230), 3)
    cv2.putText(dbg, g["char"], (g["x"], max(30, g["y"] - 8)), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (30, 140, 30), 4)
scale = 1600 / W
cv2.imwrite(os.path.join(OUT, "debug.png"), cv2.resize(dbg, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA))
cv2.imwrite(os.path.join(OUT, "bw.png"), 255 - bw)
json.dump({"image": SRC, "width": W, "height": H, "bands": bands, "glyphs": labeled}, open(os.path.join(OUT, "glyphs.json"), "w"), indent=1)
print("mapping", "OK" if ok else "NEEDS ATTENTION", "->", os.path.join(OUT, "debug.png"))

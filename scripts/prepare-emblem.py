"""Prepare the PEYMAN hero emblem master from reference/logo-alternative.png.

Task 4.1 (cinematic-hero spec). Runs outside the npm graph (Python + Pillow).

Operations, and nothing else (Req 19.3: no recolor, retouch, redraw or vectorize):
  1. Trim to the alpha bounding box of the visible emblem (alpha > 1).
  2. Pad 11 px of fully transparent pixels on all four sides.
  3. Assert the content pixels equal the source crop byte-for-byte and the
     padding is fully transparent.
  4. Write assets/emblem/peyman-emblem.png and print its SHA-256.

It also measures (read-only) the column-axis anchor used as the transform
origin, and prints it for assets/emblem/README.md.

Why alpha > 1 and not alpha > 0: the source carries 1,302 isolated residue
pixels at alpha 1/255 (0.4% opacity) scattered across the canvas outside the
emblem, left over from background removal. Including them yields a 1216x1189
box (aspect +16.6% off the emblem). Every pixel inside the crop is kept
unchanged, including any alpha-1 pixels; only the invisible residue outside
the emblem's rectangle is dropped by the crop.

Usage (from the repository root):
    python scripts/prepare-emblem.py
"""

from __future__ import annotations

import hashlib
import statistics
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "reference" / "logo-alternative.png"
OUTPUT = ROOT / "assets" / "emblem" / "peyman-emblem.png"

ALPHA_THRESHOLD = 1  # pixels with alpha > 1 define the visible emblem box
PAD = 11  # px, transparent, all four sides (1% of trimmed height)

# Measured values. The script fails loudly if the source ever changes.
EXPECTED_SOURCE_SIZE = (1254, 1254)
EXPECTED_BBOX = (193, 78, 1174, 1200)  # left, top, right, bottom (exclusive)
EXPECTED_TRIM = (981, 1122)
EXPECTED_MASTER = (EXPECTED_TRIM[0] + 2 * PAD, EXPECTED_TRIM[1] + 2 * PAD)  # 1003x1144

# The design's reference ratio (972/1108) and its ±1% tolerance.
REFERENCE_RATIO = 972 / 1108
RATIO_TOLERANCE = 0.01

# Anchor measurement: opaque means alpha > 128. The column shaft is measured
# on the rows between the capital and the ribbon crossing (fractions of the
# trimmed height), where the leftmost opaque run is the shaft alone.
OPAQUE = 128
SHAFT_ROWS = (0.25, 0.47)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def ratio_delta(w: int, h: int) -> float:
    return (w / h) / REFERENCE_RATIO - 1


def trim(src: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    alpha = src.getchannel("A")
    bbox = alpha.point(lambda v: 255 if v > ALPHA_THRESHOLD else 0).getbbox()
    if bbox is None:
        fail("source has no visible pixels")
    if bbox != EXPECTED_BBOX:
        fail(f"alpha bbox {bbox} != expected {EXPECTED_BBOX}")

    # Everything outside the box must be invisible residue (alpha <= threshold).
    left, top, right, bottom = bbox
    px = src.load()
    width, height = src.size
    for y in range(height):
        inside_rows = top <= y < bottom
        for x in range(width):
            if inside_rows and left <= x < right:
                continue
            if px[x, y][3] > ALPHA_THRESHOLD:
                fail(f"visible pixel outside bbox at {(x, y)}: {px[x, y]}")

    cropped = src.crop(bbox)
    if cropped.size != EXPECTED_TRIM:
        fail(f"trimmed size {cropped.size} != expected {EXPECTED_TRIM}")
    delta = ratio_delta(*cropped.size)
    if abs(delta) > RATIO_TOLERANCE:
        fail(f"trimmed aspect {delta:+.2%} vs 972/1108 exceeds ±1%")
    return cropped, bbox


def pad(cropped: Image.Image) -> Image.Image:
    w, h = cropped.size
    master = Image.new("RGBA", (w + 2 * PAD, h + 2 * PAD), (0, 0, 0, 0))
    master.paste(cropped, (PAD, PAD))  # plain copy: no blending into the canvas
    if master.size != EXPECTED_MASTER:
        fail(f"master size {master.size} != expected {EXPECTED_MASTER}")
    delta = ratio_delta(*master.size)
    if abs(delta) > RATIO_TOLERANCE:
        fail(f"master aspect {delta:+.2%} vs 972/1108 exceeds ±1%")
    return master


def assert_content_identical(master: Image.Image, cropped: Image.Image) -> None:
    w, h = cropped.size
    inner = master.crop((PAD, PAD, PAD + w, PAD + h))
    if inner.tobytes() != cropped.tobytes():
        fail("content pixels differ from the source crop")
    # Padding must be fully transparent black (0, 0, 0, 0).
    mw, mh = master.size
    for box in ((0, 0, mw, PAD), (0, mh - PAD, mw, mh), (0, 0, PAD, mh), (mw - PAD, 0, mw, mh)):
        if any(master.crop(box).tobytes()):
            fail(f"padding region {box} is not fully transparent")


def measure_anchor(master: Image.Image) -> dict[str, float]:
    """Column axis of the P, as fractions of the master (read-only)."""
    alpha = master.getchannel("A").load()
    mw, mh = master.size
    content_h = mh - 2 * PAD

    centers = []
    y0 = PAD + round(SHAFT_ROWS[0] * content_h)
    y1 = PAD + round(SHAFT_ROWS[1] * content_h)
    for y in range(y0, y1 + 1):
        x = 0
        while x < mw and alpha[x, y] <= OPAQUE:
            x += 1
        start = x
        while x < mw and alpha[x, y] > OPAQUE:
            x += 1
        if x > start:
            centers.append((start + x - 1) / 2)
    if not centers:
        fail("could not locate the column shaft")
    axis_x = statistics.median(centers)

    # Vertical extent of the column along its axis: entablature top to base bottom.
    ax = round(axis_x)
    opaque_rows = [y for y in range(mh) if alpha[ax, y] > OPAQUE]
    top, bottom = opaque_rows[0], opaque_rows[-1]
    axis_y = (top + bottom) / 2

    return {
        "axis_x_px": axis_x,
        "axis_y_px": axis_y,
        "column_top_px": top,
        "column_bottom_px": bottom,
        "x": round(axis_x / mw, 3),
        "y": round(axis_y / mh, 3),
    }


def main() -> None:
    src = Image.open(SOURCE)
    src.load()
    if src.mode != "RGBA":
        fail(f"source mode {src.mode} != RGBA")
    if src.size != EXPECTED_SOURCE_SIZE:
        fail(f"source size {src.size} != expected {EXPECTED_SOURCE_SIZE}")

    cropped, bbox = trim(src)
    master = pad(cropped)
    assert_content_identical(master, cropped)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    master.save(OUTPUT, format="PNG", optimize=True)

    # Re-read the written file and re-verify it losslessly.
    written = Image.open(OUTPUT)
    written.load()
    if written.mode != "RGBA" or written.tobytes() != master.tobytes():
        fail("written PNG does not decode to the verified pixels")

    sha = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    anchor = measure_anchor(written)

    print(f"source      {SOURCE.relative_to(ROOT)} {src.size[0]}x{src.size[1]} {src.mode}")
    print(f"alpha bbox  {bbox} (alpha > {ALPHA_THRESHOLD})")
    print(f"trimmed     {cropped.size[0]}x{cropped.size[1]} aspect {ratio_delta(*cropped.size):+.2%} vs 972/1108")
    print(f"master      {master.size[0]}x{master.size[1]} aspect {ratio_delta(*master.size):+.2%} vs 972/1108")
    print(f"content     identical to source crop; padding fully transparent")
    print(f"output      {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} bytes)")
    print(f"anchor      x={anchor['x']} y={anchor['y']} "
          f"(axis {anchor['axis_x_px']:.1f}px, column {anchor['column_top_px']}-{anchor['column_bottom_px']}px)")
    print(f"sha256      {sha}")


if __name__ == "__main__":
    main()

# Emblem master

`peyman-emblem.png` is the input for the next/image optimizer. It is never linked directly. Only `reference/logo-alternative.png` is used; `logo-primary.png` and `logo-column.png` are not shipped. `reference/` is read-only.

## Command

From the repository root, with Python 3 and Pillow (outside the npm graph):

```powershell
python -m pip install --user pillow
python scripts/prepare-emblem.py
```

Produced with Python 3.14.2 and Pillow 12.3.0.

## Operations

These are the only operations. There is no recoloring, retouching, redrawing or vectorizing (Req 19.3).

1. Trim to the alpha bounding box of the visible emblem (alpha > 1): source box `(193, 78)–(1174, 1200)`, giving 981×1122.
2. Pad 11 px of fully transparent pixels on all four sides, giving 1003×1144.
3. Assert that the content pixels equal the source crop byte-for-byte and that the padding is fully transparent. The written file is decoded again and re-checked.
4. Write the PNG (RGBA, `optimize=True`) and print its SHA-256. The output is deterministic.

### Why alpha > 1 and not the expected 972×1108

The source has 1,302 stray pixels at alpha 1/255 (0.4% opacity, invisible). They are scattered across the canvas outside the emblem and were left behind by background removal. With them, the raw alpha > 0 box is 1216×1189, which puts the aspect ratio 16.6% off the emblem. Trimming at alpha > 1 removes only that residue, because every pixel outside the box has alpha ≤ 1 (the script asserts this).

The design's 972×1108 does not match any alpha threshold (alpha > 250 gives 972×1109). Getting to 972×1108 would mean clipping visible anti-aliased edge pixels, so it was not done. The measured size is within the ±1% aspect tolerance:

| | Size | Aspect vs 972/1108 |
|---|---|---|
| Trimmed | 981×1122 | −0.33% |
| Master | 1003×1144 | −0.06% |

The padding stays at 11 px, which is 1% of the trimmed height (11.22 px, rounded down).

## Output

| Field | Value |
|---|---|
| File | `assets/emblem/peyman-emblem.png` |
| Dimensions | 1003×1144, RGBA |
| Aspect ratio | 1003/1144 ≈ 0.8768 |
| Size | 1,008,399 bytes |
| SHA-256 | `69b412e275329f49dbac0f81f6ee79bcb7d1b3767d31edd18fc9c9b69e78831e` |
| Source SHA-256 (`reference/logo-alternative.png`) | `6589a0c9d268b086eb3a4418b579ebfe939929f1006fd1d65cc9228767f8a796` |

## Column-axis anchor

Measured from the master's alpha channel (opaque means alpha > 128), in fractions of the master:

```ts
anchor: { x: 0.278, y: 0.499 }
```

- **x:** the median center of the column shaft's opaque run across the rows between the capital and the ribbon crossing (25–47% of content height). This is 279 px of 1003. The shaft is about 236 px wide.
- **y:** the midpoint of the column's opaque extent along that axis, from the entablature top (16 px) to the base bottom (1125 px). This is 570.5 px of 1144.

The design estimated `{ x: 0.30, y: 0.52 }`.

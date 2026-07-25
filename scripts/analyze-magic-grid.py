"""
分析 magic_images.png 的网格结构。
检测水平和垂直白线，找出实际画面边界。
"""

from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape

print(f"source: {w}x{h}")
print()

WHITE_THRESHOLD = 240
RATIO_THRESHOLD = 0.05

is_white_pixel = (arr[:, :, 0] > WHITE_THRESHOLD) & \
                 (arr[:, :, 1] > WHITE_THRESHOLD) & \
                 (arr[:, :, 2] > WHITE_THRESHOLD)

row_white_ratio = is_white_pixel.mean(axis=1)
col_white_ratio = is_white_pixel.mean(axis=0)

print(f"row_white_ratio: min={row_white_ratio.min():.3f} max={row_white_ratio.max():.3f} mean={row_white_ratio.mean():.3f}")
print(f"col_white_ratio: min={col_white_ratio.min():.3f} max={col_white_ratio.max():.3f} mean={col_white_ratio.mean():.3f}")
print()

print("=== rows with white ratio > 0.05 ===")
row_white_rows = []
for y in range(h):
    if row_white_ratio[y] > 0.05:
        print(f"  y={y}: ratio={row_white_ratio[y]:.3f}")
        row_white_rows.append(y)
print()
print(f"total white rows: {len(row_white_rows)}")
if row_white_rows:
    # 找连续区间
    bands = []
    start = row_white_rows[0]
    prev = row_white_rows[0]
    for y in row_white_rows[1:]:
        if y - prev > 1:
            bands.append((start, prev + 1))
            start = y
        prev = y
    bands.append((start, prev + 1))
    print(f"row white bands: {bands}")
print()

print("=== cols with white ratio > 0.05 ===")
col_white_cols = []
for x in range(w):
    if col_white_ratio[x] > 0.05:
        col_white_cols.append(x)

if col_white_cols:
    bands = []
    start = col_white_cols[0]
    prev = col_white_cols[0]
    for x in col_white_cols[1:]:
        if x - prev > 1:
            bands.append((start, prev + 1))
            start = x
        prev = x
    bands.append((start, prev + 1))
    print(f"col white bands: {bands}")
    print(f"  count: {len(bands)}")
    for s, e in bands:
        print(f"  x=[{s},{e}] width={e-s}px center={(s+e)//2}")

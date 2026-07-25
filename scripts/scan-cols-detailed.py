"""
扫描列亮度，找暗色列段。
"""

from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape

gray = arr.mean(axis=2)
col_mean = gray.mean(axis=0)

print("=== 暗色列段（亮度 < 10）===")
dark_cols = []
in_band = False
start = 0
for x in range(w):
    if col_mean[x] < 10:
        if not in_band:
            start = x
            in_band = True
    else:
        if in_band:
            dark_cols.append((start, x, x - start))
            in_band = False
if in_band:
    dark_cols.append((start, w, w - start))

for s, e, width in dark_cols:
    if width >= 3:
        print(f"  x=[{s},{e}] width={width} center={(s+e)//2}")

print("\n=== 列亮度采样（每 10 列）===")
for x in range(0, w, 10):
    val = col_mean[x]
    bar = "#" * int(val / 3)
    marker = " <-- DARK" if val < 10 else ""
    print(f"  x={x:4d}: {val:6.1f} {bar}{marker}")

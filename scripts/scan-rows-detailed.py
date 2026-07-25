"""
更精细地扫描 magic_images.png 的亮度分布。
输出每行每列的亮度，找出所有可能的分隔位置。
"""

from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape

print(f"source: {w}x{h}")

gray = arr.mean(axis=2)
row_mean = gray.mean(axis=1)
col_mean = gray.mean(axis=0)

# 输出所有行的亮度（每 10 行采样）
print("\n=== 行亮度（每 5 行采样）===")
for y in range(0, h, 5):
    val = row_mean[y]
    bar = "#" * int(val / 3)
    marker = " <-- DARK" if val < 10 else ""
    print(f"  y={y:4d}: {val:6.1f} {bar}{marker}")

# 找出所有亮度 < 10 的连续行段
print("\n=== 暗色行段（亮度 < 10）===")
dark_rows = []
in_band = False
start = 0
for y in range(h):
    if row_mean[y] < 10:
        if not in_band:
            start = y
            in_band = True
    else:
        if in_band:
            dark_rows.append((start, y, y - start))
            in_band = False
if in_band:
    dark_rows.append((start, h, h - start))

for s, e, width in dark_rows:
    if width >= 3:
        print(f"  y=[{s},{e}] width={width} center={(s+e)//2}")

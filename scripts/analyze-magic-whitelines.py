"""
magic_images.png 用更宽松的阈值检测白线/浅色分隔线。
尝试不同阈值，找出真实的分隔线位置。
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

# 尝试不同阈值
for threshold in [240, 220, 200, 180, 150, 120, 100]:
    is_bright = (arr[:, :, 0] > threshold) & \
                (arr[:, :, 1] > threshold) & \
                (arr[:, :, 2] > threshold)

    row_ratio = is_bright.mean(axis=1)
    col_ratio = is_bright.mean(axis=0)

    # 找 ratio > 0.3 的行/列
    row_bands = []
    in_band = False
    start = 0
    for y in range(h):
        if row_ratio[y] > 0.3:
            if not in_band:
                start = y
                in_band = True
        else:
            if in_band:
                row_bands.append((start, y))
                in_band = False
    if in_band:
        row_bands.append((start, h))

    col_bands = []
    in_band = False
    start = 0
    for x in range(w):
        if col_ratio[x] > 0.3:
            if not in_band:
                start = x
                in_band = True
        else:
            if in_band:
                col_bands.append((start, x))
                in_band = False
    if in_band:
        col_bands.append((start, w))

    print(f"=== threshold={threshold}, ratio>0.3 ===")
    print(f"  row bands (width>2): {[(s,e) for s,e in row_bands if e-s > 2]}")
    print(f"  col bands (width>2): {[(s,e) for s,e in col_bands if e-s > 2]}")
    print()

# 额外：查看几个关键位置的像素值
print("=== 采样像素值 ===")
# 5x3 网格预期分隔位置
# 垂直：x = 307, 614, 921, 1228
# 水平：y = 341, 682
sample_points = [
    (307, 100), (307, 500), (307, 900),
    (614, 100), (614, 500), (614, 900),
    (921, 100), (921, 500), (921, 900),
    (1228, 100), (1228, 500), (1228, 900),
    (100, 341), (500, 341), (1000, 341), (1400, 341),
    (100, 682), (500, 682), (1000, 682), (1400, 682),
]
for x, y in sample_points:
    if x < w and y < h:
        r, g, b = arr[y, x]
        print(f"  ({x},{y}): RGB=({r},{g},{b})")

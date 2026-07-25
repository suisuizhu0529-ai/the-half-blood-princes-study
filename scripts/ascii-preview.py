"""
把 magic_images.png 缩小后转成 ASCII 灰度图，直观显示布局。
"""

from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC).convert("L")
arr = np.array(img)
h, w = arr.shape

# 缩小到 80x40
target_w = 120
target_h = 50
chars = " .:-=+*#%@"
# 灰度 0-255 映射到 chars
for y in range(target_h):
    line = ""
    for x in range(target_w):
        # 采样
        src_x = int(x * w / target_w)
        src_y = int(y * h / target_h)
        val = arr[src_y, src_x]
        idx = int(val / 256 * len(chars))
        idx = min(idx, len(chars) - 1)
        line += chars[idx]
    print(line)

print()
print(f"source: {w}x{h}")
print(f"ascii: {target_w}x{target_h}")

# 输出每行的平均亮度（找暗色行）
print()
print("=== 行平均亮度（找暗色分隔带）===")
row_mean = arr.mean(axis=1)
# 缩小到 50 行采样
for y in range(0, h, h // 30):
    val = row_mean[y]
    bar = "#" * int(val / 5)
    print(f"  y={y:4d}: {val:6.1f} {bar}")

print()
print("=== 列平均亮度（找暗色分隔带）===")
col_mean = arr.mean(axis=0)
for x in range(0, w, w // 50):
    val = col_mean[x]
    bar = "#" * int(val / 5)
    print(f"  x={x:4d}: {val:6.1f} {bar}")

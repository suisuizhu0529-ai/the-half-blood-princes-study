"""
扫描 magic_images.png，找出每个画面的实际边界。
策略：
  1. 把图片转灰度
  2. 用阈值二值化（亮像素 = 画面，暗像素 = 边距/分隔）
  3. 连通区域分析，找出每个亮区的边界框
  4. 过滤掉太小的区域（噪声）

输出每个画面区域的边界坐标。
"""

from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape

print(f"source: {w}x{h}")

# 转灰度
gray = arr.mean(axis=2)

# 二值化：亮度 > 30 视为画面
threshold = 30
binary = gray > threshold

# 找连通区域（简单的 flood fill）
from collections import deque

visited = np.zeros_like(binary, dtype=bool)
regions = []

for y in range(h):
    for x in range(w):
        if binary[y, x] and not visited[y, x]:
            # BFS
            queue = deque([(x, y)])
            visited[y, x] = True
            min_x, max_x = x, x
            min_y, max_y = y, y
            count = 0
            while queue:
                cx, cy = queue.popleft()
                count += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                # 4 邻域
                for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h and binary[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((nx, ny))
            # 过滤掉太小的区域（< 5000 像素）
            if count > 5000:
                regions.append({
                    "bbox": (min_x, min_y, max_x+1, max_y+1),
                    "size": (max_x-min_x+1, max_y-min_y+1),
                    "count": count,
                })

print(f"\n找到 {len(regions)} 个亮区:")
for i, r in enumerate(regions):
    bbox = r["bbox"]
    size = r["size"]
    print(f"  region {i}: bbox={bbox} size={size[0]}x{size[1]} pixels={r['count']}")

# 按位置排序（先按行 y，再按列 x）
regions.sort(key=lambda r: (r["bbox"][1], r["bbox"][0]))

print(f"\n按位置排序后:")
for i, r in enumerate(regions):
    bbox = r["bbox"]
    size = r["size"]
    print(f"  region {i}: bbox={bbox} size={size[0]}x{size[1]}")

# 保存每个区域
OUT_DIR = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/_tmp_magic")
OUT_DIR.mkdir(parents=True, exist_ok=True)
for f in OUT_DIR.glob("*.png"):
    f.unlink()

for i, r in enumerate(regions):
    bbox = r["bbox"]
    cell = img.crop(bbox)
    cell.save(OUT_DIR / f"region_{i:02d}.png")
    print(f"  saved region_{i:02d}.png")

print(f"\n{len(regions)} regions saved to _tmp_magic/")

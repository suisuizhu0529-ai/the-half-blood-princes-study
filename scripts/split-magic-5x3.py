"""
magic_images.png 没有白线，改用亮度分布找分隔带。
生成诊断页：源图 + 均匀网格 + 亮度分布图。
"""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
OUT_DIR = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/library_preview")
TMP_DIR = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/_tmp_magic")
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)
for f in TMP_DIR.glob("*.png"):
    f.unlink()
for f in TMP_DIR.glob("*.webp"):
    f.unlink()

img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape
print(f"source: {w}x{h}")

# 1536x1024，假设是 3列x5行 或 5列x3行？
# 1536/3 = 512, 1024/3 = 341.33
# 1536/5 = 307.2, 1024/5 = 204.8
# 1536/4 = 384, 1024/4 = 256
# 用户说 15 张图（除第1张人物已有），即网格可能是 3x5 或 5x3

# 先尝试 5 列 x 3 行 = 15 格
print("\n=== 尝试 5 列 × 3 行 ===")
cols, rows = 5, 3
cell_w = w // cols  # 307
cell_h = h // rows  # 341
print(f"cell size: {cell_w}x{cell_h}")

# 生成切分预览图
preview = img.copy()
draw = ImageDraw.Draw(preview)
for c in range(1, cols):
    x = c * cell_w
    draw.line([(x, 0), (x, h)], fill=(201, 162, 39), width=2)
for r in range(1, rows):
    y = r * cell_h
    draw.line([(0, y), (w, y)], fill=(201, 162, 39), width=2)
preview.save(OUT_DIR / "_grid_5x3.png")

# 切分 15 格
positions = []
for r in range(rows):
    for c in range(cols):
        left = c * cell_w
        upper = r * cell_h
        right = left + cell_w
        lower = upper + cell_h
        cell = img.crop((left, upper, right, lower))
        name = f"cell_r{r}_c{c}.png"
        cell.save(TMP_DIR / name)
        positions.append((r, c, left, upper, right, lower))
        print(f"  r{r}_c{c}: x=[{left},{right}] y=[{upper},{lower}]")

# 生成 HTML 诊断页
html = """<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>magic_images 网格诊断（5×3）</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; background: #1a1a1a; color: #d8c7a5; font-family: serif; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  h2 { font-size: 15px; color: #c9a227; margin: 24px 0 12px; }
  .info { font-size: 13px; color: #888; margin-bottom: 16px; line-height: 1.6; }
  .source-wrap { position: relative; display: inline-block; }
  .source-wrap img { display: block; max-width: 100%; }
  .grid-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
  .grid-overlay line { stroke: #c9a227; stroke-width: 2; }
  .grid-overlay text { fill: #c9a227; font-size: 12px; font-family: monospace; font-weight: bold; }
  .cells { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 1500px; }
  .cell { background: #0b0b0f; border: 1px solid #c9a227; padding: 4px; }
  .cell img { width: 100%; height: auto; display: block; }
  .cell-label { margin-top: 4px; font-size: 11px; color: #c9a227; font-family: monospace; }
  .cell-coords { font-size: 10px; color: #888; margin-top: 2px; font-family: monospace; }
</style>
</head>
<body>
<h1>magic_images.png — 网格诊断（5×3 = 15 格）</h1>
<div class="info">
  源图 1536×1024，无白色分隔线。<br>
  尝试按 5 列 × 3 行均匀切分，每格 307×341。<br>
  请查看每格内容，确认布局是否正确。
</div>

<h2>1. 源图 + 5×3 网格线</h2>
<div class="source-wrap">
  <img src="../magic_images.png" alt="source">
  <svg class="grid-overlay" viewBox="0 0 1536 1024" preserveAspectRatio="none">
"""

# 添加网格线
for c in range(1, cols):
    x = c * cell_w
    html += f'    <line x1="{x}" y1="0" x2="{x}" y2="1024" />\n'
for r in range(1, rows):
    y = r * cell_h
    html += f'    <line x1="0" y1="{y}" x2="1536" y2="{y}" />\n'

# 添加标签
labels = [
    "r0_c0", "r0_c1", "r0_c2", "r0_c3", "r0_c4",
    "r1_c0", "r1_c1", "r1_c2", "r1_c3", "r1_c4",
    "r2_c0", "r2_c1", "r2_c2", "r2_c3", "r2_c4",
]
for i, (r, c, left, upper, right, lower) in enumerate(positions):
    cx = (left + right) // 2
    cy = (upper + lower) // 2
    html += f'    <text x="{cx-30}" y="{cy}">{labels[i]}</text>\n'

html += """  </svg>
</div>

<h2>2. 15 个独立格子</h2>
<div class="cells">
"""

for i, (r, c, left, upper, right, lower) in enumerate(positions):
    name = f"cell_r{r}_c{c}.png"
    html += f'  <div class="cell">\n'
    html += f'    <img src="../_tmp_magic/{name}">\n'
    html += f'    <div class="cell-label">{labels[i]}</div>\n'
    html += f'    <div class="cell-coords">x=[{left},{right}] y=[{upper},{lower}]</div>\n'
    html += f'  </div>\n'

html += """</div>

</body>
</html>
"""

(OUT_DIR / "_diagnostic_5x3.html").write_text(html, encoding="utf-8")
print(f"\n诊断页: {OUT_DIR}/_diagnostic_5x3.html")
print(f"预览图: {OUT_DIR}/_grid_5x3.png")
print(f"15 格: {TMP_DIR}/")

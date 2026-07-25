"""
生成完整诊断页：
1. 源图 + 自动检测的暗色低谷线
2. 行/列亮度分布图
3. 多种切分方案对比
"""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
OUT_DIR = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/library_preview")
OUT_DIR.mkdir(parents=True, exist_ok=True)

img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape

gray = arr.mean(axis=2)
row_mean = gray.mean(axis=1)
col_mean = gray.mean(axis=0)

# 找暗色低谷
def find_dark_bands(mean_arr, threshold=10, min_width=3):
    bands = []
    in_band = False
    start = 0
    for i in range(len(mean_arr)):
        if mean_arr[i] < threshold:
            if not in_band:
                start = i
                in_band = True
        else:
            if in_band:
                width = i - start
                if width >= min_width:
                    bands.append((start, i, width, (start + i) // 2))
                in_band = False
    if in_band:
        width = len(mean_arr) - start
        if width >= min_width:
            bands.append((start, len(mean_arr), width, (start + len(mean_arr)) // 2))
    return bands

row_bands = find_dark_bands(row_mean, 10, 3)
col_bands = find_dark_bands(col_mean, 10, 3)

print("=== 行暗色带 ===")
for s, e, width, center in row_bands:
    print(f"  y=[{s},{e}] width={width} center={center}")

print("\n=== 列暗色带 ===")
for s, e, width, center in col_bands:
    print(f"  x=[{s},{e}] width={width} center={center}")

# 生成标注源图
annotated = img.copy()
draw = ImageDraw.Draw(annotated)

# 标注行暗色带（红色线）
for s, e, width, center in row_bands:
    if 20 < center < h - 20:  # 排除顶部和底部边距
        draw.line([(0, center), (w, center)], fill=(255, 50, 50), width=2)
        draw.text((10, center - 15), f"y={center}", fill=(255, 50, 50))

# 标注列暗色带（蓝色线）
for s, e, width, center in col_bands:
    if 20 < center < w - 20:  # 排除左边和右边距
        draw.line([(center, 0), (center, h)], fill=(50, 100, 255), width=2)
        draw.text((center + 5, 10), f"x={center}", fill=(50, 100, 255))

annotated.save(OUT_DIR / "_annotated_source.png")

# 生成行亮度分布图（横向条形图）
row_chart_h = 200
row_chart = Image.new("RGB", (w, row_chart_h), (10, 10, 15))
draw = ImageDraw.Draw(row_chart)
max_val = max(row_mean.max(), 1)
for x in range(w):
    val = col_mean[x]  # 这里用 col_mean 画在底部
    bar_h = int(val / max_val * (row_chart_h - 20))
    color = (255, 50, 50) if val < 10 else (200, 200, 200)
    draw.line([(x, row_chart_h - 10), (x, row_chart_h - 10 - bar_h)], fill=color, width=1)

# 生成列亮度分布图（纵向条形图）
col_chart_w = 200
col_chart = Image.new("RGB", (col_chart_w, h), (10, 10, 15))
draw = ImageDraw.Draw(col_chart)
max_val = max(col_mean.max(), 1)
for y in range(h):
    val = row_mean[y]
    bar_w = int(val / max_val * (col_chart_w - 20))
    color = (50, 100, 255) if val < 10 else (200, 200, 200)
    draw.line([(10, y), (10 + bar_w, y)], fill=color, width=1)

# 组合成完整诊断图
total_w = w + col_chart_w + 20
total_h = h + row_chart_h + 20 + 100
composite = Image.new("RGB", (total_w, total_h), (10, 10, 15))
composite.paste(annotated, (0, 0))
composite.paste(col_chart, (w + 20, 0))
composite.paste(row_chart, (0, h + 20))

composite.save(OUT_DIR / "_full_diagnostic.png")

print(f"\n诊断图已保存:")
print(f"  标注源图: {OUT_DIR}/_annotated_source.png")
print(f"  完整诊断: {OUT_DIR}/_full_diagnostic.png")

# 生成 HTML 诊断页
html = f"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>magic_images 完整诊断</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; padding: 20px; background: #1a1a1a; color: #d8c7a5; font-family: serif; }}
  h1 {{ font-size: 18px; margin: 0 0 8px; }}
  h2 {{ font-size: 15px; color: #c9a227; margin: 24px 0 12px; }}
  .info {{ font-size: 13px; color: #888; margin-bottom: 16px; line-height: 1.6; }}
  .source-wrap {{ position: relative; display: inline-block; }}
  .source-wrap img {{ display: block; max-width: 100%; }}
  table {{ border-collapse: collapse; margin: 12px 0; }}
  th, td {{ border: 1px solid #c9a227; padding: 6px 12px; font-family: monospace; font-size: 12px; }}
  th {{ background: #2a1a3a; color: #c9a227; }}
  td {{ color: #d8c7a5; }}
  .legend {{ margin-top: 12px; padding: 12px; background: #0b0b0f; border: 1px solid #c9a227; }}
  .legend p {{ margin: 6px 0; font-size: 13px; }}
  .red {{ color: #ff5050; }}
  .blue {{ color: #5064ff; }}
</style>
</head>
<body>

<h1>magic_images.png — 完整诊断</h1>
<div class="info">
  源图 {w}×{h}。红色线 = 行暗色带（水平分隔），蓝色线 = 列暗色带（垂直分隔）。<br>
  请查看标注图，告诉我正确的切分位置。
</div>

<h2>1. 标注源图（红线=行分隔，蓝线=列分隔）</h2>
<div class="source-wrap">
  <img src="_annotated_source.png" alt="annotated">
</div>

<h2>2. 检测到的行暗色带</h2>
<table>
<tr><th>起始 y</th><th>结束 y</th><th>宽度</th><th>中心</th><th>用途</th></tr>
"""
for s, e, width, center in row_bands:
    purpose = ""
    if center < 50:
        purpose = "顶部边距"
    elif center > h - 50:
        purpose = "底部边距"
    else:
        purpose = "可能的行分隔"
    html += f"<tr><td>{s}</td><td>{e}</td><td>{width}</td><td>{center}</td><td>{purpose}</td></tr>\n"

html += """</table>

<h2>3. 检测到的列暗色带</h2>
<table>
<tr><th>起始 x</th><th>结束 x</th><th>宽度</th><th>中心</th><th>用途</th></tr>
"""
for s, e, width, center in col_bands:
    purpose = ""
    if center < 50:
        purpose = "左边距"
    elif center > w - 50:
        purpose = "右边距"
    else:
        purpose = "可能的列分隔"
    html += f"<tr><td>{s}</td><td>{e}</td><td>{width}</td><td>{center}</td><td>{purpose}</td></tr>\n"

html += f"""</table>

<h2>4. 完整诊断图（源图+亮度分布）</h2>
<div class="source-wrap">
  <img src="_full_diagnostic.png" alt="full" style="max-width: 100%;">
</div>

<div class="legend">
  <p><strong>分析结果：</strong></p>
  <p>源图 {w}×{h}，检测到 {len(row_bands)} 个行暗色带，{len(col_bands)} 个列暗色带。</p>
  <p>排除边距后，行分隔位置：{[c for s, e, w, c in row_bands if 50 < c < h - 50]}</p>
  <p>排除边距后，列分隔位置：{[c for s, e, w, c in col_bands if 50 < c < w - 50]}</p>
  <p class="red">红线 = 行分隔（水平切分线）</p>
  <p class="blue">蓝线 = 列分隔（垂直切分线）</p>
  <p><strong>请告诉我：</strong></p>
  <p>1. 标注图上的分隔线位置是否正确？</p>
  <p>2. 如果不正确，请告诉我每条切分线的精确位置（x 或 y 坐标）。</p>
  <p>3. 或者告诉我每格的画面边界（左上角和右下角坐标）。</p>
</div>

</body>
</html>
"""

(OUT_DIR / "_full_diagnostic.html").write_text(html, encoding="utf-8")
print(f"HTML 诊断页: {OUT_DIR}/_full_diagnostic.html")

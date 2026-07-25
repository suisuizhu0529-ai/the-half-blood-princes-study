"""
精确找出 magic_images.png 的行列分隔位置。
策略：扫描每行/列的平均亮度，找出暗色低谷（分隔带）。
"""

from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC).convert("RGB")
arr = np.array(img)
h, w, _ = arr.shape

print(f"source: {w}x{h}")

# 计算每行/列的平均亮度
gray = arr.mean(axis=2)
row_mean = gray.mean(axis=1)  # shape (h,)
col_mean = gray.mean(axis=0)  # shape (w,)

# 用滑动窗口平滑（窗口 5）
def smooth(arr, window=5):
    kernel = np.ones(window) / window
    return np.convolve(arr, kernel, mode="same")

row_smooth = smooth(row_mean, 5)
col_smooth = smooth(col_mean, 5)

# 找暗色低谷：局部最小值，且亮度 < 整体均值的 0.4
def find_dark_valleys(smoothed, raw, threshold_ratio=0.4):
    mean_val = raw.mean()
    threshold = mean_val * threshold_ratio
    valleys = []
    for i in range(2, len(smoothed) - 2):
        if smoothed[i] < threshold and smoothed[i] <= smoothed[i-1] and smoothed[i] <= smoothed[i+1]:
            valleys.append(i)
    return valleys

row_valleys = find_dark_valleys(row_smooth, row_mean)
col_valleys = find_dark_valleys(col_smooth, col_mean)

print(f"\n行平均亮度: mean={row_mean.mean():.1f}, threshold={row_mean.mean()*0.4:.1f}")
print(f"行暗色低谷位置 (y): {row_valleys}")

print(f"\n列平均亮度: mean={col_mean.mean():.1f}, threshold={col_mean.mean()*0.4:.1f}")
print(f"列暗色低谷位置 (x): {col_valleys}")

# 把连续的低谷合并
def merge_valleys(valleys, min_gap=20):
    if not valleys:
        return []
    merged = [valleys[0]]
    for v in valleys[1:]:
        if v - merged[-1] > min_gap:
            merged.append(v)
        else:
            # 取平均
            merged[-1] = (merged[-1] + v) // 2
    return merged

row_valleys_merged = merge_valleys(row_valleys)
col_valleys_merged = merge_valleys(col_valleys)

print(f"\n合并后行低谷 (y): {row_valleys_merged}")
print(f"合并后列低谷 (x): {col_valleys_merged}")

# 根据低谷计算切分边界
# 假设 3 行 5 列
# 行低谷应该在 y ≈ 340, 680 附近
# 列低谷应该在 x ≈ 307, 614, 921, 1228 附近

# 找出最接近预期位置的低谷
def find_nearest(valleys, expected_list, tolerance=50):
    result = []
    for exp in expected_list:
        if not valleys:
            result.append(exp)
            continue
        nearest = min(valleys, key=lambda v: abs(v - exp))
        if abs(nearest - exp) <= tolerance:
            result.append(nearest)
        else:
            result.append(exp)
    return result

expected_rows = [340, 680]
expected_cols = [307, 614, 921, 1228]

actual_row_cuts = find_nearest(row_valleys_merged, expected_rows)
actual_col_cuts = find_nearest(col_valleys_merged, expected_cols)

print(f"\n实际行切分位置 (y): {actual_row_cuts}")
print(f"实际列切分位置 (x): {actual_col_cuts}")

# 计算切分边界（在低谷中心切，保留两侧画面）
row_bounds = [(0, actual_row_cuts[0])]
for i in range(len(actual_row_cuts) - 1):
    row_bounds.append((actual_row_cuts[i], actual_row_cuts[i+1]))
row_bounds.append((actual_row_cuts[-1], h))

col_bounds = [(0, actual_col_cuts[0])]
for i in range(len(actual_col_cuts) - 1):
    col_bounds.append((actual_col_cuts[i], actual_col_cuts[i+1]))
col_bounds.append((actual_col_cuts[-1], w))

print(f"\n行边界: {row_bounds}")
print(f"列边界: {col_bounds}")

# 保存切分结果
OUT_DIR = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/_tmp_magic")
OUT_DIR.mkdir(parents=True, exist_ok=True)
for f in OUT_DIR.glob("*.png"):
    f.unlink()

print(f"\n=== 切分 {len(row_bounds)}x{len(col_bounds)} = {len(row_bounds)*len(col_bounds)} 格 ===")
idx = 0
for r, (r_start, r_end) in enumerate(row_bounds):
    for c, (c_start, c_end) in enumerate(col_bounds):
        cell = img.crop((c_start, r_start, c_end, r_end))
        name = f"cell_r{r}_c{c}.png"
        cell.save(OUT_DIR / name)
        print(f"  r{r}_c{c} ({name}): x=[{c_start},{c_end}] y=[{r_start},{r_end}] size={c_end-c_start}x{r_end-r_start}")
        idx += 1

print(f"\n{idx} cells saved.")

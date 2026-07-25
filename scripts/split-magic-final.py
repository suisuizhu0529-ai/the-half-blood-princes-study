"""
按照 Gemini 提供的精确坐标切分 magic_images.png。
坐标格式：[ymin, xmin, ymax, xmax]，千分比（0-1000）。
"""

from pathlib import Path
from PIL import Image

# 源图
SRC = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/archive/magic_images.png")
img = Image.open(SRC)
h, w = img.size[1], img.size[0]  # PIL: (width, height)
print(f"源图: {w}x{h}")

# 切分坐标（千分比）
# 格式：[ymin, xmin, ymax, xmax]
cuts = {
    "professor-profile": {
        "half-blood-prince.webp": [47, 8, 303, 170],
        "potion-master-office.webp": [47, 172, 303, 330],
        "silent-scholar.webp": [47, 332, 303, 493],
    },
    "potion-research": {
        "draught-living-death.webp": [47, 508, 303, 667],
        "advanced-potion-theory.webp": [47, 669, 303, 829],
        "rare-ingredients.webp": [47, 831, 303, 992],
    },
    "hogwarts-documents": {
        "potion-exam-record.webp": [374, 8, 617, 170],
        "ancient-research-notes.webp": [374, 172, 617, 330],
        "professor-archive-file.webp": [374, 332, 617, 493],
    },
    "literary-archive": {
        "language-of-silence.webp": [374, 508, 617, 667],
        "art-of-knowledge.webp": [374, 669, 617, 829],
        "forgotten-wizard-text.webp": [374, 831, 617, 992],
    },
    "hidden-manuscripts": {
        "unsigned-letter.webp": [703, 204, 946, 387],
        "seventh-drawer.webp": [703, 389, 946, 582],
        "final-page.webp": [703, 584, 946, 791],
    },
}

# 输出目录
BASE = Path("/Users/zhangyawen/工作work/ai-bc/The Half-Blood Prince's Study /public/images/library")

# 创建目录
for category in cuts:
    (BASE / category).mkdir(parents=True, exist_ok=True)

# 切分
total = 0
skipped = 0
for category, files in cuts.items():
    print(f"\n=== {category} ===")
    for filename, coords in files.items():
        # 跳过已存在的 half-blood-prince（从 snape-character-sheet.png 切分）
        if filename == "half-blood-prince.webp" and (BASE / category / filename).exists():
            print(f"  {filename}: 已存在，跳过")
            skipped += 1
            continue

        # 千分比转像素坐标
        ymin, xmin, ymax, xmax = coords
        left = int(xmin * w / 1000)
        upper = int(ymin * h / 1000)
        right = int(xmax * w / 1000)
        lower = int(ymax * h / 1000)

        # 切分
        cell = img.crop((left, upper, right, lower))
        out_path = BASE / category / filename
        cell.save(out_path, "WEBP", quality=95)
        print(f"  {filename}: 像素坐标 ({left},{upper})-({right},{lower}), 尺寸 {right-left}x{lower-upper}")
        total += 1

print(f"\n完成：切分 {total} 张，跳过 {skipped} 张")
print(f"输出目录：{BASE}/")
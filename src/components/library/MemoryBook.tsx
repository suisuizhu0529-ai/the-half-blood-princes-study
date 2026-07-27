import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LibraryEntry, LibraryCategoryMeta } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import { getUnlockStatus, getFeatureUnlockStatus } from "@/utils/archiveUnlock";
import MemoryPage from "./MemoryPage";

interface MemoryBookProps {
  /** 当前书（分类元信息） */
  category: LibraryCategoryMeta;
  /** 该分类下所有 entries */
  entries: LibraryEntry[];
  /** 学习进度（计算解锁状态） */
  progress: LearningProgress;
  /** 已查看的 entryId 列表 */
  viewedIds: string[];
  /** 当前页索引（受控，由 MemoryChamberOverlay 持有以便同步翻页） */
  pageIndex: number;
  /** 翻页方向（受控，用于 AnimatePresence 翻页动画方向） */
  direction: number;
  /** 翻页回调（受控） */
  onPageChange: (index: number, direction: number) => void;
  /** 点击 unlocked entry → 打开 ArchiveViewer */
  onOpenArchive: (entry: LibraryEntry) => void;
  /** Phase 20.2.2：TTS 是否正在播放 */
  speaking: boolean;
  /** Phase 20.2.2：TTS 是否可用 */
  audioSupported: boolean;
  /** Phase 20.2.2：点击 Listen 触发（speak/stop 由上层处理） */
  onListen: () => void;
}

/**
 * MemoryBook —— Phase 20.2.1 立体魔法书。
 *
 * Phase 20.2.1 视觉重写：
 *   - 摒弃"横向卡片容器"形态
 *   - 采用真实书页比例（单页 width:height ≈ 0.7）
 *   - 桌面端双页展开约 880px × 620px（每页 440 × 620）
 *   - 移动端单页展开约 90vw × 自适应
 *   - 中央装订线 + 内侧阴影 + 页缘泛黄
 *   - 左页：书目扉页（标题/副标/描述/页数）
 *   - 右页：当前 MemoryPage（翻页动画）
 *   - 翻页箭头悬浮于书页外侧
 *   - 底部页码圆点指示器
 *
 * 不改：
 *   - 数据结构、unlock 逻辑、ArchiveViewer
 *   - 翻页交互（仍由 MemoryChamberOverlay 按住拖动触发）
 */
export default function MemoryBook({
  category,
  entries,
  progress,
  viewedIds,
  pageIndex,
  direction,
  onPageChange,
  onOpenArchive,
  speaking,
  audioSupported,
  onListen,
}: MemoryBookProps) {
  const theme = category.colorTheme;
  const total = entries.length;
  const currentEntry = entries[pageIndex];
  const currentStatus = getUnlockStatus(currentEntry, progress);
  const isViewed = viewedIds.includes(currentEntry.id);
  // Phase 20.2.2：当前 entry 内部特性解锁状态（透传给 MemoryPage）
  const currentFeatureStatus = getFeatureUnlockStatus(currentEntry, progress);

  const goToPage = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      onPageChange(next, next > pageIndex ? 1 : -1);
    },
    [pageIndex, total, onPageChange],
  );

  const handlePrev = useCallback(() => {
    if (pageIndex > 0) {
      onPageChange(pageIndex - 1, -1);
    }
  }, [pageIndex, onPageChange]);

  const handleNext = useCallback(() => {
    if (pageIndex < total - 1) {
      onPageChange(pageIndex + 1, 1);
    }
  }, [pageIndex, total, onPageChange]);

  if (!theme) return null;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ perspective: "1800px" }}
    >
      {/* === 立体魔法书双页展开 ===
          Phase 20.2.1：真实书页比例
          - 桌面：每页 440×620（比例 0.71），整书 880×620
          - 移动：单页 90vw，高度按 0.7 比例由 vw 推导
          - 高度由比例决定，不再使用固定 vh */}
      <div
        className="relative flex"
        style={{
          // 桌面端双页总宽 880px；移动端 90vw 单页
          width: "min(880px, 92vw)",
          // 单页比例 0.7 → 整书宽度 880 时高度 = 440/0.7 ≈ 628
          // 用 aspect-ratio 让高度自然由宽度决定，保证书页比例恒定
          aspectRatio: "880 / 628",
          transformStyle: "preserve-3d",
        }}
      >
        {/* === 左页：扉页（书目信息） ===
            桌面端显示，移动端隐藏（移动端只看右页） */}
        <div
          className="parchment-surface relative hidden h-full w-1/2 overflow-hidden rounded-l-sm sm:block"
          style={{
            boxShadow:
              "inset -28px 0 38px -12px rgba(60,40,15,0.32), inset 0 0 90px rgba(120,90,40,0.10)",
          }}
        >
          {/* 页缘泛黄（左页右侧靠近装订线） */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/4"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(140,100,40,0.18))",
            }}
          />

          {/* 装订线（左页右缘） */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(40,28,12,0.55))",
            }}
          />

          {/* 扉页内容：竖向居中，右对齐（靠近装订线） */}
          <div className="flex h-full flex-col justify-center px-12 text-right lg:px-16">
            {/* 顶部小标 */}
            <p
              className="font-ui text-[10px] uppercase tracking-widest3"
              style={{ color: `${theme.gold}aa` }}
            >
              ✦ Memory Chamber ✦
            </p>

            {/* 主标题 —— 放大，呈现魔法书气质 */}
            <h2
              className="mt-5 font-display text-3xl leading-tight tracking-widest2 lg:text-4xl"
              style={{ color: theme.gold }}
            >
              {category.title}
            </h2>

            {/* 中文副标题 */}
            <p className="mt-3 font-zh text-sm tracking-[0.5em] text-ink/65 lg:text-base">
              {category.titleZh}
            </p>

            {/* 装饰金线 */}
            <div className="mt-8 flex justify-end">
              <div
                className="h-px w-24"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.gold}80)`,
                }}
              />
            </div>

            {/* 描述（衬线斜体，阅读级） */}
            <p className="mt-6 font-serif text-sm italic leading-relaxed text-ink/60 lg:text-base lg:leading-relaxed">
              {category.description}
            </p>

            {/* 页数 */}
            <p className="mt-10 font-ui text-[10px] uppercase tracking-widest3 text-ink/45">
              {total} {total === 1 ? "page" : "pages"} · sealed in his hand
            </p>
          </div>
        </div>

        {/* === 右页：当前 MemoryPage === */}
        <div
          className="relative h-full w-full overflow-hidden rounded-r-sm sm:w-1/2"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* 装订线阴影（右页左缘） */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-4"
            style={{
              background:
                "linear-gradient(90deg, rgba(40,28,12,0.45), transparent)",
            }}
          />
          {/* 页缘泛黄（右页左侧靠近装订线） */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-1/4"
            style={{
              background:
                "linear-gradient(270deg, transparent, rgba(140,100,40,0.12))",
            }}
          />

          <AnimatePresence mode="wait" custom={direction}>
            <MemoryPage
              key={currentEntry.id}
              entry={currentEntry}
              status={currentStatus}
              index={pageIndex}
              total={total}
              viewed={isViewed}
              theme={theme}
              onOpenArchive={onOpenArchive}
              progress={progress}
              featureStatus={currentFeatureStatus}
              speaking={speaking}
              audioSupported={audioSupported}
              onListen={onListen}
            />
          </AnimatePresence>
        </div>

        {/* === 翻页箭头（悬浮于书页外侧） === */}
        {pageIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous page"
            className="absolute left-0 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/30 bg-stone/80 p-2.5 text-parchment/70 backdrop-blur-sm transition-all duration-300 hover:border-gold/70 hover:text-gold"
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
        )}
        {pageIndex < total - 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next page"
            className="absolute right-0 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/30 bg-stone/80 p-2.5 text-parchment/70 backdrop-blur-sm transition-all duration-300 hover:border-gold/70 hover:text-gold"
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* === 底部页码指示器 === */}
      <div className="mt-8 flex items-center gap-3">
        {entries.map((entry, idx) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => goToPage(idx)}
            aria-label={`Go to page ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-400 ${
              idx === pageIndex
                ? "w-7 bg-gold/85"
                : "w-1.5 bg-parchment/25 hover:bg-parchment/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

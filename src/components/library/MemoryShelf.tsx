import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ArchiveBook from "./ArchiveBook";
import type { LibraryCategoryMeta, LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import { getUnlockStatus } from "@/utils/archiveUnlock";

interface MemoryShelfProps {
  /** 所有分类元信息 */
  categories: LibraryCategoryMeta[];
  /** 按 category id 分组的 entries */
  entriesByCategory: Map<string, LibraryEntry[]>;
  /** 学习进度（计算解锁状态） */
  progress: LearningProgress;
  /** 当前焦点索引 */
  focusedIndex: number;
  /** 切换焦点 */
  onFocusChange: (index: number) => void;
  /** 焦点书被点击（已为焦点时再点击）→ 进入 Memory Chamber */
  onFocusedBookActivate: () => void;
}

/**
 * MemoryShelf —— Phase 20.1 Round 1 魔法书架空间。
 *
 * 替代旧的纵向 ArchiveCategoryCard 列表 / 横向 carousel。
 *
 * 视觉：
 *   - 深色木质书架背景（横向木板 + 阴影）
 *   - 竖向书背排列（ArchiveBook）
 *   - 焦点书居中突出、上浮、金色光晕
 *   - 两侧非焦点书半透明、略小
 *
 * 交互：
 *   - 横向拖动书架 → 切换焦点书（dragX 阈值触发）
 *   - 左右箭头按钮 → 切换焦点
 *   - 点击非焦点书 → 切换焦点
 *   - 点击焦点书 → 进入 Memory Chamber（onFocusedBookActivate）
 *
 * 不改数据结构，仅作 Library 页面的空间化入口。
 */
export default function MemoryShelf({
  categories,
  entriesByCategory,
  progress,
  focusedIndex,
  onFocusChange,
  onFocusedBookActivate,
}: MemoryShelfProps) {
  // 拖动状态：记录起始 x，松手时判断方向
  const dragStartX = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 计算每本书的解锁进度
  const getBookProgress = useCallback(
    (category: LibraryCategoryMeta) => {
      const entries = entriesByCategory.get(category.id) ?? [];
      const total = entries.length;
      let revealed = 0;
      for (const entry of entries) {
        const status = getUnlockStatus(entry, progress);
        if (status === "unlocked" && !entry.locked) revealed++;
      }
      return { total, revealed };
    },
    [entriesByCategory, progress],
  );

  // 书背点击：非焦点→切换焦点；焦点→进入 Chamber
  const handleBookSelect = useCallback(
    (index: number) => {
      if (index !== focusedIndex) {
        onFocusChange(index);
      } else {
        onFocusedBookActivate();
      }
    },
    [focusedIndex, onFocusChange, onFocusedBookActivate],
  );

  // 拖动开始
  const handleDragStart = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    setIsDragging(true);
  };

  // 拖动结束：判断方向
  const handleDragEnd = (e: React.PointerEvent) => {
    if (dragStartX.current === null) {
      setIsDragging(false);
      return;
    }
    const deltaX = e.clientX - dragStartX.current;
    const threshold = 40; // 拖动 40px 以上触发切换
    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0) {
        // 向左拖 → 下一本
        const next =
          focusedIndex < categories.length - 1 ? focusedIndex + 1 : 0;
        onFocusChange(next);
      } else {
        // 向右拖 → 上一本
        const next =
          focusedIndex > 0 ? focusedIndex - 1 : categories.length - 1;
        onFocusChange(next);
      }
    }
    dragStartX.current = null;
    setIsDragging(false);
  };

  // 左右箭头
  const handlePrev = useCallback(() => {
    const next = focusedIndex > 0 ? focusedIndex - 1 : categories.length - 1;
    onFocusChange(next);
  }, [focusedIndex, categories.length, onFocusChange]);

  const handleNext = useCallback(() => {
    const next = focusedIndex < categories.length - 1 ? focusedIndex + 1 : 0;
    onFocusChange(next);
  }, [focusedIndex, categories.length, onFocusChange]);

  return (
    <div className="relative mx-auto w-full max-w-[1100px]">
      {/* 左右切换箭头 */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous book"
        className="absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-full border border-gold/20 bg-stone/60 p-2.5 text-parchment/50 backdrop-blur-sm transition-all duration-300 hover:border-gold/50 hover:text-gold/90 sm:p-3"
      >
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={handleNext}
        aria-label="Next book"
        className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-full border border-gold/20 bg-stone/60 p-2.5 text-parchment/50 backdrop-blur-sm transition-all duration-300 hover:border-gold/50 hover:text-gold/90 sm:p-3"
      >
        <ChevronRight size={20} strokeWidth={1.5} />
      </button>

      {/* 书架本体：深色木板 + 横向拖动区 */}
      <div
        className="relative overflow-hidden rounded-sm"
        style={{
          // 木质书架背景：深棕渐变 + 顶部高光
          background:
            "linear-gradient(180deg, rgba(45,32,20,0.4) 0%, rgba(20,12,4,0.6) 50%, rgba(45,32,20,0.4) 100%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.7), 0 8px 30px rgba(0,0,0,0.5)",
        }}
        onPointerDown={handleDragStart}
        onPointerUp={handleDragEnd}
        onPointerLeave={handleDragEnd}
      >
        {/* 顶部木板高光线 */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(201,162,39,0.25), transparent)",
          }}
        />
        {/* 底部木板阴影 */}
        <div
          className="absolute inset-x-0 bottom-0 h-12"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(0,0,0,0.5))",
          }}
        />

        {/* 书本排列区：横向 flex，居中对齐 */}
        <div
          className="relative flex items-end justify-center gap-3 px-16 py-12 sm:gap-5"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          {categories.map((category, idx) => {
            const { total, revealed } = getBookProgress(category);
            return (
              <ArchiveBook
                key={category.id}
                category={category}
                isFocused={idx === focusedIndex}
                totalEntries={total}
                revealedCount={revealed}
                onSelect={() => handleBookSelect(idx)}
              />
            );
          })}
        </div>
      </div>

      {/* 焦点指示器（底部小点） */}
      <div className="mt-8 flex justify-center gap-2">
        {categories.map((category, idx) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onFocusChange(idx)}
            aria-label={`Focus ${category.title}`}
            className={`h-1.5 rounded-full transition-all duration-400 ${
              idx === focusedIndex
                ? "w-6 bg-gold/80"
                : "w-1.5 bg-parchment/25 hover:bg-parchment/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

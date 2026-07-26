import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { LibraryCategoryMeta, LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import ArchiveCategoryCard from "./ArchiveCategoryCard";

interface MemoryChamberOverlayProps {
  /** 当前召唤的书（分类元信息） */
  category: LibraryCategoryMeta;
  /** 该分类下的 entries */
  entries: LibraryEntry[];
  /** 学习进度（解锁状态用） */
  progress: LearningProgress;
  /** 该分类在 LIBRARY_CATEGORIES 中的索引 */
  index: number;
  /** 当前展开的 entryId（单选展开） */
  expandedEntryId: string | null;
  /** 切换 entry 展开 */
  onEntryToggle: (entryId: string) => void;
  /** 点击图片档案 → 全屏 Viewer */
  onImageView: (entry: LibraryEntry) => void;
  /** 已查看的 entryId 列表 */
  viewedIds: string[];
  /** 关闭 Memory Chamber，书飞回书架 */
  onClose: () => void;
}

/**
 * MemoryChamberOverlay —— Phase 20.1 Round 1.5 记忆室召唤覆盖层。
 *
 * 当用户点击焦点书时，书通过 layoutId 飞出书架、移到屏幕中心并放大展开，
 * 显示该分类的 entries（复用 ArchiveCategoryCard 渲染，不改数据结构）。
 *
 * 动画流程（Framer Motion layoutId 自动补间）：
 *   1. 书架上的 motion.button（layoutId=`memory-book-${id}`）被卸载
 *   2. 本组件的 motion.div（相同 layoutId）被挂载到中心
 *   3. Framer Motion 自动补间：书从书架位置飞到中心 + 放大 + rotateY 回正
 *   4. 飞行完成后，展开 ArchiveCategoryCard 内容
 *
 * 关闭：
 *   - 点击 X 按钮 / ESC / 点击背景
 *   - 反向动画：书飞回书架原位
 */
export default function MemoryChamberOverlay({
  category,
  entries,
  progress,
  index,
  expandedEntryId,
  onEntryToggle,
  onImageView,
  viewedIds,
  onClose,
}: MemoryChamberOverlayProps) {
  const theme = category.colorTheme;

  return (
    <motion.div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.5 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${category.title} Memory Chamber`}
    >
      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close memory chamber"
        className="absolute right-6 top-6 z-50 rounded-full border border-gold/20 bg-stone/60 p-2.5 text-parchment/60 backdrop-blur-sm transition-all duration-300 hover:border-gold/50 hover:text-gold/90"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      {/* 召唤出的书（layoutId 飞出 + 放大 + 展开） */}
      <motion.div
        layoutId={`memory-book-${category.id}`}
        className="relative flex flex-col items-center"
        style={{
          width: "min(680px, 90vw)",
          maxHeight: "85vh",
          // 3D 透视：飞出过程中保持立体感
          perspective: "1200px",
        }}
        onClick={(e) => e.stopPropagation()}
        initial={{ rotateY: -12 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 书本外框：皮革质感（呼应书架上的书） */}
        <motion.div
          className="relative w-full overflow-hidden rounded-md"
          style={{
            background: theme
              ? `linear-gradient(180deg, ${theme.leatherHighlight} 0%, ${theme.leather} 100%)`
              : "linear-gradient(180deg, #3a2a1a 0%, #2a1d12 100%)",
            boxShadow: `0 30px 80px rgba(0,0,0,0.9), 0 0 0 1px ${theme?.gold ?? "#c9a227"}44, inset 0 0 60px rgba(0,0,0,0.5)`,
            border: `1px solid ${theme?.gold ?? "#c9a227"}33`,
          }}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* 书顶装饰金线 */}
          <div
            className="absolute inset-x-8 top-5 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme?.gold ?? "#c9a227"}80, transparent)`,
            }}
          />
          <div
            className="absolute inset-x-10 top-8 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme?.gold ?? "#c9a227"}40, transparent)`,
            }}
          />

          {/* 书名标题区 */}
          <div className="px-10 pt-14 text-center">
            <p className="font-ui text-[10px] uppercase tracking-widest3" style={{ color: `${theme?.gold ?? "#c9a227"}99` }}>
              Memory Chamber
            </p>
            <h2 className="mt-3 font-display text-2xl tracking-widest2 sm:text-3xl" style={{ color: theme?.gold ?? "#c9a227" }}>
              {category.title}
            </h2>
            <p className="mt-2 font-zh text-sm tracking-[0.4em] text-parchment/55">
              {category.titleZh}
            </p>
            <p className="mx-auto mt-4 max-w-md font-serif text-sm italic text-parchment/60">
              {category.description}
            </p>
          </div>

          {/* 书底装饰金线 */}
          <div
            className="absolute inset-x-10 bottom-32 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme?.gold ?? "#c9a227"}40, transparent)`,
            }}
          />
          <div
            className="absolute inset-x-8 bottom-28 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme?.gold ?? "#c9a227"}80, transparent)`,
            }}
          />

          {/* entries 内容区（复用 ArchiveCategoryCard 渲染逻辑）
              注意：ArchiveCategoryCard 的 expanded 永远为 true（在 Chamber 中永远展开） */}
          <div className="max-h-[50vh] overflow-y-auto px-8 pb-12 pt-8">
            <ArchiveCategoryCard
              category={category}
              entries={entries}
              expanded={true}
              index={index}
              progress={progress}
              onToggle={() => {
                /* Chamber 内不响应卡片级 toggle */
              }}
              expandedEntryId={expandedEntryId}
              onEntryToggle={onEntryToggle}
              onImageView={onImageView}
              viewedIds={viewedIds}
            />
          </div>
        </motion.div>

        {/* 底部巨大投影（书悬浮于空间中） */}
        <div
          className="mt-2 rounded-full"
          style={{
            width: "60%",
            height: "20px",
            background: "rgba(0,0,0,0.7)",
            filter: "blur(20px)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

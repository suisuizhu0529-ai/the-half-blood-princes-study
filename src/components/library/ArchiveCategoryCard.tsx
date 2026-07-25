import { motion } from "framer-motion";
import { ChevronDown, Feather } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LibraryCategory, LibraryEntry, LibraryCategoryMeta } from "@/types/library";
import type { UnlockStatus } from "@/utils/archiveUnlock";
import { getUnlockStatus } from "@/utils/archiveUnlock";
import type { LearningProgress } from "@/utils/archiveUnlock";
import ArchiveEntryCard from "./ArchiveEntryCard";

interface ArchiveCategoryCardProps {
  /** 分类元信息 */
  category: LibraryCategoryMeta;
  /** 该分类下所有 entries */
  entries: LibraryEntry[];
  /** 当前是否展开 */
  expanded: boolean;
  /** 列表入场索引 */
  index: number;
  /** 学习进度（用于计算解锁状态 + 透传给 ArchiveChamber） */
  progress: LearningProgress;
  /** 切换展开状态 */
  onToggle: (categoryId: LibraryCategory) => void;
  /**
   * Phase 7C：当前展开的 entryId（Archive Chamber 内嵌展开）。
   * null 表示无 entry 展开。
   */
  expandedEntryId: string | null;
  /** Phase 7C：切换 Archive Chamber 展开 / 折叠 */
  onEntryToggle: (entryId: string) => void;
  /** Phase 7D-3.2：点击图片打开全屏 Archive Viewer */
  onImageView: (entry: LibraryEntry) => void;
  /** Phase 7D-6：已查看档案 entryId 列表（打开过 Viewer） */
  viewedIds: string[];
}

/**
 * Archive 分类卡片（Phase 7B → 7C）。
 *
 * 折叠状态：显示分类标题 + 中文 + 进度（N archives / M revealed）
 * 展开状态：在卡片内部展开该分类下所有 ArchiveEntryCard
 *          每张 ArchiveEntryCard 可进一步就地展开 ArchiveChamber
 *
 * Phase 7C 升级：
 *   - onEntrySelect 替换为 expandedEntryId + onEntryToggle
 *   - 单选展开：同一时间只有一个 entry 的 Chamber 展开
 *   - 与 NotebookItem + MemoryChamber 结构对称
 *
 * 视觉延续 Dark Academia：羊皮纸 + 金色细边 + Cinzel 标题 + 羽毛笔装饰。
 */
export default function ArchiveCategoryCard({
  category,
  entries,
  expanded,
  index,
  progress,
  onToggle,
  expandedEntryId,
  onEntryToggle,
  onImageView,
  viewedIds,
}: ArchiveCategoryCardProps) {
  // 计算该分类下每条 entry 的解锁状态
  const statuses: UnlockStatus[] = entries.map((e) =>
    getUnlockStatus(e, progress),
  );
  const revealedCount = statuses.filter((s) => s === "unlocked").length;
  const total = entries.length;

  const handleToggle = () => onToggle(category.id);

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
        delay: 0.2 + Math.min(index * 0.06, 0.4),
      }}
      className="parchment-surface relative rounded-sm shadow-parchment-deep"
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-sm border border-gold/30" />

      <article className="relative px-7 py-6 sm:px-9 sm:py-7">
        {/* 顶部可点击区 */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={`category-${category.id}`}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Feather
              size={15}
              strokeWidth={1.4}
              className="text-[#7a5a12] drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              aria-hidden
            />
            <div>
              <h3 className="font-display text-xl tracking-widest2 text-ink/80 sm:text-2xl">
                {category.title}
              </h3>
              <p className="mt-0.5 font-zh text-[10px] tracking-[0.4em] text-ink/45">
                {category.titleZh}
              </p>
              {/* Phase 7D-4：金色短分割线 —— 强化档案册层次 */}
              <div className="archive-rule mt-2" aria-hidden />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 进度统计 */}
            <div className="text-right">
              <p className="font-ui text-[10px] uppercase tracking-widest3 text-ink/55">
                {total === 1 ? "1 archive" : `${total} archives`}
              </p>
              <p
                className={cn(
                  "mt-0.5 font-ui text-[10px] uppercase tracking-widest3",
                  revealedCount > 0 ? "text-gold/80" : "text-ink/35",
                )}
              >
                {revealedCount === 1
                  ? "1 revealed"
                  : `${revealedCount} revealed`}
              </p>
            </div>

            {/* 展开箭头 */}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-ink/45"
            >
              <ChevronDown size={16} strokeWidth={1.5} />
            </motion.span>
          </div>
        </button>

        {/* 短描述（折叠状态可见，展开后也保留作为分类引言） */}
        <p className="mt-3 font-serif text-sm italic leading-relaxed text-ink/50">
          {category.description}
        </p>

        {/* 展开区：entry 列表 */}
        <div
          id={`category-${category.id}`}
          className="grid transition-all duration-500 ease-out"
          style={{
            gridTemplateRows: expanded ? "1fr" : "0fr",
            opacity: expanded ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="mt-5 border-t border-gold/20 pt-5">
              <ul className="flex flex-col gap-3">
                {entries.map((entry, idx) => (
                  <ArchiveEntryCard
                    key={entry.id}
                    entry={entry}
                    status={statuses[idx]}
                    index={idx}
                    progress={progress}
                    expanded={expandedEntryId === entry.id}
                    onToggleExpand={onEntryToggle}
                    onImageView={onImageView}
                    viewed={viewedIds.includes(entry.id)}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </article>
    </motion.li>
  );
}

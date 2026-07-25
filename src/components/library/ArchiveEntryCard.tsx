import { motion } from "framer-motion";
import { Lock, ArrowRight, Check } from "lucide-react";
import type { LibraryEntry } from "@/types/library";
import type { UnlockStatus, LearningProgress } from "@/utils/archiveUnlock";
import ArchiveChamber from "./ArchiveChamber";

interface ArchiveEntryCardProps {
  /** 当前 archive entry */
  entry: LibraryEntry;
  /** 解锁状态：unlocked / locked / sealed */
  status: UnlockStatus;
  /** 列表入场索引 */
  index: number;
  /** 学习进度（透传给 ArchiveChamber 用于 unlockFeatures 判定） */
  progress: LearningProgress;
  /** 当前是否展开 Archive Chamber */
  expanded: boolean;
  /** 切换 Archive Chamber 展开 / 折叠 */
  onToggleExpand: (entryId: string) => void;
  /** Phase 7D-3.2：点击图片打开全屏 Archive Viewer */
  onImageView: (entry: LibraryEntry) => void;
  /** Phase 7D-6：是否已查看（打开过 Viewer） */
  viewed?: boolean;
}

/**
 * 单条 Archive Entry 卡片（Phase 7B → 7C）。
 *
 * Phase 7C 升级：
 *   - onSelect（跳转路由）替换为 onToggleExpand（就地展开 ArchiveChamber）
 *   - 与 NotebookItem + MemoryChamber 结构对称：
 *       ArchiveEntryCard → ArchiveChamber（展开）
 *   - 不再依赖 react-router，Library 内嵌完成阅读体验
 *
 * 三种状态对应三种视觉：
 *   - unlocked：显示 Open Archive → / Close Archive，可点击展开 / 折叠 Chamber
 *   - locked  ：显示 🔒 Locked + 鼓励文案 + 阈值
 *   - sealed  ：显示 Sealed + 神秘文案（神秘档案专属，Phase 7B.7 后已不再产生）
 *
 * 视觉延续 Dark Academia：羊皮纸 + 金色细边 + Cinzel 标题 + 衬线斜体描述。
 */
export default function ArchiveEntryCard({
  entry,
  status,
  index,
  progress,
  expanded,
  onToggleExpand,
  onImageView,
  viewed,
}: ArchiveEntryCardProps) {
  const isUnlocked = status === "unlocked";

  const handleToggle = () => {
    if (!isUnlocked) return;
    onToggleExpand(entry.id);
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: 0.1 + Math.min(index * 0.05, 0.3),
      }}
      className="relative rounded-sm border border-gold/15 bg-parchment/30 px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-[1px] transition-colors duration-300 hover:border-gold/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
    >
      {/* 标题行 */}
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-display text-base tracking-widest2 text-ink/75 sm:text-lg">
          {entry.title}
        </h4>
        <StatusBadge status={status} locked={entry.locked} viewed={viewed} />
      </div>

      {/* 中文副标题 */}
      {entry.subtitle && (
        <p className="mt-1 font-zh text-[10px] tracking-[0.4em] text-ink/40">
          {entry.subtitle}
        </p>
      )}

      {/* 描述 */}
      <p className="mt-3 font-serif text-sm italic leading-relaxed text-ink/55">
        {entry.description}
      </p>

      {/* 底部行动区 */}
      <div className="mt-4 flex items-center justify-between">
        {isUnlocked ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={`archive-chamber-${entry.id}`}
            className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-widest2 text-gold/80 transition-colors hover:text-gold"
          >
            <span>{expanded ? "Close Archive" : "Open Archive"}</span>
            <ArrowRight
              size={11}
              strokeWidth={1.6}
              className={`transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <p className="font-ui text-[10px] uppercase tracking-widest2 text-ink/40">
            {status === "sealed" ? "Sealed" : "Locked"}
          </p>
        )}

        {entry.requiredProgress !== undefined && !isUnlocked && (
          <span className="font-ui text-[10px] uppercase tracking-widest2 text-ink/35">
            Requires {entry.requiredProgress}
          </span>
        )}
      </div>

      {/* Locked/Sealed 诗意提示文案 */}
      {!isUnlocked && (
        <p className="mt-3 border-t border-gold/10 pt-3 font-serif text-xs italic leading-relaxed text-ink/40">
          {status === "sealed"
            ? "Sealed beyond progress — the Professor never wished to share this."
            : "More spells must be collected before this archive reveals itself."}
        </p>
      )}

      {/* Archive Chamber 展开区域 */}
      <div
        id={`archive-chamber-${entry.id}`}
        className="grid transition-all duration-500 ease-out"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {/* key 仅用 entry.id：与 MemoryChamber 一致，避免不必要重挂载 */}
          {expanded && isUnlocked && (
            <ArchiveChamber
              key={`ac-${entry.id}`}
              entry={entry}
              progress={progress}
              onImageView={onImageView}
            />
          )}
        </div>
      </div>
    </motion.li>
  );
}

/**
 * 状态徽章：右上角小标识。
 *
 * Phase 7D-6 三状态：
 *   - locked（静态锁定）    → 🔒 Sealed Document
 *   - unlocked but !viewed  → Available Archive
 *   - unlocked & viewed     → ✓ Examined Record
 *
 * 保留原 status 逻辑作为兜底（locked/sealed 状态）。
 */
function StatusBadge({
  status,
  locked,
  viewed,
}: {
  status: UnlockStatus;
  locked?: boolean;
  viewed?: boolean;
}) {
  // Phase 7D-5：静态锁定优先显示 Sealed Document
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-widest3 text-ink/45">
        <Lock size={9} strokeWidth={1.6} />
        Sealed Document
      </span>
    );
  }

  if (status === "unlocked") {
    if (viewed) {
      return (
        <span className="inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-widest3 text-gold/80">
          <Check size={9} strokeWidth={1.8} />
          Examined Record
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-widest3 text-gold/60">
        <span className="h-1 w-1 rounded-full bg-gold/60" />
        Available Archive
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-widest3 text-ink/40">
      <Lock size={9} strokeWidth={1.6} />
      {status === "sealed" ? "Unknown" : "Locked"}
    </span>
  );
}

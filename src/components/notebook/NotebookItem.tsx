import { motion } from "framer-motion";
import MemoryChamber from "./MemoryChamber";
import type { NotebookEntry } from "@/types/notebook";

interface NotebookItemProps {
  /** 当前收藏词条 */
  entry: NotebookEntry;
  /** 列表入场索引，用于错峰淡入 */
  index: number;
  /** 当前是否展开 Memory Chamber */
  expanded: boolean;
  /** 切换展开状态 */
  onToggleExpand: (id: string) => void;
  /**
   * 首次触发学习行为（Reveal Meaning）时回调。
   * 透传给 MemoryChamber，由 Notebook 页面统一写入 storage。
   */
  onReviewed?: (entry: NotebookEntry) => void;
}

/**
 * Notebook 单条收藏卡片（Phase 6）。
 *
 * 默认状态：显示基础信息（word / phonetic / partOfSpeech / meaningZh）
 *           + "Enter Memory Chamber" 按钮
 *
 * 展开状态：在卡片内部就地展开 MemoryChamber 详情区
 *           按钮文案变为 "Close Chamber"
 *
 * 视觉延续 Dark Academia：羊皮纸 + 金色细边 + Cinzel + 羽毛笔意象。
 */
export default function NotebookItem({
  entry,
  index,
  expanded,
  onToggleExpand,
  onReviewed,
}: NotebookItemProps) {
  // MemoryChamber 内部状态在每次展开时重置（key 变化触发 remount）
  // 这里不维护 revealed state，由 MemoryChamber 自管

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
      {/* 单层金色细边 */}
      <div className="pointer-events-none absolute inset-[5px] rounded-sm border border-gold/35" />

      <article className="relative px-7 py-7 sm:px-9 sm:py-8">
        {/* 顶部：Lesson No. + 收藏日期 */}
        <header className="flex items-center justify-between font-ui text-[10px] uppercase tracking-widest3 text-ink/50">
          <span>
            <span className="text-gold/80">Lesson No.</span>{" "}
            <span className="text-ink/70">
              {String(entry.lessonNumber).padStart(2, "0")}
            </span>
          </span>
          <span>{formatCreatedAt(entry.createdAt)}</span>
        </header>

        {/* 单词行 */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-display text-3xl leading-none tracking-widest2 text-[#7a5a12] sm:text-4xl">
            {entry.word}
          </h3>
          {entry.phonetic && (
            <span className="font-serif text-sm italic text-ink/60">
              {entry.phonetic}
            </span>
          )}
          {entry.partOfSpeech && (
            <span className="font-serif text-sm italic text-ink/55">
              {entry.partOfSpeech}
            </span>
          )}
        </div>

        {/* 中文释义 */}
        <p className="mt-3 font-zh text-lg tracking-wider text-ink/80">
          {entry.meaningZh}
        </p>

        {/* 分隔线 */}
        <div className="gold-rule mt-5 w-1/2" />

        {/* 进入 / 关闭 Memory Chamber 按钮 */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => onToggleExpand(entry.id)}
            aria-expanded={expanded}
            aria-controls={`memory-chamber-${entry.id}`}
            className="font-ui text-[11px] uppercase tracking-widest2 text-ink/55 transition-colors hover:text-ink/85"
          >
            {expanded ? "Close Chamber" : "Enter Memory Chamber"}
          </button>
        </div>

        {/* Memory Chamber 展开区域 */}
        <div
          id={`memory-chamber-${entry.id}`}
          className="grid transition-all duration-500 ease-out"
          style={{
            gridTemplateRows: expanded ? "1fr" : "0fr",
            opacity: expanded ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            {/* key 仅用 entry.id：避免 reviewCount 变化导致重挂载触发循环计数 */}
            {expanded && (
              <MemoryChamber
                key={`mc-${entry.id}`}
                entry={entry}
                onReviewed={onReviewed}
              />
            )}
          </div>
        </div>
      </article>
    </motion.li>
  );
}

/**
 * 将 ISO 时间字符串格式化为 Dark Academia 风格短日期。
 */
function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

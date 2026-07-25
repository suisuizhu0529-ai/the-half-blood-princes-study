import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Feather, BookOpen, Search } from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import NotebookItem from "@/components/notebook/NotebookItem";
import { useEntered } from "@/hooks/useEntered";
import { useNotebook } from "@/hooks/useNotebook";
import type { NotebookEntry } from "@/types/notebook";

/**
 * Prince's Notebook —— 私人笔记（Phase 6）。
 *
 * 数据来源：localStorage（通过 useNotebook 订阅）。
 * 视觉延续 Dark Academia：羊皮纸、金色边框、Cinzel 字体、羽毛笔。
 *
 * Phase 6 重构：
 *   - 删除 Archive | Review 双模式切换
 *   - 恢复单一 Collected Spells 列表
 *   - 每个 NotebookItem 内嵌 Memory Chamber 入口（就地展开，不跳转）
 *   - 一次只展开一个单词（expandedId）
 *
 * 与 Study Room 的联动：
 *   - 在 Study Room 点击 "Add to Notebook" → storage 写入 + dispatch 事件
 *   - 本页面订阅事件，列表自动刷新
 */
export default function Notebook() {
  const { entered } = useEntered();
  const { entries, count, update } = useNotebook();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 按 word 实时过滤，不区分大小写。query 为空时显示全部。
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.word.toLowerCase().includes(q));
  }, [entries, query]);

  /**
   * 切换 Memory Chamber 展开。
   *
   * 行为：
   *   - 点击未展开的 entry → 展开它（其它自动收起）
   *   - 点击已展开的 entry → 收起
   */
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  /**
   * Memory Chamber 首次 Reveal Meaning 回调。
   * - reviewCount: 原值 + 1
   * - lastReviewedAt: 当前 ISO 时间
   * 通过 updateEntry 浅合并写入，不改变其他字段。
   */
  const handleReviewed = useCallback(
    (entry: NotebookEntry) => {
      update(entry.id, {
        reviewCount: (entry.reviewCount ?? 0) + 1,
        lastReviewedAt: new Date().toISOString(),
      });
    },
    [update],
  );

  return (
    <section className="container relative px-6 pt-32 pb-24 sm:pt-36">
      {/* 顶部标题（入场后淡入） */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
        className="mb-10 text-center"
      >
        <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/60">
          The Half-Blood Prince&apos;s Study
        </p>
        <h1 className="mt-2 font-display text-2xl tracking-widest2 text-parchment/85 sm:text-3xl">
          Prince&apos;s Notebook
        </h1>
        <p className="mt-2 font-zh text-xs tracking-[0.4em] text-parchment/45 sm:text-sm">
          私 人 笔 记
        </p>
        <Flourish className="mx-auto mt-5 h-3 w-52" variant="center" />
        {/* 收藏数量 */}
        <p className="mt-5 font-serif text-sm italic text-parchment/55">
          {count === 1 ? "1 spell collected" : `${count} spells collected`}
        </p>
        {/* 副标题：低调衬线小字 */}
        <p className="mt-1.5 font-serif text-xs italic text-parchment/35">
          Vocabulary mastered from your private archive.
        </p>
      </motion.div>

      {/* 主体内容：空状态 / 列表 / 无搜索结果 */}
      {entries.length === 0 ? (
        <EmptyState entered={entered} />
      ) : (
        <>
          {/* 搜索框 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mx-auto mb-8 w-full max-w-[640px]"
          >
            <SearchInput value={query} onChange={setQuery} />
          </motion.div>

          {filtered.length === 0 ? (
            <NoResults query={query} entered={entered} />
          ) : (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={entered ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mx-auto flex w-full max-w-[640px] flex-col gap-6"
            >
              {filtered.map((entry, idx) => (
                <NotebookItem
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  expanded={expandedId === entry.id}
                  onToggleExpand={handleToggleExpand}
                  onReviewed={handleReviewed}
                />
              ))}
            </motion.ul>
          )}
        </>
      )}

      {/* 返回书房 */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2, delay: 0.6 }}
        className="mt-16 text-center"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-ui text-[11px] uppercase tracking-widest2 text-parchment/55 transition-colors hover:text-parchment"
        >
          <span className="h-px w-6 bg-parchment/40" />
          <ArrowLeft size={13} strokeWidth={1.6} />
          <span>Return to Study</span>
        </Link>
      </motion.footer>
    </section>
  );
}

/**
 * 搜索输入框（Phase 4B 保留）。
 *
 * 视觉延续 Dark Academia：羊皮纸底 + 金色细线 + Cinzel 小字 placeholder。
 * 不使用现代圆角 / 蓝色聚焦环，聚焦时金色边框微亮。
 */
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="parchment-surface relative rounded-sm">
      <div className="pointer-events-none absolute inset-[4px] rounded-sm border border-gold/30" />
      <div className="relative flex items-center gap-3 px-5 py-3">
        <Search
          size={15}
          strokeWidth={1.5}
          className="text-ink/55"
          aria-hidden
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search the archive…"
          aria-label="Search notebook entries"
          className="w-full bg-transparent font-serif text-base italic text-ink/85 placeholder:text-ink/35 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="font-ui text-[10px] uppercase tracking-widest2 text-ink/45 transition-colors hover:text-ink/75"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 空状态。
 *
 * 文案："The notebook awaits its first secret."
 * 视觉延续羊皮纸卡片 + 羽毛笔，提示用户回到 Study Room 收藏。
 */
function EmptyState({ entered }: { entered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
      className="mx-auto w-full max-w-[560px]"
    >
      <div className="parchment-surface relative rounded-sm px-8 py-14 shadow-parchment-deep sm:px-12 sm:py-16">
        {/* 双层金色边框 */}
        <div className="pointer-events-none absolute inset-[6px] rounded-sm border border-gold/55" />
        <div className="pointer-events-none absolute inset-[10px] rounded-sm border border-gold/25" />

        {/* 羽毛笔装饰 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={
            entered
              ? { opacity: 0.85, scale: 1, rotate: 0 }
              : { opacity: 0, scale: 0.7, rotate: -8 }
          }
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
          className="mx-auto mb-6 w-fit"
        >
          <Feather
            size={26}
            strokeWidth={1.3}
            className="text-[#7a5a12] drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
          />
        </motion.div>

        <p className="text-center font-ui text-[10px] uppercase tracking-widest3 text-ink/55">
          Phase 6 · Notebook
        </p>

        <h2 className="mt-4 text-center font-display text-2xl tracking-widest2 text-ink/85 sm:text-3xl">
          The Notebook Awaits
        </h2>

        <Flourish className="mx-auto mt-6 h-3 w-44" variant="center" />

        <p className="mt-8 text-center font-serif text-lg italic leading-relaxed text-ink/70">
          The notebook awaits its first secret.
        </p>

        <p className="mt-4 text-center font-zh text-sm leading-relaxed text-ink/55">
          回到书房，将今日的词语留于此处。
        </p>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-ui text-[11px] uppercase tracking-widest2 text-ink/65 transition-colors hover:text-ink"
          >
            <BookOpen size={13} strokeWidth={1.6} />
            <span>Return to Today&apos;s Lesson</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 搜索无结果状态。
 *
 * 不破坏 Dark Academia 氛围，用诗意短句提示。
 */
function NoResults({
  query,
  entered,
}: {
  query: string;
  entered: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mx-auto w-full max-w-[560px] text-center"
    >
      <p className="font-serif text-lg italic text-parchment/55">
        No spell bears that name.
      </p>
      <p className="mt-2 font-zh text-sm text-parchment/35">
        未找到与 &ldquo;{query}&rdquo; 相关的词条。
      </p>
    </motion.div>
  );
}

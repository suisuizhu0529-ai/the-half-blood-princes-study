import { useCallback, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import ArchiveCategoryCard from "@/components/library/ArchiveCategoryCard";
import ArchiveViewer from "@/components/library/ArchiveViewer";
import { useEntered } from "@/hooks/useEntered";
import { useNotebook } from "@/hooks/useNotebook";
import { LIBRARY_ENTRIES } from "@/data/library";
import { LIBRARY_CATEGORIES } from "@/types/library";
import type { LibraryCategory, LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import { getUnlockStatus } from "@/utils/archiveUnlock";
import {
  getViewedArchives,
  markArchiveViewed,
  subscribeViewedArchives,
} from "@/utils/viewedArchivesStorage";

/**
 * Professor Archive —— 教授资料库（Phase 7B → 7C）。
 *
 * Phase 7B 升级：
 *   - 替换 Phase 6 硬编码 ARCHIVES → 读取 LIBRARY_CATEGORIES + LIBRARY_ENTRIES
 *   - 5 个分类卡片可点击展开，显示该分类下所有 entries
 *   - 接入 archiveUnlock.ts 计算层，根据学习进度判定解锁状态
 *   - 单选展开（expandedCategoryId），一次只展开一个分类
 *
 * Phase 7C 升级：
 *   - 不新增 /library/:id 路由，ArchiveChamber 作为内嵌展开组件
 *   - 与 Notebook 的 MemoryChamber 结构对称：
 *       Library → ArchiveCategoryCard → ArchiveEntryCard → ArchiveChamber
 *   - 单选展开 entry（expandedEntryId），同一时间只展开一个 Chamber
 *   - 解锁的 entry 可点击 Open Archive 就地展开阅读
 *   - 不修改 App.tsx 路由
 *
 * 视觉延续 Dark Academia：羊皮纸、金色边框、Cinzel、羽毛笔。
 */
export default function Library() {
  const { entered } = useEntered();
  const { count } = useNotebook();
  const [expandedCategoryId, setExpandedCategoryId] =
    useState<LibraryCategory | null>(null);
  // Phase 7C：当前展开的 Archive Chamber entryId（单选展开）
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  // Phase 7D-3.2：全屏 Archive Viewer 当前查看的 entry
  const [viewerEntry, setViewerEntry] = useState<LibraryEntry | null>(null);
  // Phase 7D-6：已查看档案 entryId 列表（打开过 Viewer 即记录）
  const [viewedIds, setViewedIds] = useState<string[]>(getViewedArchives);

  // 订阅 viewedArchives 变化（跨组件 / 跨标签页同步）
  useEffect(() => {
    const unsub = subscribeViewedArchives(() => {
      setViewedIds(getViewedArchives());
    });
    return unsub;
  }, []);

  // 学习进度（Phase 7B 仅启用 collectedWords）
  const progress: LearningProgress = useMemo(
    () => ({ collectedWords: count }),
    [count],
  );

  // 按 category 分组 entries
  const entriesByCategory = useMemo(() => {
    const map = new Map<LibraryCategory, LibraryEntry[]>();
    for (const cat of LIBRARY_CATEGORIES) {
      map.set(cat.id, []);
    }
    for (const entry of LIBRARY_ENTRIES) {
      const arr = map.get(entry.category);
      if (arr) arr.push(entry);
    }
    return map;
  }, []);

  const handleToggleCategory = useCallback((categoryId: LibraryCategory) => {
    setExpandedCategoryId((cur) => (cur === categoryId ? null : categoryId));
  }, []);

  // Phase 7C：切换 Archive Chamber 展开 / 折叠（单选）
  const handleEntryToggle = useCallback((entryId: string) => {
    setExpandedEntryId((cur) => (cur === entryId ? null : entryId));
  }, []);

  // Phase 7D-6：Archive Discovery 统计
  // - 已解锁数量（unlocked 状态，排除 locked 静态锁定的 entry）
  // - 已查看数量（打开过 Viewer 的 entry）
  const { discoveredCount, viewedCount, total } = useMemo(() => {
    const total = LIBRARY_ENTRIES.length;
    let discoveredCount = 0;
    for (const entry of LIBRARY_ENTRIES) {
      const status = getUnlockStatus(entry, progress);
      // Phase 7D-5：locked 静态锁定不计入已解锁
      if (status === "unlocked" && !entry.locked) discoveredCount++;
    }
    const viewedCount = viewedIds.length;
    return { discoveredCount, viewedCount, total };
  }, [progress, viewedIds]);

  // Phase 7D-3.2：打开 / 关闭 Archive Viewer
  const handleImageView = useCallback((entry: LibraryEntry) => {
    setViewerEntry(entry);
  }, []);
  const handleViewerClose = useCallback(() => {
    setViewerEntry(null);
  }, []);

  // Phase 7D-6：Viewer 打开时记录已查看（去重）
  useEffect(() => {
    if (viewerEntry) {
      markArchiveViewed(viewerEntry.id);
    }
  }, [viewerEntry]);

  return (
    <section className="container relative px-6 pt-32 pb-24 sm:pt-36">
      {/* Phase 7D-4：档案室环境层 —— 深黑绿色石墙 + 蜡烛光晕 */}
      <div
        className="archive-ambient pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />
      {/* Phase 7D-4：浮尘粒子 —— 极克制，5 颗慢速漂浮 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <span
          className="dust-mote"
          style={{
            top: "18%",
            left: "22%",
            // @ts-expect-error -- CSS custom property
            "--dx": "18px",
            "--dy": "-28px",
            "--dur": "22s",
            "--delay": "0s",
          }}
        />
        <span
          className="dust-mote"
          style={{
            top: "35%",
            left: "68%",
            // @ts-expect-error -- CSS custom property
            "--dx": "-14px",
            "--dy": "-20px",
            "--dur": "26s",
            "--delay": "4s",
          }}
        />
        <span
          className="dust-mote"
          style={{
            top: "58%",
            left: "14%",
            // @ts-expect-error -- CSS custom property
            "--dx": "20px",
            "--dy": "-24px",
            "--dur": "24s",
            "--delay": "8s",
          }}
        />
        <span
          className="dust-mote"
          style={{
            top: "72%",
            left: "78%",
            // @ts-expect-error -- CSS custom property
            "--dx": "-16px",
            "--dy": "-26px",
            "--dur": "28s",
            "--delay": "2s",
          }}
        />
        <span
          className="dust-mote"
          style={{
            top: "82%",
            left: "42%",
            // @ts-expect-error -- CSS custom property
            "--dx": "12px",
            "--dy": "-22px",
            "--dur": "30s",
            "--delay": "6s",
          }}
        />
      </div>

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
          Professor Archive
        </h1>
        <p className="mt-2 font-zh text-xs tracking-[0.4em] text-parchment/45 sm:text-sm">
          教 授 资 料 库
        </p>
        <Flourish className="mx-auto mt-5 h-3 w-52" variant="center" />
        {/* 当前进度 */}
        <p className="mt-5 font-serif text-sm italic text-parchment/55">
          {count === 1 ? "1 spell gathered" : `${count} spells gathered`}
        </p>
        <p className="mt-1.5 font-serif text-xs italic text-parchment/35">
          Collect more spells to unveil the Professor&apos;s secrets.
        </p>

        {/* Phase 7D-6：Archive Discovery 进度 */}
        <div className="mt-7 inline-flex flex-col items-center gap-1.5">
          <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/65">
            Archive Discovery
          </p>
          <p className="font-display text-lg tracking-widest2 text-gold/85 sm:text-xl">
            {viewedCount} / {discoveredCount}{" "}
            <span className="text-parchment/55">Records Discovered</span>
          </p>
          <p className="font-serif text-xs italic text-parchment/40">
            of {total} archives in the collection
          </p>
        </div>
      </motion.div>

      {/* 分类列表 */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mx-auto flex w-full max-w-[640px] flex-col gap-5"
      >
        {LIBRARY_CATEGORIES.map((category, idx) => (
          <ArchiveCategoryCard
            key={category.id}
            category={category}
            entries={entriesByCategory.get(category.id) ?? []}
            expanded={expandedCategoryId === category.id}
            index={idx}
            progress={progress}
            onToggle={handleToggleCategory}
            expandedEntryId={expandedEntryId}
            onEntryToggle={handleEntryToggle}
            onImageView={handleImageView}
            viewedIds={viewedIds}
          />
        ))}
      </motion.ul>

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

      {/* Phase 7D-3.2：全屏 Archive Viewer */}
      <ArchiveViewer entry={viewerEntry} onClose={handleViewerClose} />
    </section>
  );
}

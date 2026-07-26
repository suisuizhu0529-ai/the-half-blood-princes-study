import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { LibraryCategoryMeta, LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import MemoryBook from "./MemoryBook";
import ProfessorInteraction from "./ProfessorInteraction";

interface MemoryChamberOverlayProps {
  /** 当前召唤的书（分类元信息） */
  category: LibraryCategoryMeta;
  /** 该分类下的 entries */
  entries: LibraryEntry[];
  /** 学习进度（解锁状态用） */
  progress: LearningProgress;
  /** 已查看的 entryId 列表 */
  viewedIds: string[];
  /** 点击 unlocked entry → 全屏 Archive Viewer */
  onOpenArchive: (entry: LibraryEntry) => void;
  /** 关闭 Memory Chamber，书飞回书架 */
  onClose: () => void;
}

/**
 * MemoryChamberOverlay —— Phase 20.2 记忆室召唤覆盖层。
 *
 * 当用户点击焦点书时，书通过 layoutId 飞出书架、移到屏幕中心并放大展开，
 * 显示该分类的 MemoryBook（翻页式书内内容）+ ProfessorInteraction（教授互动区域）。
 *
 * Phase 20.2 修复：
 *   - 恢复教授互动区域（Image/Content/Listen/Conversation 四区）
 *   - ProfessorInteraction 作为独立区域，跟随 MemoryBook 翻页同步切换
 *   - pageIndex/direction 状态提升到本组件，MemoryBook 改为受控
 *
 * Phase 20.2 修复 v2：
 *   - 点击空白处关闭：用独立背景层接收点击，避免内层 stopPropagation 阻挡
 *   - 魔杖翻页：订阅 MAGIC_SWEEP，根据轨迹 x 方向判断左/右翻页
 *   - 魔杖关闭：订阅 MAGIC_DISMISS，快速横向挥动关闭 Chamber
 *
 * Phase 20.2 修复 v3：
 *   - 移除 MAGIC_SWEEP / MAGIC_DISMISS 订阅（纯挥动易误触）
 *   - 改为 mousedown + 横向拖动 ≥ 阈值 才翻页（按住拖动模式）
 *   - 支持连续翻页（拖动距离每超过 repeatInterval 触发一次）
 *   - 关闭保留：X 按钮 / ESC / 点击背景
 *
 * 结构：
 *   MemoryChamberOverlay
 *    ├ MemoryBook（翻页式书内内容）
 *    ├ ProfessorInteraction（教授互动独立区域）
 *    └ ArchiveViewer（保留，由 Library.tsx 管理）
 *
 * 关闭：
 *   - 点击 X 按钮 / ESC / 点击背景
 *   - 反向动画：书飞回书架原位
 */
export default function MemoryChamberOverlay({
  category,
  entries,
  progress,
  viewedIds,
  onOpenArchive,
  onClose,
}: MemoryChamberOverlayProps) {
  const theme = category.colorTheme;

  // Phase 20.2 修复：pageIndex/direction 提升到本组件，
  // 让 ProfessorInteraction 跟随 MemoryBook 翻页同步切换 entry
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const total = entries.length;

  const handlePageChange = useCallback(
    (next: number, dir: number) => {
      setPageIndex(next);
      setDirection(dir);
    },
    [],
  );

  // 当前页对应的 entry（传给 ProfessorInteraction）
  const currentEntry = entries[pageIndex];

  // Phase 20.2 修复 v4：按住拖动翻页，每次按下只翻一页
  //   - mousedown：记录起点 + triggered=false
  //   - mousemove（按下时）：横向位移 ≥ 阈值 且 未 triggered → 翻页 + triggered=true
  //   - mouseup：清空状态（下一次按下才能再翻）
  //   横向占优（|dx| > |dy|）才触发，避免与上下滚动/选择文本冲突
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    triggered: boolean;
  } | null>(null);

  useEffect(() => {
    if (!theme) return;

    const DRAG_THRESHOLD = 110; // 触发翻页所需横向拖动距离（px）

    const handleDown = (e: MouseEvent) => {
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        triggered: false,
      };
    };

    const handleMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state || state.triggered) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      // 横向不占优则忽略（可能是上下滚动或选词）
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (Math.abs(dx) < DRAG_THRESHOLD) return;

      if (dx < 0) {
        // 向左拖 → 下一页
        setPageIndex((prev) => {
          if (prev >= total - 1) return prev;
          setDirection(1);
          return prev + 1;
        });
      } else {
        // 向右拖 → 上一页
        setPageIndex((prev) => {
          if (prev <= 0) return prev;
          setDirection(-1);
          return prev - 1;
        });
      }
      state.triggered = true; // 本次按下已翻页，mouseup 前不再触发
    };

    const handleUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [theme, total]);

  if (!theme) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto"
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.88)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.5 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${category.title} Memory Chamber`}
    >
      {/* Phase 20.2 修复 v2：独立背景层接收点击关闭
          不依赖外层 motion.div 的 onClick，避免内层 stopPropagation 阻挡 */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />

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

      {/* 召唤出的书（layoutId 飞出 + 放大 + 打开 MemoryBook + ProfessorInteraction）
          Phase 20.2.1：
          - MemoryBook 作为主体（双页真实比例）
          - ProfessorInteraction 作为书外"夹页"（独立羊皮纸条），不进入书框
          - items-start + my-12，内容超出视口时可滚动，
            不超出时通过 my-12 在视觉上接近居中，书周围留空白可点击关闭 */}
      <motion.div
        layoutId={`memory-book-${category.id}`}
        className="relative my-12 flex w-fit max-w-[92vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        initial={{ rotateY: -12 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          perspective: "1800px",
        }}
      >
        {/* === 书本外框：皮革质感（呼应书架上的书） ===
            Phase 20.2.1：仅包裹 MemoryBook，不再塞入 ProfessorInteraction */}
        <motion.div
          className="relative rounded-md p-1.5"
          style={{
            background: `linear-gradient(180deg, ${theme.leatherHighlight} 0%, ${theme.leather} 100%)`,
            boxShadow: `0 36px 90px rgba(0,0,0,0.92), 0 0 0 1px ${theme.gold}44, inset 0 0 60px rgba(0,0,0,0.5)`,
            border: `1px solid ${theme.gold}33`,
          }}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* MemoryBook：立体魔法书双页（受控） */}
          <MemoryBook
            category={category}
            entries={entries}
            progress={progress}
            viewedIds={viewedIds}
            pageIndex={pageIndex}
            direction={direction}
            onPageChange={handlePageChange}
            onOpenArchive={onOpenArchive}
          />
        </motion.div>

        {/* === ProfessorInteraction：书外夹页 ===
            Phase 20.2.1：作为独立羊皮纸条悬浮于书下方，
            不进入书框，避免破坏书页比例。
            限制最大高度 + 内部滚动，长内容不撑坏整体布局。
            宽度对齐书页（单页宽度 ≈ 整书 1/2） */}
        <div
          className="parchment-surface mt-6 w-full max-w-[440px] rounded-sm px-8 py-6"
          style={{
            boxShadow:
              "0 12px 30px rgba(0,0,0,0.55), inset 0 0 50px rgba(120,90,40,0.10)",
            maxHeight: "38vh",
            overflowY: "auto",
          }}
        >
          <ProfessorInteraction
            entry={currentEntry}
            progress={progress}
            onImageView={onOpenArchive}
          />
        </div>

        {/* 底部巨大投影（书悬浮于空间中） */}
        <div
          className="mt-3 rounded-full"
          style={{
            width: "55%",
            height: "22px",
            background: "rgba(0,0,0,0.72)",
            filter: "blur(22px)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { LibraryCategoryMeta, LibraryEntry } from "@/types/library";
import type { LearningProgress } from "@/utils/archiveUnlock";
import { getFeatureUnlockStatus } from "@/utils/archiveUnlock";
import { updateArchiveProgress } from "@/utils/archiveProgressStorage";
import { useSpeech } from "@/hooks/useSpeech";
import MemoryBook from "./MemoryBook";

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
 * 显示该分类的 MemoryBook（翻页式书内内容）。
 *
 * Phase 20.2.2：
 *   - 删除 ProfessorInteraction 渲染（书外夹页）
 *   - Listen / Conversation 逻辑提升到本组件，UI 移入 MemoryPage
 *   - 保持原有 useSpeech / archiveProgress 逻辑不变，仅改变 UI 位置
 *   - ProfessorInteraction 文件保留，作为未来 Conversation 模式组件
 *
 * 结构：
 *   MemoryChamberOverlay
 *    └ MemoryBook
 *        └ MemoryPage（含 Listen / Conversation 书页内印记）
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

  // pageIndex/direction 提升到本组件，让翻页交互与 MemoryBook 受控同步
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

  // 当前页对应的 entry
  const currentEntry = entries[pageIndex];

  // === Phase 20.2.2：从 ProfessorInteraction 提升的逻辑 ===
  // 保持原有 useSpeech + archiveProgress 写入逻辑不变，仅改变 UI 位置。
  const { speaking, supported: audioSupported, speak, stop } = useSpeech();

  // 进入即写入 discovered + lastVisitedAt（useRef 防 StrictMode 双调用）
  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    updateArchiveProgress(currentEntry.id, { discovered: true });
  }, [currentEntry.id]);

  // Phase 20.2.4-A：翻页时停止语音
  //   - 避免 UI state（currentEntry）与 media state（audio）脱钩
  //     —— 否则翻页后 speaking 仍 true，但字幕显示新页 voiceText
  //   - 所有翻页路径（按钮、拖动、底部圆点）均经 setPageIndex，统一在此拦截
  //   - 首次 mount（pageIndex 初始 0）跳过，不误触
  const firstPageRef = useRef(true);
  useEffect(() => {
    if (firstPageRef.current) {
      firstPageRef.current = false;
      return;
    }
    stop();
  }, [pageIndex, stop]);

  // content 进入即视为已读（保留原 ProfessorInteraction 行为）
  const currentFeatureStatus = getFeatureUnlockStatus(currentEntry, progress);
  useEffect(() => {
    if (currentFeatureStatus.content && currentEntry.content) {
      updateArchiveProgress(currentEntry.id, { contentRead: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntry.id]);

  // image 占位时（src 留空）视为已查看（保留原 ProfessorInteraction 行为）
  useEffect(() => {
    if (
      currentFeatureStatus.image &&
      currentEntry.image &&
      !currentEntry.image.src
    ) {
      updateArchiveProgress(currentEntry.id, { imageViewed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntry.id]);

  // Listen：保持原有 handleListen 逻辑（speak/stop + 写入 audioPlayed）
  const handleListen = useCallback(() => {
    if (speaking) {
      stop();
      return;
    }
    if (!currentEntry.audio?.voiceText) return;
    speak({ text: currentEntry.audio.voiceText });
    updateArchiveProgress(currentEntry.id, { audioPlayed: true });
  }, [speaking, speak, stop, currentEntry.id, currentEntry.audio]);

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

      {/* 召唤出的书（layoutId 飞出 + 放大 + 打开 MemoryBook）
          Phase 20.2.2：
          - 仅 MemoryBook 作为主体（双页真实比例）
          - ProfessorInteraction 不再渲染（书外夹页已删除）
          - Listen / Conversation UI 已移入 MemoryPage，逻辑由本组件提升管理
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
        {/* === 书本外框：皮革质感（呼应书架上的书） === */}
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
          {/* MemoryBook：立体魔法书双页（受控）
              Phase 20.2.2：speaking/audioSupported/onListen 透传到 MemoryPage */}
          <MemoryBook
            category={category}
            entries={entries}
            progress={progress}
            viewedIds={viewedIds}
            pageIndex={pageIndex}
            direction={direction}
            onPageChange={handlePageChange}
            onOpenArchive={onOpenArchive}
            speaking={speaking}
            audioSupported={audioSupported}
            onListen={handleListen}
          />
        </motion.div>

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

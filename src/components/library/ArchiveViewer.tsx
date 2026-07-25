import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { LIBRARY_CATEGORIES } from "@/types/library";
import type { LibraryEntry } from "@/types/library";

interface ArchiveViewerProps {
  /** 当前查看的 entry，null 时不渲染 */
  entry: LibraryEntry | null;
  /** 关闭查看器 */
  onClose: () => void;
}

/**
 * Archive Viewer —— 全屏图片档案查看器（Phase 7D-3.2）。
 *
 * 定位：Library 内嵌的轻量 Lightbox，点击 ArchiveChamber 内图片触发。
 *
 * 交互：
 *   - 点击 X / 背景遮罩 / ESC 键 关闭
 *   - 进入：遮罩 opacity 0→1，图片 scale 0.95→1
 *   - 退出：平滑淡出
 *
 * 视觉延续 Dark Academia：深色遮罩 + 金色边框 + Cinzel 标题 + 衬线斜体。
 * 移动端使用 object-contain 保证图片完整显示不裁切。
 */
export default function ArchiveViewer({ entry, onClose }: ArchiveViewerProps) {
  // ESC 键关闭 + 锁定背景滚动
  useEffect(() => {
    if (!entry) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [entry, onClose]);

  // 查找分类标题（沿用已有 LIBRARY_CATEGORIES，不重新写文本）
  const categoryMeta = entry
    ? LIBRARY_CATEGORIES.find((c) => c.id === entry.category)
    : null;

  return (
    <AnimatePresence>
      {entry && entry.image && entry.image.src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${entry.title} — image viewer`}
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-black/40 text-gold/80 transition-colors hover:border-gold/60 hover:text-gold sm:right-6 sm:top-6"
          >
            <X size={18} strokeWidth={1.6} />
          </button>

          {/* 内容容器 —— 阻止点击冒泡到背景 */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 中央图片 —— object-contain 保证完整显示，不裁切 */}
            <img
              src={entry.image.src}
              alt={entry.image.alt}
              className="max-h-[80vh] w-auto max-w-full rounded-[12px] border border-gold/40 object-contain shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            />

            {/* 信息区域 —— 沿用已有数据 */}
            <div className="mt-5 w-full max-w-[600px] text-center">
              {categoryMeta && (
                <p className="font-ui text-[10px] uppercase tracking-widest3 text-gold/60">
                  {categoryMeta.title}
                </p>
              )}
              <h2 className="mt-2 font-display text-xl tracking-widest2 text-parchment/90 sm:text-2xl">
                {entry.title}
              </h2>
              <p className="mt-3 font-serif text-sm italic leading-relaxed text-parchment/65">
                {entry.description}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

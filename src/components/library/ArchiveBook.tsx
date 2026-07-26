import { motion } from "framer-motion";
import type { BookColorTheme, LibraryCategoryMeta } from "@/types/library";

interface ArchiveBookProps {
  /** 分类元信息（决定书背标题/中文/主题色） */
  category: LibraryCategoryMeta;
  /** 是否为当前焦点书（居中突出） */
  isFocused: boolean;
  /** 该分类下 entries 总数 */
  totalEntries: number;
  /** 该分类下已解锁 entries 数 */
  revealedCount: number;
  /** 点击书背 */
  onSelect: () => void;
}

/** 默认主题色（深棕皮革，回退用） */
const DEFAULT_THEME: BookColorTheme = {
  leather: "#2a1d12",
  leatherHighlight: "#3a2a1a",
  gold: "#c9a227",
  glow: "rgba(201,162,39,0.4)",
  pageEdge: "#d4c4a8",
};

/**
 * ArchiveBook —— Phase 20.1 Round 1.5 立体魔法书视觉层。
 *
 * 每本书代表一个 LibraryCategory，以 3D 立体书背形式陈列在 MemoryShelf 上。
 *
 * 视觉（3D 透视）：
 *   - 书脊（spine）：竖向皮革 + 金色书名 + 装饰金线
 *   - 封面（cover）：从书脊延伸的封面斜面，带皮革纹理
 *   - 书页厚度（pages）：右侧书页边缘泛黄
 *   - 阴影：底部投影 + 书脊内侧阴影
 *
 * 状态：
 *   - 焦点书：直立、上浮、全 opacity、金色光晕呼吸、轻微 rotateY
 *   - 非焦点书：缩小、半透明、blur 软化
 *
 * layoutId：用于 Round 1.5 飞出动画，书架上的书与 Memory Chamber 中的书
 * 共享 layoutId={`memory-book-${id}`}，切换时 Framer Motion 自动补间。
 *
 * 不改数据结构，仅作 ArchiveCategoryCard 的空间化视觉替代。
 */
export default function ArchiveBook({
  category,
  isFocused,
  totalEntries,
  revealedCount,
  onSelect,
}: ArchiveBookProps) {
  const theme = category.colorTheme ?? DEFAULT_THEME;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      layoutId={`memory-book-${category.id}`}
      initial={false}
      animate={{
        opacity: isFocused ? 1 : 0.4,
        y: isFocused ? -32 : 0,
        scale: isFocused ? 1.1 : 0.82,
        filter: isFocused ? "blur(0px)" : "blur(1.5px)",
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex-shrink-0 cursor-pointer"
      style={{
        width: isFocused ? "120px" : "92px",
        height: isFocused ? "360px" : "300px",
        zIndex: isFocused ? 10 : 1,
        // 3D 透视：父级 perspective，自身 preserve-3d
        perspective: "900px",
        transformStyle: "preserve-3d",
      }}
      aria-label={`${category.title} book`}
      aria-pressed={isFocused}
    >
      {/* 焦点书的金色光晕（背后辐射） */}
      {isFocused && (
        <motion.div
          className="pointer-events-none absolute -inset-8 rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, ${theme.glow} 0%, transparent 70%)`,
            filter: "blur(24px)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* 3D 书本本体：书脊 + 封面斜面 + 书页厚度 */}
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: isFocused ? "rotateY(-8deg)" : "rotateY(-12deg)",
          transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* === 书脊（spine，主面） === */}
        <div
          className="absolute inset-0 overflow-hidden rounded-sm"
          style={{
            background: `linear-gradient(180deg, ${theme.leatherHighlight} 0%, ${theme.leather} 45%, ${theme.leather} 100%)`,
            boxShadow: isFocused
              ? `0 16px 50px rgba(0,0,0,0.8), 0 0 0 1px ${theme.gold}55, inset 0 0 40px rgba(0,0,0,0.5)`
              : `0 8px 24px rgba(0,0,0,0.7), inset 0 0 24px rgba(0,0,0,0.6)`,
            borderLeft: `2px solid ${theme.leatherHighlight}`,
            borderRight: `2px solid rgba(0,0,0,0.4)`,
          }}
        >
          {/* 皮革纹理（细微噪点感，用渐变模拟） */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `repeating-linear-gradient(180deg, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)`,
            }}
          />

          {/* 书脊顶部双金线装饰 */}
          <div
            className="absolute inset-x-2 top-4 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.gold}80, transparent)` }}
          />
          <div
            className="absolute inset-x-3 top-7 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.gold}50, transparent)` }}
          />

          {/* 书脊底部双金线装饰 */}
          <div
            className="absolute inset-x-3 bottom-20 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.gold}50, transparent)` }}
          />
          <div
            className="absolute inset-x-2 bottom-16 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.gold}80, transparent)` }}
          />

          {/* 竖向书名（英文，金色） */}
          <div className="absolute inset-0 flex items-start justify-center pt-12">
            <span
              className="font-display tracking-widest2"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontSize: isFocused ? "13px" : "11px",
                color: theme.gold,
                textShadow: isFocused
                  ? `0 0 12px ${theme.glow}`
                  : "0 1px 2px rgba(0,0,0,0.8)",
                transition: "all 0.6s ease",
                letterSpacing: "0.15em",
              }}
            >
              {category.title}
            </span>
          </div>

          {/* 书脊中文标题（中段，小字） */}
          <div className="absolute inset-x-0 top-1/2 flex justify-center">
            <span
              className="font-zh tracking-[0.3em]"
              style={{
                fontSize: "8px",
                color: `${theme.gold}99`,
                writingMode: "vertical-rl",
              }}
            >
              {category.titleZh}
            </span>
          </div>

          {/* 书脊底部装饰：羽毛笔图标 */}
          <div className="absolute inset-x-0 bottom-8 flex justify-center">
            <svg
              viewBox="0 0 24 24"
              className={isFocused ? "h-4 w-4" : "h-3 w-3"}
              fill="none"
              stroke={theme.gold}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.7 }}
            >
              <path d="M20.246 3.755a2.25 2.25 0 0 1 1.06 3.866l-1.5 1.5a.75.75 0 0 1-1.06 0L9.49 9.06a.75.75 0 0 1 0-1.06l1.5-1.5a2.25 2.25 0 0 1 3.866-1.06z" />
              <path d="M14.5 6.5 4 17" />
            </svg>
          </div>

          {/* 焦点书：底部进度 */}
          {isFocused && (
            <motion.div
              className="absolute inset-x-0 bottom-3 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <span className="font-ui text-[8px] uppercase tracking-widest3" style={{ color: theme.gold }}>
                {revealedCount}/{totalEntries}
              </span>
            </motion.div>
          )}

          {/* 焦点书：顶部微光呼吸 */}
          {isFocused && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-16"
              style={{
                background: `linear-gradient(180deg, ${theme.gold}25 0%, transparent 100%)`,
              }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>

        {/* === 书页厚度（右侧延伸，3D 立体感） === */}
        <div
          className="absolute top-1 bottom-1 rounded-r-sm"
          style={{
            // 从书脊右侧延伸出的书页厚度
            left: "100%",
            width: isFocused ? "16px" : "12px",
            background: `linear-gradient(90deg, ${theme.pageEdge} 0%, ${theme.pageEdge}cc 50%, ${theme.pageEdge}88 100%)`,
            transform: "translateX(-2px) rotateY(45deg)",
            transformOrigin: "left center",
            boxShadow: "inset 2px 0 4px rgba(0,0,0,0.4)",
            // 书页纹理（横向细线模拟纸张层叠）
            backgroundImage: `repeating-linear-gradient(180deg, ${theme.pageEdge} 0px, ${theme.pageEdge} 1px, ${theme.pageEdge}99 1px, ${theme.pageEdge}99 2px)`,
          }}
        />

        {/* === 底部投影 === */}
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: isFocused ? "100px" : "70px",
            height: isFocused ? "12px" : "8px",
            background: "rgba(0,0,0,0.6)",
            filter: "blur(8px)",
            opacity: isFocused ? 0.7 : 0.4,
          }}
        />
      </div>
    </motion.button>
  );
}

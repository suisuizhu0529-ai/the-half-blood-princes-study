/**
 * AncientSpellBook（Phase 18.4 · MagicObject 架构重构版）。
 *
 * 重构说明（Phase 18.4）：
 *   - 删除所有 SVG 程序生成书本主体（~470 行）
 *   - 改用 MagicObject 加载 assetManifest 中注册的 spell-book-main 图片
 *   - 图片只负责材质真实感（皮革/羊皮纸/烛光）
 *   - 文字、符文、章节信息、交互提示全部为 React overlay 层
 *
 * 架构关系：
 *   SceneObject（基类，位置/缩放/hover/click）
 *     ↓
 *   MagicObject（注入 spell-book-main 图片 + 浮动 + glow）
 *     ↓
 *   AncientSpellBook（overlay 层：标题/符文/chapter/hint + 打开动画）
 *
 * 接口保持不变：
 *   - isOpen：是否打开
 *   - onOpenClick：点击封面回调
 *   - children：内页内容（打开后显示）
 *   - className：外层样式
 *
 * 不做：
 *   - 不直接读取 Memory / localStorage / relationship state
 *   - 不修改 assetManifest
 *   - 不引入第三方动画库
 */

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import MagicObject from "../scene/MagicObject";

interface AncientSpellBookProps {
  /** 书本是否已打开 */
  isOpen?: boolean;
  /** 点击封面打开回调 */
  onOpenClick?: () => void;
  /** 书本内页内容（打开后显示） */
  children?: ReactNode;
  /** 章节信息（显示在封面顶部，可选） */
  chapter?: string;
  /** 自定义 className */
  className?: string;
}

/**
 * 古老魔法书（MagicObject 架构版）。
 *
 * 渲染结构：
 *   <MagicObject assetId="spell-book-main" preset="spell-book">
 *     <BookCoverOverlay>  ← 闭合态：标题/符文/chapter/hint
 *     <BookPageOverlay>   ← 打开态：children 内页内容
 *   </MagicObject>
 *
 * 交互：
 *   - 合上：显示封面 overlay + "Click to open" 提示
 *   - 点击：触发 onOpenClick
 *   - 打开：overlay 切换为内页内容容器
 */
export default function AncientSpellBook({
  isOpen = false,
  onOpenClick,
  children,
  chapter,
  className,
}: AncientSpellBookProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn("relative flex justify-center", className)}
      style={{ perspective: "1800px" }}
      aria-label="Ancient Spell Book"
    >
      <motion.div
        className="relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          rotateY: hovered && !isOpen ? 2 : -3,
        }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformStyle: "preserve-3d",
          width: "min(768px, 95vw)",
          // 4:3 比例（比图片原始 3:2 更方），cover 模式会裁掉图片左右边缘，突出中央书本
          aspectRatio: "4 / 3",
          borderRadius: "4px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5)",
        }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        {/* 图片作为场景纹理层（fill + cover 铺满，裁掉边缘突出书本） */}
        <MagicObject
          assetId="spell-book-main"
          preset="spell-book"
          fill
          objectFit="cover"
          objectPosition="center 45%"
          interactive={false}
          enableHoverGlow={false}
        >
          {/* === React Overlay 层 === */}
          <AnimatePresence mode="wait">
            {!isOpen ? (
              /* 闭合态：封面标题 + 符文 + chapter + hint */
              <BookCoverOverlay
                key="cover"
                hovered={hovered}
                chapter={chapter}
                onOpenClick={onOpenClick}
              />
            ) : (
              /* 打开态：内页内容容器 */
              <BookPageOverlay key="pages">{children}</BookPageOverlay>
            )}
          </AnimatePresence>
        </MagicObject>
      </motion.div>
    </div>
  );
}

/**
 * 封面 overlay（闭合态）。
 *
 * 包含：
 *   - 顶部 chapter 信息
 *   - 中央魔法符文
 *   - 标题文字（LIBER POTIONUM / The Half-Blood Prince）
 *   - hover 时显示交互提示
 */
function BookCoverOverlay({
  hovered,
  chapter,
  onOpenClick,
}: {
  hovered: boolean;
  chapter?: string;
  onOpenClick?: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-between"
      style={{
        pointerEvents: onOpenClick ? "auto" : "none",
        cursor: onOpenClick ? "pointer" : "default",
      }}
      onClick={onOpenClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, rotateY: -175 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* 顶部 chapter 信息（融入材质） */}
      {chapter && (
        <div
          className="mt-[8%] text-center"
          style={{
            fontFamily: "Cinzel, serif",
            fontWeight: 700,
            fontSize: "clamp(10px, 1.4vw, 14px)",
            letterSpacing: "0.4em",
            color: "#d4621a",
            opacity: 0.5,
            mixBlendMode: "overlay",
          }}
        >
          {chapter}
        </div>
      )}

      {/* 中央魔法符文（刻印风格，低 opacity 融入皮革） */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
        style={{ mixBlendMode: "overlay" }}
      >
        <motion.svg
          viewBox="-60 -60 120 120"
          className="h-[36%] w-[36%]"
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* 外环（刻印，暗色） */}
          <circle
            cx="0"
            cy="0"
            r="48"
            fill="none"
            stroke="#3a2418"
            strokeWidth="0.8"
            opacity="0.6"
          />
          {/* 中环 */}
          <circle
            cx="0"
            cy="0"
            r="38"
            fill="none"
            stroke="#3a2418"
            strokeWidth="0.5"
            opacity="0.5"
          />
          {/* 五角星（刻印，深褐） */}
          <path
            d="M 0 -30 L 9 -10 L 30 -8 L 14 4 L 19 24 L 0 14 L -19 24 L -14 4 L -30 -8 L -9 -10 Z"
            fill="none"
            stroke="#5a2a14"
            strokeWidth="1"
            strokeLinejoin="round"
            opacity="0.5"
          />
          {/* 中央光点（唯一亮色，微弱呼吸） */}
          <motion.circle
            cx="0"
            cy="0"
            r="2"
            fill="#fa4c14"
            animate={{ opacity: [0.3, 0.6, 0.3], r: [1.5, 2.5, 1.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* 四向刻度 */}
          <line x1="0" y1="-52" x2="0" y2="-46" stroke="#3a2418" strokeWidth="0.6" opacity="0.5" />
          <line x1="0" y1="46" x2="0" y2="52" stroke="#3a2418" strokeWidth="0.6" opacity="0.5" />
          <line x1="-52" y1="0" x2="-46" y2="0" stroke="#3a2418" strokeWidth="0.6" opacity="0.5" />
          <line x1="46" y1="0" x2="52" y2="0" stroke="#3a2418" strokeWidth="0.6" opacity="0.5" />
        </motion.svg>
      </div>

      {/* 标题文字（烫金压印，融入皮革材质） */}
      <div
        className="mt-[22%] text-center"
        style={{
          fontFamily: "Cinzel, serif",
          fontWeight: 700,
          fontSize: "clamp(13px, 1.8vw, 18px)",
          letterSpacing: "0.4em",
          color: "#d4621a",
          opacity: 0.55,
          mixBlendMode: "overlay",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        LIBER POTIONUM
      </div>

      {/* 副标题（更淡，融入皮革） */}
      <div
        className="mb-[20%] text-center"
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: "clamp(9px, 1.1vw, 11px)",
          letterSpacing: "0.25em",
          color: "#8a7020",
          opacity: 0.4,
          mixBlendMode: "overlay",
        }}
      >
        ✦ The Half-Blood Prince ✦
      </div>

      {/* 交互提示（hover 时显示，融入材质） */}
      <AnimatePresence>
        {hovered && onOpenClick && (
          <motion.div
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontStyle: "italic",
              fontSize: "clamp(9px, 1vw, 11px)",
              color: "#d4621a",
              letterSpacing: "0.15em",
              mixBlendMode: "overlay",
            }}
          >
            ✦ Click to open ✦
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * 内页 overlay（打开态）。
 *
 * 容器层，children 由父组件（ResearchNotebook 等）注入。
 * 定位在图片的羊皮纸区域内。
 */
function BookPageOverlay({ children }: { children?: ReactNode }) {
  return (
    <motion.div
      className="absolute flex items-stretch justify-stretch overflow-hidden"
      style={{
        // 定位到书本内页区域（与图片羊皮纸区域对齐）
        top: "18%",
        bottom: "16%",
        left: "8%",
        right: "8%",
        pointerEvents: "auto",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.8 }}
    >
      {children}
    </motion.div>
  );
}

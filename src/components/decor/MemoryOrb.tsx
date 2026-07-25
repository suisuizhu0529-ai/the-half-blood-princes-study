import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SharedHistoryEvent } from "@/types/sharedHistory";

interface MemoryOrbProps {
  /** 对应的 sharedHistory 事件 */
  event: SharedHistoryEvent;
  /** 在光球簇中的索引（用于错开浮动动画延迟） */
  index: number;
  className?: string;
}

/** 事件类型 → 颜色映射 */
const EVENT_TYPE_COLOR: Record<string, { core: string; glow: string; label: string }> = {
  "knowledge-gap": { core: "#e0a458", glow: "rgba(224, 164, 88, 0.6)", label: "Knowledge Gap" },
  "achievement": { core: "#c9a227", glow: "rgba(201, 162, 39, 0.6)", label: "Achievement" },
  "archive-explored": { core: "#7a8aa0", glow: "rgba(122, 138, 160, 0.5)", label: "Archive Explored" },
  "topic-discussed": { core: "#9a8a6a", glow: "rgba(154, 138, 106, 0.5)", label: "Topic Discussed" },
};

/**
 * 记忆光球（Phase 16.2-A）。
 *
 * 视觉：
 *   - 金色悬浮光球，带光晕
 *   - 缓慢上下浮动（不同 index 错开延迟）
 *   - hover 放大 + 显示事件摘要 tooltip
 *
 * 数据映射：
 *   - 每个光球对应一条 SharedHistoryEvent
 *   - 颜色按事件类型区分
 *   - count > 1 时光球内部显示数字
 */
export default function MemoryOrb({ event, index, className }: MemoryOrbProps) {
  const [hovered, setHovered] = useState(false);
  const colors = EVENT_TYPE_COLOR[event.type] ?? EVENT_TYPE_COLOR["topic-discussed"];

  return (
    <motion.div
      className={cn("relative cursor-pointer", className)}
      style={{ width: 48, height: 48 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      aria-label={`Memory: ${event.subject}`}
    >
      {/* 浮动动画 */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 4 + index * 0.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.3,
        }}
        className="relative w-full h-full"
      >
        {/* hover 放大 */}
        <motion.div
          animate={{ scale: hovered ? 1.25 : 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-full"
        >
          <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id={`orb-core-${index}`} cx="0.4" cy="0.35" r="0.6">
                <stop offset="0" stopColor="#fff8e0" stopOpacity="0.95" />
                <stop offset="0.3" stopColor={colors.core} stopOpacity="0.85" />
                <stop offset="1" stopColor={colors.core} stopOpacity="0.3" />
              </radialGradient>
              <radialGradient id={`orb-glow-${index}`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor={colors.core} stopOpacity="0.4" />
                <stop offset="1" stopColor={colors.core} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 外光晕 */}
            <circle cx="24" cy="24" r="24" fill={`url(#orb-glow-${index})`} />
            {/* 光球主体 */}
            <circle cx="24" cy="24" r="14" fill={`url(#orb-core-${index})`} />
            {/* 高光 */}
            <ellipse cx="20" cy="20" rx="4" ry="3" fill="#fff8e0" opacity="0.6" />

            {/* count 标记（>1 时显示） */}
            {event.count > 1 && (
              <g>
                <circle cx="34" cy="34" r="6" fill="#1a0e08" stroke={colors.core} strokeWidth="1" />
                <text
                  x="34" y="37" textAnchor="middle"
                  fill={colors.core}
                  fontSize="8"
                  fontFamily="Cinzel, serif"
                  fontWeight="600"
                >
                  {event.count}
                </text>
              </g>
            )}
          </svg>
        </motion.div>

        {/* hover tooltip */}
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 -translate-x-1/2 -top-20 z-30 pointer-events-none"
          >
            <div className="whitespace-nowrap rounded border border-gold/30 bg-stone-950/95 px-3 py-2 shadow-lg">
              <p className="font-serif text-[10px] uppercase tracking-widest text-gold/70">
                {colors.label}
              </p>
              <p className="font-serif text-xs text-parchment/90 mt-1">
                {event.subject}
              </p>
              {event.detail && (
                <p className="font-serif text-[10px] italic text-parchment/60 mt-0.5">
                  {event.detail}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PotionBottleSetProps {
  /** 药剂瓶数量（对应 achievements.length） */
  count: number;
  className?: string;
}

/** 最大显示瓶数 */
const MAX_BOTTLES = 5;

/** 5 种瓶型（不同形状 + 液体颜色，呼应 potionLevel） */
const BOTTLE_SHAPES = [
  { liquidColor: "#c9a227", glassColor: "rgba(180, 150, 90, 0.3)" }, // 琥珀
  { liquidColor: "#3a7a5a", glassColor: "rgba(90, 160, 120, 0.3)" }, // 翡翠
  { liquidColor: "#5a3a7a", glassColor: "rgba(140, 100, 170, 0.3)" }, // 深紫
  { liquidColor: "#c8c8d8", glassColor: "rgba(180, 180, 200, 0.3)" }, // 银白
  { liquidColor: "#ffd88a", glassColor: "rgba(220, 180, 100, 0.3)" }, // 金色
] as const;

/**
 * 药剂瓶陈列架（Phase 16.2-A → 16.2-B 增强 hover）。
 *
 * 视觉：
 *   - 木质架子 + 铜框
 *   - 5 种不同形状的药剂瓶
 *   - 瓶内液体颜色对应 potionLevel
 *
 * Phase 16.2-B hover 增强：
 *   - hover 瓶子 → 瓶内液体轻微旋转 + 玻璃反光增强
 *   - 出现 tooltip 显示瓶序号
 */
export default function PotionBottleSet({ count, className }: PotionBottleSetProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const visibleCount = Math.min(count, MAX_BOTTLES);

  return (
    <div className={cn("relative", className)} aria-hidden>
      {/* 药剂架背景 */}
      <div className="relative flex items-end gap-3 px-2 pb-2 pt-6">
        {/* 架子横木 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 rounded-sm"
          style={{
            background: "linear-gradient(180deg, #3a2418 0%, #1a0e08 100%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}
        />
        {/* 铜框装饰 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, #8a7020, transparent)" }}
        />

        {Array.from({ length: MAX_BOTTLES }).map((_, i) => {
          const isVisible = i < visibleCount;
          const isHovered = hoveredIdx === i;
          const shape = BOTTLE_SHAPES[i]!;

          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: isVisible ? 1 : 0.15,
                opacity: isVisible ? 1 : 0.15,
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: "bottom center" }}
              className="relative z-10"
              onHoverStart={() => setHoveredIdx(i)}
              onHoverEnd={() => setHoveredIdx(null)}
            >
              {/* hover 时的光晕 */}
              <motion.div
                animate={{ opacity: isHovered && isVisible ? 0.3 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute -inset-2 rounded-full blur-xl pointer-events-none"
                style={{ background: `radial-gradient(circle, ${shape.liquidColor} 0%, transparent 70%)` }}
              />

              {/* hover tooltip */}
              {isHovered && isVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 -top-10 z-30 pointer-events-none whitespace-nowrap"
                >
                  <span className="font-serif text-[10px] uppercase tracking-widest text-gold/80 bg-stone-950/95 px-2 py-1 rounded border border-gold/20">
                    Vial {i + 1}
                  </span>
                </motion.div>
              )}

              <svg viewBox="0 0 40 70" width="32" height="56" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={`liquid-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={shape.liquidColor} stopOpacity="0.7" />
                    <stop offset="1" stopColor={shape.liquidColor} stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id={`glass-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={shape.glassColor} stopOpacity="0.2" />
                    <stop offset="0.5" stopColor={shape.glassColor} stopOpacity="0.5" />
                    <stop offset="1" stopColor={shape.glassColor} stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* 瓶塞 */}
                <rect x="17" y="4" width="6" height="8" rx="1" fill="#4a3020" />
                <rect x="16" y="10" width="8" height="3" rx="1" fill="#3a2418" />

                {/* 瓶颈 */}
                <rect x="18" y="12" width="4" height="8" fill={`url(#glass-${i})`} />

                {/* 瓶身（不同形状） + 液体（hover 时旋转） */}
                {i === 0 && (
                  <>
                    <ellipse cx="20" cy="48" rx="14" ry="16" fill={`url(#glass-${i})`} />
                    <motion.ellipse
                      cx="20" cy="52" rx="10" ry="11"
                      fill={`url(#liquid-${i})`}
                      animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      style={{ transformOrigin: "20px 52px" }}
                    />
                  </>
                )}
                {i === 1 && (
                  <>
                    <path d="M 8 60 L 14 22 L 26 22 L 32 60 Z" fill={`url(#glass-${i})`} />
                    <motion.path
                      d="M 11 58 L 15 28 L 25 28 L 29 58 Z"
                      fill={`url(#liquid-${i})`}
                      animate={isHovered ? { scaleY: [1, 0.95, 1.02, 1] } : { scaleY: 1 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: "20px 58px" }}
                    />
                  </>
                )}
                {i === 2 && (
                  <>
                    <rect x="12" y="20" width="16" height="40" rx="3" fill={`url(#glass-${i})`} />
                    <motion.rect
                      x="14" y="35" width="12" height="23" rx="2"
                      fill={`url(#liquid-${i})`}
                      animate={isHovered ? { y: [35, 34, 36, 35] } : { y: 35 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </>
                )}
                {i === 3 && (
                  <>
                    <circle cx="20" cy="45" r="15" fill={`url(#glass-${i})`} />
                    <motion.path
                      d="M 8 50 Q 20 60 32 50 L 30 58 Q 20 62 10 58 Z"
                      fill={`url(#liquid-${i})`}
                      animate={isHovered ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: "20px 55px" }}
                    />
                  </>
                )}
                {i === 4 && (
                  <>
                    <rect x="10" y="22" width="20" height="38" rx="2" fill={`url(#glass-${i})`} />
                    <motion.rect
                      x="12" y="36" width="16" height="22" rx="1"
                      fill={`url(#liquid-${i})`}
                      animate={isHovered ? { scaleX: [1, 0.96, 1.02, 1] } : { scaleX: 1 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: "20px 47px" }}
                    />
                  </>
                )}

                {/* 玻璃高光（hover 时增强） */}
                <motion.ellipse
                  cx="15" cy="35" rx="2" ry="8"
                  fill="#fff8e0"
                  animate={{ opacity: isHovered ? 0.5 : 0.2 }}
                  transition={{ duration: 0.3 }}
                />

                {/* 底座阴影 */}
                <ellipse cx="20" cy="64" rx="12" ry="2" fill="#000" opacity="0.3" />
              </svg>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

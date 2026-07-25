/**
 * MagicCursor（Phase 17.1-G · 纯 SVG 魔杖光标版）。
 *
 * 定位：全局鼠标魔杖光效。
 *   - 纯 SVG 自绘 Snape 风格魔杖（深黑檀木、简洁、固定向上）
 *   - 无外链图片依赖，刷新即用
 *   - 移动端 / 触摸设备自动隐藏
 *   - pointer-events-none，不拦截交互
 *
 * 视觉：
 *   - 魔杖主体：深黑檀木渐变（#1a0e08 → #0a0604），细长优雅
 *   - 杖底握把：4 道刻纹
 *   - 顶端：微弱暖金光点（不夸张，单层 6px）
 *   - 尺寸：80x120（细长比例，不占满屏）
 *   - 固定角度向上
 *
 * 不做：
 *   - 不修改 AmbientLayer
 *   - 不影响 parallax / 桌面物件
 *   - 不接入 Memory
 */

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagicCursorProps {
  /** 光晕强度（0-1），可由 Ritual 阶段控制 */
  intensity?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

export default function MagicCursor({
  intensity = 1,
  enabled = true,
}: MagicCursorProps) {
  // 原始鼠标位置
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  // 弹簧平滑跟随
  const springConfig = { damping: 30, stiffness: 400, mass: 0.5 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: MouseEvent) => {
      // 魔杖锚点：底端中心对齐鼠标（向上延伸 120px）
      mouseX.set(e.clientX - 40);
      mouseY.set(e.clientY - 120);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [enabled, mouseX, mouseY]);

  if (!enabled) return null;

  const opacity = Math.min(0.95 * intensity, 1);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden md:block"
      style={{
        x,
        y,
        width: 80,
        height: 120,
        opacity,
        willChange: "transform",
      }}
    >
      <svg
        viewBox="0 0 80 120"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))" }}
      >
        <defs>
          {/* 魔杖杖身：深黑檀木渐变 */}
          <linearGradient id="wandBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0a0604" />
            <stop offset="50%" stopColor="#2a1810" />
            <stop offset="100%" stopColor="#0a0604" />
          </linearGradient>

          {/* 杖身高光（中央细线） */}
          <linearGradient id="wandShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3a24" stopOpacity="0" />
            <stop offset="50%" stopColor="#5a3a24" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5a3a24" stopOpacity="0" />
          </linearGradient>

          {/* 顶端光点（微弱暖金） */}
          <radialGradient id="wandTip" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fa4c14" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#c9a227" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* === 杖身主体（从底到顶，细长微锥） === */}
        {/* 底部：x1=36, x2=44 (宽 8)，顶部：x1=38, x2=42 (宽 4) */}
        <path
          d="M 36 118 L 44 118 L 42 4 L 38 4 Z"
          fill="url(#wandBody)"
        />

        {/* 中央高光线 */}
        <line x1="40" y1="4" x2="40" y2="118" stroke="url(#wandShine)" strokeWidth="1.5" opacity="0.6" />

        {/* === 杖底握把刻纹（4 道） === */}
        <g opacity="0.5">
          <line x1="36" y1="108" x2="44" y2="108" stroke="#000" strokeWidth="0.5" />
          <line x1="36" y1="112" x2="44" y2="112" stroke="#000" strokeWidth="0.5" />
          <line x1="36" y1="116" x2="44" y2="116" stroke="#000" strokeWidth="0.5" />
        </g>

        {/* === 顶端微弱光点（单层 6px） === */}
        <circle cx="40" cy="4" r="6" fill="url(#wandTip)" />
        <circle cx="40" cy="4" r="1" fill="#fa4c14" opacity="0.6" />
      </svg>
    </motion.div>
  );
}
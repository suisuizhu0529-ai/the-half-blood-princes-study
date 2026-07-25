/**
 * CandleRitual（Phase 18.3 · 5 阶段魔法蜡烛仪式）。
 *
 * 定位：替换 AwakeningSequence 中的内置 Candle 函数。
 *
 * 架构：
 *   SceneObject（基类，位置/缩放/hover/click）
 *     ↓
 *   CandleRitual（5 阶段仪式渲染，由父组件通过 stage prop 控制）
 *
 * 状态机（外部控制，不内自治）：
 *   0 idle         未激活，仅微弱轮廓
 *   1 gathering    金色火星向烛芯汇聚
 *   2 rune         烛台底部符文环淡入
 *   3 ignition     火焰点燃（ember → small → stable）
 *   4 illumination 光照扩散（桌面光池）
 *   5 completed    稳定 idle flicker
 *
 * 父组件职责：
 *   - 管理时间轴（何时切换 stage）
 *   - 多根蜡烛的点燃顺序编排
 *
 * 不做：
 *   - 不内建 setTimeout 切换 stage
 *   - 不引入第三方动画库
 *   - 不修改 assetManifest
 */

import { motion, type Variants } from "framer-motion";
import SceneObject from "../scene/SceneObject";

export type CandleStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface CandleRitualProps {
  /** 当前阶段（0-5） */
  stage: CandleStage;
  /** 水平位置百分比，默认 50 */
  positionX?: number;
  /** 垂直位置百分比，默认 50 */
  positionY?: number;
  /** 缩放倍率，默认 1 */
  scale?: number;
  /** 蜡烛类型（影响配色，中央蜡烛略大略亮） */
  variant?: "center" | "side";
  /** 自定义 className */
  className?: string;
}

/** 阶段切换的视觉参数 */
interface StageVisual {
  /** 烛体透明度 */
  candleOpacity: number;
  /** 火焰透明度 */
  flameOpacity: number;
  /** 火焰缩放 */
  flameScale: number;
  /** 光晕透明度 */
  glowOpacity: number;
  /** 光晕半径 */
  glowRadius: number;
  /** 符文透明度 */
  runeOpacity: number;
  /** 桌面光池透明度 */
  poolOpacity: number;
  /** 粒子是否激活 */
  particlesActive: boolean;
}

/** 按 stage 返回视觉参数 */
function getStageVisual(stage: CandleStage): StageVisual {
  switch (stage) {
    case 0: // idle：仅微弱轮廓
      return {
        candleOpacity: 0.4,
        flameOpacity: 0,
        flameScale: 0,
        glowOpacity: 0,
        glowRadius: 8,
        runeOpacity: 0,
        poolOpacity: 0,
        particlesActive: false,
      };
    case 1: // gathering：粒子汇聚，烛体渐显
      return {
        candleOpacity: 0.7,
        flameOpacity: 0,
        flameScale: 0,
        glowOpacity: 0.1,
        glowRadius: 10,
        runeOpacity: 0,
        poolOpacity: 0,
        particlesActive: true,
      };
    case 2: // rune：符文亮起
      return {
        candleOpacity: 0.9,
        flameOpacity: 0,
        flameScale: 0,
        glowOpacity: 0.2,
        glowRadius: 12,
        runeOpacity: 0.8,
        poolOpacity: 0,
        particlesActive: true,
      };
    case 3: // ignition：火焰点燃
      return {
        candleOpacity: 1,
        flameOpacity: 1,
        flameScale: 1,
        glowOpacity: 0.5,
        glowRadius: 18,
        runeOpacity: 0.6,
        poolOpacity: 0.3,
        particlesActive: false,
      };
    case 4: // illumination：光照扩散
      return {
        candleOpacity: 1,
        flameOpacity: 1,
        flameScale: 1,
        glowOpacity: 0.7,
        glowRadius: 24,
        runeOpacity: 0.5,
        poolOpacity: 0.6,
        particlesActive: false,
      };
    case 5: // completed：稳定 idle
      return {
        candleOpacity: 1,
        flameOpacity: 1,
        flameScale: 1,
        glowOpacity: 0.6,
        glowRadius: 22,
        runeOpacity: 0.4,
        poolOpacity: 0.5,
        particlesActive: false,
      };
  }
}

/** 火焰摇曳动画（idle flicker） */
const flameFlickerVariants: Variants = {
  idle: {
    scaleY: [1, 1.08, 0.96, 1.05, 1],
    opacity: [1, 0.92, 1, 0.95, 1],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  static: {
    scaleY: 1,
    opacity: 1,
  },
};

/** 光池呼吸动画 */
const poolBreathVariants: Variants = {
  breathing: {
    scale: [1, 1.05, 0.98, 1.04, 1],
    opacity: [0.5, 0.6, 0.45, 0.55, 0.5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  static: {
    scale: 1,
    opacity: 0,
  },
};

/**
 * 单根魔法蜡烛（5 阶段仪式）。
 *
 * 渲染结构：
 *   <SceneObject 定位>
 *     <svg 蜡烛主体>
 *       <defs 渐变定义>
 *       <桌面光池>
 *       <烛台底座>
 *       <烛体>
 *       <符文环>
 *       <粒子汇聚（stage 1-2）>
 *       <火焰光晕>
 *       <火焰本体>
 *     </svg>
 *   </SceneObject>
 */
export default function CandleRitual({
  stage,
  positionX = 50,
  positionY = 50,
  scale = 1,
  variant = "side",
  className,
}: CandleRitualProps) {
  const visual = getStageVisual(stage);
  const isCenter = variant === "center";

  // 中央蜡烛略大略亮
  const sizeScale = isCenter ? 1.15 : 1;
  const glowBoost = isCenter ? 1.2 : 1;

  // 蜡烛 SVG 视觉参数
  const candleWidth = 8;
  const candleHeight = 48;
  const baseY = 92;

  // 粒子配置（stage 1-2 激活）
  const particleCount = 8;
  const particleRadius = 30;

  return (
    <SceneObject
      positionX={positionX}
      positionY={positionY}
      scale={scale * sizeScale}
      interactive={false}
      className={className}
      ariaLabel="Magic candle"
    >
      <motion.svg
        viewBox="0 0 60 120"
        className="h-48 w-20"
        animate={{ opacity: visual.candleOpacity }}
        transition={{ duration: 0.4 }}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* 火焰径向渐变 */}
          <radialGradient id={`flame-${variant}-${positionX}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff4d6" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffc878" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e0a458" stopOpacity="0" />
          </radialGradient>
          {/* 烛体渐变 */}
          <linearGradient id={`body-${variant}-${positionX}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d8c7a5" />
            <stop offset="50%" stopColor="#f5f1e6" />
            <stop offset="100%" stopColor="#c8b790" />
          </linearGradient>
          {/* 烛台底座渐变 */}
          <linearGradient id={`base-${variant}-${positionX}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b5a3e" />
            <stop offset="50%" stopColor="#8b7355" />
            <stop offset="100%" stopColor="#5a4a30" />
          </linearGradient>
          {/* 符文环渐变 */}
          <linearGradient id={`rune-${variant}-${positionX}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c9a227" stopOpacity="0" />
            <stop offset="50%" stopColor="#f0c84e" stopOpacity="1" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 桌面光池（stage 4-5，呼吸动画） */}
        <motion.ellipse
          cx="30"
          cy={baseY + 8}
          rx="28"
          ry="6"
          fill={`url(#flame-${variant}-${positionX})`}
          variants={poolBreathVariants}
          initial="static"
          animate={stage >= 4 ? "breathing" : "static"}
          style={{ opacity: visual.poolOpacity }}
        />

        {/* 烛台底座 */}
        <ellipse cx="30" cy={baseY} rx="14" ry="4" fill={`url(#base-${variant}-${positionX})`} />
        <rect
          x="18"
          y={baseY - 6}
          width="24"
          height="6"
          rx="1"
          fill={`url(#base-${variant}-${positionX})`}
        />

        {/* 烛体 */}
        <rect
          x={30 - candleWidth / 2}
          y={baseY - candleHeight - 6}
          width={candleWidth}
          height={candleHeight}
          fill={`url(#body-${variant}-${positionX})`}
        />
        <ellipse
          cx="30"
          cy={baseY - candleHeight - 6}
          rx={candleWidth / 2}
          ry="1.5"
          fill="#e8d8b5"
        />

        {/* 烛芯 */}
        <line
          x1="30"
          y1={baseY - candleHeight - 6}
          x2="30"
          y2={baseY - candleHeight - 12}
          stroke="#3a2418"
          strokeWidth="0.8"
        />

        {/* 符文环（stage 2+，烛台底部金色光环） */}
        <motion.ellipse
          cx="30"
          cy={baseY + 2}
          rx="20"
          ry="3"
          fill="none"
          stroke={`url(#rune-${variant}-${positionX})`}
          strokeWidth="0.6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: visual.runeOpacity,
            scale: visual.runeOpacity > 0 ? 1 : 0.8,
          }}
          transition={{ duration: 0.5 }}
          style={{ transformOrigin: `30px ${baseY + 2}px` }}
        />

        {/* 粒子汇聚（stage 1-2，金色火星从外圈向烛芯移动） */}
        {visual.particlesActive &&
          Array.from({ length: particleCount }).map((_, i) => {
            const angle = (i / particleCount) * Math.PI * 2;
            const startX = 30 + Math.cos(angle) * particleRadius;
            const startY = baseY - candleHeight - 6 + Math.sin(angle) * particleRadius * 0.5;
            return (
              <motion.circle
                key={`particle-${i}`}
                cx={startX}
                cy={startY}
                r="0.8"
                fill="#f0c84e"
                initial={{ opacity: 0 }}
                animate={{
                  cx: [startX, 30],
                  cy: [startY, baseY - candleHeight - 12],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  repeat: Infinity,
                  repeatDelay: 0.2,
                  ease: "easeIn",
                }}
              />
            );
          })}

        {/* 火焰光晕 */}
        <motion.circle
          cx="30"
          cy={baseY - candleHeight - 18}
          r={visual.glowRadius * glowBoost}
          fill={`url(#flame-${variant}-${positionX})`}
          animate={{ opacity: visual.glowOpacity }}
          transition={{ duration: 0.4 }}
        />

        {/* 火焰本体（stage 3+，摇曳动画） */}
        <motion.path
          d={`M 30 ${baseY - candleHeight - 12} Q 27 ${baseY - candleHeight - 18} 30 ${baseY - candleHeight - 24} Q 33 ${baseY - candleHeight - 18} 30 ${baseY - candleHeight - 12} Z`}
          fill="#ffc878"
          variants={flameFlickerVariants}
          initial="static"
          animate={stage >= 3 ? "idle" : "static"}
          style={{
            transformOrigin: `30px ${baseY - candleHeight - 12}px`,
            opacity: visual.flameOpacity,
            scale: visual.flameScale,
          }}
        />
      </motion.svg>
    </SceneObject>
  );
}

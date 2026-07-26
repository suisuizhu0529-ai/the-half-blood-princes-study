/**
 * CandleAmbientLight（Phase 19.2 · 蜡烛环境光层）。
 *
 * 定位：
 *   根据三根蜡烛的 stage，控制一个全屏 radial-gradient overlay，
 *   让"蜡烛点亮房间"而非"蜡烛自己发光"。
 *
 * 设计原则（Snape 冷峻风格）：
 *   - 不做真实光照计算
 *   - 暖光低饱和（金/橙），避免游戏化
 *   - 与 CandleRitual.illumination 阶段同步增强
 *   - 中央蜡烛权重更高（variant=center）
 *
 * 视觉映射：
 *   stage 0 idle          → opacity 0（房间黑暗）
 *   stage 1-2 gathering   → 微弱暖光开始浮现
 *   stage 3 ignition      → 光晕明显增强
 *   stage 4 illumination  → 光照扩散到桌面
 *   stage 5 completed     → 稳定暖光（房间被点亮）
 *
 * 不做：
 *   - 不新建光照系统
 *   - 不引入 Three.js
 *   - 不修改状态机
 */

import { motion } from "framer-motion";
import type { CandleStage } from "./CandleRitual";

export interface CandleAmbientLightProps {
  /** 三根蜡烛的当前 stage（中央、左、右） */
  centerStage: CandleStage;
  leftStage: CandleStage;
  rightStage: CandleStage;
  /** 自定义 className */
  className?: string;
}

/** 单根蜡烛对环境光的贡献（0-1） */
function candleContribution(stage: CandleStage): number {
  switch (stage) {
    case 0:
      return 0;
    case 1: // gathering
      return 0.08;
    case 2: // rune
      return 0.15;
    case 3: // ignition
      return 0.45;
    case 4: // illumination
      return 0.75;
    case 5: // completed
      return 0.65; // 稳定略低于 illumination 峰值
  }
}

/**
 * 蜡烛环境光层。
 *
 * 实现：
 *   - 中央蜡烛权重 1.4（略大略亮）
 *   - 左右蜡烛权重 1.0
 *   - 总亮度 clamp 到 1
 *   - 双层 radial-gradient：
 *       底层（大范围暖光扩散，模拟房间被点亮）
 *       顶层（桌面光池，更聚焦）
 *   - 微弱 flicker（completed 阶段，呼应火焰摇曳）
 */
export default function CandleAmbientLight({
  centerStage,
  leftStage,
  rightStage,
  className,
}: CandleAmbientLightProps) {
  const centerContrib = candleContribution(centerStage) * 1.4;
  const leftContrib = candleContribution(leftStage);
  const rightContrib = candleContribution(rightStage);
  const totalBrightness = Math.min(centerContrib + leftContrib + rightContrib, 1);

  // 底层：大范围暖光（房间被点亮感）
  const baseOpacity = totalBrightness * 0.35;
  // 顶层：桌面光池（更聚焦，呼应 CandleRitual 的 pool）
  const poolOpacity = totalBrightness * 0.5;
  // 光晕半径：亮度越高扩散越远
  const baseScale = 0.85 + totalBrightness * 0.4;
  // completed 阶段微弱 flicker（呼应火焰）
  const isStable = centerStage >= 5 && leftStage >= 5 && rightStage >= 5;

  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      aria-hidden="true"
      style={{ zIndex: 5 }}
      animate={{
        opacity: baseOpacity,
        scale: baseScale,
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* 底层：大范围暖光扩散（房间被点亮） */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 65%, rgba(255, 200, 120, 0.35) 0%, rgba(250, 160, 80, 0.15) 35%, transparent 70%)",
          filter: "blur(8px)",
        }}
        animate={
          isStable
            ? { opacity: [1, 0.92, 1.04, 0.96, 1] }
            : { opacity: 1 }
        }
        transition={
          isStable
            ? {
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0.6 }
        }
      />

      {/* 顶层：桌面光池（更聚焦，呼应蜡烛光池） */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 40% 25% at 50% 72%, rgba(255, 220, 160, 0.4) 0%, rgba(250, 180, 100, 0.2) 40%, transparent 75%)",
          filter: "blur(4px)",
        }}
        animate={{ opacity: poolOpacity }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}

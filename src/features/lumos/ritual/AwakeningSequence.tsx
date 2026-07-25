/**
 * AwakeningSequence（Phase 18.3 重构版）。
 *
 * 定位：Lumos 仪式 Phase B（环境苏醒 + 魔杖挥光，4s）。
 *
 * 时间轴（4s，Phase 19.1 调整 rune 阶段至 0.5s）：
 *   0.0-0.8s  纯黑（/100，盖住首页 fade out）
 *   0.0-0.5s  魔杖挥光弧
 *   0.8-2.0s  黑暗变薄 + 月光增强
 *   0.8s      中央蜡烛 stage 0 → 1（gathering）
 *   1.1s      中央蜡烛 stage 1 → 2（rune，持续 0.5s）
 *   1.6s      中央蜡烛 stage 2 → 3（ignition）+ 左蜡烛开始 gathering
 *   1.9s      中央蜡烛 stage 3 → 4（illumination）+ 左蜡烛 rune
 *   2.2s      中央蜡烛 stage 4 → 5（completed）+ 左蜡烛 ignition + 右蜡烛 gathering
 *   2.5s      左蜡烛 illumination + 右蜡烛 rune
 *   2.8s      左蜡烛 completed + 右蜡烛 ignition
 *   3.1s      右蜡烛 illumination
 *   3.4s      右蜡烛 completed
 *   2.5-4.0s  书本浮现光晕（金色，引导视觉）
 *   4.0s      完成 → 调用 onComplete（进入 research 阶段）
 *
 * 重构说明（Phase 18.3）：
 *   - 删除内置 Candle 函数
 *   - 改用 CandleRitual ×3，由 stage 状态机驱动 5 阶段唤醒
 *   - 中央蜡烛优先点燃（0.8s 起），左右蜡烛依次跟随
 *   - 蜡烛位置：中央 z 高 + scale 大，左右 z 低 + scale 小（前/后景关系）
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import CandleRitual, { type CandleStage } from "./CandleRitual";
import ParticleField from "../scene/ParticleField";
import { sfxManager } from "@/services/audio/sfxManager";

interface AwakeningSequenceProps {
  /** 苏醒完成回调 */
  onComplete: () => void;
  className?: string;
}

/** 单根蜡烛的时间轴配置 */
interface CandleTimeline {
  /** 各阶段切换时间点（秒，相对 awakening 开始） */
  stages: { stage: CandleStage; at: number }[];
}

/** 中央蜡烛时间轴（Phase 19.1：rune 阶段持续 0.5s，让用户能看清符文） */
const centerTimeline: CandleTimeline = {
  stages: [
    { stage: 1, at: 0.8 }, // gathering
    { stage: 2, at: 1.1 }, // rune（持续到 1.6s = 0.5s）
    { stage: 3, at: 1.6 }, // ignition
    { stage: 4, at: 1.9 }, // illumination
    { stage: 5, at: 2.2 }, // completed
  ],
};

/** 左蜡烛时间轴（跟随中央，rune 持续 0.5s） */
const leftTimeline: CandleTimeline = {
  stages: [
    { stage: 1, at: 1.4 },
    { stage: 2, at: 1.7 },
    { stage: 3, at: 2.2 },
    { stage: 4, at: 2.5 },
    { stage: 5, at: 2.8 },
  ],
};

/** 右蜡烛时间轴（最后点燃，rune 持续 0.5s） */
const rightTimeline: CandleTimeline = {
  stages: [
    { stage: 1, at: 2.0 },
    { stage: 2, at: 2.3 },
    { stage: 3, at: 2.8 },
    { stage: 4, at: 3.1 },
    { stage: 5, at: 3.4 },
  ],
};

/** 根据时间轴和当前时间计算阶段 */
function getStageAt(timeline: CandleTimeline, elapsed: number): CandleStage {
  let stage: CandleStage = 0;
  for (const s of timeline.stages) {
    if (elapsed >= s.at) stage = s.stage;
  }
  return stage;
}

export default function AwakeningSequence({
  onComplete,
  className,
}: AwakeningSequenceProps) {
  const [elapsed, setElapsed] = useState(0);

  // Phase 19.1：记录上次各蜡烛阶段，用于检测 stage 3（ignition）切换并播放音效
  const prevStagesRef = useRef<{ center: CandleStage; left: CandleStage; right: CandleStage }>({
    center: 0,
    left: 0,
    right: 0,
  });

  // 时间驱动：每 100ms 更新 elapsed
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const now = (Date.now() - start) / 1000;
      setElapsed(now);
    }, 100);

    // 4s 后自动完成
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  // 计算各蜡烛当前阶段
  const centerStage = getStageAt(centerTimeline, elapsed);
  const leftStage = getStageAt(leftTimeline, elapsed);
  const rightStage = getStageAt(rightTimeline, elapsed);

  // Phase 19.1：检测 ignition 阶段切换，播放 candle_ignite 音效
  useEffect(() => {
    const prev = prevStagesRef.current;
    if (centerStage === 3 && prev.center < 3) sfxManager.play("candle_ignite");
    if (leftStage === 3 && prev.left < 3) sfxManager.play("candle_ignite");
    if (rightStage === 3 && prev.right < 3) sfxManager.play("candle_ignite");
    prevStagesRef.current = { center: centerStage, left: leftStage, right: rightStage };
  }, [centerStage, leftStage, rightStage]);

  // Phase 19.1：粒子层 opacity 随蜡烛点燃进度增强
  //   0 - 0.8s   : 0    （纯黑阶段，无粒子）
  //   0.8 - 1.6s : 0.3  （中央蜡烛 gathering→rune，少量粒子）
  //   1.6 - 2.2s : 0.6  （中央蜡烛点燃，粒子增强）
  //   2.2 - 3.4s : 0.9  （左右蜡烛陆续点燃，粒子最浓）
  //   3.4 - 4.0s : 1.0  （全部点燃，氛围稳定）
  const particleOpacity =
    elapsed < 0.8 ? 0
    : elapsed < 1.6 ? 0.3
    : elapsed < 2.2 ? 0.6
    : elapsed < 3.4 ? 0.9
    : 1.0;

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-label="Awakening Sequence">
      {/* 黑暗叠加层（前 0.8s 纯黑，之后快速变薄让蜡烛可见） */}
      <motion.div
        className="absolute inset-0 z-10 bg-stone-950"
        animate={{ opacity: [1, 1, 0.5, 0.35] }}
        transition={{ duration: 4, times: [0, 0.15, 0.4, 1], ease: "easeOut" }}
      />

      {/* 月光增强（0.6s 后开始） */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgba(180,200,230,0.6) 0%, transparent 70%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.8, 1] }}
        transition={{ duration: 4, times: [0, 0.15, 0.4, 1] }}
      />

      {/* Phase 19.1：粒子尘埃层（z=40，在蜡烛之上、魔杖挥光之下）
          - 蜡烛点燃时粒子增强（暖色金尘）
          - 用 fixed 定位覆盖整个 viewport（Lumos 场景 z=999 内部） */}
      <ParticleField
        count={28}
        tone="warm"
        opacity={particleOpacity}
        enabled={elapsed >= 0.8}
        zIndex={40}
      />

      {/* 魔杖挥光弧（0-1.2s，加长持续时间） */}
      <motion.svg
        viewBox="0 0 400 300"
        className="pointer-events-none absolute inset-0 z-30 m-auto h-[60vh] w-[85vw]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.8, 0] }}
        transition={{ duration: 1.5, times: [0, 0.2, 0.5, 1] }}
      >
        <defs>
          <linearGradient id="wandArc" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fa4c14" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffc878" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff4d6" stopOpacity="0.9" />
          </linearGradient>
          <filter id="arcGlow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <motion.path
          d="M 360 260 Q 280 180 200 120 Q 120 60 40 40"
          fill="none"
          stroke="url(#wandArc)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#arcGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {[
          { cx: 280, cy: 180, delay: 0.2 },
          { cx: 200, cy: 120, delay: 0.4 },
          { cx: 120, cy: 60, delay: 0.6 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="3"
            fill="#fff4d6"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 2, 0] }}
            transition={{ duration: 0.6, delay: p.delay }}
          />
        ))}
      </motion.svg>

      {/* 蜡烛组（3 根，中央优先点燃，绝对定位实现前/后景关系） */}
      {/* 左蜡烛（远景，scale 0.9） */}
      <CandleRitual
        stage={leftStage}
        positionX={32}
        positionY={72}
        scale={0.9}
        variant="side"
      />
      {/* 右蜡烛（远景，scale 0.9） */}
      <CandleRitual
        stage={rightStage}
        positionX={68}
        positionY={72}
        scale={0.9}
        variant="side"
      />
      {/* 中央蜡烛（前景，scale 1.0，variant=center 略大略亮） */}
      <CandleRitual
        stage={centerStage}
        positionX={50}
        positionY={68}
        scale={1.0}
        variant="center"
      />

      {/* 书本浮现光晕（2s 开始，金色，引导视觉到中央） */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 m-auto h-[60vh] max-w-2xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201,162,39,0.3) 0%, rgba(250,76,20,0.12) 30%, transparent 70%)",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0, 0.7, 0.9], scale: [0.8, 0.8, 0.95, 1] }}
        transition={{ duration: 4, times: [0, 0.5, 0.7, 1], ease: "easeOut" }}
      />
    </div>
  );
}

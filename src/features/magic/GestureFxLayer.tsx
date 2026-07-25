/**
 * GestureFxLayer（Phase 19.1 · 手势视觉反馈层）。
 *
 * 定位：
 *   全局订阅 MAGIC_CIRCLE / DEATHLY_HALLOWS_GESTURE 事件，
 *   触发短暂、克制的视觉反馈。
 *
 * 设计原则（Snape 冷峻风格）：
 *   - 不加入技能系统
 *   - 不使用粒子爆炸 / 彩色光效
 *   - 短暂出现（1-1.5s），快速消散
 *   - 金色 / 暗金色为主，与 Dark Academia 一致
 *
 * 反馈类型：
 *   MAGIC_CIRCLE：
 *     - 圆形符文环在鼠标位置短暂出现
 *     - 金色光晕扩散
 *     - 1s 后消失
 *
 *   DEATHLY_HALLOWS_GESTURE：
 *     - 死亡圣器符号（三角+圆+竖线）在鼠标位置短暂亮起
 *     - 1.5s 后消失
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { magicEvents, MAGIC_EVENTS, type MagicEventPayload } from "@/features/magic/MagicEvents";

/** 单次视觉反馈实例 */
interface FxInstance {
  id: number;
  type: "circle" | "deathly-hallows";
  x: number;
  y: number;
}

/** 全局 ID 生成器 */
let fxIdCounter = 0;

export default function GestureFxLayer() {
  const [fxList, setFxList] = useState<FxInstance[]>([]);

  useEffect(() => {
    const addFx = (type: "circle" | "deathly-hallows") => (payload: MagicEventPayload) => {
      const id = ++fxIdCounter;
      const fx: FxInstance = { id, type, x: payload.x, y: payload.y };
      setFxList((prev) => [...prev, fx]);

      // 自动移除（circle 1.2s，deathly-hallows 1.6s）
      const lifetime = type === "circle" ? 1200 : 1600;
      setTimeout(() => {
        setFxList((prev) => prev.filter((f) => f.id !== id));
      }, lifetime);
    };

    const unsubCircle = magicEvents.on(MAGIC_EVENTS.MAGIC_CIRCLE, addFx("circle"));
    const unsubHallows = magicEvents.on(
      MAGIC_EVENTS.DEATHLY_HALLOWS_GESTURE,
      addFx("deathly-hallows"),
    );

    return () => {
      unsubCircle();
      unsubHallows();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 200 }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {fxList.map((fx) => (
          <FxRenderer key={fx.id} fx={fx} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** 渲染单个视觉反馈 */
function FxRenderer({ fx }: { fx: FxInstance }) {
  if (fx.type === "circle") {
    return <CircleRuneFx x={fx.x} y={fx.y} />;
  }
  return <DeathlyHallowsFx x={fx.x} y={fx.y} />;
}

/**
 * MAGIC_CIRCLE 反馈：圆形符文环 + 金色光晕。
 * - 0.0-0.3s：符文环淡入 + 扩散
 * - 0.3-0.8s：光晕呼吸
 * - 0.8-1.2s：淡出
 */
function CircleRuneFx({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 0.8, 0], scale: [0.6, 1.0, 1.05, 1.1] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, times: [0, 0.25, 0.7, 1], ease: "easeOut" }}
    >
      <svg viewBox="-60 -60 120 120" className="h-32 w-32">
        <defs>
          <radialGradient id="circleFx-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0c84e" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#c9a227" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 中心光晕 */}
        <circle cx="0" cy="0" r="55" fill="url(#circleFx-glow)" />
        {/* 外环 */}
        <circle
          cx="0"
          cy="0"
          r="42"
          fill="none"
          stroke="#c9a227"
          strokeWidth="0.8"
          opacity="0.7"
        />
        {/* 中环 */}
        <circle
          cx="0"
          cy="0"
          r="32"
          fill="none"
          stroke="#f0c84e"
          strokeWidth="0.5"
          opacity="0.5"
        />
        {/* 四向刻度 */}
        <line x1="0" y1="-46" x2="0" y2="-40" stroke="#c9a227" strokeWidth="0.6" opacity="0.6" />
        <line x1="0" y1="40" x2="0" y2="46" stroke="#c9a227" strokeWidth="0.6" opacity="0.6" />
        <line x1="-46" y1="0" x2="-40" y2="0" stroke="#c9a227" strokeWidth="0.6" opacity="0.6" />
        <line x1="40" y1="0" x2="46" y2="0" stroke="#c9a227" strokeWidth="0.6" opacity="0.6" />
      </svg>
    </motion.div>
  );
}

/**
 * DEATHLY_HALLOWS_GESTURE 反馈：死亡圣器符号短暂亮起。
 * - 0.0-0.4s：符号淡入 + 微弱发光
 * - 0.4-1.0s：稳定显示
 * - 1.0-1.6s：淡出
 */
function DeathlyHallowsFx({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: [0, 0.85, 0.85, 0], scale: [0.7, 1.0, 1.0, 1.05] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.6, times: [0, 0.25, 0.65, 1], ease: "easeOut" }}
    >
      <svg viewBox="0 0 100 100" className="h-36 w-36">
        <defs>
          <radialGradient id="hallowsFx-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c9a227" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 中心光晕 */}
        <circle cx="50" cy="50" r="48" fill="url(#hallowsFx-glow)" />
        {/* 三角形（老魔杖 Elder Wand）— 外框 */}
        <path
          d="M 50 14 L 86 78 L 14 78 Z"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.0"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* 圆形（复活石 Resurrection Stone）— 内切于三角形 */}
        <circle
          cx="50"
          cy="56"
          r="21"
          fill="none"
          stroke="#f0c84e"
          strokeWidth="0.8"
          opacity="0.75"
        />
        {/* 竖线（隐形斗篷 Invisibility Cloak）— 顶点到底边中点 */}
        <line
          x1="50"
          y1="14"
          x2="50"
          y2="78"
          stroke="#f0c84e"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* 中心光点 */}
        <motion.circle
          cx="50"
          cy="56"
          r="1.8"
          fill="#f5e6b8"
          animate={{ opacity: [0.6, 1, 0.6], r: [1.5, 2.2, 1.5] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}

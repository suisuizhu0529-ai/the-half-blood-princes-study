/**
 * BookTransition（Phase 19.2 · 电影级书本打开转场；Round 1 · 真实书本连续性）。
 *
 * 定位：
 *   点击 AncientSpellBook 后触发的沉浸式转场 overlay。
 *   替代旧的 "1.4s timer + scale/opacity/blur" 简单淡出。
 *
 * 设计原则（Dark Academia 电影镜头）：
 *   - 克制、慢、高级
 *   - 不是游戏技能动画
 *   - 每个阶段有明确叙事意图
 *   - 用户感觉"打开魔法书进入课程"
 *
 * 5 阶段时间轴（总时长 2.4s）：
 *   Stage 1 · lock feedback    0    - 300ms
 *     书本微震 + 金光闪现，告知"触碰有效"
 *   Stage 2 · camera zoom      300  - 800ms
 *     镜头推近：scale 1 → 1.4 + 背景暗化
 *   Stage 3 · cover close-up   800  - 1200ms
 *     封面充满屏幕：scale 1.4 → 2.2 + 微 blur
 *   Stage 4 · page turn        1200 - 1600ms
 *     翻页闪光：白金光晕从书脊扩散
 *   Stage 5 · lesson reveal    1600 - 2400ms
 *     Lesson 页面淡入 + 转场层淡出
 *
 * 完成后调用 onComplete → 触发 closeRitual → StudyRoom 显示 Lesson
 *
 * Round 1 视觉连续性修复（回应 Claude "镜头对准的内容错了"）：
 *   - 替换 CSS placeholder（棕色色块 + 占位徽章）为真实书本图片
 *   - 通过 bookImageSrc 接收 AncientSpellBook 使用的同一张素材
 *   - 渲染样式与 AncientSpellBook 完全一致：
 *       4:3 容器、cover 模式、objectPosition "center 45%"、相同 boxShadow
 *   - 保留烫金边框暗示作为图片 overlay（连续性锚点）
 *   - 用户感知：点击前的书本 = 转场中被放大的书本（同一物件）
 *
 * 架构边界：
 *   - 不修改 useLumosRitual 状态机
 *   - 不修改 AncientSpellBook 数据结构
 *   - 不修改 assetManifest 注册逻辑
 *   - 不引入新依赖（仅 React + Framer Motion + CSS）
 *   - 通过 bookRect 接收书本屏幕坐标，实现"从书本位置展开"的镜头感
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface BookTransitionProps {
  /** 书本在视口中的位置和尺寸（用于镜头推近的起始锚点） */
  bookRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /**
   * 真实书本封面图片路径（与 AncientSpellBook 使用同一素材）。
   * Round 1：建立"点击前 = 转场中"的视觉连续性。
   * 由 LumosEntrance 通过 getAsset("spell-book-main")?.src 传入。
   */
  bookImageSrc: string;
  /** 转场完成回调（触发 closeRitual） */
  onComplete: () => void;
}

/** 转场阶段 */
type TransitionPhase = "lock" | "zoom" | "closeup" | "pageturn" | "reveal" | "done";

/** 各阶段时间点（ms） */
const PHASE_TIMINGS = {
  lockEnd: 300,
  zoomEnd: 800,
  closeupEnd: 1200,
  pageturnEnd: 1600,
  revealEnd: 2400,
} as const;

export default function BookTransition({ bookRect, bookImageSrc, onComplete }: BookTransitionProps) {
  const [phase, setPhase] = useState<TransitionPhase>("lock");

  // 阶段推进 + 完成回调
  useEffect(() => {
    const timers: number[] = [];

    timers.push(window.setTimeout(() => setPhase("zoom"), PHASE_TIMINGS.lockEnd));
    timers.push(window.setTimeout(() => setPhase("closeup"), PHASE_TIMINGS.zoomEnd));
    timers.push(window.setTimeout(() => setPhase("pageturn"), PHASE_TIMINGS.closeupEnd));
    timers.push(window.setTimeout(() => setPhase("reveal"), PHASE_TIMINGS.pageturnEnd));
    timers.push(window.setTimeout(() => {
      setPhase("done");
      onComplete();
    }, PHASE_TIMINGS.revealEnd));

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [onComplete]);

  // 计算镜头推近的起始位置（书本中心）
  const bookCenterX = bookRect ? bookRect.x + bookRect.width / 2 : window.innerWidth / 2;
  const bookCenterY = bookRect ? bookRect.y + bookRect.height / 2 : window.innerHeight / 2;

  // 转换为 transform-origin（百分比）
  const originX = (bookCenterX / window.innerWidth) * 100;
  const originY = (bookCenterY / window.innerHeight) * 100;

  // 根据 phase 计算 scale / opacity / blur
  const getVisualState = () => {
    switch (phase) {
      case "lock":
        // Stage 1: 微震 + 金光闪现
        return {
          bookScale: 1.0,
          bookOpacity: 1,
          bookBlur: 0,
          bgOpacity: 0,
          flashOpacity: 0.6, // 金光闪现
          glowOpacity: 0,
        };
      case "zoom":
        // Stage 2: 镜头推近 + 背景暗化
        return {
          bookScale: 1.4,
          bookOpacity: 1,
          bookBlur: 0,
          bgOpacity: 0.5,
          flashOpacity: 0,
          glowOpacity: 0.3,
        };
      case "closeup":
        // Stage 3: 封面充满屏幕 + 微 blur
        return {
          bookScale: 2.2,
          bookOpacity: 0.95,
          bookBlur: 2,
          bgOpacity: 0.85,
          flashOpacity: 0,
          glowOpacity: 0.5,
        };
      case "pageturn":
        // Stage 4: 翻页闪光
        return {
          bookScale: 2.4,
          bookOpacity: 0.7,
          bookBlur: 6,
          bgOpacity: 0.95,
          flashOpacity: 0.85, // 白金光晕扩散
          glowOpacity: 0.8,
        };
      case "reveal":
        // Stage 5: Lesson 显现，转场层淡出
        return {
          bookScale: 2.6,
          bookOpacity: 0,
          bookBlur: 12,
          bgOpacity: 1,
          flashOpacity: 0,
          glowOpacity: 0,
        };
      default:
        return {
          bookScale: 2.6,
          bookOpacity: 0,
          bookBlur: 12,
          bgOpacity: 1,
          flashOpacity: 0,
          glowOpacity: 0,
        };
    }
  };

  const visual = getVisualState();

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          className="fixed inset-0"
          style={{
            zIndex: 1200, // 高于 Lumos 场景 (z=999)
            pointerEvents: "none",
            background: "rgb(0, 0, 0)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          {/* === 暗化背景层 === */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgb(0, 0, 0)" }}
            animate={{ opacity: visual.bgOpacity }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* === 书本镜头层（从书本位置展开） === */}
          {/* Round 1：渲染真实书本图片，与 AncientSpellBook 视觉一致 */}
          <motion.div
            className="absolute inset-0"
            style={{
              transformOrigin: `${originX}% ${originY}%`,
            }}
            animate={{
              scale: visual.bookScale,
              opacity: visual.bookOpacity,
              filter: `blur(${visual.bookBlur}px)`,
            }}
            transition={{
              duration: phase === "lock" ? 0.3 : 0.4,
              ease: [0.22, 1, 0.36, 1], // easeOutQuart，电影感
            }}
          >
            {/* 真实书本封面（与 AncientSpellBook 相同样式） */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative overflow-hidden"
                style={{
                  width: "min(768px, 95vw)",
                  aspectRatio: "4 / 3",
                  borderRadius: "4px",
                  boxShadow:
                    "0 24px 60px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.5)",
                }}
              >
                {/* 真实书本素材图片（与 AncientSpellBook 同源） */}
                <img
                  src={bookImageSrc}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center 45%",
                    userSelect: "none",
                  }}
                />
                {/* 烫金边框暗示（连续性锚点，与 AncientSpellBook 风格一致） */}
                <div
                  className="absolute inset-[3%] rounded-[2px] pointer-events-none"
                  style={{
                    border: "1px solid rgba(201, 162, 39, 0.3)",
                    boxShadow: "inset 0 0 30px rgba(201, 162, 39, 0.08)",
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* === Stage 1: 金光闪现（lock feedback） === */}
          <AnimatePresence>
            {phase === "lock" && (
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at " + originX + "% " + originY + "%, rgba(250, 200, 120, 0.4) 0%, transparent 30%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* === Stage 4: 翻页闪光（白金光晕从中心扩散） === */}
          <AnimatePresence>
            {phase === "pageturn" && (
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at " + originX + "% " + originY + "%, rgba(255, 244, 214, 0.9) 0%, rgba(250, 200, 120, 0.5) 25%, transparent 60%)",
                }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 0.85, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* === 持续的金色光晕（zoom/closeup/pageturn 阶段） === */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at " + originX + "% " + originY + "%, rgba(201, 162, 39, 0.25) 0%, transparent 50%)",
            }}
            animate={{ opacity: visual.glowOpacity }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

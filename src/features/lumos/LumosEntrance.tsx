/**
 * LumosEntrance（Phase 17.1-D 场景隔离版）。
 *
 * 重新设计：
 *   - Lumos = Scene Transition，不是 Modal Overlay
 *   - 首页与 Lumos 视觉隔离
 *   - 不再是透明 overlay 叠在首页上
 *
 * 接受外部 useLumosRitual 的值（由 StudyRoom 传入，实现状态共享）。
 *
 * 状态渲染：
 *   idle → 小入口（在首页内，点击进入场景）
 *   awakening → 全屏苏醒序列（首页已被 StudyRoom display:none）
 *   research/verification → 全屏魔法书场景
 *   closed → 小"再次施法"入口
 *
 * Phase 17.1-D 变化：
 *   - z-index 提升到 999（高于所有 StudyRoom 内容）
 *   - closeRitual 加 0.8s 退出过渡（opacity 1→0 + blur 0→8px + scale 1→0.98）
 *   - 增加 ESC 键退出支持
 *   - 退出后 phase = closed，无残留 fixed overlay
 */

import { useEffect, useRef, useState } from "react";
import type { UseLumosRitualReturn } from "./hooks/useLumosRitual";
import AwakeningSequence from "./ritual/AwakeningSequence";
import AncientSpellBook from "./spellbook/AncientSpellBook";
import BookTransition from "./spellbook/BookTransition";
import SnapeWhisper from "@/features/snape/SnapeWhisper";
import { SNAPE_REACTIONS } from "@/core/snape/reactions";
import { magicEvents, MAGIC_EVENTS } from "@/features/magic/MagicEvents";
import { magicContext } from "@/features/magic/MagicContext";
import { sfxManager } from "@/services/audio/sfxManager";
import type { LessonCardProps } from "@/components/study/LessonCard";
import { motion, AnimatePresence } from "framer-motion";

interface LumosEntranceProps {
  /** useLumosRitual 返回值（由 StudyRoom 传入） */
  ritual: UseLumosRitualReturn;
  /** LessonCard 所需 props（保留兼容，当前未使用） */
  lessonCardProps?: LessonCardProps;
}

/**
 * Lumos 仪式主入口（场景隔离版）。
 *
 * 渲染策略：
 *   - idle：首页内的小入口（Enter the Study）
 *   - awakening：全屏苏醒序列 + Snape 低语
 *   - research/verification：全屏魔法书场景
 *   - closed：首页内的小入口（Cast Lumos again）
 */
export default function LumosEntrance({
  ritual,
  lessonCardProps,
}: LumosEntranceProps) {
  // lessonCardProps 保留用于未来扩展（当前未使用，翻页后直接回首页）
  void lessonCardProps;
  const { phase, bookOpen, activateLumos, completeAwakening, openBook, closeRitual, resetToIdle } =
    ritual;

  const ritualEnterReaction = SNAPE_REACTIONS.find(
    (r) => r.moment === "ritual_enter",
  );
  const bookOpenReaction = SNAPE_REACTIONS.find((r) => r.moment === "book_open");

  const isBookScene = phase === "research" || phase === "verification";
  const isIdle = phase === "idle";
  const isClosed = phase === "closed";
  const isAwakening = phase === "awakening";

  // Phase 17.1-D：ESC 键退出（仅在 Lumos 激活时响应）
  useEffect(() => {
    if (!isBookScene && !isAwakening) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRitual();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isBookScene, isAwakening, closeRitual]);

  // Phase 17.2.2：同步魔法场景状态（MagicContext）。
  //   idle/awakening → lumos（入口/仪式进行中）
  //   research/verification → spellbook（魔法书，预留 sweep 翻页）
  //   closed → study（回到首页单词页，禁止 sweep 重复唤醒）
  useEffect(() => {
    if (phase === "idle" || phase === "awakening") {
      magicContext.setActiveScene("lumos");
    } else if (phase === "research" || phase === "verification") {
      magicContext.setActiveScene("spellbook");
    } else {
      magicContext.setActiveScene("study");
    }
  }, [phase]);

  // Phase 17.2.2：MAGIC_SWEEP 场景门控。
  //   仅 lumos 场景 + idle 阶段才激活仪式。
  //   study 场景（首页单词页）禁止响应，避免重复唤醒。
  //   spellbook 场景预留翻页交互（TODO）。
  // Phase 19.1：触发时播放 wand_swish 音效。
  useEffect(() => {
    const unsub = magicEvents.on(MAGIC_EVENTS.MAGIC_SWEEP, () => {
      if (magicContext.getActiveScene() !== "lumos") return;
      if (phase !== "idle") return;
      sfxManager.play("wand_swish");
      activateLumos();
    });
    return unsub;
  }, [phase, activateLumos]);

  // Phase 19.1：打开书本时播放 book_open 音效。
  //   包装 openBook，避免修改 useLumosRitual 状态机。
  //   Phase 19.2：同时捕获书本屏幕坐标，触发 BookTransition 电影转场。
  const bookWrapperRef = useRef<HTMLDivElement>(null);
  const [bookRect, setBookRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleOpenBook = () => {
    sfxManager.play("book_open");
    // 捕获书本屏幕坐标（用于 BookTransition 镜头推近锚点）
    const el = bookWrapperRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setBookRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    openBook();
  };

  // Phase 19.2：BookTransition 转场完成 → closeRitual（替代旧 1.4s timer）
  //   useLumosRitual 状态机不变，仅延后 closeRitual 调用时机
  const handleTransitionComplete = () => {
    closeRitual();
  };

  return (
    <>
      {/* === idle：首页内的魔法阵入口 === */}
      {isIdle && (
        <div className="-mt-[200px] flex flex-col items-center gap-6">
          <motion.button
            type="button"
            onClick={activateLumos}
            className="group relative flex flex-col items-center gap-4 rounded-full px-12 py-10 transition-all duration-700 hover:scale-105"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.3, scale: 1 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            aria-label="Enter the Study"
          >
            {/* 外层光晕（增强边缘虚化） */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(201,162,39,0.18) 0%, rgba(250,76,20,0.10) 35%, transparent 70%)",
                filter: "blur(12px)",
              }}
              animate={{ opacity: [0.5, 0.8, 0.5], scale: [0.95, 1.1, 0.95] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* 第二层虚化光晕 */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(201,162,39,0.08) 0%, transparent 60%)",
                filter: "blur(24px)",
              }}
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* 粒子星光动效 */}
            <SparkleParticles />

            {/* 死亡圣器符号 SVG（静止） */}
            <motion.svg
              viewBox="0 0 100 100"
              className="relative h-24 w-24 sm:h-28 sm:w-28"
            >
              <defs>
                <radialGradient id="runeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c9a227" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* 外圈光晕 */}
              <circle cx="50" cy="50" r="48" fill="url(#runeGlow)" />

              {/* === 死亡圣器三符号 === */}
              {/* 三角形（老魔杖 Elder Wand）— 外框 */}
              <path d="M 50 14 L 86 78 L 14 78 Z" fill="none" stroke="#c9a227" strokeWidth="0.9" strokeLinejoin="round" opacity="0.75" />
              {/* 圆形（复活石 Resurrection Stone）— 内切于三角形 */}
              <circle cx="50" cy="56" r="21" fill="none" stroke="#c9a227" strokeWidth="0.7" opacity="0.65" />
              {/* 竖线（隐形斗篷 Invisibility Cloak）— 顶点到底边中点 */}
              <line x1="50" y1="14" x2="50" y2="78" stroke="#c9a227" strokeWidth="0.7" strokeLinecap="round" opacity="0.65" />

              {/* 中心光点（呼吸感） */}
              <motion.circle
                cx="50" cy="56" r="1.5" fill="#c9a227"
                animate={{ opacity: [0.4, 0.9, 0.4], r: [1, 1.8, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* 四方位符文点（保留外围星点装饰） */}
              <circle cx="50" cy="6" r="1.2" fill="#c9a227" opacity="0.5" />
              <circle cx="50" cy="94" r="1.2" fill="#c9a227" opacity="0.5" />
              <circle cx="6" cy="50" r="1.2" fill="#c9a227" opacity="0.5" />
              <circle cx="94" cy="50" r="1.2" fill="#c9a227" opacity="0.5" />
            </motion.svg>
          </motion.button>
        </div>
      )}

      {/* === closed：首页内的"再次施法"入口 === */}
      {isClosed && (
        <div className="mt-16 flex justify-center">
          <motion.button
            type="button"
            onClick={resetToIdle}
            className="group flex flex-col items-center gap-3 rounded-lg px-8 py-6 transition-colors hover:bg-stone-900/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            aria-label="Cast Lumos again"
          >
            <svg viewBox="0 0 64 64" className="h-10 w-10 opacity-60 transition-opacity group-hover:opacity-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#c9a227" strokeWidth="0.6" />
              <circle cx="32" cy="32" r="24" fill="none" stroke="#c9a227" strokeWidth="0.4" opacity="0.6" />
              <path d="M 32 14 L 48 42 L 16 42 Z" fill="none" stroke="#c9a227" strokeWidth="0.8" strokeLinejoin="round" />
              <circle cx="32" cy="32" r="2" fill="#f5e6b8" />
            </svg>
            <span className="font-serif text-xs italic tracking-wider text-parchment/50">
              ✦ Cast Lumos again ✦
            </span>
          </motion.button>
        </div>
      )}

      {/* === Lumos 全屏场景（awakening + research + verification） === */}
      {/* Phase 17.1-D：用 AnimatePresence 包裹，让 exit 动画（0.8s blur+scale）能完整播放后再卸载 */}
      <AnimatePresence>
        {(isAwakening || isBookScene) && (
          <motion.div
            key="lumos-scene"
            className="fixed inset-0 z-[999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              filter: "blur(8px)",
              scale: 0.98,
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
            style={{
              // Phase 17.1-D：所有 Lumos 阶段都用黑色全屏背景，彻底覆盖首页
              background:
                "radial-gradient(ellipse at center, rgba(10,6,4,0.98) 0%, rgba(0,0,0,1) 100%)",
            }}
            onClick={isBookScene ? closeRitual : undefined}
            aria-label="Lumos Ritual"
          >
            {/* === awakening：苏醒序列 + Snape 低语 === */}
            {isAwakening && (
              <>
                <SnapeWhisper reaction={ritualEnterReaction} duration={4000} />
                <AwakeningSequence onComplete={completeAwakening} />
              </>
            )}

            {/* === research + verification：魔法书场景 === */}
            {isBookScene && (
              <div className="flex h-full w-full flex-col items-center justify-center">
                {/* Phase 17.2.1：打开书时 Snape 低语 "Today's research." */}
                {bookOpen && (
                  <SnapeWhisper reaction={bookOpenReaction} duration={3500} />
                )}
                {/* 魔法书 + 背后发光层 */}
                <motion.div
                  ref={bookWrapperRef}
                  className="relative flex max-h-[92vh] w-full justify-center px-4 mt-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!bookOpen) handleOpenBook();
                  }}
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* 书本背后发光（金色 radial，呼吸感） */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 m-auto h-[80vh] max-w-4xl"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, rgba(201,162,39,0.18) 0%, rgba(250,76,20,0.08) 35%, transparent 70%)",
                    }}
                    animate={
                      bookOpen
                        ? { opacity: 0, scale: 1.4 }
                        : { opacity: [0.6, 0.9, 0.6], scale: [0.98, 1.02, 0.98] }
                    }
                    transition={
                      bookOpen
                        ? { duration: 0.3, ease: "easeOut" }
                        : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                  {/* 书本本体（Phase 19.2：打开动画由 BookTransition 接管，此处不再 scale/blur） */}
                  <AncientSpellBook
                    isOpen={bookOpen}
                    onOpenClick={handleOpenBook}
                    className="relative max-h-[92vh]"
                  />
                </motion.div>

                {/* === Phase 19.2: BookTransition 电影级转场 overlay === */}
                {/*   z=1200 高于 Lumos 场景，覆盖书本放大过程，转场完成后调用 closeRitual */}
                {bookOpen && (
                  <BookTransition
                    bookRect={bookRect}
                    onComplete={handleTransitionComplete}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 粒子星光动效。
 *
 * 在魔法阵周围生成 12 颗随机分布的小星光，
 * 各自有不同的闪烁周期和位置偏移，营造魔法粒子感。
 */
function SparkleParticles() {
  const particles = [
    { x: 20, y: 15, delay: 0, dur: 2.5 },
    { x: 75, y: 20, delay: 0.3, dur: 3 },
    { x: 10, y: 50, delay: 0.6, dur: 2.8 },
    { x: 85, y: 55, delay: 0.9, dur: 3.2 },
    { x: 30, y: 80, delay: 1.2, dur: 2.6 },
    { x: 70, y: 85, delay: 1.5, dur: 3.4 },
    { x: 50, y: 5, delay: 0.4, dur: 2.2 },
    { x: 5, y: 30, delay: 0.7, dur: 3.1 },
    { x: 90, y: 35, delay: 1.0, dur: 2.7 },
    { x: 15, y: 70, delay: 1.3, dur: 3.3 },
    { x: 80, y: 75, delay: 1.6, dur: 2.4 },
    { x: 45, y: 95, delay: 1.9, dur: 3.5 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* 四角星 SVG */}
          <svg viewBox="0 0 10 10" className="h-2 w-2">
            <path
              d="M 5 0 L 6 4 L 10 5 L 6 6 L 5 10 L 4 6 L 0 5 L 4 4 Z"
              fill="#c9a227"
              opacity="0.8"
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

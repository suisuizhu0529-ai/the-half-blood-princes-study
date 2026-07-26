import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Feather } from "lucide-react";
import Flourish from "./decor/Flourish";
import { sfxManager } from "@/services/audio/sfxManager";

interface EntranceProps {
  onEntered?: () => void;
}

/**
 * 入场体验覆盖层。
 *
 * 时序：
 *  0.0s  全黑
 *  0.9s  羽毛笔 + 标题淡入
 *  2.4s  "Enter the Study" 按钮淡入
 *  用户点击 → 1.6s 淡出 → onEntered
 *
 * 全屏 z-50 黑幕，遮住底层 AmbientLayer 与 StudyRoom。
 * 淡出后露出书房氛围，笔记翻开动画由 StudyRoom 在 entered=true 时触发。
 *
 * Phase 19.2：handleEnter 在 user gesture 内主动初始化 AudioContext，
 *   避免后续首次音效播放因 suspended context 延迟。不播放任何声音。
 */
export default function Entrance({ onEntered }: EntranceProps) {
  const [showTitle, setShowTitle] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTitle(true), 900);
    const t2 = setTimeout(() => setShowEnter(true), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleEnter = () => {
    if (exiting) return;
    // Phase 19.2：在用户明确点击手势内预热 AudioContext
    //   - 不播放声音，仅创建 context 并尝试 resume
    //   - 后续 wand_swish / candle_ignite 等可立即播放，无首次延迟
    //   - 失败时 sfxManager 内部 console.warn，不阻塞入场流程
    sfxManager.initialize();
    setExiting(true);
  };

  // 键盘 Enter / Return 进入书房（按钮淡入后才响应，避免误触）
  useEffect(() => {
    if (!showEnter || exiting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Phase 19.2：键盘 Enter 也是有效 user gesture，预热 AudioContext
        sfxManager.initialize();
        setExiting(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEnter, exiting]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone px-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 1.6, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (exiting) onEntered?.();
      }}
      role="dialog"
      aria-label="Entrance"
    >
      {/* 极淡的雨丝暗示（黑幕中隐约可感） */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 block w-px"
            style={{
              left: `${8 + i * 9}%`,
              height: "90px",
              background:
                "linear-gradient(180deg, transparent 0%, rgba(180, 200, 230, 0.55) 50%, transparent 100%)",
              opacity: 0.18,
              animation: `rain-fall ${0.55 + (i % 3) * 0.18}s linear ${(i * 0.14) % 1.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* 极淡的暗角，让中心更聚焦 */}
      <div className="vignette pointer-events-none absolute inset-0" />

      {/* 中心内容 */}
      <div className="relative text-center">
        {/* 标题组 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={showTitle ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
            animate={
              showTitle
                ? { opacity: 1, scale: 1, rotate: 0 }
                : { opacity: 0, scale: 0.7, rotate: -10 }
            }
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="mx-auto mb-7 w-fit"
          >
            <Feather
              size={28}
              strokeWidth={1.2}
              className="text-gold/70 drop-shadow-[0_0_12px_rgba(201,162,39,0.35)]"
            />
          </motion.div>

          <p className="mb-4 font-ui text-[10px] uppercase tracking-[0.5em] text-gold/55">
            Welcome to
          </p>

          <h1 className="font-display text-2xl leading-tight tracking-widest2 text-parchment sm:text-4xl">
            The Half-Blood Prince&apos;s Study
          </h1>

          <p className="mt-5 font-zh text-xs tracking-[0.5em] text-parchment/55 sm:text-sm">
            混 血 王 子 的 私 人 书 房
          </p>

          <Flourish className="mx-auto mt-8 h-3 w-52" variant="center" />
        </motion.div>

        {/* 进入按钮 */}
        <motion.button
          type="button"
          onClick={handleEnter}
          initial={{ opacity: 0 }}
          animate={showEnter ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="group mt-14 inline-flex items-center gap-4 font-display text-xs tracking-widest2 text-parchment/65 transition-colors hover:text-parchment"
          aria-label="Enter the Study"
        >
          <span className="h-px w-8 bg-gold/40 transition-all duration-500 group-hover:w-12 group-hover:bg-gold" />
          <span className="relative">
            Enter the Study
            <span className="absolute -bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-gold transition-all duration-500 group-hover:w-full" />
          </span>
          <span className="h-px w-8 bg-gold/40 transition-all duration-500 group-hover:w-12 group-hover:bg-gold" />
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={showEnter ? { opacity: 0.5 } : { opacity: 0 }}
          transition={{ duration: 1.4, delay: 0.6 }}
          className="mt-5 font-serif text-xs italic text-parchment/35"
        >
          · The candle awaits your hand ·
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={showEnter ? { opacity: 0.4 } : { opacity: 0 }}
          transition={{ duration: 1.4, delay: 1.1 }}
          className="mt-3 font-ui text-[10px] tracking-widest2 text-gold/45"
        >
          press Enter to begin
        </motion.p>
      </div>

      {/* 底部署名 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={showEnter ? { opacity: 0.3 } : { opacity: 0 }}
        transition={{ duration: 1.5, delay: 1.2 }}
        className="absolute bottom-8 font-ui text-[10px] tracking-widest2 text-parchment/30"
      >
        A Quiet Hour with Words
      </motion.p>
    </motion.div>
  );
}
